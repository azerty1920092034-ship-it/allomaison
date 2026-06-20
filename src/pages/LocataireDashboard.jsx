import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import "../styles/design-system.css";
import "./LocataireDashboard.css";

const BADGES = {
  en_attente: {
    label: "En attente",
    color: "var(--amber-600)", bg: "var(--amber-50)",
    desc: "Le propriétaire n'a pas encore répondu.",
  },
  acceptee: {
    label: "Visite acceptée",
    color: "var(--green-600)", bg: "var(--green-50)",
    desc: "Le propriétaire a accepté votre demande de visite !",
  },
  refusee: {
    label: "Refusée",
    color: "var(--red-600)", bg: "var(--red-50)",
    desc: "Le propriétaire n'a pas pu confirmer cette visite.",
  },
  autre_date: {
    label: "Autre date proposée",
    color: "var(--purple-600)", bg: "var(--purple-50)",
    desc: "Le propriétaire vous propose une autre date.",
  },
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
          snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (b.dateCreation?.seconds || 0) - (a.dateCreation?.seconds || 0))
        );
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  return (
    <div className="ld-screen">
      <div className="ld-inner">

        {/* ── Header ── */}
        <div className="ld-header">
          <div className="ld-header-left">
            <h2>Mes visites</h2>
            {!loading && reservations.length > 0 && (
              <p className="ld-header-count">
                {reservations.length} demande{reservations.length > 1 ? "s" : ""}
              </p>
            )}
          </div>
          <button className="btn-ghost" onClick={() => setEcran("choix")}>
            ← Accueil
          </button>
        </div>

        {/* ── Loader ── */}
        {loading ? (
          <div className="ld-loader">
            <div className="ld-loader-dot" />
            <div className="ld-loader-dot" />
            <div className="ld-loader-dot" />
          </div>

        /* ── Vide ── */
        ) : reservations.length === 0 ? (
          <div className="ld-empty">
            <div className="ld-empty-icon">🗓️</div>
            <h3>Aucune demande de visite</h3>
            <p>Trouvez une maison sur la carte et cliquez sur "Réserver cette maison".</p>
            <button className="btn-primary" style={{ width: "auto", padding: "11px 28px" }}
              onClick={() => setEcran("carte")}>
              Chercher une maison
            </button>
          </div>

        /* ── Liste ── */
        ) : (
          <div className="ld-list">
            {reservations.map((r, i) => {
              const badge = BADGES[r.statut] || {
                label: r.statut, color: "var(--gray-500)",
                bg: "var(--gray-100)", desc: "",
              };
              return (
                <div key={r.id} className="ld-res-card"
                  style={{ borderLeftColor: badge.color, animationDelay: `${i * 0.05}s` }}>

                  {/* Header carte */}
                  <div className="ld-res-head">
                    <div>
                      <p className="ld-res-type">{r.maisonType} — {r.maisonQuartier}</p>
                      <p className="ld-res-date">
                        Demande du {r.dateCreation?.toDate?.()?.toLocaleDateString("fr-FR") || ""}
                      </p>
                    </div>
                    <span className="ld-badge"
                      style={{ background: badge.bg, color: badge.color }}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Détails */}
                  <div className="ld-res-details">
                    <p>📅 Visite souhaitée : <strong>{r.dateVisite}</strong></p>
                    {r.maisonPrix && (
                      <p>💰 {Number(r.maisonPrix).toLocaleString()} FCFA {r.maisonPaiement}</p>
                    )}
                    {r.message && (
                      <p className="ld-msg">"{r.message}"</p>
                    )}
                  </div>

                  {/* Bande statut */}
                  <div className="ld-res-status"
                    style={{ background: badge.bg, color: badge.color }}>
                    {badge.desc}
                    {r.statut === "autre_date" && r.dateProposee && (
                      <p className="ld-new-date">📅 Nouvelle date : {r.dateProposee}</p>
                    )}
                  </div>

                  {/* Bouton WhatsApp si acceptée ou autre date */}
                  {(r.statut === "acceptee" || r.statut === "autre_date") && r.maisonWhatsapp && (
                    <div className="ld-res-footer">
                      <a
                        href={`https://wa.me/${r.maisonWhatsapp}?text=Bonjour%2C%20je%20vous%20contacte%20suite%20%C3%A0%20ma%20demande%20de%20visite%20sur%20ALLOmaison%20pour%20le%20${r.maisonType}%20%C3%A0%20${r.maisonQuartier}.`}
                        target="_blank" rel="noreferrer"
                        className="ld-wa-link">
                        💬 Contacter le propriétaire sur WhatsApp
                      </a>
                    </div>
                  )}

                  {/* Refusée → chercher une autre maison */}
                  {r.statut === "refusee" && (
                    <div className="ld-res-refused">
                      <p>Vous pouvez chercher une autre maison disponible.</p>
                      <button className="btn-primary"
                        style={{ width: "auto", padding: "9px 20px", fontSize: "var(--text-sm)" }}
                        onClick={() => setEcran("carte")}>
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