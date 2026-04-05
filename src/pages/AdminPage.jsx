import { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { signOut } from "firebase/auth";

export default function AdminPage() {
  const [maisons, setMaisons] = useState([]);
  const [users, setUsers] = useState([]);
  const [avis, setAvis] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const maisonSnap = await getDocs(collection(db, "maisons"));
      const avisSnap = await getDocs(collection(db, "avis"));
      setMaisons(maisonSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setAvis(avisSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };
    loadData();
  }, []);

  const proprietaires = [...new Set(maisons.map(m => m.proprietaireId))];

  const card = (titre, valeur, couleur, emoji) => (
    <div style={{
      background: "white", borderRadius: "16px", padding: "24px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.08)", flex: 1, minWidth: "140px",
      borderTop: "4px solid " + couleur, textAlign: "center"
    }}>
      <p style={{ fontSize: "32px", margin: "0 0 8px" }}>{emoji}</p>
      <p style={{ fontSize: "28px", fontWeight: "bold", color: couleur, margin: "0 0 4px" }}>
        {valeur}
      </p>
      <p style={{ fontSize: "13px", color: "#666", margin: 0 }}>{titre}</p>
    </div>
  );

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <p>Chargement...</p>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f0fdf4", padding: "24px" }}>

      <div style={{ maxWidth: "900px", margin: "0 auto" }}>

        <div style={{ display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: "32px" }}>
          <div>
            <h1 style={{ color: "#16a34a", margin: "0 0 4px" }}>
              🏠 ALLOmaison Admin
            </h1>
            <p style={{ color: "#666", margin: 0, fontSize: "14px" }}>
              Tableau de bord
            </p>
          </div>
          <button onClick={() => signOut(auth)}
            style={{ padding: "8px 16px", background: "#fee2e2", color: "#dc2626",
              border: "none", borderRadius: "8px", cursor: "pointer" }}>
            Se déconnecter
          </button>
        </div>

        <div style={{ display: "flex", gap: "16px", marginBottom: "32px", flexWrap: "wrap" }}>
          {card("Maisons publiées", maisons.length, "#16a34a", "🏡")}
          {card("Propriétaires", proprietaires.length, "#0284c7", "👤")}
          {card("Avis laissés", avis.length, "#f59e0b", "⭐")}
        </div>

        <div style={{ background: "white", borderRadius: "16px", padding: "24px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)", marginBottom: "24px" }}>
          <h2 style={{ color: "#16a34a", marginBottom: "16px", fontSize: "18px" }}>
            Liste des maisons publiées
          </h2>

          {maisons.length === 0 ? (
            <p style={{ color: "#999", textAlign: "center" }}>Aucune maison pour le moment</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#f0fdf4" }}>
                  <th style={{ padding: "10px", textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>Type</th>
                  <th style={{ padding: "10px", textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>Quartier</th>
                  <th style={{ padding: "10px", textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>Paiement</th>
                  <th style={{ padding: "10px", textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>WhatsApp</th>
                  <th style={{ padding: "10px", textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {maisons.map((m) => (
                  <tr key={m.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "10px" }}>{m.type}</td>
                    <td style={{ padding: "10px" }}>{m.quartier}</td>
                    <td style={{ padding: "10px" }}>{m.paiement}</td>
                    <td style={{ padding: "10px" }}>{m.whatsapp}</td>
                    <td style={{ padding: "10px" }}>
                      <span style={{
                        background: m.disponible ? "#dcfce7" : "#fee2e2",
                        color: m.disponible ? "#16a34a" : "#dc2626",
                        padding: "2px 8px", borderRadius: "20px", fontSize: "12px"
                      }}>
                        {m.disponible ? "Disponible" : "Indisponible"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ background: "white", borderRadius: "16px", padding: "24px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
          <h2 style={{ color: "#f59e0b", marginBottom: "16px", fontSize: "18px" }}>
            Derniers avis
          </h2>

          {avis.length === 0 ? (
            <p style={{ color: "#999", textAlign: "center" }}>Aucun avis pour le moment</p>
          ) : (
            avis.map((a) => (
              <div key={a.id} style={{ borderBottom: "1px solid #f3f4f6", padding: "12px 0" }}>
                <div style={{ display: "flex", gap: "4px", marginBottom: "4px" }}>
                  {[1,2,3,4,5].map(i => (
                    <span key={i} style={{ color: i <= a.etoiles ? "#f59e0b" : "#ddd" }}>★</span>
                  ))}
                </div>
                <p style={{ margin: 0, fontSize: "13px", color: "#555" }}>{a.commentaire || "Pas de commentaire"}</p>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}