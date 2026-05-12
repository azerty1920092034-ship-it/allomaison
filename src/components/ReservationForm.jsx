import { useState } from "react";
import { db, auth } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function ReservationForm({ maison, onClose }) {
  const [form, setForm] = useState({ nom: "", telephone: "", dateVisite: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [succes, setSucces] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!form.nom.trim()) return setError("❌ Entrez votre nom.");
    if (!form.telephone.trim()) return setError("❌ Entrez votre téléphone.");
    if (!form.dateVisite) return setError("❌ Choisissez une date de visite.");
    setLoading(true);
    try {
      await addDoc(collection(db, "reservations"), {
        maisonId: maison.id,
        maisonType: maison.type,
        maisonQuartier: maison.quartier,
        maisonPrix: maison.prix,
        maisonPaiement: maison.paiement,
        proprietaireId: maison.proprietaireId,
        locataireId: auth.currentUser?.uid || null,
        locataireNom: form.nom,
        locataireTelephone: form.telephone,
        dateVisite: form.dateVisite,
        message: form.message,
        statut: "en_attente",
        dateCreation: serverTimestamp(),
        lu: false,
      });
      setSucces(true);
    } catch (e) { setError("❌ Erreur : " + e.message); }
    setLoading(false);
  };

  if (succes) return (
    <div style={{ padding: "24px", textAlign: "center" }}>
      <p style={{ fontSize: "40px", margin: "0 0 12px" }}>🎉</p>
      <h3 style={{ color: "#16a34a", margin: "0 0 8px" }}>Réservation envoyée !</h3>
      <p style={{ color: "#555", fontSize: "13px", margin: "0 0 16px" }}>
        Le propriétaire va examiner votre demande et vous contacter sur WhatsApp.
      </p>
      <button onClick={onClose}
        style={{ padding: "10px 24px", background: "#16a34a", color: "white",
          border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "14px" }}>
        Fermer
      </button>
    </div>
  );

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: "16px" }}>
        <h3 style={{ margin: 0, color: "#16a34a", fontSize: "16px" }}>📅 Réserver cette maison</h3>
        <button onClick={onClose}
          style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#999" }}>✕</button>
      </div>

      <div style={{ background: "#f0fdf4", borderRadius: "10px",
        padding: "10px 12px", marginBottom: "16px", fontSize: "13px" }}>
        <p style={{ margin: 0, color: "#16a34a", fontWeight: "bold" }}>
          {maison.type} — {maison.quartier}
        </p>
        <p style={{ margin: "2px 0 0", color: "#555" }}>
          💰 {Number(maison.prix).toLocaleString()} FCFA {maison.paiement}
        </p>
      </div>

      {[
        { label: "Votre nom complet", key: "nom", type: "text", placeholder: "Ex: Koffi Jean" },
        { label: "Numéro WhatsApp", key: "telephone", type: "tel", placeholder: "Ex: 22967000000" },
      ].map(({ label, key, type, placeholder }) => (
        <div key={key} style={{ marginBottom: "12px" }}>
          <p style={{ margin: "0 0 4px", fontSize: "12px", color: "#555" }}>
            {label} <span style={{ color: "#dc2626" }}>*</span>
          </p>
          <input type={type} placeholder={placeholder}
            value={form[key]}
            onChange={(e) => { setForm(f => ({ ...f, [key]: e.target.value })); setError(""); }}
            style={{ width: "100%", padding: "10px", border: "1px solid #ddd",
              borderRadius: "8px", fontSize: "13px", boxSizing: "border-box" }} />
        </div>
      ))}

      <div style={{ marginBottom: "12px" }}>
        <p style={{ margin: "0 0 4px", fontSize: "12px", color: "#555" }}>
          Date de visite souhaitée <span style={{ color: "#dc2626" }}>*</span>
        </p>
        <input type="date" value={form.dateVisite}
          min={new Date().toISOString().split("T")[0]}
          onChange={(e) => { setForm(f => ({ ...f, dateVisite: e.target.value })); setError(""); }}
          style={{ width: "100%", padding: "10px", border: "1px solid #ddd",
            borderRadius: "8px", fontSize: "13px", boxSizing: "border-box" }} />
      </div>

      <div style={{ marginBottom: "16px" }}>
        <p style={{ margin: "0 0 4px", fontSize: "12px", color: "#555" }}>Message (optionnel)</p>
        <textarea placeholder="Ex: Je suis disponible le matin..."
          value={form.message} rows={3}
          onChange={(e) => setForm(f => ({ ...f, message: e.target.value }))}
          style={{ width: "100%", padding: "10px", border: "1px solid #ddd",
            borderRadius: "8px", fontSize: "13px", boxSizing: "border-box" }} />
      </div>

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca",
          borderRadius: "8px", padding: "8px 12px", marginBottom: "12px",
          fontSize: "12px", color: "#dc2626" }}>{error}</div>
      )}

      <button onClick={handleSubmit} disabled={loading}
        style={{ width: "100%", padding: "12px",
          background: loading ? "#86efac" : "#16a34a",
          color: "white", border: "none", borderRadius: "10px",
          fontSize: "14px", cursor: loading ? "not-allowed" : "pointer", fontWeight: "bold" }}>
        {loading ? "⏳ Envoi..." : "📅 Envoyer ma demande"}
      </button>
    </div>
  );
}