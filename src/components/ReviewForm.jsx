import { useState } from "react";
import { db, auth } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import "../styles/design-system.css";
import "./ReviewForm.css";

export default function ReviewForm({ maisonId, onClose }) {
  const [etoiles, setEtoiles]       = useState(0);
  const [commentaire, setCommentaire] = useState("");
  const [survol, setSurvol]         = useState(0);
  const [loading, setLoading]       = useState(false);
  const [succes, setSucces]         = useState(false);
  const [error, setError]           = useState("");

  const handleSubmit = async () => {
    if (etoiles === 0) { setError("Choisissez une note avant de publier."); return; }
    setLoading(true);
    try {
      await addDoc(collection(db, "avis"), {
        maisonId,
        userId:      auth.currentUser.uid,
        etoiles,
        commentaire,
        date:        new Date(),
      });
      setSucces(true);
    } catch (e) { setError("Erreur : " + e.message); }
    setLoading(false);
  };

  /* ── Succès ── */
  if (succes) return (
    <div className="rv-succes fade-in">
      <div className="rv-succes-icon">⭐</div>
      <h3 className="rv-succes-title">Merci pour votre avis !</h3>
      <p className="rv-succes-desc">Votre retour aide la communauté ALLOmaison.</p>
      <button className="rv-succes-btn" onClick={onClose}>Fermer</button>
    </div>
  );

  /* ── Formulaire ── */
  return (
    <div className="rv-form fade-in">

      {/* Header */}
      <div className="rv-header">
        <h3 className="rv-title">Laisser un avis</h3>
        <button className="rv-close" onClick={onClose} aria-label="Fermer">✕</button>
      </div>

      {/* Question */}
      <p className="rv-question">Cette maison existe-t-elle vraiment ?</p>

      {/* Étoiles */}
      <div className="rv-stars">
        {[1,2,3,4,5].map(i => (
          <span
            key={i}
            className={`rv-star${i <= (survol || etoiles) ? " active" : ""}`}
            style={{ color: i <= (survol || etoiles) ? "var(--amber-500)" : "var(--gray-200)" }}
            onMouseEnter={() => setSurvol(i)}
            onMouseLeave={() => setSurvol(0)}
            onClick={() => { setEtoiles(i); setError(""); }}
          >
            ★
          </span>
        ))}
      </div>

      {/* Commentaire */}
      <textarea
        className="rv-textarea"
        placeholder="Votre commentaire (optionnel)…"
        value={commentaire}
        rows={3}
        onChange={e => setCommentaire(e.target.value)}
      />

      {/* Erreur */}
      {error && (
        <div className="error-box fade-in" style={{ marginBottom: 12 }}>{error}</div>
      )}

      {/* Bouton */}
      <button className="rv-submit" onClick={handleSubmit} disabled={loading}>
        {loading ? "Envoi…" : "Publier mon avis"}
      </button>

      <button className="rv-cancel" onClick={onClose}>Annuler</button>
    </div>
  );
}