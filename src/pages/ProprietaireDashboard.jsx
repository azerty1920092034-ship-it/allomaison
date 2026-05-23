import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { collection, query, where, onSnapshot, doc, getDoc,
  updateDoc, serverTimestamp } from "firebase/firestore";

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

      let resParId = [], resParWp = [], resReçuId = false, resReçuWp = false;

      const fusionnerRes = () => {
        if (!resReçuId || !resReçuWp) return;
        const tous = [...resParId];
        resParWp.forEach((r) => { if (!tous.find((x) => x.id === r.id)) tous.push(r); });
        setReservations(tous.sort((a, b) =>
          (b.dateCreation?.seconds || 0) - (a.dateCreation?.seconds || 0)
        ));
      };

      const unsubR1 = onSnapshot(
        query(collection(db, "reservations"), where("proprietaireId", "==", uid)),
        (snap) => { resParId = snap.docs.map((d) => ({ id: d.id, ...d.data() })); resReçuId = true; fusionnerRes(); }
      );

      let unsubR2 = () => {};
      if (wp) {
        unsubR2 = onSnapshot(
          query(collection(db, "reservations"), where("maisonWhatsapp", "==", wp)),
          (snap) => { resParWp = snap.docs.map((d) => ({ id: d.id, ...d.data() })); resReçuWp = true; fusionnerRes(); }
        );
      } else { resReçuWp = true; }

      unsubAll = () => { unsubR1(); unsubR2(); };
    });

    return () => { if (unsubAll) unsubAll(); };
  }, []);

  const nbEnAttente = reservations.filter(r => r.statut === "en_attente").length;

  const handleReservation = async (resId, statut, dateProposee = null) => {
    try {
      const updateData = { statut, dateMaj: serverTimestamp() };
      if (dateProposee) updateData.dateProposee = dateProposee;
      await updateDoc(doc(db, "reservations", resId), updateData);
    } catch (e) { alert("Erreur : " + e.message); }
  };

  const resaBadge = (statut) => ({
    en_attente:  { label: "⏳ En attente",  color: "#d97706", bg: "#fffbeb" },
    acceptee:    { label: "✅ Acceptée",    color: "#16a34a", bg: "#f0fdf4" },
    refusee:     { label: "❌ Refusée",     color: "#dc2626", bg: "#fef2f2" },
    autre_date:  { label: "📅 Autre date",  color: "#7c3aed", bg: "#faf5ff" },
  }[statut] || { label: statut, color: "#555", bg: "#f3f4f6" });

  return (
    <div style={{ minHeight: "100vh", background: "#f0fdf4", padding: "20px" }}>
      <div style={{ maxWidth: "520px", margin: "0 auto" }}>

        {/* ── En-tête ── */}
        <div style={{ background: "white", borderRadius: "16px", padding: "20px 24px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.08)", marginBottom: "16px",
          display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ margin: 0, color: "#16a34a", fontSize: "18px" }}>
              📅 Mes réservations
            </h2>
            {profil?.whatsapp && (
              <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#666" }}>
                📱 {profil.whatsapp}
              </p>
            )}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            {/* Bouton retour vers accueil */}
            <button onClick={() => setEcran("choix")}
              style={{ fontSize: "12px", padding: "6px 12px", background: "#f0fdf4",
                border: "1px solid #16a34a", borderRadius: "8px",
                color: "#16a34a", cursor: "pointer" }}>
              ← Accueil
            </button>
            <button onClick={() => signOut(auth)}
              style={{ fontSize: "12px", padding: "6px 12px", background: "none",
                border: "1px solid #ddd", borderRadius: "8px",
                color: "#999", cursor: "pointer" }}>
              Déconnexion
            </button>
          </div>
        </div>

        {/* ── Compteur ── */}
        {nbEnAttente > 0 && (
          <div style={{ background: "#fffbeb", border: "1px solid #fde68a",
            borderRadius: "12px", padding: "12px 16px", marginBottom: "16px",
            fontSize: "13px", color: "#92400e", display: "flex",
            alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "24px" }}>🔔</span>
            <p style={{ margin: 0, fontWeight: "bold" }}>
              {nbEnAttente} demande{nbEnAttente > 1 ? "s" : ""} de visite en attente
            </p>
          </div>
        )}

        {/* ── Liste réservations ── */}
        {reservations.length === 0 ? (
          <div style={{ background: "white", borderRadius: "16px", padding: "40px 24px",
            textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
            <p style={{ fontSize: "40px", margin: "0 0 12px" }}>📅</p>
            <p style={{ color: "#555", fontSize: "15px" }}>Aucune réservation pour le moment.</p>
            <p style={{ color: "#888", fontSize: "13px", marginTop: "8px" }}>
              Les demandes de visite apparaîtront ici.
            </p>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: "13px", color: "#666", marginBottom: "12px" }}>
              {reservations.length} réservation{reservations.length > 1 ? "s" : ""}
              {nbEnAttente > 0 && (
                <span style={{ color: "#d97706", fontWeight: "bold" }}>
                  {" "}· {nbEnAttente} en attente
                </span>
              )}
            </p>

            {reservations.map((r) => {
              const badge = resaBadge(r.statut);
              return (
                <div key={r.id} style={{ background: "white", borderRadius: "14px",
                  marginBottom: "14px", padding: "16px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                  borderLeft: `4px solid ${badge.color}` }}>

                  <div style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "flex-start", marginBottom: "10px" }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: "bold", fontSize: "14px" }}>
                        {r.maisonType} — {r.maisonQuartier}
                      </p>
                      <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#888" }}>
                        {r.dateCreation?.toDate?.()?.toLocaleDateString("fr-FR") || ""}
                      </p>
                    </div>
                    <span style={{ background: badge.bg, color: badge.color,
                      padding: "3px 10px", borderRadius: "20px",
                      fontSize: "11px", fontWeight: "bold" }}>
                      {badge.label}
                    </span>
                  </div>

                  <div style={{ background: "#f9fafb", borderRadius: "8px",
                    padding: "10px 12px", marginBottom: "12px", fontSize: "13px" }}>
                    <p style={{ margin: "0 0 4px" }}>👤 <strong>{r.locataireNom}</strong></p>
                    <p style={{ margin: "0 0 4px", color: "#555" }}>📱 {r.locataireTelephone}</p>
                    <p style={{ margin: "0 0 4px", color: "#555" }}>
                      📅 Visite souhaitée : <strong>{r.dateVisite}</strong>
                    </p>
                    {r.message && (
                      <p style={{ margin: 0, color: "#666", fontStyle: "italic" }}>
                        💬 "{r.message}"
                      </p>
                    )}
                    {r.dateProposee && (
                      <p style={{ margin: "4px 0 0", color: "#7c3aed" }}>
                        📅 Date proposée : <strong>{r.dateProposee}</strong>
                      </p>
                    )}
                  </div>

                  {r.statut === "en_attente" && (
                    <div>
                      <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                        <button onClick={() => {
                          handleReservation(r.id, "acceptee");
                          window.open(`https://wa.me/${r.locataireTelephone}?text=Bonjour%20${encodeURIComponent(r.locataireNom)}%20!%20Votre%20demande%20de%20visite%20est%20accept%C3%A9e.%20Rendez-vous%20le%20${r.dateVisite}.%20-%20ALLomaison`, "_blank");
                        }}
                          style={{ flex: 1, padding: "9px", background: "#16a34a",
                            color: "white", border: "none", borderRadius: "8px",
                            cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}>
                          ✅ Accepter
                        </button>
                        <button onClick={() => {
                          handleReservation(r.id, "refusee");
                          window.open(`https://wa.me/${r.locataireTelephone}?text=Bonjour%20${encodeURIComponent(r.locataireNom)}%20!%20Nous%20ne%20pouvons%20pas%20confirmer%20votre%20r%C3%A9servation.%20Veuillez%20nous%20excuser.%20-%20ALLomaison`, "_blank");
                        }}
                          style={{ flex: 1, padding: "9px", background: "#fee2e2",
                            color: "#dc2626", border: "none", borderRadius: "8px",
                            cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}>
                          ❌ Refuser
                        </button>
                      </div>

                      <div style={{ background: "#faf5ff", borderRadius: "8px",
                        padding: "10px", border: "1px solid #e9d5ff" }}>
                        <p style={{ margin: "0 0 6px", fontSize: "12px",
                          color: "#7c3aed", fontWeight: "bold" }}>📅 Proposer une autre date</p>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <input type="date"
                            min={new Date().toISOString().split("T")[0]}
                            value={autreDate[r.id] || ""}
                            onChange={(e) => setAutreDate(prev => ({ ...prev, [r.id]: e.target.value }))}
                            style={{ flex: 1, padding: "7px", border: "1px solid #ddd",
                              borderRadius: "8px", fontSize: "12px" }} />
                          <button onClick={() => {
                            if (!autreDate[r.id]) return;
                            handleReservation(r.id, "autre_date", autreDate[r.id]);
                            window.open(`https://wa.me/${r.locataireTelephone}?text=Bonjour%20${encodeURIComponent(r.locataireNom)}%20!%20Je%20vous%20propose%20plut%C3%B4t%20le%20${autreDate[r.id]}%20pour%20la%20visite.%20-%20ALLomaison`, "_blank");
                            setAutreDate(prev => ({ ...prev, [r.id]: "" }));
                          }}
                            style={{ padding: "7px 12px", background: "#7c3aed",
                              color: "white", border: "none", borderRadius: "8px",
                              cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>
                            Envoyer
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {r.statut !== "en_attente" && (
                    <a href={`https://wa.me/${r.locataireTelephone}`}
                      target="_blank" rel="noreferrer"
                      style={{ display: "block", textAlign: "center", padding: "8px",
                        background: "#f0fdf4", color: "#16a34a", borderRadius: "8px",
                        textDecoration: "none", fontSize: "12px" }}>
                      💬 Contacter sur WhatsApp
                    </a>
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
