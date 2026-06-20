import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { db, auth } from "../firebase";
import { collection, getDocs, deleteDoc, doc, updateDoc, increment, getDoc } from "firebase/firestore";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import ReviewForm from "../components/ReviewForm";
import ReservationForm from "../components/ReservationForm";
import ErrorBoundary from "../components/ErrorBoundary";
import "../styles/design-system.css";
import "./MapPage.css";

/* ── Icônes markers ── */
const pointVert = L.divIcon({
  className: "",
  html: '<div style="width:16px;height:16px;background:#22c55e;border-radius:50%;border:3px solid white;box-shadow:0 0 8px #22c55e55"></div>',
  iconSize: [16,16], iconAnchor: [8,8],
});
const pointOr = L.divIcon({
  className: "",
  html: '<div style="width:20px;height:20px;background:#f59e0b;border-radius:50%;border:3px solid white;box-shadow:0 0 10px #f59e0b55"></div>',
  iconSize: [20,20], iconAnchor: [10,10],
});

const quartiers = ["Tous","Cotonou","Godomey","Cocotomey","Abomey-Calavi"];
const types     = ["Tous","Chambre salon","Entree couchee","Studio","Maison entiere"];

/* ── Clustering ── */
function ClusterLayer({ maisons, isMine, onSelect }) {
  const map = useMap();
  const groupRef = useRef(null);

  useEffect(() => {
    const loadCluster = async () => {
      if (!window.L.MarkerClusterGroup) {
        await new Promise((resolve) => {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/MarkerCluster.Default.min.css";
          document.head.appendChild(link);
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/leaflet.markercluster.min.js";
          script.onload = resolve;
          document.head.appendChild(script);
        });
      }
      if (groupRef.current) map.removeLayer(groupRef.current);
      const group = window.L.markerClusterGroup({
        maxClusterRadius: 60,
        showCoverageOnHover: false,
        iconCreateFunction: (cluster) => {
          const count = cluster.getChildCount();
          const hasMine = cluster.getAllChildMarkers().some(m => m.options.isMine);
          return window.L.divIcon({
            html: `<div style="width:38px;height:38px;background:${hasMine?"#f59e0b":"#16a34a"};border-radius:50%;border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:14px;">${count}</div>`,
            className: "", iconSize: [38,38], iconAnchor: [19,19],
          });
        },
      });
      maisons.forEach((m) => {
        const mine = isMine(m);
        const marker = window.L.marker(
          [parseFloat(m.lat), parseFloat(m.lng)],
          { icon: mine ? pointOr : pointVert, isMine: mine }
        );
        marker.bindTooltip(
          `<div style="font-size:12px;line-height:1.6">
            <strong>${m.nom || "Propriétaire"}</strong><br/>
            <span style="color:#555">${m.type} — ${m.quartier}</span><br/>
            <span style="color:#16a34a;font-weight:bold">${Number(m.prix).toLocaleString()} FCFA ${m.paiement}</span>
          </div>`,
          { direction: "top", offset: [0,-10] }
        );
        marker.on("click", () => onSelect(m));
        group.addLayer(marker);
      });
      map.addLayer(group);
      groupRef.current = group;
    };
    if (maisons.length > 0) loadCluster();
    return () => { if (groupRef.current) map.removeLayer(groupRef.current); };
  }, [maisons, map]);

  return null;
}

function MapCentrer({ centre, zoom }) {
  const map = useMap();
  useEffect(() => { map.setView(centre, zoom, { animate: true }); }, [centre, zoom]);
  return null;
}

const CLOUDINARY_CLOUD  = "dz3yafimu";
const CLOUDINARY_PRESET = "allomaison_upload";

async function uploadToCloudinary(file) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", CLOUDINARY_PRESET);
  const res  = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method:"POST", body:fd });
  const data = await res.json();
  return data.secure_url;
}

