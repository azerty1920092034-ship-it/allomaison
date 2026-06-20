import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { collection, query, where, onSnapshot, doc, getDoc,
  updateDoc, serverTimestamp } from "firebase/firestore";
import "../styles/design-system.css";
import "./ProprietaireDashboard.css";

const BADGES = {
  en_attente: { label: "En attente", color: "var(--amber-600)", bg: "var(--amber-50)"  },
  acceptee:   { label: "Acceptée",   color: "var(--green-600)", bg: "var(--green-50)"  },
  refusee:    { label: "Refusée",    color: "var(--red-600)",   bg: "var(--red-50)"    },
  autre_date: { label: "Autre date", color: "var(--purple-600)", bg: "var(--purple-50)" },
};

export default function ProprietaireDashboard({ setEcran }) {
  const [reservations, setReservations] = useState([]);
  const [profil, setProfil]             = useState(null);
  const [autreDate, setAutreDate]       = useState({});

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    let unsubAll = null;

    getDoc(doc(db, "users", uid)).then((snap) => {
      const data = snap.exists() ? snap.data() : {};
      setProfil(data);
      const wp = data.whatsapp || "";
      let resParId = [], resParWp = [], reçuId = false, reçuWp = false;

      const fusionner = () => {
        if (!reçuId || !reçuWp) return;
        const tous = [...resParId];
        resParWp.forEach(r => { if (!tous.find(x => x.id === r.id)) tous.push(r); });
        setReservations(tous.sort((a, b) => (b.dateCreation?.seconds || 0) - (a.dateCreation?.seconds || 0)));
      };

      const u1 = onSnapshot(
        query(collection(db, "reservations"), where("proprietaireId", "==", uid)),
        s => { resParId = s.docs.map(d => ({ id: d.id, ...d.data() })); reçuId = true; fusionner(); }
      );
      let u2 = () => {};
      if (wp) {
        u2 = onSnapshot(
          query(collection(db, "reservations"), where("maisonWhatsapp", "==", wp)),
          s => { resParWp = s.docs.map(d => ({ id: d.id, ...d.data() })); reçuWp = true; fusionner(); }
        );
      } else { reçuWp = true; }
      unsubAll = () => { u1(); u2(); };
    });
    return () => { if (unsubAll) unsubAll(); };
  }, []);

  const nbEnAttente = reservations.filter(r => r.statut === "en_attente").length;

  const handleReservation = async (resId, statut, dateProposee = null) => {
    try {
      const data = { statut, dateMaj: serverTimestamp() };
      if (dateProposee) data.dateProposee = dateProposee;
      await updateDoc(doc(db, "reservations", resId), data);
    } catch (e) { alert("Erreur : " + e.message); }
  };

  return (
    <div className="pd-screen">
      <div className="pd-inner">

        {/* ── Header ── */}
        <div className="pd-header">
          <div className="pd-header-left">
            <h2>Mes réservations</h2>
            {profil?.whatsapp && (
              <p className="pd-header-wp">📱 {profil.whatsapp}</p>
            )}
          </div>
          <div className="pd-header-actions">
            <button className="btn-ghost" onClick={() => setEcran("choix")}>← Accueil</button>
            <button className="btn-ghost" onClick={() => signOut(auth)}>Déconnexion</button>
          </div>
        </div>

        {/* ── Alerte ── */}
        {nbEnAttente > 0 && (
          <div className="pd-alert">
            <div className="pd-alert-icon">🔔</div>
            <p className="pd-alert-text">
              {nbEnAttente} demande{nbEnAttente > 1 ? "s" : ""} en attente de réponse
            </p>
          </div>
        )}

        {/* ── Liste ── */}
        {reservations.length === 0 ? (
          <div className="pd-empty">
            <div className="pd-empty-icon">🗓️</div>
            <h3>Aucune réservation</h3>
            <p>Les demandes de visite de vos locataires apparaîtront ici.</p>
          </div>
        ) : (
          <div className="pd-list">
            {reservations.map((r) => {
              const badge = BADGES[r.statut] || { label: r.statut, color: "var(--gray-500)", bg: "var(--gray-100)" };
              return (
                <div key={r.id} className="pd-res-card"
                  style={{ borderLeftColor: badge.color }}>

                  {/* Header carte */}
                  <div className="pd-res-head">
                    <div>
                      <p className="pd-res-type">{r.maisonType} — {r.maisonQuartier}</p>
                      <p className="pd-res-date">
                        {r.dateCreation?.toDate?.()?.toLocaleDateString("fr-FR") || ""}
                      </p>
                    </div>
                    <span className="pd-badge"
                      style={{ background: badge.bg, color: badge.color }}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Infos locataire */}
                  <div className="pd-res-info">
                    <p>👤 <strong>{r.locataireNom}</strong></p>
                    <p>📱 {r.locataireTelephone}</p>
                    <p>📅 Visite souhaitée : <strong>{r.dateVisite}</strong></p>
                    {r.message && <p className="pd-msg">"{r.message}"</p>}
                    {r.dateProposee && (
                      <p className="pd-autre-date">📅 Date proposée : {r.dateProposee}</p>
                    )}
                  </div>

                  {/* Actions si en attente */}
                  {r.statut === "en_attente" && (
                    <div className="pd-res-actions">
                      <div className="pd-action-row">
                        <button className="pd-btn-accept"
                          onClick={() => {
                            handleReservation(r.id, "acceptee");
                            window.open(
                              `https://wa.me/${r.locataireTelephone}?text=Bonjour%20${encodeURIComponent(r.locataireNom)}%20!%20Votre%20demande%20de%20visite%20est%20accept%C3%A9e.%20Rendez-vous%20le%20${r.dateVisite}.%20-%20ALLomaison`,
                              "_blank"
                            );
                          }}>
                          ✓ Accepter
                        </button>
                        <button className="pd-btn-refuse"
                          onClick={() => {
                            handleReservation(r.id, "refusee");
                            window.open(
                              `https://wa.me/${r.locataireTelephone}?text=Bonjour%20${encodeURIComponent(r.locataireNom)}%20!%20Nous%20ne%20pouvons%20pas%20confirmer%20votre%20r%C3%A9servation.%20Veuillez%20nous%20excuser.%20-%20ALLomaison`,
                              "_blank"
                            );
                          }}>
                          ✕ Refuser
                        </button>
                      </div>

                      {/* Autre date */}
                      <div className="pd-autre-date-block">
                        <p className="pd-autre-date-label">Proposer une autre date</p>
                        <div className="pd-autre-date-row">
                          <input
                            type="date"
                            className="pd-date-input"
                            min={new Date().toISOString().split("T")[0]}
                            value={autreDate[r.id] || ""}
                            onChange={e => setAutreDate(prev => ({ ...prev, [r.id]: e.target.value }))}
                          />
                          <button className="pd-btn-autre-date"
                            onClick={() => {
                              if (!autreDate[r.id]) return;
                              handleReservation(r.id, "autre_date", autreDate[r.id]);
                              window.open(
                                `https://wa.me/${r.locataireTelephone}?text=Bonjour%20${encodeURIComponent(r.locataireNom)}%20!%20Je%20vous%20propose%20plut%C3%B4t%20le%20${autreDate[r.id]}%20pour%20la%20visite.%20-%20ALLomaison`,
                                "_blank"
                              );
                              setAutreDate(prev => ({ ...prev, [r.id]: "" }));
                            }}>
                            Envoyer
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Contact WhatsApp si déjà traité */}
                  {r.statut !== "en_attente" && (
                    <div className="pd-res-contact">
                      <a href={`https://wa.me/${r.locataireTelephone}`}
                        target="_blank" rel="noreferrer"
                        className="pd-wa-link">
                        💬 Contacter sur WhatsApp
                      </a>
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