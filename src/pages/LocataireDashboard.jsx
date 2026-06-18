import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import "../theme.css";

const BADGES = {
  en_attente: { label: "En attente",           color: "var(--amber-600)", bg: "var(--amber-50)",
                desc: "Le propriétaire n'a pas encore répondu." },
  acceptee:   { label: "Visite acceptée",       color: "var(--green-600)", bg: "var(--green-50)",
                desc: "Le propriétaire a accepté votre demande de visite !" },
  refusee:    { label: "Refusée",               color: "var(--red-600)",   bg: "var(--red-50)",
                desc: "Le propriétaire n'a pas pu confirmer cette visite." },
  autre_date: { label: "Autre date proposée",   color: "var(--purple-600)", bg: "var(--purple-50)",
                desc: "Le propriétaire vous propose une autre date." },
};

export default function LocataireDashboard({ setEcran }) {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setLoading(false); return; }
    const unsub = onSnapshot(
      query(collection(db, "reservations"), where("locataireId", "==", uid)),
      (snap) => {
        setReservations(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (b.dateCreation?.seconds || 0) - (a.dateCreation?.seconds || 0))
        );
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  return (
    <div className="am-page">
      <div className="am-container">

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "var(--font-size-lg)", fontWeight: 700,
              color: "var(--slate-900)", letterSpacing: "-0.02em" }}>
              Mes visites
            </h2>
            {!loading && reservations.length > 0 && (
              <p style={{ margin: "2px 0 0", fontSize: "var(--font-size-xs)", color: "var(--slate-400)" }}>
                {reservations.length} demande{reservations.length > 1 ? "s" : ""}
              </p>
            )}
          </div>
          <button className="am-btn am-btn-ghost am-btn-sm" onClick={() => setEcran("choix")}>
            ← Accueil
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="am-loading" style={{ minHeight: "50vh" }}>
            <div className="am-loading-dot" />
          </div>
        ) : reservations.length === 0 ? (
          <div className="am-card">
            <div className="am-empty">
              <div className="am-empty-icon">🗓️</div>
              <h3>Aucune demande de visite</h3>
              <p>Trouvez une maison sur la carte et cliquez sur "Réserver cette maison".</p>
              <button className="am-btn am-btn-primary"
                style={{ marginTop: 20, width: "auto", padding: "11px 28px" }}
                onClick={() => setEcran("carte")}>
                Chercher une maison
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {reservations.map((r) => {
              const badge = BADGES[r.statut] || { label: r.statut, color: "var(--slate-500)", bg: "var(--slate-100)", desc: "" };
              return (
                <div key={r.id} className="am-card"
                  style={{ padding: 0, overflow: "hidden", borderLeft: `3px solid ${badge.color}` }}>

                  {/* Top */}
                  <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid var(--slate-100)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <div>
                        <p style={{ margin: "0 0 2px", fontWeight: 600, fontSize: "var(--font-size-base)",
                          color: "var(--slate-800)" }}>
                          {r.maisonType} — {r.maisonQuartier}
                        </p>
                        <p style={{ margin: 0, fontSize: "var(--font-size-xs)", color: "var(--slate-400)" }}>
                          Demande du {r.dateCreation?.toDate?.()?.toLocaleDateString("fr-FR") || ""}
                        </p>
                      </div>
                      <span className="am-badge"
                        style={{ background: badge.bg, color: badge.color, flexShrink: 0 }}>
                        {badge.label}
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div style={{ padding: "12px 18px", background: "var(--slate-50)",
                    fontSize: "var(--font-size-sm)", color: "var(--slate-600)",
                    display: "flex", flexDirection: "column", gap: 4 }}>
                    <p style={{ margin: 0 }}>📅 Visite souhaitée : <strong>{r.dateVisite}</strong></p>
                    {r.maisonPrix && (
                      <p style={{ margin: 0 }}>💰 {Number(r.maisonPrix).toLocaleString()} FCFA {r.maisonPaiement}</p>
                    )}
                    {r.message && (
                      <p style={{ margin: 0, fontStyle: "italic", color: "var(--slate-500)" }}>
                        "{r.message}"
                      </p>
                    )}
                  </div>

                  {/* Status message */}
                  <div style={{ padding: "10px 18px", fontSize: "var(--font-size-sm)",
                    color: badge.color, background: badge.bg }}>
                    {badge.desc}
                    {r.statut === "autre_date" && r.dateProposee && (
                      <p style={{ margin: "4px 0 0", fontWeight: 600 }}>
                        📅 Nouvelle date : {r.dateProposee}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  {(r.statut === "acceptee" || r.statut === "autre_date") && r.maisonWhatsapp && (
                    <div style={{ padding: "12px 18px" }}>
                      <a href={`https://wa.me/${r.maisonWhatsapp}?text=Bonjour%2C%20je%20vous%20contacte%20suite%20%C3%A0%20ma%20demande%20de%20visite%20sur%20ALLOmaison%20pour%20le%20${r.maisonType}%20%C3%A0%20${r.maisonQuartier}.`}
                        target="_blank" rel="noreferrer"
                        className="am-btn"
                        style={{ background: "#25d366", color: "var(--white)", textDecoration: "none",
                          borderRadius: "var(--radius-sm)", padding: "10px 16px", fontSize: "var(--font-size-sm)" }}>
                        💬 Contacter le propriétaire sur WhatsApp
                      </a>
                    </div>
                  )}

                  {r.statut === "refusee" && (
                    <div style={{ padding: "12px 18px", textAlign: "center" }}>
                      <p style={{ margin: "0 0 10px", fontSize: "var(--font-size-xs)", color: "var(--slate-500)" }}>
                        Vous pouvez chercher une autre maison disponible.
                      </p>
                      <button className="am-btn am-btn-primary am-btn-sm" onClick={() => setEcran("carte")}>
                        Chercher une autre maison
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