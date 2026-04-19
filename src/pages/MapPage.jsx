import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from "react-leaflet";
import { db, auth } from "../firebase";
import { collection, getDocs, deleteDoc, doc, updateDoc, increment, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Style tooltip nom propriétaire
const tooltipStyle = document.createElement("style");
tooltipStyle.textContent = `
  .leaflet-tooltip-nom {
    background: white;
    border: none;
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.18);
    padding: 2px 8px;
    font-size: 11px;
    font-weight: bold;
    color: #222;
    white-space: nowrap;
  }
  .leaflet-tooltip-nom::before { display: none; }
`;
if (!document.head.querySelector("#tooltip-nom-style")) {
  tooltipStyle.id = "tooltip-nom-style";
  document.head.appendChild(tooltipStyle);
}
import ReviewForm from "../components/ReviewForm";
import ErrorBoundary from "../components/ErrorBoundary";

const CLOUDINARY_CLOUD  = "dz3yafimu";
const CLOUDINARY_PRESET = "allomaison_upload";

async function uploadToCloudinary(file) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", CLOUDINARY_PRESET);
  const res  = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method: "POST", body: fd });
  const data = await res.json();
  return data.secure_url;
}

const pointVert = L.divIcon({
  className: "",
  html: '<div style="width:16px;height:16px;background:#22c55e;border-radius:50%;border:3px solid white;box-shadow:0 0 8px #22c55e"></div>',
  iconSize: [16, 16], iconAnchor: [8, 8],
});
const pointOr = L.divIcon({
  className: "",
  html: '<div style="width:20px;height:20px;background:#f59e0b;border-radius:50%;border:3px solid white;box-shadow:0 0 10px #f59e0b"></div>',
  iconSize: [20, 20], iconAnchor: [10, 10],
});

const quartiers = ["Tous", "Cotonou", "Godomey", "Cocotomey", "Abomey-Calavi"];
const types     = ["Tous", "Chambre salon", "Entree couchee", "Studio", "Maison entiere"];

// ✅ Composant interne qui force le recalcul de la carte
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }, [map]);
  return null;
}

