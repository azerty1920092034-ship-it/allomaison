import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

export default function LocataireDashboard({ setEcran }) {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setLoading(false); return; }

    // Charge les réservations du locataire connecté
    const unsub = onSnapshot(
      query(collection(db, "reservations"), where("locataireId", "==", uid)),
      (snap) => {
        const data = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.dateCreation?.seconds || 0) - (a.dateCreation?.seconds || 0));
        setReservations(data);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const resaBadge = (statut) => ({
    en_attente:  { label: "⏳ En attente",   color: "#d97706", bg: "#fffbeb",
                   desc: "Le propriétaire n'a pas encore répondu." },
    acceptee:    { label: "✅ Visite acceptée", color: "#16a34a", bg: "#f0fdf4",
                   desc: "Le propriétaire a accepté votre demande de visite !" },
    refusee:     { label: "❌ Refusée",       color: "#dc2626", bg: "#fef2f2",
                   desc: "Le propriétaire n'a pas pu confirmer cette visite." },
    autre_date:  { label: "📅 Autre date proposée", color: "#7c3aed", bg: "#faf5ff",
                   desc: "Le propriétaire vous propose une autre date." },
  }[statut] || { label: statut, color: "#555", bg: "#f3f4f6", desc: "" });

  return (
    <div style={{ minHeight: "100vh", background: "#f0fdf4", padding: "20px" }}>
      <div style={{ maxWidth: "520px", margin: "0 auto" }}>

        {/* ── En-tête ── */}
        <div style={{ background: "white", borderRadius: "16px", padding: "20px 24px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.08)", marginBottom: "16px",
          display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ margin: 0, color: "#0284c7", fontSize: "18px" }}>
            📅 Mes demandes de visite
          </h2>
          <button onClick={() => setEcran("choix")}
            style={{ fontSize: "12px", padding: "6px 12px", background: "#f0f9ff",
              border: "1px solid #0284c7", borderRadius: "8px",
              color: "#0284c7", cursor: "pointer" }}>
            ← Accueil
          </button>
        </div>

        {/* ── Contenu ── */}
        {loading ? (
          <p style={{ textAlign: "center", color: "#0284c7" }}>Chargement...</p>
        ) : reservations.length === 0 ? (
          <div style={{ background: "white", borderRadius: "16px", padding: "40px 24px",
            textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
            <p style={{ fontSize: "40px", margin: "0 0 12px" }}>📅</p>
            <p style={{ color: "#555", fontSize: "15px", marginBottom: "8px" }}>
              Aucune demande de visite pour le moment.
            </p>
            <p style={{ color: "#888", fontSize: "13px", marginBottom: "20px" }}>
              Trouvez une maison sur la carte et cliquez sur "Réserver cette maison".
            </p>
            <button onClick={() => setEcran("carte")}
              style={{ padding: "10px 24px", background: "#16a34a", color: "white",
                border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "14px" }}>
              🔍 Chercher une maison
            </button>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: "13px", color: "#666", marginBottom: "12px" }}>
              {reservations.length} demande{reservations.length > 1 ? "s" : ""} de visite
            </p>

            {reservations.map((r) => {
              const badge = resaBadge(r.statut);
              return (
                <div key={r.id} style={{ background: "white", borderRadius: "14px",
                  marginBottom: "14px", padding: "16px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                  borderLeft: `4px solid ${badge.color}` }}>

                  {/* Maison */}
                  <div style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "flex-start", marginBottom: "10px" }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: "bold", fontSize: "14px" }}>
                        {r.maisonType} — {r.maisonQuartier}
                      </p>
                      <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#888" }}>
                        Demande du {r.dateCreation?.toDate?.()?.toLocaleDateString("fr-FR") || ""}
                      </p>
                    </div>
                    <span style={{ background: badge.bg, color: badge.color,
                      padding: "3px 10px", borderRadius: "20px",
                      fontSize: "11px", fontWeight: "bold", whiteSpace: "nowrap" }}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Détails de la demande */}
                  <div style={{ background: "#f9fafb", borderRadius: "8px",
                    padding: "10px 12px", marginBottom: "10px", fontSize: "13px" }}>
                    <p style={{ margin: "0 0 4px", color: "#555" }}>
                      📅 Visite souhaitée : <strong>{r.dateVisite}</strong>
                    </p>
                    {r.maisonPrix && (
                      <p style={{ margin: "0 0 4px", color: "#555" }}>
                        💰 {Number(r.maisonPrix).toLocaleString()} FCFA {r.maisonPaiement}
                      </p>
                    )}
                    {r.message && (
                      <p style={{ margin: 0, color: "#666", fontStyle: "italic" }}>
                        💬 Votre message : "{r.message}"
                      </p>
                    )}
                  </div>

                  {/* Message de statut */}
                  <div style={{ background: badge.bg, borderRadius: "8px",
                    padding: "10px 12px", marginBottom: "10px",
                    fontSize: "13px", color: badge.color }}>
                    {badge.desc}
                    {r.statut === "autre_date" && r.dateProposee && (
                      <p style={{ margin: "6px 0 0", fontWeight: "bold" }}>
                        📅 Nouvelle date proposée : {r.dateProposee}
                      </p>
                    )}
                  </div>

                  {/* Bouton WhatsApp — seulement si acceptée ou autre_date, PAS si refusée */}
                  {(r.statut === "acceptee" || r.statut === "autre_date") && r.maisonWhatsapp && (
                    <a href={`https://wa.me/${r.maisonWhatsapp}?text=Bonjour%2C%20je%20vous%20contacte%20suite%20%C3%A0%20ma%20demande%20de%20visite%20sur%20ALLOmaison%20pour%20le%20${r.maisonType}%20%C3%A0%20${r.maisonQuartier}.`}
                      target="_blank" rel="noreferrer"
                      style={{ display: "block", textAlign: "center", padding: "10px",
                        background: "#25d366", color: "white", borderRadius: "10px",
                        textDecoration: "none", fontWeight: "bold", fontSize: "14px" }}>
                      💬 Contacter le propriétaire sur WhatsApp
                    </a>
                  )}

                  {/* Message d'explication si refusée — pas de WhatsApp */}
                  {r.statut === "refusee" && (
                    <div style={{ background: "#fef2f2", borderRadius: "8px",
                      padding: "10px 12px", fontSize: "12px", color: "#dc2626",
                      textAlign: "center" }}>
                      Vous pouvez chercher une autre maison disponible sur la carte.
                      <br />
                      <button onClick={() => setEcran("carte")}
                        style={{ marginTop: "8px", padding: "6px 16px",
                          background: "#16a34a", color: "white", border: "none",
                          borderRadius: "8px", cursor: "pointer", fontSize: "12px" }}>
                        🔍 Chercher une autre maison
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}