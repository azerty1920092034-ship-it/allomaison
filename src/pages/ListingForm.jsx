import { useState, useEffect, useCallback } from "react";
import { db, auth } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const CLOUDINARY_CLOUD = "dz3yafimu";
const CLOUDINARY_PRESET = "allomaison_upload";

// ─── Cloudinary upload ───────────────────────────────────────────────────────
async function uploadToCloudinary(file, type) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_PRESET);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/${type}/upload`,
    { method: "POST", body: formData }
  );
  const data = await res.json();
  return data.secure_url;
}

// ─── Recentre la carte dynamiquement quand lat/lng changent ─────────────────
function MapController({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      map.flyTo([lat, lng], 17, { duration: 1.2 });
    }
  }, [lat, lng, map]);
  return null;
}

// ─── Marker déplaçable sur la carte ─────────────────────────────────────────
function PickerMarker({ onPick, position }) {
  const markerIcon = L.divIcon({
    className: "",
    html: `<div style="
      width: 22px; height: 22px;
      background: #16a34a;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 0 0 3px #16a34a55, 0 4px 12px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

  // Clic sur la carte → déplace le marker
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });

  if (!position) return null;

  return (
    <Marker
      position={position}
      icon={markerIcon}
      draggable={true}
      eventHandlers={{
        // Drag du marker → met à jour la position
        dragend(e) {
          const latlng = e.target.getLatLng();
          onPick(latlng.lat, latlng.lng);
        },
      }}
    />
  );
}

