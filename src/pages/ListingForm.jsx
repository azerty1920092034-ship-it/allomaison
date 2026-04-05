import { useState } from "react";
import { db, auth } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";

const CLOUDINARY_CLOUD = "dz3yafimu";
const CLOUDINARY_PRESET = "allomaison_upload";

async function uploadToCloudinary(file, type) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_PRESET);
  const res = await fetch(
    "https://api.cloudinary.com/v1_1/" + CLOUDINARY_CLOUD + "/" + type + "/upload",
    { method: "POST", body: formData }
  );
  const data = await res.json();
  return data.secure_url;
}

export default function ListingForm({ onPublished }) {
  const [form, setForm] = useState({
    nom: "", prenom: "", type: "Studio",
    quartier: "Cotonou", description: "",
    whatsapp: "", paiement: "Par mois",
    lat: "", lng: ""
  });
  const [photo, setPhoto] = useState(null);
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [succes, setSucces] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let photoURL = "";
      let videoURL = "";
      if (photo) photoURL = await uploadToCloudinary(photo, "image");
      if (video) videoURL = await uploadToCloudinary(video, "video");
      await addDoc(collection(db, "maisons"), {
        ...form,
        lat: parseFloat(form.lat),
        lng: parseFloat(form.lng),
        photo: photoURL,
        video: videoURL,
        proprietaireId: auth.currentUser.uid,
        disponible: true,
        dateAjout: new Date()
      });
     setSucces(true);
setTimeout(() => onPublished(), 2000);
    } catch (e) {
      alert("Erreur : " + e.message);
    }
    setLoading(false);
  };

  const inp = (label, name, type, placeholder) => (
    <div style={{ marginBottom: "12px" }}>
      <p style={{ margin: "0 0 4px", fontSize: "13px", color: "#555" }}>{label}</p>
      <input type={type} name={name} placeholder={placeholder}
        value={form[name]} onChange={handleChange}
        style={{ width: "100%", padding: "10px", border: "1px solid #ddd",
          borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }} />
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

  if (succes) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
      height: "100vh", background: "#f0fdf4", flexDirection: "column" }}>
      <div style={{ background: "white", padding: "40px", borderRadius: "16px",
        textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
        <p style={{ fontSize: "48px" }}>🎉</p>
        <h2 style={{ color: "#16a34a" }}>Maison ajoutée avec succès !</h2>
        <p style={{ color: "#666" }}>Votre maison est maintenant visible sur la carte.</p>
        <button onClick={() => signOut(auth)} style={{ marginTop: "16px",
          padding: "10px 24px", background: "#16a34a", color: "white",
          border: "none", borderRadius: "8px", cursor: "pointer" }}>
          Terminer
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f0fdf4",
      display: "flex", justifyContent: "center", padding: "20px" }}>
      <div style={{ background: "white", padding: "32px", borderRadius: "16px",
        width: "100%", maxWidth: "480px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.1)", height: "fit-content" }}>
        <h2 style={{ color: "#16a34a", textAlign: "center", marginBottom: "24px" }}>
          🏡 Ajouter ma maison
        </h2>

        {inp("Nom", "nom", "text", "Votre nom")}
        {inp("Prénom", "prenom", "text", "Votre prénom")}
        {sel("Type de maison", "type", ["Studio", "Chambre salon", "Entrée couchée", "Maison entière"])}
        {sel("Quartier", "quartier", ["Cotonou", "Godomey", "Cocotomey", "Abomey-Calavi"])}

        <div style={{ marginBottom: "12px" }}>
          <p style={{ margin: "0 0 4px", fontSize: "13px", color: "#555" }}>Description</p><textarea name="description" value={form.description}
            onChange={handleChange} rows={3}
            placeholder="Décrivez votre maison..."
            style={{ width: "100%", padding: "10px", border: "1px solid #ddd",
              borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }} />
        </div>

        {inp("Numéro WhatsApp", "whatsapp", "text", "Ex: 22967000000")}
        {sel("Mode de paiement", "paiement", ["Par nuit", "Par mois", "Par année"])}
<div style={{ marginBottom: "16px", background: "#f0fdf4", 
  borderRadius: "10px", padding: "12px", border: "1px solid #bbf7d0" }}>
  <p style={{ margin: "0 0 8px", fontSize: "13px", fontWeight: "bold", color: "#16a34a" }}>
    📍 Coordonnées GPS de la maison
  </p>
  <p style={{ margin: "0 0 10px", fontSize: "12px", color: "#555" }}>
    Pour trouver vos coordonnées : ouvrez <strong>Google Maps</strong>, 
    trouvez votre maison, faites un <strong>clic droit</strong> dessus 
    et copiez les deux chiffres qui apparaissent.
  </p>
  <a href="https://maps.google.com" target="_blank" rel="noreferrer"
    style={{ display: "inline-block", marginBottom: "12px", padding: "6px 12px",
      background: "#16a34a", color: "white", borderRadius: "8px",
      textDecoration: "none", fontSize: "12px" }}>
    Ouvrir Google Maps
  </a>
  <div style={{ display: "flex", gap: "10px" }}>
    <div style={{ flex: 1 }}>
      <p style={{ margin: "0 0 4px", fontSize: "13px", color: "#555" }}>Latitude</p>
      <input type="text" name="lat" placeholder="Ex: 6.3654"
        value={form.lat} onChange={handleChange}
        style={{ width: "100%", padding: "10px", border: "1px solid #ddd",
          borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }} />
    </div>
    <div style={{ flex: 1 }}>
      <p style={{ margin: "0 0 4px", fontSize: "13px", color: "#555" }}>Longitude</p>
      <input type="text" name="lng" placeholder="Ex: 2.4183"
        value={form.lng} onChange={handleChange}
        style={{ width: "100%", padding: "10px", border: "1px solid #ddd",
          borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }} />
    </div>
  </div>
</div>

        <div style={{ marginBottom: "12px" }}>
          <p style={{ margin: "0 0 4px", fontSize: "13px", color: "#555" }}>Photo de la devanture</p>
          <input type="file" accept="image/*"
            onChange={(e) => setPhoto(e.target.files[0])}
            style={{ fontSize: "13px" }} />
        </div>

        <div style={{ marginBottom: "24px" }}>
          <p style={{ margin: "0 0 4px", fontSize: "13px", color: "#555" }}>Video de la devanture</p>
          <input type="file" accept="video/*"
            onChange={(e) => setVideo(e.target.files[0])}
            style={{ fontSize: "13px" }} />
        </div>

        <button onClick={handleSubmit} disabled={loading}
          style={{ width: "100%", padding: "14px",
            background: loading ? "#86efac" : "#16a34a",
            color: "white", border: "none", borderRadius: "10px",
            fontSize: "16px", cursor: loading ? "not-allowed" : "pointer" }}>
          {loading ? "Envoi en cours..." : "Publier ma maison"}
        </button>

        <p onClick={() => signOut(auth)}
          style={{ textAlign: "center", marginTop: "16px", color: "#999",
            cursor: "pointer", fontSize: "13px" }}>
          Se deconnecter
        </p>
      </div>
    </div>
  );
}