import { useState } from "react";
import { db, auth } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import "../styles/design-system.css";
import "./ReservationForm.css";

export default function ReservationForm({ maison, onClose }) {
  const [form, setForm]     = useState({ nom: "", telephone: "", dateVisite: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [succes, setSucces]   = useState(false);
  const [error, setError]     = useState("");

  const set = (key, val) => { setForm((f) => ({ ...f, [key]: val })); setError(""); };

  const handleSubmit = async () => {
    if (!form.nom.trim()) return setError("Entrez votre nom complet.");
    if (!form.telephone.trim()) return setError("Entrez votre numéro WhatsApp.");
    if (!form.dateVisite) return setError("Choisissez une date de visite.");
    setLoading(true);
    try {
      await addDoc(collection(db, "reservations"), {
        maisonId:           maison.id,
        maisonType:         maison.type,
        maisonQuartier:     maison.quartier,
        maisonPrix:         maison.prix,
        maisonPaiement:     maison.paiement,
        maisonWhatsapp:     maison.whatsapp || "",
        proprietaireId:     maison.proprietaireId || "",
        locataireId:        auth.currentUser?.uid || null,
        locataireNom:       form.nom,
        locataireTelephone: form.telephone,
        dateVisite:         form.dateVisite,
        message:            form.message,
        statut:             "en_attente",
        dateCreation:       serverTimestamp(),
        lu:                 false,
      });
      setSucces(true);
    } catch (e) { setError("Erreur : " + e.message); }
    setLoading(false);
  };

  if (succes) return (
    <div className="resa-form-succes fade-in">
      <div className="resa-succes-icon">🎉</div>
      <h3 className="resa-succes-title">Demande envoyée !</h3>
      <p className="resa-succes-desc">
        Le propriétaire va examiner votre demande et vous contacter sur WhatsApp.
      </p>
      <button className="btn-primary" onClick={onClose}>Fermer</button>
    </div>
  );

  return (
    <div className="resa-form fade-in">
      {/* Header */}
      <div className="resa-form-header">
        <h3 className="resa-form-title">Réserver cette maison</h3>
        <button className="resa-form-close" onClick={onClose} aria-label="Fermer">✕</button>
      </div>

      {/* Récap maison */}
      <div className="resa-form-maison">
        <p className="resa-form-maison-nom">{maison.type} — {maison.quartier}</p>
        <p className="resa-form-maison-prix">
          💰 {Number(maison.prix).toLocaleString()} FCFA {maison.paiement}
        </p>
      </div>

      {/* Champs */}
      <div className="resa-form-fields">
        <div>
          <label className="field-label">
            Nom complet <span style={{ color: "var(--red-500)" }}>*</span>
          </label>
          <input className="input" type="text" placeholder="Ex: Koffi Jean"
            value={form.nom} onChange={(e) => set("nom", e.target.value)} />
        </div>

        <div>
          <label className="field-label">
            Numéro WhatsApp <span style={{ color: "var(--red-500)" }}>*</span>
          </label>
          <input className="input" type="tel" placeholder="Ex: 22967000000"
            value={form.telephone} onChange={(e) => set("telephone", e.target.value)} />
        </div>

        <div>
          <label className="field-label">
            Date de visite souhaitée <span style={{ color: "var(--red-500)" }}>*</span>
          </label>
          <input className="input" type="date"
            value={form.dateVisite}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => set("dateVisite", e.target.value)} />
        </div>

        <div>
          <label className="field-label">Message (optionnel)</label>
          <textarea className="input resa-form-textarea"
            placeholder="Ex: Je suis disponible le matin…"
            value={form.message} rows={3}
            onChange={(e) => set("message", e.target.value)} />
        </div>
      </div>

      {error && (
        <div className="error-box" style={{ marginBottom: "var(--space-4)" }}>{error}</div>
      )}

      <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
        {loading ? <span className="btn-loading">●●●</span> : "Envoyer ma demande"}
      </button>
    </div>
  );
}