// ─── Composant principal ─────────────────────────────────────────────────────
export default function ListingForm({ onPublished }) {
  const [form, setForm] = useState({
    nom: "", type: "Studio", quartier: "Cotonou",
    description: "", whatsapp: "", paiement: "Par mois",
    prix: "", lat: null, lng: null,
  });
  const [photo, setPhoto]               = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading]           = useState(false);
  const [succes, setSucces]             = useState(false);

  // ── Localisation ────────────────────────────────────────────────────────────
  const [showMap, setShowMap]           = useState(false);
  const [coordsOk, setCoordsOk]         = useState(false);
  const [locMethod, setLocMethod]       = useState(null); // null | "adresse" | "manuel"
  const [gpsLoading, setGpsLoading]     = useState(false);
  const [adresse, setAdresse]           = useState("");
  const [rechercheAdresse, setRechercheAdresse] = useState(false);
  const [manualLat, setManualLat]       = useState("");
  const [manualLng, setManualLng]       = useState("");
  const [accuracy, setAccuracy]         = useState(null); // précision GPS en mètres

  // ── Handlers génériques ─────────────────────────────────────────────────────
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  // ── Enregistre une position et marque comme validée ──────────────────────
  const handlePick = useCallback((lat, lng) => {
    setForm((f) => ({ ...f, lat, lng }));
    setCoordsOk(true);
  }, []);

  // ── Réinitialise la localisation ─────────────────────────────────────────
  const resetLocation = () => {
    setForm((f) => ({ ...f, lat: null, lng: null }));
    setCoordsOk(false);
    setLocMethod(null);
    setAccuracy(null);
    // On garde la carte ouverte pour permettre de choisir directement
  };

  // ── GPS ──────────────────────────────────────────────────────────────────
  const handleGPS = () => {
    if (!navigator.geolocation) {
      setShowMap(true);
      return;
    }
    setGpsLoading(true);
    setShowMap(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handlePick(pos.coords.latitude, pos.coords.longitude);
        setAccuracy(Math.round(pos.coords.accuracy));
        setGpsLoading(false);
      },
      () => {
        setGpsLoading(false);
        alert("⚠️ Impossible d'obtenir votre position. Activez la localisation ou choisissez une autre méthode.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // ── Recherche par adresse (Nominatim) ────────────────────────────────────
  const handleRechercheAdresse = async () => {
    if (!adresse.trim()) return alert("Entrez une adresse !");
    setRechercheAdresse(true);
    try {
      const url =
        "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" +
        encodeURIComponent(adresse + ", Bénin");
      const res = await fetch(url, {
        headers: { "User-Agent": "AlloMaison/1.0 (contact@allomaison.bj)" },
      });
      const data = await res.json();
      if (data.length > 0) {
        handlePick(parseFloat(data[0].lat), parseFloat(data[0].lon));
        setShowMap(true);
        setLocMethod(null);
      } else {
        alert("❌ Adresse introuvable. Essayez un carrefour, un marché, ou une école à proximité.");
      }
    } catch {
      alert("Erreur réseau. Vérifiez votre connexion.");
    }
    setRechercheAdresse(false);
  };

  // ── Coordonnées manuelles ─────────────────────────────────────────────────
  const handleManuelValider = () => {
    const lat = parseFloat(manualLat.replace(",", "."));
    const lng = parseFloat(manualLng.replace(",", "."));
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return alert("❌ Coordonnées invalides.\nExemple : Latitude 6.3654 / Longitude 2.4183");
    }
    handlePick(lat, lng);
    setShowMap(true);
    setLocMethod(null);
  };

  // ── Validation et envoi ───────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.nom.trim())     return alert("❌ Entrez votre nom.");
    if (!/^\d{8,15}$/.test(form.whatsapp.trim()))
      return alert("❌ Numéro WhatsApp invalide (8 à 15 chiffres sans espaces).");
    if (!form.prix.trim())    return alert("❌ Entrez le prix.");
    if (!photo)               return alert("❌ Ajoutez une photo de la maison.");
    if (!coordsOk)            return alert("❌ Localisez votre maison sur la carte.");

    setLoading(true);
    try {
      const photoURL = await uploadToCloudinary(photo, "image");
      await addDoc(collection(db, "maisons"), {
        ...form,
        photo: photoURL,
        proprietaireId: auth.currentUser.uid,
        disponible: true,
        dateAjout: new Date(),
      });
      setSucces(true);
      setTimeout(() => onPublished(), 2000);
    } catch (e) {
      alert("Erreur : " + e.message);
    }
    setLoading(false);
  };

  // ── Helpers de rendu ──────────────────────────────────────────────────────
  const inp = (label, name, type, placeholder) => (
    <div style={{ marginBottom: "12px" }}>
      <p style={{ margin: "0 0 4px", fontSize: "13px", color: "#555" }}>{label}</p>
      <input
        type={type} name={name} placeholder={placeholder}
        value={form[name]} onChange={handleChange}
        style={{ width: "100%", padding: "10px", border: "1px solid #ddd",
          borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }}
      />
    </div>
  );

  const sel = (label, name, options) => (
    <div style={{ marginBottom: "12px" }}>
      <p style={{ margin: "0 0 4px", fontSize: "13px", color: "#555" }}>{label}</p>
      <select name={name} value={form[name]} onChange={handleChange}
        style={{ width: "100%", padding: "10px", border: "1px solid #ddd",
          borderRadius: "8px", fontSize: "14px" }}>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );

  // ── Écran de succès ───────────────────────────────────────────────────────
  if (succes) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
      height: "100vh", background: "#f0fdf4", flexDirection: "column" }}>
      <div style={{ background: "white", padding: "40px", borderRadius: "16px",
        textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
        <p style={{ fontSize: "48px" }}>🎉</p>
        <h2 style={{ color: "#16a34a" }}>Maison ajoutée avec succès !</h2>
        <p style={{ color: "#666" }}>Votre maison est maintenant visible sur la carte.</p>
        <button onClick={() => signOut(auth)}
          style={{ marginTop: "16px", padding: "10px 24px",
            background: "#16a34a", color: "white",
            border: "none", borderRadius: "8px", cursor: "pointer" }}>
          Terminer
        </button>
      </div>
    </div>
  );

  // ── Formulaire principal ──────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#f0fdf4",
      display: "flex", justifyContent: "center", padding: "20px" }}>
      <div style={{ background: "white", padding: "32px", borderRadius: "16px",
        width: "100%", maxWidth: "480px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.1)", height: "fit-content" }}>

        <h2 style={{ color: "#16a34a", textAlign: "center", marginBottom: "24px" }}>
          🏡 Ajouter ma maison
        </h2>

        {inp("Votre nom complet", "nom", "text", "Ex: Koffi Jean")}
        {sel("Type de maison", "type", ["Studio", "Chambre salon", "Entrée couchée", "Maison entière"])}
        {sel("Quartier", "quartier", ["Cotonou", "Godomey", "Cocotomey", "Abomey-Calavi"])}

        <div style={{ marginBottom: "12px" }}>
          <p style={{ margin: "0 0 4px", fontSize: "13px", color: "#555" }}>Description</p>
          <textarea name="description" value={form.description}
            onChange={handleChange} rows={3}
            placeholder="Décrivez votre maison (propre, calme, eau courante...)"
            style={{ width: "100%", padding: "10px", border: "1px solid #ddd",
              borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }} />
        </div>

        {inp("Numéro WhatsApp", "whatsapp", "text", "Ex: 22967000000")}

        <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
          <div style={{ flex: 1 }}>
            {sel("Paiement", "paiement", ["Par nuit", "Par mois", "Par année"])}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: "0 0 4px", fontSize: "13px", color: "#555" }}>Prix (FCFA)</p>
            <input type="number" name="prix" placeholder="Ex: 50000"
              value={form.prix} onChange={handleChange}
              style={{ width: "100%", padding: "10px", border: "1px solid #ddd",
                borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }} />
          </div>
        </div>

        {/* Photo */}
        <div style={{ marginBottom: "16px" }}>
          <p style={{ margin: "0 0 4px", fontSize: "13px", color: "#555" }}>
            📸 Photo de la maison <span style={{ color: "#dc2626" }}>*</span>
          </p>
          <input type="file" accept="image/*" onChange={handlePhoto}
            style={{ fontSize: "13px" }} />
          {photoPreview && (
            <img src={photoPreview} alt="preview"
              style={{ width: "100%", borderRadius: "10px", marginTop: "10px",
                maxHeight: "180px", objectFit: "cover" }} />
          )}
        </div>

        {/* ── BLOC LOCALISATION ────────────────────────────────────────────── */}
        <div style={{ marginBottom: "20px", background: "#f0fdf4",
          borderRadius: "10px", padding: "12px", border: "1px solid #bbf7d0" }}>

          <p style={{ margin: "0 0 8px", fontSize: "13px", fontWeight: "bold", color: "#16a34a" }}>
            📍 Localisation de la maison <span style={{ color: "#dc2626" }}>*</span>
          </p>

          {/* ── Position confirmée ── */}
          {coordsOk && (
            <div style={{ marginBottom: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px",
                color: "#16a34a", fontSize: "13px", marginBottom: "4px" }}>
                ✅ Position enregistrée !
                <button onClick={resetLocation}
                  style={{ fontSize: "11px", padding: "3px 8px", background: "none",
                    border: "1px solid #16a34a", borderRadius: "6px",
                    color: "#16a34a", cursor: "pointer" }}>
                  Modifier
                </button>
              </div>

              {/* Coordonnées affichées */}
              <p style={{ fontSize: "11px", color: "#666", margin: "0 0 2px" }}>
                📌 Lat : <strong>{form.lat?.toFixed(5)}</strong> &nbsp;|&nbsp;
                Lng : <strong>{form.lng?.toFixed(5)}</strong>
              </p>

              {/* Précision GPS si dispo */}
              {accuracy !== null && (
                <p style={{ fontSize: "11px", margin: "0",
                  color: accuracy < 30 ? "#16a34a" : accuracy < 100 ? "#d97706" : "#dc2626" }}>
                  {accuracy < 30
                    ? `✅ Précision GPS : ~${accuracy} m (très bonne)`
                    : accuracy < 100
                    ? `⚠️ Précision GPS : ~${accuracy} m (acceptable)`
                    : `❌ Précision GPS faible : ~${accuracy} m — ajustez sur la carte`}
                </p>
              )}

              {/* Rappel que le marker est déplaçable */}
              {showMap && (
                <p style={{ fontSize: "11px", color: "#888", margin: "6px 0 0" }}>
                  💡 Vous pouvez <strong>déplacer le point</strong> ou toucher un autre endroit sur la carte pour affiner la position.
                </p>
              )}
            </div>
          )}

          {/* ── Bouton GPS principal ── */}
          {!coordsOk && (
            <button onClick={handleGPS} disabled={gpsLoading}
              style={{ width: "100%", padding: "10px",
                background: gpsLoading ? "#86efac" : "#16a34a",
                color: "white", border: "none", borderRadius: "8px",
                fontSize: "13px", cursor: gpsLoading ? "not-allowed" : "pointer",
                marginBottom: "8px" }}>
              {gpsLoading ? "📡 Recherche de votre position..." : "📍 Utiliser ma position GPS"}
            </button>
          )}

          {/* ── Mini carte Leaflet ── */}
          {showMap && (
            <div style={{ borderRadius: "10px", overflow: "hidden",
              marginBottom: "8px", border: "2px solid #bbf7d0" }}>
              <MapContainer
                center={form.lat ? [form.lat, form.lng] : [6.3654, 2.4183]}
                zoom={form.lat ? 17 : 14}
                style={{ height: "240px", width: "100%" }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a>'
                />
                {/* Recentrage dynamique */}
                <MapController lat={form.lat} lng={form.lng} />
                {/* Marker déplaçable */}
                <PickerMarker
                  onPick={handlePick}
                  position={form.lat ? [form.lat, form.lng] : null}
                />
              </MapContainer>
              <p style={{ fontSize: "11px", color: "#888", margin: "4px 8px",
                textAlign: "center" }}>
                👆 Touchez la carte pour placer le point · Maintenez et glissez le point pour l'affiner
              </p>
            </div>
          )}

          {/* ── Options de secours ── */}
          {!coordsOk && (
            <p style={{ fontSize: "12px", color: "#888", textAlign: "center",
              margin: "8px 0 0" }}>
              Vous ne trouvez pas votre maison ?{" "}
              <span
                onClick={() => setLocMethod(locMethod === "adresse" ? null : "adresse")}
                style={{ color: "#16a34a", cursor: "pointer", textDecoration: "underline" }}>
                Chercher par adresse
              </span>
              {" "}ou{" "}
              <span
                onClick={() => setLocMethod(locMethod === "manuel" ? null : "manuel")}
                style={{ color: "#16a34a", cursor: "pointer", textDecoration: "underline" }}>
                entrer les coordonnées
              </span>
            </p>
          )}

          {/* ── Option 1 : Recherche par adresse ── */}
          {locMethod === "adresse" && (
            <div style={{ marginTop: "10px", padding: "10px", background: "white",
              borderRadius: "8px", border: "1px solid #ddd" }}>
              <p style={{ margin: "0 0 6px", fontSize: "12px", color: "#555" }}>
                Entrez un point de repère connu (carrefour, marché, école...)
              </p>
              <input
                type="text"
                placeholder="Ex: Carrefour Godomey, Cotonou"
                value={adresse}
                onChange={(e) => setAdresse(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRechercheAdresse()}
                style={{ width: "100%", padding: "8px", border: "1px solid #ddd",
                  borderRadius: "8px", fontSize: "13px", boxSizing: "border-box",
                  marginBottom: "8px" }}
              />
              <button onClick={handleRechercheAdresse} disabled={rechercheAdresse}
                style={{ width: "100%", padding: "8px", background: "#0284c7",
                  color: "white", border: "none", borderRadius: "8px",
                  fontSize: "13px", cursor: rechercheAdresse ? "not-allowed" : "pointer" }}>
                {rechercheAdresse ? "Recherche en cours..." : "🔍 Trouver sur la carte"}
              </button>
            </div>
          )}

          {/* ── Option 2 : Coordonnées manuelles ── */}
          {locMethod === "manuel" && (
            <div style={{ marginTop: "10px", padding: "10px", background: "white",
              borderRadius: "8px", border: "1px solid #ddd" }}>
              <p style={{ margin: "0 0 6px", fontSize: "12px", color: "#555" }}>
                Ouvrez <strong>Google Maps</strong>, maintenez le doigt sur votre maison,
                puis copiez les 2 chiffres qui apparaissent.
              </p>
              <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                <input
                  type="text" placeholder="Latitude (Ex: 6.3654)"
                  value={manualLat} onChange={(e) => setManualLat(e.target.value)}
                  style={{ flex: 1, padding: "8px", border: "1px solid #ddd",
                    borderRadius: "8px", fontSize: "13px" }}
                />
                <input
                  type="text" placeholder="Longitude (Ex: 2.4183)"
                  value={manualLng} onChange={(e) => setManualLng(e.target.value)}
                  style={{ flex: 1, padding: "8px", border: "1px solid #ddd",
                    borderRadius: "8px", fontSize: "13px" }}
                />
              </div>
              <button onClick={handleManuelValider}
                style={{ width: "100%", padding: "8px", background: "#7c3aed",
                  color: "white", border: "none", borderRadius: "8px",
                  fontSize: "13px", cursor: "pointer" }}>
                ✅ Valider les coordonnées
              </button>
            </div>
          )}
        </div>
        {/* ── FIN BLOC LOCALISATION ─────────────────────────────────────────── */}

        <button onClick={handleSubmit} disabled={loading}
          style={{ width: "100%", padding: "14px",
            background: loading ? "#86efac" : "#16a34a",
            color: "white", border: "none", borderRadius: "10px",
            fontSize: "16px", cursor: loading ? "not-allowed" : "pointer" }}>
          {loading ? "Envoi en cours..." : "Publier ma maison 🏡"}
        </button>

        <p onClick={() => signOut(auth)}
          style={{ textAlign: "center", marginTop: "16px", color: "#999",
            cursor: "pointer", fontSize: "13px" }}>
          Se déconnecter
        </p>
      </div>
    </div>
  );
}
