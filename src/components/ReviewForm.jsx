import { useState } from "react";
import { db, auth } from "../firebase";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";

export default function ReviewForm({ maisonId, onClose }) {
  const [etoiles, setEtoiles] = useState(0);
  const [commentaire, setCommentaire] = useState("");
  const [survol, setSurvol] = useState(0);
  const [loading, setLoading] = useState(false);
  const [succes, setSucces] = useState(false);

  const handleSubmit = async () => {
    if (etoiles === 0) {
      alert("Veuillez choisir une note !");
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, "avis"), {
        maisonId,
        userId: auth.currentUser.uid,
        etoiles,
        commentaire,
        date: new Date()
      });
      setSucces(true);
    } catch (e) {
      alert("Erreur : " + e.message);
    }
    setLoading(false);
  };

  if (succes) return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <p style={{ fontSize: "32px" }}>⭐</p>
      <p style={{ color: "#16a34a", fontWeight: "bold" }}>Merci pour votre avis !</p>
      <button onClick={onClose}
        style={{ marginTop: "12px", padding: "8px 20px", background: "#16a34a",
          color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}>
        Fermer
      </button>
    </div>
  );

  return (
    <div style={{ padding: "20px" }}>
      <h3 style={{ color: "#16a34a", marginBottom: "16px", textAlign: "center" }}>
        Laisser un avis
      </h3>

      <p style={{ fontSize: "13px", color: "#555", marginBottom: "8px" }}>
        Cette maison existe-t-elle vraiment ?
      </p>

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", justifyContent: "center" }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i}
            onMouseEnter={() => setSurvol(i)}
            onMouseLeave={() => setSurvol(0)}
            onClick={() => setEtoiles(i)}
            style={{
              fontSize: "32px", cursor: "pointer",
              color: i <= (survol || etoiles) ? "#f59e0b" : "#ddd"
            }}>
            ★
          </span>
        ))}
      </div>

      <textarea
        placeholder="Votre commentaire (optionnel)..."
        value={commentaire}
        onChange={(e) => setCommentaire(e.target.value)}
        rows={3}
        style={{ width: "100%", padding: "10px", border: "1px solid #ddd",
          borderRadius: "8px", fontSize: "14px", boxSizing: "border-box",
          marginBottom: "16px" }}
      />

      <button onClick={handleSubmit} disabled={loading}
        style={{ width: "100%", padding: "12px",
          background: loading ? "#86efac" : "#16a34a",
          color: "white", border: "none", borderRadius: "8px",
          fontSize: "15px", cursor: loading ? "not-allowed" : "pointer" }}>
        {loading ? "Envoi..." : "Publier mon avis"}
      </button>

      <p onClick={onClose}
        style={{ textAlign: "center", marginTop: "12px", color: "#999",
          cursor: "pointer", fontSize: "13px" }}>
        Annuler
      </p>
    </div>
  );
}