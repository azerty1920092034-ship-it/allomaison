import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { collection, query, where, onSnapshot, doc, getDoc,
  updateDoc, serverTimestamp } from "firebase/firestore";
import "../theme.css";

const BADGES = {
  en_attente: { label: "En attente",    color: "var(--amber-600)", bg: "var(--amber-50)" },
  acceptee:   { label: "Acceptée",      color: "var(--green-600)", bg: "var(--green-50)" },
  refusee:    { label: "Refusée",       color: "var(--red-600)",   bg: "var(--red-50)" },
  autre_date: { label: "Autre date",    color: "var(--purple-600)", bg: "var(--purple-50)" },
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
        resParWp.forEach((r) => { if (!tous.find((x) => x.id === r.id)) tous.push(r); });
        setReservations(tous.sort((a, b) => (b.dateCreation?.seconds || 0) - (a.dateCreation?.seconds || 0)));
      };

      const u1 = onSnapshot(
        query(collection(db, "reservations"), where("proprietaireId", "==", uid)),
        (s) => { resParId = s.docs.map((d) => ({ id: d.id, ...d.data() })); reçuId = true; fusionner(); }
      );
      let u2 = () => {};
      if (wp) {
        u2 = onSnapshot(
          query(collection(db, "reservations"), where("maisonWhatsapp", "==", wp)),
          (s) => { resParWp = s.docs.map((d) => ({ id: d.id, ...d.data() })); reçuWp = true; fusionner(); }
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
    <div className="am-page">
      <div className="am-container">

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "var(--font-size-lg)", fontWeight: 700,
              color: "var(--slate-900)", letterSpacing: "-0.02em" }}>
              Mes réservations
            </h2>
            {profil?.whatsapp && (
              <p style={{ margin: "2px 0 0", fontSize: "var(--font-size-xs)", color: "var(--slate-400)" }}>
                📱 {profil.whatsapp}
              </p>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="am-btn am-btn-ghost am-btn-sm" onClick={() => setEcran("choix")}>← Accueil</button>
            <button className="am-btn am-btn-ghost am-btn-sm" onClick={() => signOut(auth)}>Déconnexion</button>
          </div>
        </div>

        {/* Alerte en attente */}
        {nbEnAttente > 0 && (
          <div style={{ background: "var(--amber-50)", border: "1.5px solid #fde68a",
            borderRadius: "var(--radius-md)", padding: "12px 16px", marginBottom: 16,
            display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: "var(--radius-sm)",
              background: "var(--amber-500)", display: "flex", alignItems: "center",
              justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 18 }}>🔔</span>
            </div>
            <p style={{ margin: 0, fontSize: "var(--font-size-sm)", color: "var(--amber-600)", fontWeight: 600 }}>
              {nbEnAttente} demande{nbEnAttente > 1 ? "s" : ""} en attente de réponse
            </p>
          </div>
        )}

        {/* Liste */}
        {reservations.length === 0 ? (
          <div className="am-card">
            <div className="am-empty">
              <div className="am-empty-icon">🗓️</div>
              <h3>Aucune réservation</h3>
              <p>Les demandes de visite de vos locataires apparaîtront ici.</p>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {reservations.map((r) => {
              const badge = BADGES[r.statut] || { label: r.statut, color: "var(--slate-500)", bg: "var(--slate-100)" };
              return (
                <div key={r.id} className="am-card"
                  style={{ padding: 0, overflow: "hidden", borderLeft: `3px solid ${badge.color}` }}>

                  {/* Header carte */}
                  <div style={{ padding: "14px 18px 12px", borderBottom: "1px solid var(--slate-100)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <div>
                        <p style={{ margin: "0 0 2px", fontWeight: 600, fontSize: "var(--font-size-base)",
                          color: "var(--slate-800)" }}>
                          {r.maisonType} — {r.maisonQuartier}
                        </p>
                        <p style={{ margin: 0, fontSize: "var(--font-size-xs)", color: "var(--slate-400)" }}>
                          {r.dateCreation?.toDate?.()?.toLocaleDateString("fr-FR") || ""}
                        </p>
                      </div>
                      <span className="am-badge" style={{ background: badge.bg, color: badge.color, flexShrink: 0 }}>
                        {badge.label}
                      </span>
                    </div>
                  </div>

                  {/* Infos locataire */}
                  <div style={{ padding: "12px 18px", background: "var(--slate-50)",
                    fontSize: "var(--font-size-sm)", color: "var(--slate-600)",
                    display: "flex", flexDirection: "column", gap: 4 }}>
                    <p style={{ margin: 0 }}>👤 <strong>{r.locataireNom}</strong></p>
                    <p style={{ margin: 0 }}>📱 {r.locataireTelephone}</p>
                    <p style={{ margin: 0 }}>📅 Visite souhaitée : <strong>{r.dateVisite}</strong></p>
                    {r.message && (
                      <p style={{ margin: 0, fontStyle: "italic", color: "var(--slate-500)" }}>"{r.message}"</p>
                    )}
                    {r.dateProposee && (
                      <p style={{ margin: 0, color: "var(--purple-600)", fontWeight: 500 }}>
                        📅 Date proposée : {r.dateProposee}
                      </p>
                    )}
                  </div>

                  {/* Actions si en_attente */}
                  {r.statut === "en_attente" && (
                    <div style={{ padding: "12px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => {
                            handleReservation(r.id, "acceptee");
                            window.open(`https://wa.me/${r.locataireTelephone}?text=Bonjour%20${encodeURIComponent(r.locataireNom)}%20!%20Votre%20demande%20de%20visite%20est%20accept%C3%A9e.%20Rendez-vous%20le%20${r.dateVisite}.%20-%20ALLomaison`, "_blank");
                          }}
                          style={{ flex: 1, padding: "10px", background: "var(--green-600)",
                            color: "var(--white)", border: "none", borderRadius: "var(--radius-sm)",
                            cursor: "pointer", fontSize: "var(--font-size-sm)", fontWeight: 600 }}>
                          ✓ Accepter
                        </button>
                        <button
                          onClick={() => {
                            handleReservation(r.id, "refusee");
                            window.open(`https://wa.me/${r.locataireTelephone}?text=Bonjour%20${encodeURIComponent(r.locataireNom)}%20!%20Nous%20ne%20pouvons%20pas%20confirmer%20votre%20r%C3%A9servation.%20Veuillez%20nous%20excuser.%20-%20ALLomaison`, "_blank");
                          }}
                          style={{ flex: 1, padding: "10px", background: "var(--red-50)",
                            color: "var(--red-600)", border: "1.5px solid #fecaca",
                            borderRadius: "var(--radius-sm)",
                            cursor: "pointer", fontSize: "var(--font-size-sm)", fontWeight: 600 }}>
                          ✕ Refuser
                        </button>
                      </div>

                      <div style={{ background: "var(--purple-50)", borderRadius: "var(--radius-sm)",
                        padding: "12px", border: "1px solid #e9d5ff" }}>
                        <p style={{ margin: "0 0 8px", fontSize: "var(--font-size-xs)",
                          color: "var(--purple-600)", fontWeight: 600 }}>
                          Proposer une autre date
                        </p>
                        <div style={{ display: "flex", gap: 8 }}>
                          <input type="date" className="am-input"
                            min={new Date().toISOString().split("T")[0]}
                            value={autreDate[r.id] || ""}
                            onChange={(e) => setAutreDate(prev => ({ ...prev, [r.id]: e.target.value }))}
                            style={{ flex: 1, padding: "8px 10px", fontSize: "var(--font-size-sm)" }} />
                          <button
                            onClick={() => {
                              if (!autreDate[r.id]) return;
                              handleReservation(r.id, "autre_date", autreDate[r.id]);
                              window.open(`https://wa.me/${r.locataireTelephone}?text=Bonjour%20${encodeURIComponent(r.locataireNom)}%20!%20Je%20vous%20propose%20plut%C3%B4t%20le%20${autreDate[r.id]}%20pour%20la%20visite.%20-%20ALLomaison`, "_blank");
                              setAutreDate(prev => ({ ...prev, [r.id]: "" }));
                            }}
                            style={{ padding: "8px 14px", background: "var(--purple-600)", color: "var(--white)",
                              border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer",
                              fontSize: "var(--font-size-sm)", fontWeight: 600, whiteSpace: "nowrap" }}>
                            Envoyer
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Contact WhatsApp si déjà traité */}
                  {r.statut !== "en_attente" && (
                    <div style={{ padding: "10px 18px" }}>
                      <a href={`https://wa.me/${r.locataireTelephone}`}
                        target="_blank" rel="noreferrer"
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                          padding: "9px", background: "var(--green-50)", color: "var(--green-700)",
                          borderRadius: "var(--radius-sm)", textDecoration: "none",
                          fontSize: "var(--font-size-sm)", fontWeight: 500 }}>
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