export default function MapPage({ setEcran }) {
  const [maisons, setMaisons]         = useState([]);
  const [carteCentre, setCarteCentre] = useState([6.3654, 2.4183]);
  const [carteZoom, setCarteZoom]     = useState(13);
  const [quartier, setQuartier]       = useState("Tous");
  const [type, setType]               = useState("Tous");
  const [selected, setSelected]       = useState(null);
  const [showReview, setShowReview]               = useState(false);
  const [showReservation, setShowReservation]     = useState(false);
  const [suppression, setSuppression]             = useState(false);
  const [userWp, setUserWp]           = useState("");
  const [photoAgrandie, setPhotoAgrandie]         = useState(null);
  const [editMode, setEditMode]       = useState(false);
  const [editForm, setEditForm]       = useState({});
  const [editPhotos, setEditPhotos]   = useState([]);
  const [newFiles, setNewFiles]       = useState([]);
  const [saving, setSaving]           = useState(false);
  const [editError, setEditError]     = useState("");

  const uid = auth.currentUser?.uid;

  const loadData = async () => {
    try {
      const snap = await getDocs(collection(db, "maisons"));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMaisons(data);
      if (uid) {
        const userSnap = await getDoc(doc(db, "users", uid));
        const wp = userSnap.exists() ? userSnap.data().whatsapp?.replace(/[\s\+]/g,"") || "" : "";
        setUserWp(wp);
      }
      const valides = snap.docs.map(d => d.data()).filter(m => !isNaN(parseFloat(m.lat)) && !isNaN(parseFloat(m.lng)));
      if (valides.length > 0) {
        const zones = {};
        valides.forEach(m => {
          const cle = `${Math.round(parseFloat(m.lat)/0.02)*0.02},${Math.round(parseFloat(m.lng)/0.02)*0.02}`;
          zones[cle] = (zones[cle] || 0) + 1;
        });
        const [zLat, zLng] = Object.entries(zones).sort((a,b) => b[1]-a[1])[0][0].split(",").map(Number);
        setCarteCentre([zLat, zLng]);
        setCarteZoom(15);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => { setTimeout(() => window.dispatchEvent(new Event("resize")), 100); }, []);

  const isMine = (m) => m && (
    m.proprietaireId === uid ||
    (userWp && (m.whatsapp || m.WhatsApp)?.replace(/[\s\+]/g,"") === userWp)
  );

  const openEdit = (m) => {
    setEditForm({ nom: m.nom||"", type: m.type||"Studio", quartier: m.quartier||"Cotonou",
      description: m.description||"", whatsapp: m.whatsapp||"",
      paiement: m.paiement||"Par mois", prix: m.prix||"" });
    setEditPhotos(m.photos?.length ? m.photos : (m.photo ? [m.photo] : []));
    setNewFiles([]); setEditError(""); setEditMode(true);
  };

  const handleNewFiles = (e) => {
    const files   = Array.from(e.target.files);
    const restant = 6 - editPhotos.length - newFiles.length;
    if (restant <= 0) return setEditError("❌ Maximum 6 photos atteint.");
    setNewFiles(prev => [...prev, ...files.slice(0, restant)]);
    setEditError("");
  };

  const handleSave = async () => {
    setEditError("");
    if (!editForm.prix || Number(editForm.prix) <= 0) return setEditError("❌ Entrez un prix valide.");
    setSaving(true);
    try {
      const nouvellesURLs = await Promise.all(newFiles.map(f => uploadToCloudinary(f)));
      const toutesPhotos  = [...editPhotos, ...nouvellesURLs];
      let videoURL = selected.video || null;
      if (editForm._removeVideo) videoURL = null;
      if (editForm._newVideo) videoURL = await uploadToCloudinary(editForm._newVideo);
      const { _removeVideo, _newVideo, ...formPropre } = editForm;
      await updateDoc(doc(db, "maisons", selected.id), { ...formPropre, photos: toutesPhotos, photo: toutesPhotos[0]||null, video: videoURL });
      const updated = { ...selected, ...formPropre, photos: toutesPhotos, photo: toutesPhotos[0]||null, video: videoURL };
      setMaisons(prev => prev.map(m => m.id === selected.id ? updated : m));
      setSelected(updated);
      setEditMode(false);
    } catch (e) { setEditError("❌ Erreur : " + e.message); }
    setSaving(false);
  };

  const handleDelete = async (maisonId) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cette maison ?")) return;
    try {
      setSuppression(true); setSelected(null); setShowReview(false);
      await new Promise(r => setTimeout(r, 300));
      await deleteDoc(doc(db, "maisons", maisonId));
      setMaisons(prev => prev.filter(m => m.id !== maisonId));
    } catch (e) { alert("Erreur : " + e.message); }
    finally { setSuppression(false); }
  };

  const filtrees  = maisons.filter(m => {
    const okQ = quartier === "Tous" || m.quartier === quartier;
    const okT = type === "Tous" || m.type === type;
    const okC = !isNaN(parseFloat(m.lat)) && !isNaN(parseFloat(m.lng));
    return okQ && okT && okC;
  });

  const getPhotos = (m) => m.photos?.length ? m.photos : (m.photo ? [m.photo] : []);

  return (
    <div className="mp-root">

      {/* ── Overlay suppression ── */}
      {suppression && (
        <div className="mp-delete-overlay">
          <div className="mp-delete-box">
            <div className="mp-delete-icon">🗑️</div>
            <p className="mp-delete-text">Suppression en cours…</p>
          </div>
        </div>
      )}

      {/* ── Lightbox ── */}
      {photoAgrandie && (
        <div className="mp-lightbox" onClick={() => setPhotoAgrandie(null)}>
          <img src={photoAgrandie} alt="agrandie" />
          <button className="mp-lightbox-close" onClick={() => setPhotoAgrandie(null)}>✕</button>
        </div>
      )}

      {/* ── Filtres ── */}
      <div className="mp-filters">
        <div className="mp-filter-group">
          <span className="mp-filter-label">Quartier</span>
          <select className="mp-filter-select" value={quartier} onChange={e => setQuartier(e.target.value)}>
            {quartiers.map(q => <option key={q}>{q}</option>)}
          </select>
        </div>
        <div className="mp-filter-group">
          <span className="mp-filter-label">Type</span>
          <select className="mp-filter-select" value={type} onChange={e => setType(e.target.value)}>
            {types.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <button className="mp-filter-back" onClick={() => setEcran("choix")}>← Accueil</button>
      </div>

      {/* ── Carte ── */}
      <ErrorBoundary>
        <MapContainer key="map" center={carteCentre} zoom={carteZoom}
          style={{ height:"100%", width:"100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapCentrer centre={carteCentre} zoom={carteZoom} />
          {!suppression && (
            <ClusterLayer
              maisons={filtrees}
              isMine={isMine}
              onSelect={async (m) => {
                setSelected(m); setShowReview(false); setShowReservation(false); setEditMode(false);
                try { await updateDoc(doc(db, "maisons", m.id), { vues: increment(1) }); } catch {}
              }}
            />
          )}
        </MapContainer>
      </ErrorBoundary>

      {/* ── Légende ── */}
      <div className="mp-legend">
        <div className="mp-legend-row">
          <div className="mp-legend-dot" style={{ width:12, height:12, background:"#22c55e" }} />
          <span>Maison disponible</span>
        </div>
        <div className="mp-legend-row">
          <div className="mp-legend-dot" style={{ width:14, height:14, background:"#f59e0b" }} />
          <span>Ma maison</span>
        </div>
      </div>

      {/* ── FICHE MAISON ── */}
      {selected && !showReview && !showReservation && !editMode && (
        <div className="mp-panel mp-panel-sm">
          <div className="mp-fiche-head">
            <div className="mp-fiche-top">
              <h3 className="mp-fiche-type">{selected.type}</h3>
              <button className="mp-fiche-close" onClick={() => setSelected(null)}>✕</button>
            </div>
            {isMine(selected) && <span className="mp-fiche-mine-badge">⭐ Ma maison</span>}
            <p className="mp-fiche-quartier">{selected.quartier}</p>
            <p className="mp-fiche-desc">{selected.description}</p>
            <p className="mp-fiche-prix">
              {Number(selected.prix).toLocaleString()} FCFA
              <span> {selected.paiement}</span>
            </p>
          </div>

          {/* Galerie */}
          {(() => {
            const photos = getPhotos(selected);
            if (!photos.length) return null;
            return (
              <div className="mp-gallery">
                <img className="mp-gallery-main" src={photos[0]} alt="principale"
                  onClick={() => setPhotoAgrandie(photos[0])} />
                {photos.length > 1 && (
                  <div className="mp-gallery-thumbs">
                    {photos.slice(1).map((url, i) => (
                      <img key={i} className="mp-gallery-thumb" src={url} alt={`photo ${i+2}`}
                        onClick={() => setPhotoAgrandie(url)} />
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Vidéo */}
          {selected.video && (
            <div className="mp-video-block">
              <p className="mp-video-label">🎥 Vidéo de visite</p>
              <video className="mp-video-player" src={selected.video} controls />
            </div>
          )}

          {/* Actions */}
          <div className="mp-fiche-actions">
            <a className="mp-btn-wa"
              href={"https://wa.me/" + selected.whatsapp + "?text=" + encodeURIComponent(
                "Bonjour, j'ai vu votre maison sur ALLOmaison (" + selected.type +
                " à " + selected.quartier + " — " + Number(selected.prix).toLocaleString() +
                " FCFA " + selected.paiement + "). Est-elle toujours disponible ?"
              )}
              target="_blank" rel="noreferrer"
              onClick={async () => {
                try { await updateDoc(doc(db, "maisons", selected.id), { clicsWhatsapp: increment(1) }); } catch {}
              }}>
              Contacter sur WhatsApp
            </a>

            {!isMine(selected) && (
              <button className="mp-btn-reserve" onClick={() => setShowReservation(true)}>
                📅 Réserver cette maison
              </button>
            )}

            <button className="mp-btn-avis" onClick={() => setShowReview(true)}>
              Laisser un avis
            </button>

            {isMine(selected) && (
              <>
                <button className="mp-btn-edit" onClick={() => openEdit(selected)}>
                  ✏️ Modifier ma maison
                </button>
                <button className="mp-btn-delete" onClick={() => handleDelete(selected.id)}>
                  Supprimer ma maison
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── FORMULAIRE ÉDITION ── */}
      {selected && editMode && (
        <div className="mp-panel mp-panel-md" style={{ padding: 16 }}>
          <div className="mp-edit-head">
            <h3 className="mp-edit-title">✏️ Modifier la maison</h3>
            <button className="mp-fiche-close" onClick={() => setEditMode(false)}>✕</button>
          </div>

          {[
            ["Votre nom", "nom", "text", "Ex: Koffi Jean"],
            ["WhatsApp", "whatsapp", "text", "Ex: 22967000000"],
          ].map(([label, key, t, ph]) => (
            <div key={key} className="mp-edit-field">
              <label className="mp-edit-label">{label}</label>
              <input className="mp-edit-input" type={t} placeholder={ph}
                value={editForm[key]}
                onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))} />
            </div>
          ))}

          {[
            ["Type", "type", ["Studio","Chambre salon","Entrée couchée","Maison entière"]],
            ["Quartier", "quartier", ["Cotonou","Godomey","Cocotomey","Abomey-Calavi"]],
          ].map(([label, key, opts]) => (
            <div key={key} className="mp-edit-field">
              <label className="mp-edit-label">{label}</label>
              <select className="mp-edit-select" value={editForm[key]}
                onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}>
                {opts.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}

          <div className="mp-edit-field">
            <label className="mp-edit-label">Description</label>
            <textarea className="mp-edit-textarea" rows={3}
              value={editForm.description}
              onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
          </div>

          <div className="mp-edit-row">
            <div className="mp-edit-field" style={{ marginBottom: 0 }}>
              <label className="mp-edit-label">Paiement</label>
              <select className="mp-edit-select" value={editForm.paiement}
                onChange={e => setEditForm(f => ({ ...f, paiement: e.target.value }))}>
                {["Par nuit","Par mois","Par année"].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="mp-edit-field" style={{ marginBottom: 0 }}>
              <label className="mp-edit-label">Prix (FCFA)</label>
              <input className="mp-edit-input" type="number" value={editForm.prix}
                onChange={e => setEditForm(f => ({ ...f, prix: e.target.value }))} />
            </div>
          </div>

          {/* Vidéo */}
          <div className="mp-edit-video-block">
            <p className="mp-edit-video-label">🎥 Vidéo <span style={{ fontWeight:400, color:"var(--gray-400)", fontSize:"11px" }}>(facultatif)</span></p>
            {selected.video && !editForm._removeVideo ? (
              <>
                <video className="mp-edit-video-player" src={selected.video} controls />
                <button className="mp-btn-delete" style={{ fontSize:"var(--text-xs)", padding:"6px" }}
                  onClick={() => setEditForm(f => ({ ...f, _removeVideo: true }))}>
                  🗑️ Supprimer la vidéo
                </button>
              </>
            ) : editForm._newVideo ? (
              <>
                <video className="mp-edit-video-player" src={URL.createObjectURL(editForm._newVideo)} controls />
                <button className="mp-btn-delete" style={{ fontSize:"var(--text-xs)", padding:"6px" }}
                  onClick={() => setEditForm(f => ({ ...f, _newVideo: null }))}>
                  🗑️ Retirer
                </button>
              </>
            ) : (
              <label className="mp-edit-video-add">
                🎬 Ajouter une vidéo
                <input type="file" accept="video/*" style={{ display:"none" }}
                  onChange={e => { const f = e.target.files[0]; if (f) setEditForm(ef => ({ ...ef, _newVideo: f, _removeVideo: false })); }} />
              </label>
            )}
          </div>

          {/* Photos */}
          <div className="mp-edit-photos-block">
            <span className="mp-edit-photos-label">📸 Photos ({editPhotos.length + newFiles.length}/6)</span>
            {(editPhotos.length > 0 || newFiles.length > 0) && (
              <div className="mp-edit-photos-grid">
                {editPhotos.map((url, i) => (
                  <div key={`e${i}`} className="mp-edit-photo-thumb">
                    <img src={url} alt="" onClick={() => setPhotoAgrandie(url)} />
                    <button className="mp-edit-photo-remove"
                      onClick={() => setEditPhotos(prev => prev.filter((_,j) => j !== i))}>✕</button>
                  </div>
                ))}
                {newFiles.map((f, i) => (
                  <div key={`n${i}`} className="mp-edit-photo-thumb">
                    <img src={URL.createObjectURL(f)} alt="" style={{ opacity: 0.85 }} />
                    <button className="mp-edit-photo-remove"
                      onClick={() => setNewFiles(prev => prev.filter((_,j) => j !== i))}>✕</button>
                  </div>
                ))}
              </div>
            )}
            {(editPhotos.length + newFiles.length) < 6 && (
              <label className="mp-edit-photo-add">
                + Ajouter des photos
                <input type="file" accept="image/*" multiple style={{ display:"none" }} onChange={handleNewFiles} />
              </label>
            )}
          </div>

          {editError && <div className="mp-edit-error">{editError}</div>}

          <div className="mp-edit-btns">
            <button className="mp-edit-cancel" onClick={() => setEditMode(false)}>Annuler</button>
            <button className="mp-edit-save" onClick={handleSave} disabled={saving}>
              {saving ? "⏳ Sauvegarde…" : "💾 Enregistrer"}
            </button>
          </div>
        </div>
      )}

      {/* ── Réservation ── */}
      {selected && showReservation && (
        <div className="mp-panel mp-panel-sm">
          <ReservationForm maison={selected} onClose={() => setShowReservation(false)} />
        </div>
      )}

      {/* ── Avis ── */}
      {selected && showReview && (
        <div className="mp-panel mp-panel-300">
          <ReviewForm
            maisonId={selected.id}
            onClose={() => { setShowReview(false); setSelected(null); }}
          />
        </div>
      )}
    </div>
  );
}