export default function MapPage({ setEcran }) {
  const [maisons, setMaisons]       = useState([]);
  const [quartier, setQuartier]     = useState("Tous");
  const [type, setType]             = useState("Tous");
  const [selected, setSelected]     = useState(null);
  const [showReview, setShowReview] = useState(false);
  const [suppression, setSuppression] = useState(false);
  const [estProprietaire, setEstProprietaire] = useState(false);
  const [userWp, setUserWp] = useState("");

  const [photoAgrandie, setPhotoAgrandie] = useState(null);
  const [editMode, setEditMode]     = useState(false);
  const [editForm, setEditForm]     = useState({});
  const [editPhotos, setEditPhotos] = useState([]);
  const [newFiles, setNewFiles]     = useState([]);
  const [saving, setSaving]         = useState(false);
  const [editError, setEditError]   = useState("");

  const loadData = async () => {
    try {
      const snap = await getDocs(collection(db, "maisons"));
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMaisons(data);

      const uid = auth.currentUser?.uid;
      const email = auth.currentUser?.email;

      if (uid) {
        // ✅ Compte principal : propriétaire de TOUTES les maisons
        if (email === "azerty1920092034@gmail.com") {
          setEstProprietaire(true);
          return;
        }

        const userSnap = await getDoc(doc(db, "users", uid));
        const userWpVal = userSnap.exists()
          ? userSnap.data().whatsapp?.replace(/[\s\+]/g, "") || ""
          : "";
        if (userWpVal) setUserWp(userWpVal);

        const owns = data.some((m) =>
          m.proprietaireId === uid ||
          (userWpVal && (m.whatsapp || m.WhatsApp)?.replace(/[\s\+]/g, "") === userWpVal)
        );
        setEstProprietaire(owns);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadData(); }, []);

  const openEdit = (m) => {
    setEditForm({
      nom:         m.nom         || "",
      type:        m.type        || "Studio",
      quartier:    m.quartier    || "Cotonou",
      description: m.description || "",
      whatsapp:    m.whatsapp    || "",
      paiement:    m.paiement    || "Par mois",
      prix:        m.prix        || "",
    });
    const existantes = m.photos?.length ? m.photos : (m.photo ? [m.photo] : []);
    setEditPhotos(existantes);
    setNewFiles([]);
    setEditError("");
    setEditMode(true);
  };

  const handleNewFiles = (e) => {
    const files   = Array.from(e.target.files);
    const restant = 6 - editPhotos.length - newFiles.length;
    if (restant <= 0) return setEditError("❌ Maximum 6 photos atteint.");
    setNewFiles((prev) => [...prev, ...files.slice(0, restant)]);
    setEditError("");
  };

  const retirerExistante = (idx) =>
    setEditPhotos((prev) => prev.filter((_, i) => i !== idx));

  const retirerNouvelle = (idx) =>
    setNewFiles((prev) => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    setEditError("");
    if (!editForm.prix || Number(editForm.prix) <= 0)
      return setEditError("❌ Entrez un prix valide.");

    setSaving(true);
    try {
      const nouvellesURLs = await Promise.all(newFiles.map((f) => uploadToCloudinary(f)));
      const toutesPhotos  = [...editPhotos, ...nouvellesURLs];

      let videoURL = selected.video || null;
      if (editForm._removeVideo) videoURL = null;
      if (editForm._newVideo) videoURL = await uploadToCloudinary(editForm._newVideo);

      const { _removeVideo, _newVideo, ...formPropre } = editForm;

      await updateDoc(doc(db, "maisons", selected.id), {
        ...formPropre,
        photos: toutesPhotos,
        photo:  toutesPhotos[0] || null,
        video:  videoURL,
      });

      const updated = { ...selected, ...formPropre, photos: toutesPhotos, photo: toutesPhotos[0] || null, video: videoURL };
      setMaisons((prev) => prev.map((m) => m.id === selected.id ? updated : m));
      setSelected(updated);
      setEditMode(false);
    } catch (e) {
      setEditError("❌ Erreur : " + e.message);
    }
    setSaving(false);
  };

  const handleDelete = async (maisonId) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cette maison ?")) return;
    try {
      setSuppression(true);
      setSelected(null);
      setShowReview(false);
      await new Promise((r) => setTimeout(r, 300));
      await deleteDoc(doc(db, "maisons", maisonId));
      setMaisons((prev) => prev.filter((m) => m.id !== maisonId));
    } catch (e) { alert("Erreur : " + e.message); }
    finally { setSuppression(false); }
  };

  const filtrees = maisons.filter((m) => {
    const okQ = quartier === "Tous" || m.quartier === quartier;
    const okT = type === "Tous" || m.type === type;
    const okC = !isNaN(parseFloat(m.lat)) && !isNaN(parseFloat(m.lng));
    return okQ && okT && okC;
  });

  const uid = auth.currentUser?.uid;
  const email = auth.currentUser?.email;
  const isSuperOwner = email === "azerty1920092034@gmail.com";

  const isMine = selected && (
    isSuperOwner ||
    selected.proprietaireId === uid ||
    (userWp && (selected.whatsapp || selected.WhatsApp)?.replace(/[\s\+]/g, "") === userWp)
  );

  const inp = (label, key, type = "text", placeholder = "") => (
    <div style={{ marginBottom: "10px" }}>
      <p style={{ margin: "0 0 3px", fontSize: "12px", color: "#555" }}>{label}</p>
      <input type={type} value={editForm[key]} placeholder={placeholder}
        onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
        style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd",
          borderRadius: "8px", fontSize: "13px", boxSizing: "border-box" }} />
    </div>
  );

  const sel = (label, key, options) => (
    <div style={{ marginBottom: "10px" }}>
      <p style={{ margin: "0 0 3px", fontSize: "12px", color: "#555" }}>{label}</p>
      <select value={editForm[key]}
        onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
        style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd",
          borderRadius: "8px", fontSize: "13px" }}>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );

  const getPhotos = (m) => m.photos?.length ? m.photos : (m.photo ? [m.photo] : []);

  return (
    <div style={{ position: "relative", height: "100vh", width: "100%" }}>

      {suppression && (
        <div style={{ position: "absolute", inset: 0, zIndex: 2000,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(255,255,255,0.7)" }}>
          <div style={{ background: "white", padding: "30px 40px", borderRadius: "16px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)", textAlign: "center" }}>
            <p style={{ fontSize: "32px", margin: "0 0 10px" }}>🗑️</p>
            <p style={{ color: "#dc2626", fontWeight: "bold", margin: 0 }}>Suppression en cours...</p>
          </div>
        </div>
      )}

      {photoAgrandie && (
        <div onClick={() => setPhotoAgrandie(null)}
          style={{ position: "fixed", inset: 0, zIndex: 3000,
            background: "rgba(0,0,0,0.85)", display: "flex",
            alignItems: "center", justifyContent: "center", cursor: "zoom-out" }}>
          <img src={photoAgrandie} alt="agrandie"
            style={{ maxWidth: "95vw", maxHeight: "90vh",
              borderRadius: "12px", objectFit: "contain" }} />
          <button onClick={() => setPhotoAgrandie(null)}
            style={{ position: "absolute", top: "16px", right: "20px",
              background: "none", border: "none", color: "white",
              fontSize: "32px", cursor: "pointer" }}>✕</button>
        </div>
      )}

      {/* ── Barre filtres ── */}
      <div style={{ position: "absolute", top: "16px", left: "50%",
        transform: "translateX(-50%)", zIndex: 1000,
        display: "flex", gap: "10px", background: "white",
        padding: "12px 16px", borderRadius: "16px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#666" }}>Quartier</p>
          <select value={quartier} onChange={(e) => setQuartier(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }}>
            {quartiers.map((q) => <option key={q}>{q}</option>)}
          </select>
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#666" }}>Type</p>
          <select value={type} onChange={(e) => setType(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px" }}>
            {types.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <button onClick={() => setEcran("choix")}
          style={{ padding: "6px 12px", background: "#fee2e2", color: "#dc2626",
            border: "none", borderRadius: "8px", cursor: "pointer",
            fontSize: "13px", alignSelf: "flex-end" }}>
          Quitter
        </button>
      </div>

      {/* ── Carte avec meilleur TileLayer ── */}
      <ErrorBoundary>
        <MapContainer center={[6.3654, 2.4183]} zoom={13}
          style={{ height: "100%", width: "100%" }}>

          {/* ✅ MapResizer corrige la carte floue quand elle est cachée puis affichée */}
          <MapResizer />

          {/* ✅ Meilleur TileLayer : CartoDB Voyager — voies très détaillées au zoom */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a> &copy; <a href="https://carto.com">CARTO</a>'
            maxZoom={20}
          />

          {!suppression && filtrees.map((m) => {
            const estMaMaison =
              isSuperOwner ||
              m.proprietaireId === uid ||
              (userWp && (m.whatsapp || m.WhatsApp)?.replace(/[\s\+]/g, "") === userWp);
            return (
              <Marker key={m.id}
                position={[parseFloat(m.lat), parseFloat(m.lng)]}
                icon={estMaMaison ? pointOr : pointVert}
                eventHandlers={{ click: async () => {
                  setSelected(m);
                  setShowReview(false);
                  setEditMode(false);
                  try { await updateDoc(doc(db, "maisons", m.id), { vues: increment(1) }); } catch {}
                } }}>
                <Tooltip permanent direction="top" offset={[0, -10]}
                  className="leaflet-tooltip-nom" opacity={1}>
                  {m.nom || "Propriétaire"}
                </Tooltip>
              </Marker>
            );
          })}
        </MapContainer>
      </ErrorBoundary>

      {/* ── Légende ── */}
      <div style={{ position: "absolute", bottom: "20px", right: "16px", zIndex: 1000,
        background: "white", padding: "10px 14px", borderRadius: "12px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.15)", fontSize: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
          <div style={{ width: "12px", height: "12px", background: "#22c55e",
            borderRadius: "50%", border: "2px solid white" }} />
          <span>Maison disponible</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "14px", height: "14px", background: "#f59e0b",
            borderRadius: "50%", border: "2px solid white" }} />
          <span>Ma maison</span>
        </div>
      </div>

      {/* ── FICHE MAISON ── */}
      {selected && !showReview && !editMode && (
        <div style={{ position: "absolute", bottom: "20px", left: "50%",
          transform: "translateX(-50%)", zIndex: 1000,
          background: "white", borderRadius: "16px",
          width: "min(320px, 92vw)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          maxHeight: "80vh", overflowY: "auto" }}>

          <div style={{ padding: "16px 16px 0" }}>
            <button onClick={() => setSelected(null)}
              style={{ float: "right", background: "none", border: "none",
                fontSize: "20px", cursor: "pointer", color: "#999" }}>✕</button>

            <h3 style={{ margin: "0 0 4px", color: "#16a34a" }}>{selected.type}</h3>
            {isMine && (
              <span style={{ display: "inline-block", background: "#fef3c7",
                color: "#92400e", fontSize: "11px", fontWeight: "bold",
                padding: "2px 8px", borderRadius: "20px", marginBottom: "6px" }}>
                ⭐ Ma maison
              </span>
            )}
            <p style={{ margin: "0 0 4px", color: "#666", fontSize: "13px" }}>{selected.quartier}</p>
            <p style={{ margin: "0 0 6px", fontSize: "13px" }}>{selected.description}</p>
            <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: "bold", color: "#16a34a" }}>
              {Number(selected.prix).toLocaleString()} FCFA
              <span style={{ fontWeight: "normal", fontSize: "12px", color: "#888" }}> {selected.paiement}</span>
            </p>
          </div>

          {(() => {
            const photos = getPhotos(selected);
            if (!photos.length) return null;
            return (
              <div style={{ padding: "10px 16px" }}>
                <img src={photos[0]} alt="principale"
                  onClick={() => setPhotoAgrandie(photos[0])}
                  style={{ width: "100%", borderRadius: "10px",
                    marginBottom: photos.length > 1 ? "8px" : 0,
                    cursor: "zoom-in", objectFit: "cover", maxHeight: "180px" }} />
                {photos.length > 1 && (
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {photos.slice(1).map((url, i) => (
                      <img key={i} src={url} alt={`photo ${i + 2}`}
                        onClick={() => setPhotoAgrandie(url)}
                        style={{ width: "72px", height: "56px", borderRadius: "8px",
                          objectFit: "cover", cursor: "zoom-in",
                          border: "2px solid #f0fdf4" }} />
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {selected.video && (
            <div style={{ padding: "0 16px 8px" }}>
              <p style={{ margin: "0 0 6px", fontSize: "12px",
                fontWeight: "bold", color: "#7c3aed" }}>🎥 Vidéo de visite</p>
              <video src={selected.video} controls
                style={{ width: "100%", borderRadius: "10px",
                  maxHeight: "180px", background: "#000" }} />
            </div>
          )}

          <div style={{ padding: "0 16px 16px" }}>
            <a href={"https://wa.me/" + selected.whatsapp} target="_blank" rel="noreferrer"
              onClick={async () => {
                try { await updateDoc(doc(db, "maisons", selected.id), { clicsWhatsapp: increment(1) }); } catch {}
              }}
              style={{ display: "block", textAlign: "center", padding: "10px",
                background: "#25d366", color: "white", borderRadius: "10px",
                textDecoration: "none", fontWeight: "bold", marginBottom: "8px" }}>
              Contacter sur WhatsApp
            </a>

            <button onClick={() => setShowReview(true)}
              style={{ width: "100%", padding: "10px", background: "#fef3c7",
                color: "#92400e", border: "none", borderRadius: "10px",
                cursor: "pointer", fontSize: "14px", marginBottom: "8px" }}>
              Laisser un avis
            </button>

            {isMine && (
              <>
                <button onClick={() => openEdit(selected)}
                  style={{ width: "100%", padding: "10px", background: "#eff6ff",
                    color: "#1d4ed8", border: "none", borderRadius: "10px",
                    cursor: "pointer", fontSize: "14px", fontWeight: "bold",
                    marginBottom: "8px" }}>
                  ✏️ Modifier ma maison
                </button>
                <button onClick={() => handleDelete(selected.id)}
                  style={{ width: "100%", padding: "10px", background: "#fee2e2",
                    color: "#dc2626", border: "none", borderRadius: "10px",
                    cursor: "pointer", fontSize: "14px", fontWeight: "bold" }}>
                  Supprimer ma maison
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── FORMULAIRE ÉDITION ── */}
      {selected && editMode && (
        <div style={{ position: "absolute", bottom: "20px", left: "50%",
          transform: "translateX(-50%)", zIndex: 1000,
          background: "white", borderRadius: "16px",
          width: "min(340px, 94vw)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          maxHeight: "85vh", overflowY: "auto" }}>

          <div style={{ padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ margin: 0, color: "#16a34a", fontSize: "16px" }}>✏️ Modifier la maison</h3>
              <button onClick={() => setEditMode(false)}
                style={{ background: "none", border: "none",
                  fontSize: "20px", cursor: "pointer", color: "#999" }}>✕</button>
            </div>

            {inp("Votre nom", "nom", "text", "Ex: Koffi Jean")}
            {sel("Type", "type", ["Studio", "Chambre salon", "Entrée couchée", "Maison entière"])}
            {sel("Quartier", "quartier", ["Cotonou", "Godomey", "Cocotomey", "Abomey-Calavi"])}

            <div style={{ marginBottom: "10px" }}>
              <p style={{ margin: "0 0 3px", fontSize: "12px", color: "#555" }}>Description</p>
              <textarea value={editForm.description} rows={3}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd",
                  borderRadius: "8px", fontSize: "13px", boxSizing: "border-box" }} />
            </div>

            {inp("WhatsApp", "whatsapp", "text", "Ex: 22967000000")}

            <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
              <div style={{ flex: 1 }}>
                {sel("Paiement", "paiement", ["Par nuit", "Par mois", "Par année"])}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: "0 0 3px", fontSize: "12px", color: "#555" }}>Prix (FCFA)</p>
                <input type="number" value={editForm.prix}
                  onChange={(e) => setEditForm((f) => ({ ...f, prix: e.target.value }))}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd",
                    borderRadius: "8px", fontSize: "13px", boxSizing: "border-box" }} />
              </div>
            </div>

            <div style={{ marginBottom: "12px", background: "#faf5ff",
              borderRadius: "8px", padding: "10px", border: "1px solid #e9d5ff" }}>
              <p style={{ margin: "0 0 6px", fontSize: "12px",
                fontWeight: "bold", color: "#7c3aed" }}>
                🎥 Vidéo{" "}
                <span style={{ fontWeight: "normal", color: "#999", fontSize: "11px" }}>(facultatif)</span>
              </p>
              {selected.video && !editForm._removeVideo ? (
                <div>
                  <video src={selected.video} controls
                    style={{ width: "100%", borderRadius: "8px",
                      maxHeight: "140px", background: "#000", marginBottom: "6px" }} />
                  <button onClick={() => setEditForm((f) => ({ ...f, _removeVideo: true }))}
                    style={{ width: "100%", padding: "6px", background: "#fee2e2",
                      color: "#dc2626", border: "none", borderRadius: "6px",
                      fontSize: "12px", cursor: "pointer" }}>
                    🗑️ Supprimer la vidéo
                  </button>
                </div>
              ) : editForm._newVideo ? (
                <div>
                  <video src={URL.createObjectURL(editForm._newVideo)} controls
                    style={{ width: "100%", borderRadius: "8px",
                      maxHeight: "140px", background: "#000", marginBottom: "6px" }} />
                  <button onClick={() => setEditForm((f) => ({ ...f, _newVideo: null }))}
                    style={{ width: "100%", padding: "6px", background: "#fee2e2",
                      color: "#dc2626", border: "none", borderRadius: "6px",
                      fontSize: "12px", cursor: "pointer" }}>
                    🗑️ Retirer
                  </button>
                </div>
              ) : (
                <label style={{ display: "block", padding: "8px",
                  background: "white", border: "1px dashed #7c3aed",
                  borderRadius: "8px", textAlign: "center",
                  fontSize: "12px", color: "#7c3aed", cursor: "pointer" }}>
                  🎬 {editForm._removeVideo ? "Ajouter une nouvelle vidéo" : "Ajouter une vidéo"}
                  <input type="file" accept="video/*" style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files[0];
                      if (f) setEditForm((ef) => ({ ...ef, _newVideo: f, _removeVideo: false }));
                    }} />
                </label>
              )}
            </div>

            <div style={{ marginBottom: "12px" }}>
              <p style={{ margin: "0 0 6px", fontSize: "12px", color: "#555", fontWeight: "bold" }}>
                📸 Photos ({editPhotos.length + newFiles.length}/6)
              </p>

              {editPhotos.length > 0 && (
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                  {editPhotos.map((url, i) => (
                    <div key={i} style={{ position: "relative" }}>
                      <img src={url} alt={`photo ${i + 1}`}
                        onClick={() => setPhotoAgrandie(url)}
                        style={{ width: "72px", height: "60px", borderRadius: "8px",
                          objectFit: "cover", cursor: "zoom-in" }} />
                      <button onClick={() => retirerExistante(i)}
                        style={{ position: "absolute", top: "-6px", right: "-6px",
                          width: "18px", height: "18px", background: "#dc2626",
                          color: "white", border: "none", borderRadius: "50%",
                          fontSize: "11px", cursor: "pointer", padding: 0,
                          display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              {newFiles.length > 0 && (
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                  {newFiles.map((f, i) => (
                    <div key={i} style={{ position: "relative" }}>
                      <img src={URL.createObjectURL(f)} alt="nouvelle"
                        style={{ width: "72px", height: "60px", borderRadius: "8px",
                          objectFit: "cover", opacity: 0.8 }} />
                      <button onClick={() => retirerNouvelle(i)}
                        style={{ position: "absolute", top: "-6px", right: "-6px",
                          width: "18px", height: "18px", background: "#dc2626",
                          color: "white", border: "none", borderRadius: "50%",
                          fontSize: "11px", cursor: "pointer", padding: 0,
                          display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              {(editPhotos.length + newFiles.length) < 6 && (
                <>
                  <label style={{ display: "block", padding: "8px",
                    background: "#f0fdf4", border: "1px dashed #16a34a",
                    borderRadius: "8px", textAlign: "center",
                    fontSize: "12px", color: "#16a34a", cursor: "pointer" }}>
                    + Ajouter des photos
                    <input type="file" accept="image/*" multiple
                      onChange={handleNewFiles} style={{ display: "none" }} />
                  </label>
                  <p style={{ fontSize: "11px", color: "#999", margin: "4px 0 0" }}>
                    Maximum 6 photos au total
                  </p>
                </>
              )}
            </div>

            {editError && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca",
                borderRadius: "8px", padding: "8px 12px", marginBottom: "10px",
                fontSize: "12px", color: "#dc2626" }}>
                {editError}
              </div>
            )}

            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setEditMode(false)}
                style={{ flex: 1, padding: "10px", background: "#f3f4f6",
                  color: "#555", border: "none", borderRadius: "10px",
                  cursor: "pointer", fontSize: "13px" }}>
                Annuler
              </button>
              <button onClick={handleSave} disabled={saving}
                style={{ flex: 2, padding: "10px",
                  background: saving ? "#86efac" : "#16a34a",
                  color: "white", border: "none", borderRadius: "10px",
                  cursor: saving ? "not-allowed" : "pointer",
                  fontSize: "13px", fontWeight: "bold" }}>
                {saving ? "⏳ Sauvegarde..." : "💾 Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selected && showReview && (
        <div style={{ position: "absolute", bottom: "20px", left: "50%",
          transform: "translateX(-50%)", zIndex: 1000,
          background: "white", borderRadius: "16px",
          width: "300px", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
          <ReviewForm
            maisonId={selected.id}
            onClose={() => { setShowReview(false); setSelected(null); }}
          />
        </div>
      )}
    </div>
  );
}
