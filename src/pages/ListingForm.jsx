import { useState, useEffect, useCallback } from "react";
import { db, auth } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../styles/design-system.css";
import "./ListingForm.css";

const CLOUDINARY_CLOUD  = "dz3yafimu";
const CLOUDINARY_PRESET = "allomaison_upload";

async function uploadToCloudinary(file, type) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_PRESET);
  const res  = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/${type}/upload`, { method: "POST", body: formData });
  const data = await res.json();
  return data.secure_url;
}

function MapController({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) map.flyTo([lat, lng], 17, { duration: 1.2 });
  }, [lat, lng, map]);
  return null;
}

function PickerMarker({ onPick, position }) {
  const markerIcon = L.divIcon({
    className: "",
    html: `<div style="width:22px;height:22px;background:#16a34a;border-radius:50%;border:3px solid white;box-shadow:0 0 0 3px #16a34a55,0 4px 12px rgba(0,0,0,0.3);"></div>`,
    iconSize: [22, 22], iconAnchor: [11, 11],
  });
  useMapEvents({ click(e) { onPick(e.latlng.lat, e.latlng.lng); } });
  if (!position) return null;
  return (
    <Marker position={position} icon={markerIcon} draggable
      eventHandlers={{ dragend(e) { const ll = e.target.getLatLng(); onPick(ll.lat, ll.lng); } }}
    />
  );
}

export default function ListingForm({ onPublished }) {
  const [form, setForm] = useState({
    nom: "", type: "Studio", quartier: "Cotonou",
    description: "", whatsapp: "", paiement: "Par mois",
    prix: "", lat: null, lng: null,
  });
  const [photos, setPhotos]             = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [video, setVideo]               = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [succes, setSucces]             = useState(false);

  const [showMap, setShowMap]           = useState(false);
  const [coordsOk, setCoordsOk]         = useState(false);
  const [locMethod, setLocMethod]       = useState(null);
  const [gpsLoading, setGpsLoading]     = useState(false);
  const [adresse, setAdresse]           = useState("");
  const [rechercheAdresse, setRechercheAdresse] = useState(false);
  const [manualLat, setManualLat]       = useState("");
  const [manualLng, setManualLng]       = useState("");
  const [accuracy, setAccuracy]         = useState(null);
  const [gpsError, setGpsError]         = useState(null);
  const [adresseError, setAdresseError] = useState(null);
  const [manuelError, setManuelError]   = useState(null);
  const [formErrors, setFormErrors]     = useState({});

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handlePhoto = (e) => {
    const files  = Array.from(e.target.files);
    const added  = files.slice(0, 6 - photos.length);
    setPhotos([...photos, ...added]);
    setPhotoPreviews([...photoPreviews, ...added.map(f => URL.createObjectURL(f))]);
    e.target.value = "";
  };
  const removePhoto = (i) => {
    setPhotos(photos.filter((_, j) => j !== i));
    setPhotoPreviews(photoPreviews.filter((_, j) => j !== i));
  };

  const handleVideo = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      setFormErrors(fe => ({ ...fe, video: "❌ Vidéo trop lourde (max 100 Mo)." }));
      return;
    }
    setVideo(file);
    setVideoPreview(URL.createObjectURL(file));
    setFormErrors(fe => ({ ...fe, video: null }));
  };
  const removeVideo = () => { setVideo(null); setVideoPreview(null); };

  const handlePick = useCallback((lat, lng) => {
    setForm(f => ({ ...f, lat, lng }));
    setCoordsOk(true);
  }, []);

  const resetLocation = () => {
    setForm(f => ({ ...f, lat: null, lng: null }));
    setCoordsOk(false);
    setLocMethod(null);
    setAccuracy(null);
  };

  const handleGPS = () => {
    setGpsError(null);
    if (!navigator.geolocation) {
      setShowMap(true);
      setGpsError("⚠️ Géolocalisation non supportée. Utilisez une autre méthode.");
      return;
    }
    setGpsLoading(true);
    setShowMap(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const acc = Math.round(pos.coords.accuracy);
        setAccuracy(acc);
        setGpsLoading(false);
        setForm(f => ({ ...f, lat: pos.coords.latitude, lng: pos.coords.longitude }));
        if (acc <= 500) {
          setCoordsOk(true);
          setGpsError(null);
        } else {
          setCoordsOk(false);
          setGpsError(`📍 Position approximative (~${acc} m). Cliquez sur la carte pour placer le point exactement.`);
        }
      },
      (err) => {
        setGpsLoading(false);
        setGpsError(
          err.code === 1
            ? "🔒 Permission refusée. Autorisez la localisation ou choisissez une autre méthode."
            : "📡 Position introuvable. Vérifiez la localisation ou utilisez une autre méthode."
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleRechercheAdresse = async () => {
    setAdresseError(null);
    if (!adresse.trim()) { setAdresseError("⚠️ Entrez un nom de lieu avant de rechercher."); return; }
    setRechercheAdresse(true);
    try {
      const url = "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" +
        encodeURIComponent(adresse + ", Bénin");
      const res  = await fetch(url, { headers: { "User-Agent": "AlloMaison/1.0" } });
      const data = await res.json();
      if (data.length > 0) {
        handlePick(parseFloat(data[0].lat), parseFloat(data[0].lon));
        setShowMap(true);
        setLocMethod(null);
        setAdresseError(null);
      } else {
        setAdresseError("❌ Lieu introuvable. Essayez un carrefour, un marché ou une école à proximité.");
      }
    } catch { setAdresseError("❌ Erreur réseau. Vérifiez votre connexion."); }
    setRechercheAdresse(false);
  };

  const handleManuelValider = () => {
    setManuelError(null);
    const lat = parseFloat(manualLat.replace(",", "."));
    const lng = parseFloat(manualLng.replace(",", "."));
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setManuelError("❌ Coordonnées invalides. Exemple : Latitude 6.3654 / Longitude 2.4183");
      return;
    }
    handlePick(lat, lng);
    setShowMap(true);
    setLocMethod(null);
  };

  const handleSubmit = async () => {
    setFormErrors({});
    const errors = {};
    if (!form.nom.trim()) errors.nom = "❌ Entrez votre nom complet.";
    const whatsappClean = form.whatsapp.replace(/[\s\-\+]/g, "");
    if (!/^\d{8,15}$/.test(whatsappClean)) errors.whatsapp = "❌ Numéro invalide. Ex: 22967000000";
    if (!String(form.prix).trim() || Number(form.prix) <= 0) errors.prix = "❌ Entrez un prix valide.";
    if (!coordsOk) errors.loc = "❌ Localisez votre maison sur la carte.";
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setLoading(true);
    try {
      const urls = await Promise.all(photos.map(f => uploadToCloudinary(f, "image")));
      let videoURL = null;
      if (video) {
        setVideoLoading(true);
        videoURL = await uploadToCloudinary(video, "video");
        setVideoLoading(false);
      }
      await addDoc(collection(db, "maisons"), {
        ...form,
        whatsapp: whatsappClean,
        photo:  urls[0] || null,
        photos: urls,
        video:  videoURL,
        proprietaireId: auth.currentUser.uid,
        telephone: auth.currentUser.phoneNumber,
        disponible: true,
        dateAjout: new Date(),
      });
      setSucces(true);
      setTimeout(() => onPublished(), 2000);
    } catch (e) {
      setFormErrors({ global: "❌ Erreur lors de la publication : " + e.message });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    setLoading(false);
  };

  /* ── Écran succès ── */
  if (succes) return (
    <div className="lf-success">
      <div className="lf-success-card">
        <div className="lf-success-icon">🎉</div>
        <h2>Maison ajoutée !</h2>
        <p>Votre maison est maintenant visible sur la carte.</p>
        <button className="btn-primary" onClick={() => signOut(auth)}>Terminer</button>
      </div>
    </div>
  );

  /* ── Formulaire ── */
  return (
    <div className="lf-screen">
      <div className="lf-card">

        {/* En-tête */}
        <div className="lf-header">
          <div className="lf-header-icon">🏡</div>
          <h2>Ajouter ma maison</h2>
        </div>

        {/* Erreur globale */}
        {formErrors.global && (
          <div className="error-box fade-in" style={{ marginBottom: 16 }}>
            {formErrors.global}
          </div>
        )}

        {/* ── Infos générales ── */}
        <div className="lf-field">
          <label className="lf-label">Nom complet <span className="lf-label-req">*</span></label>
          <input className={`lf-input${formErrors.nom ? " error" : ""}`}
            type="text" name="nom" placeholder="Ex: Koffi Jean"
            value={form.nom}
            onChange={e => { handleChange(e); setFormErrors(fe => ({ ...fe, nom: null })); }} />
          {formErrors.nom && <p className="lf-field-error">{formErrors.nom}</p>}
        </div>

        <div className="lf-row">
          <div className="lf-field">
            <label className="lf-label">Type de maison</label>
            <select className="lf-select" name="type" value={form.type} onChange={handleChange}>
              {["Studio","Chambre salon","Entrée couchée","Maison entière"].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="lf-field">
            <label className="lf-label">Quartier</label>
            <select className="lf-select" name="quartier" value={form.quartier} onChange={handleChange}>
              {["Cotonou","Godomey","Cocotomey","Abomey-Calavi"].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        </div>

        <div className="lf-field">
          <label className="lf-label">Description</label>
          <textarea className="lf-textarea" name="description" value={form.description}
            onChange={handleChange} rows={3}
            placeholder="Décrivez votre maison (propre, calme, eau courante...)" />
        </div>

        <div className="lf-field">
          <label className="lf-label">Numéro WhatsApp <span className="lf-label-req">*</span></label>
          <input className={`lf-input${formErrors.whatsapp ? " error" : ""}`}
            type="text" name="whatsapp" placeholder="Ex: 22967000000"
            value={form.whatsapp}
            onChange={e => { handleChange(e); setFormErrors(fe => ({ ...fe, whatsapp: null })); }} />
          {formErrors.whatsapp && <p className="lf-field-error">{formErrors.whatsapp}</p>}
        </div>

        <div className="lf-row">
          <div className="lf-field">
            <label className="lf-label">Paiement</label>
            <select className="lf-select" name="paiement" value={form.paiement} onChange={handleChange}>
              {["Par nuit","Par mois","Par année"].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="lf-field">
            <label className="lf-label">Prix (FCFA) <span className="lf-label-req">*</span></label>
            <input className={`lf-input${formErrors.prix ? " error" : ""}`}
              type="number" name="prix" placeholder="Ex: 50000"
              value={form.prix}
              onChange={e => { handleChange(e); setFormErrors(fe => ({ ...fe, prix: null })); }} />
            {formErrors.prix && <p className="lf-field-error">{formErrors.prix}</p>}
          </div>
        </div>

        <div className="lf-divider" />

        {/* ── Photos ── */}
        <div className="lf-block lf-block-green">
          <p className="lf-block-title">
            📸 Photos
            <span className="lf-block-subtitle">({photos.length}/6 — facultatif)</span>
          </p>

          {photoPreviews.length > 0 && (
            <div className="lf-photos-grid">
              {photoPreviews.map((url, i) => (
                <div key={i} className="lf-photo-thumb">
                  <img src={url} alt="" />
                  <button className="lf-photo-remove" onClick={() => removePhoto(i)}>✕</button>
                </div>
              ))}
            </div>
          )}

          {photos.length < 6 && (
            <label className="lf-photo-add">
              ➕ {photos.length === 0 ? "Ajouter des photos" : "Ajouter d'autres photos"}
              <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handlePhoto} />
            </label>
          )}
        </div>

        {/* ── Vidéo ── */}
        <div className="lf-block lf-block-purple">
          <p className="lf-block-title">
            🎥 Vidéo de visite
            <span className="lf-block-subtitle">(facultatif — max 100 Mo)</span>
          </p>

          {!video ? (
            <label className="lf-video-add">
              🎬 Ajouter une vidéo de visite
              <input type="file" accept="video/*" style={{ display: "none" }} onChange={handleVideo} />
            </label>
          ) : (
            <>
              <video className="lf-video-preview" src={videoPreview} controls />
              <div className="lf-video-actions">
                <button className="lf-video-remove" onClick={removeVideo}>🗑️ Supprimer</button>
                <label className="lf-video-change">
                  🔄 Changer
                  <input type="file" accept="video/*" style={{ display: "none" }} onChange={handleVideo} />
                </label>
              </div>
              <p className="lf-video-meta">📁 {video.name} ({(video.size / (1024*1024)).toFixed(1)} Mo)</p>
            </>
          )}

          {formErrors.video && <p className="lf-field-error" style={{ marginTop: 8 }}>{formErrors.video}</p>}
        </div>

        {/* ── Localisation ── */}
        <div className="lf-block lf-block-green">
          <p className="lf-block-title">
            📍 Localisation <span className="lf-label-req">*</span>
          </p>

          {formErrors.loc && (
            <div className="lf-inline-error" style={{ marginBottom: 10 }}>{formErrors.loc}</div>
          )}

          {/* Position confirmée */}
          {coordsOk && (
            <div style={{ marginBottom: 10 }}>
              <div className="lf-loc-ok">
                ✅ Position enregistrée
                <button className="lf-loc-modify" onClick={resetLocation}>Modifier</button>
              </div>
              <p className="lf-loc-coords">
                📌 Lat : <strong>{form.lat?.toFixed(5)}</strong> &nbsp;|&nbsp;
                Lng : <strong>{form.lng?.toFixed(5)}</strong>
              </p>
              {accuracy !== null && (
                <p className="lf-loc-accuracy" style={{
                  color: accuracy < 30 ? "var(--green-600)" : accuracy < 100 ? "var(--amber-600)" : "var(--red-600)"
                }}>
                  {accuracy < 30
                    ? `✅ Précision GPS : ~${accuracy} m (très bonne)`
                    : accuracy < 100
                    ? `⚠️ Précision : ~${accuracy} m (acceptable)`
                    : `❌ Précision faible : ~${accuracy} m — ajustez sur la carte`}
                </p>
              )}
              {showMap && (
                <p className="lf-loc-hint">
                  💡 Déplacez le point ou touchez un autre endroit pour affiner.
                </p>
              )}
            </div>
          )}

          {/* Bouton GPS */}
          {!coordsOk && (
            <>
              <button className="lf-gps-btn" onClick={handleGPS} disabled={gpsLoading}>
                {gpsLoading ? "📡 Recherche de votre position…" : "📍 Utiliser ma position GPS"}
              </button>
              {gpsError && <div className="lf-inline-error">{gpsError}</div>}
            </>
          )}

          {/* Carte Leaflet */}
          {showMap && (
            <>
              <div className="lf-map-wrap" style={{ marginTop: coordsOk ? 0 : 10 }}>
                <MapContainer
                  center={form.lat ? [form.lat, form.lng] : [6.3654, 2.4183]}
                  zoom={form.lat ? 17 : 14}
                  style={{ height: "240px", width: "100%" }}
                  scrollWheelZoom
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a>'
                  />
                  <MapController lat={form.lat} lng={form.lng} />
                  <PickerMarker onPick={handlePick} position={form.lat ? [form.lat, form.lng] : null} />
                </MapContainer>
              </div>
              <p className="lf-map-hint">
                👆 Touchez la carte pour placer le point · Glissez le point pour affiner
              </p>
            </>
          )}

          {/* Options de secours */}
          {!coordsOk && (
            <p className="lf-loc-fallback">
              Pas de GPS ?{" "}
              <button onClick={() => setLocMethod(locMethod === "adresse" ? null : "adresse")}>
                Chercher par adresse
              </button>
              {" "}ou{" "}
              <button onClick={() => setLocMethod(locMethod === "manuel" ? null : "manuel")}>
                entrer les coordonnées
              </button>
            </p>
          )}

          {/* Recherche adresse */}
          {locMethod === "adresse" && (
            <div className="lf-sub-block">
              <p>Entrez un point de repère connu (carrefour, marché, école...)</p>
              <input className="lf-input" type="text"
                placeholder="Ex: Carrefour Godomey, Cotonou"
                value={adresse}
                onChange={e => setAdresse(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleRechercheAdresse()}
                style={{ marginBottom: 8 }}
              />
              <button className="lf-sub-btn-blue" onClick={handleRechercheAdresse} disabled={rechercheAdresse}>
                {rechercheAdresse ? "Recherche en cours…" : "🔍 Trouver sur la carte"}
              </button>
              {adresseError && <div className="lf-inline-error">{adresseError}</div>}
            </div>
          )}

          {/* Coordonnées manuelles */}
          {locMethod === "manuel" && (
            <div className="lf-sub-block">
              <p>
                Ouvrez <strong>Google Maps</strong>, maintenez le doigt sur votre maison,
                puis copiez les 2 chiffres qui apparaissent.
              </p>
              <div className="lf-coords-row">
                <input type="text" placeholder="Latitude (Ex: 6.3654)"
                  value={manualLat} onChange={e => setManualLat(e.target.value)} />
                <input type="text" placeholder="Longitude (Ex: 2.4183)"
                  value={manualLng} onChange={e => setManualLng(e.target.value)} />
              </div>
              <button className="lf-sub-btn-purple" onClick={handleManuelValider}>
                ✅ Valider les coordonnées
              </button>
              {manuelError && <div className="lf-inline-error">{manuelError}</div>}
            </div>
          )}
        </div>

        {/* Bouton publier */}
        <button className="lf-submit" onClick={handleSubmit} disabled={loading}>
          {videoLoading
            ? "🎥 Upload vidéo en cours…"
            : loading
            ? "⏳ Envoi en cours…"
            : "Publier ma maison 🏡"}
        </button>

        <button className="lf-signout" onClick={() => signOut(auth)}>
          Se déconnecter
        </button>

      </div>
    </div>
  );
}