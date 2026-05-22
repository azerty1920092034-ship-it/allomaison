import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { collection, query, where, onSnapshot, doc, getDoc,
  updateDoc, serverTimestamp } from "firebase/firestore";

export default function ProprietaireDashboard({ setEcran }) {
  const [maisons, setMaisons]           = useState([]);
  const [reservations, setReservations] = useState([]);
  const [profil, setProfil]             = useState(null);
  const [loading, setLoading]           = useState(true);
  const [confirm, setConfirm]           = useState(null);
  const [onglet, setOnglet]             = useState("maisons");
  const [autreDate, setAutreDate]       = useState({});

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    let unsubAll = null;

    getDoc(doc(db, "users", uid)).then((snap) => {
      if (!snap.exists()) { setLoading(false); return; }
      const data = snap.data();
      setProfil(data);
      const wp = data.whatsapp || "";

      let parId = [], parWp = [], reçuId = false, reçuWp = false;

      const fusionner = () => {
        if (!reçuId || !reçuWp) return;
        const tous = [...parId];
        parWp.forEach((m) => { if (!tous.find((x) => x.id === m.id)) tous.push(m); });
        setMaisons(tous);
        setLoading(false);
      };

      const unsub1 = onSnapshot(
        query(collection(db, "maisons"), where("proprietaireId", "==", uid)),
        (snap) => { parId = snap.docs.map((d) => ({ id: d.id, ...d.data() })); reçuId = true; fusionner(); }
      );

      let unsub2 = () => {};
      if (wp) {
        unsub2 = onSnapshot(
          query(collection(db, "maisons"), where("whatsapp", "==", wp)),
          (snap) => { parWp = snap.docs.map((d) => ({ id: d.id, ...d.data() })); reçuWp = true; fusionner(); }
        );
      } else { reçuWp = true; }

      // ── Double requête réservations ───────────────────────────────────────
      // Les maisons publiées par l'admin ont proprietaireId = uid admin
      // donc on cherche aussi par maisonWhatsapp pour retrouver les réservations
      let resParId = [], resParWp = [], resReçuId = false, resReçuWp = false;

      const fusionnerRes = () => {
        if (!resReçuId || !resReçuWp) return;
        const tous = [...resParId];
        resParWp.forEach((r) => { if (!tous.find((x) => x.id === r.id)) tous.push(r); });
        setReservations(tous.sort((a, b) =>
          (b.dateCreation?.seconds || 0) - (a.dateCreation?.seconds || 0)
        ));
      };

      // Requête 1 : réservations où proprietaireId == uid
      const unsubR1 = onSnapshot(
        query(collection(db, "reservations"), where("proprietaireId", "==", uid)),
        (snap) => {
          resParId = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          resReçuId = true;
          fusionnerRes();
        }
      );

      // Requête 2 : réservations où maisonWhatsapp == numéro du propriétaire
      // Capture les réservations des maisons publiées par l'admin avant inscription
      let unsubR2 = () => {};
      if (wp) {
        unsubR2 = onSnapshot(
          query(collection(db, "reservations"), where("maisonWhatsapp", "==", wp)),
          (snap) => {
            resParWp = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            resReçuWp = true;
            fusionnerRes();
          }
        );
      } else {
        resReçuWp = true;
      }

      unsubAll = () => { unsub1(); unsub2(); unsubR1(); unsubR2(); };
    });

    return () => { if (unsubAll) unsubAll(); };
  }, []);

  const nbEnAttente = reservations.filter(r => r.statut === "en_attente").length;

  const marquerLoue = async (maisonId) => {
    try {
      await updateDoc(doc(db, "maisons", maisonId), {
        disponible: false, dateLocation: serverTimestamp(),
      });
      setConfirm(null);
    } catch (e) { alert("Erreur : " + e.message); }
  };

  const marquerDisponible = async (maisonId) => {
    try {
      await updateDoc(doc(db, "maisons", maisonId), { disponible: true, dateLocation: null });
    } catch (e) { alert("Erreur : " + e.message); }
  };

  const handleReservation = async (resId, statut, dateProposee = null) => {
    try {
      const updateData = { statut, dateMaj: serverTimestamp() };
      if (dateProposee) updateData.dateProposee = dateProposee;
      await updateDoc(doc(db, "reservations", resId), updateData);
    } catch (e) { alert("Erreur : " + e.message); }
  };

  const statutBadge = (m) => {
    if (m.featured && m.featuredUntil?.toDate() > new Date())
      return { label: "⭐ En avant", color: "#d97706", bg: "#fef3c7" };
    if (!m.disponible)
      return { label: "🔴 Occupée", color: "#dc2626", bg: "#fef2f2" };
    return { label: "🟢 Disponible", color: "#16a34a", bg: "#f0fdf4" };
  };

  const resaBadge = (statut) => ({
    en_attente:  { label: "⏳ En attente",  color: "#d97706", bg: "#fffbeb" },
    acceptee:    { label: "✅ Acceptée",    color: "#16a34a", bg: "#f0fdf4" },
    refusee:     { label: "❌ Refusée",     color: "#dc2626", bg: "#fef2f2" },
    autre_date:  { label: "📅 Autre date",  color: "#7c3aed", bg: "#faf5ff" },
  }[statut] || { label: statut, color: "#555", bg: "#f3f4f6" });

  const tab = (id, label, badge = 0) => (
    <button onClick={() => setOnglet(id)}
      style={{ padding: "8px 16px", borderRadius: "10px", border: "none",
        cursor: "pointer", fontSize: "13px", fontWeight: "bold", position: "relative",
        background: onglet === id ? "#16a34a" : "#f3f4f6",
        color: onglet === id ? "white" : "#555" }}>
      {label}
      {badge > 0 && (
        <span style={{ position: "absolute", top: "-6px", right: "-6px",
          background: "#dc2626", color: "white", borderRadius: "50%",
          width: "18px", height: "18px", fontSize: "11px",
          display: "flex", alignItems: "center", justifyContent: "center" }}>
          {badge}
        </span>
      )}
    </button>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f0fdf4", padding: "20px" }}>
      <div style={{ maxWidth: "520px", margin: "0 auto" }}>

        {/* En-tête */}
        <div style={{ background: "white", borderRadius: "16px", padding: "20px 24px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.08)", marginBottom: "16px",
          display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ margin: 0, color: "#16a34a", fontSize: "18px" }}>
              🏡 Mon espace propriétaire
            </h2>
            {profil && (
              <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#666" }}>
                📱 {profil.whatsapp}
              </p>
            )}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => setEcran("carte")}
              style={{ fontSize: "12px", padding: "6px 12px", background: "#f0fdf4",
                border: "1px solid #16a34a", borderRadius: "8px",
                color: "#16a34a", cursor: "pointer" }}>
              🗺️ Carte
            </button>
            <button onClick={() => signOut(auth)}
              style={{ fontSize: "12px", padding: "6px 12px", background: "none",
                border: "1px solid #ddd", borderRadius: "8px",
                color: "#999", cursor: "pointer" }}>
              Déconnexion
            </button>
          </div>
        </div>

        {/* Onglets */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          {tab("maisons", "🏠 Mes maisons")}
          {tab("reservations", "📅 Réservations", nbEnAttente)}
        </div>

        {/* ═══ ONGLET MAISONS ═══ */}
        {onglet === "maisons" && (
          <>
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a",
              borderRadius: "12px", padding: "14px 16px", marginBottom: "16px",
              fontSize: "13px", color: "#92400e", lineHeight: "1.6" }}>
              💡 <strong>Comment ça marche ?</strong><br />
              Notre équipe publie votre première maison gratuitement.
              Vous pouvez ensuite la gérer ici et la mettre en avant pour attirer plus de locataires.
            </div>

            {loading ? (
              <p style={{ textAlign: "center", color: "#16a34a" }}>Chargement...</p>
            ) : maisons.length === 0 ? (
              <div style={{ background: "white", borderRadius: "16px", padding: "40px 24px",
                textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
                <p style={{ fontSize: "40px", margin: "0 0 12px" }}>🏠</p>
                <p style={{ color: "#555", fontSize: "15px", marginBottom: "8px" }}>
                  Aucune maison publiée pour l'instant.
                </p>
                <a href="https://wa.me/22900000000?text=Bonjour%2C%20je%20veux%20publier%20ma%20maison%20sur%20AlloMaison"
                  target="_blank" rel="noreferrer"
                  style={{ display: "inline-block", marginTop: "16px",
                    padding: "10px 24px", background: "#16a34a", color: "white",
                    borderRadius: "10px", textDecoration: "none", fontSize: "14px" }}>
                  📲 Nous contacter sur WhatsApp
                </a>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: "13px", color: "#666", marginBottom: "12px" }}>
                  {maisons.length} maison{maisons.length > 1 ? "s" : ""} publiée{maisons.length > 1 ? "s" : ""}
                </p>
                {maisons.map((m) => {
                  const badge = statutBadge(m);
                  return (
                    <div key={m.id} style={{ background: "white", borderRadius: "14px",
                      marginBottom: "14px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", overflow: "hidden" }}>
                      {m.photo ? (
                        <img src={m.photo} alt={m.type}
                          style={{ width: "100%", height: "160px", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100px", background: "#f0fdf4",
                          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px" }}>🏠</div>
                      )}
                      <div style={{ padding: "14px 16px" }}>
                        <span style={{ display: "inline-block", padding: "3px 10px",
                          background: badge.bg, color: badge.color, borderRadius: "20px",
                          fontSize: "12px", fontWeight: "bold", marginBottom: "8px" }}>
                          {badge.label}
                        </span>
                        <h3 style={{ margin: "0 0 4px", fontSize: "15px", color: "#222" }}>
                          {m.type} — {m.quartier}
                        </h3>
                        {m.prix && (
                          <p style={{ margin: "0 0 4px", fontSize: "13px", color: "#555" }}>
                            💰 {Number(m.prix).toLocaleString()} FCFA {m.paiement}
                          </p>
                        )}
                        {m.description && (
                          <p style={{ margin: "0 0 10px", fontSize: "12px", color: "#888", lineHeight: "1.5" }}>
                            {m.description}
                          </p>
                        )}

                        {m.disponible ? (
                          confirm === m.id ? (
                            <div style={{ background: "#fef2f2", border: "1px solid #fecaca",
                              borderRadius: "10px", padding: "12px", marginBottom: "10px" }}>
                              <p style={{ margin: "0 0 10px", fontSize: "13px",
                                color: "#dc2626", fontWeight: "bold" }}>🔑 Confirmer la location ?</p>
                              <div style={{ display: "flex", gap: "8px" }}>
                                <button onClick={() => setConfirm(null)}
                                  style={{ flex: 1, padding: "8px", background: "#f3f4f6",
                                    color: "#555", border: "none", borderRadius: "8px",
                                    fontSize: "13px", cursor: "pointer" }}>Annuler</button>
                                <button onClick={() => marquerLoue(m.id)}
                                  style={{ flex: 1, padding: "8px", background: "#dc2626",
                                    color: "white", border: "none", borderRadius: "8px",
                                    fontSize: "13px", cursor: "pointer", fontWeight: "bold" }}>✅ Confirmer</button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => setConfirm(m.id)}
                              style={{ width: "100%", padding: "10px", background: "#f0fdf4",
                                color: "#16a34a", border: "1px solid #bbf7d0", borderRadius: "10px",
                                fontSize: "13px", cursor: "pointer", fontWeight: "bold", marginBottom: "10px" }}>
                              🔑 Marquer comme loué
                            </button>
                          )
                        ) : (
                          <div style={{ background: "#fef2f2", border: "1px solid #fecaca",
                            borderRadius: "10px", padding: "10px 12px", marginBottom: "10px" }}>
                            <p style={{ margin: "0 0 6px", fontSize: "12px",
                              color: "#dc2626", fontWeight: "bold" }}>🔴 Maison occupée</p>
                            <button onClick={() => marquerDisponible(m.id)}
                              style={{ width: "100%", padding: "7px", background: "white",
                                color: "#16a34a", border: "1px solid #16a34a", borderRadius: "8px",
                                fontSize: "12px", cursor: "pointer" }}>
                              🟢 Remettre en disponible
                            </button>
                          </div>
                        )}

                        {!(m.featured && m.featuredUntil?.toDate() > new Date()) && (
                          <div style={{ background: "#fffbeb", border: "1px solid #fde68a",
                            borderRadius: "10px", padding: "10px 12px", marginTop: "8px" }}>
                            <p style={{ margin: "0 0 8px", fontSize: "12px", color: "#92400e" }}>
                              ⭐ Mettez votre maison en avant pour apparaître en premier.
                            </p>
                            <button onClick={() => alert("💳 Contactez-nous sur WhatsApp pour activer la mise en avant.")}
                              style={{ width: "100%", padding: "9px", background: "#d97706",
                                color: "white", border: "none", borderRadius: "8px",
                                fontSize: "13px", cursor: "pointer", fontWeight: "bold" }}>
                              ⭐ Mettre en avant — 1 000 FCFA/semaine
                            </button>
                          </div>
                        )}

                        {m.featured && m.featuredUntil?.toDate() > new Date() && (
                          <div style={{ background: "#fef3c7", borderRadius: "8px",
                            padding: "8px 12px", marginTop: "8px", fontSize: "12px", color: "#92400e" }}>
                            ⭐ En avant jusqu'au{" "}
                            <strong>{m.featuredUntil.toDate().toLocaleDateString("fr-FR")}</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ═══ ONGLET RÉSERVATIONS ═══ */}
        {onglet === "reservations" && (
          <div>
            {reservations.length === 0 ? (
              <div style={{ background: "white", borderRadius: "16px", padding: "40px 24px",
                textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
                <p style={{ fontSize: "40px", margin: "0 0 12px" }}>📅</p>
                <p style={{ color: "#555", fontSize: "15px" }}>Aucune réservation pour le moment.</p>
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
        )}
      </div>
    </div>
  );
}