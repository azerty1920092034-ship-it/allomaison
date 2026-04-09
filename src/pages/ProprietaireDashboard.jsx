import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";

export default function ProprietaireDashboard() {
  const [maisons, setMaisons]   = useState([]);
  const [profil, setProfil]     = useState(null);
  const [loading, setLoading]   = useState(true);

  // ── Charge le profil et les maisons du propriétaire ──────────────────────
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    let unsubMaisons = null;

    // 1. Charge le profil pour récupérer le numéro WhatsApp
    getDoc(doc(db, "users", uid)).then((snap) => {
      if (!snap.exists()) { setLoading(false); return; }
      const data = snap.data();
      setProfil(data);

      const wp = data.whatsapp || "";

      // 2. Double requête :
      //    - maisons publiées par l'admin et liées à ce uid
      //    - maisons publiées avec ce numéro WhatsApp (avant création du compte)
      //    On fusionne les deux sans doublon.

      let parId  = [];
      let parWp  = [];
      let reçuId = false;
      let reçuWp = false;

      const fusionner = () => {
        if (!reçuId || !reçuWp) return;
        const tous = [...parId];
        parWp.forEach((m) => {
          if (!tous.find((x) => x.id === m.id)) tous.push(m);
        });
        setMaisons(tous);
        setLoading(false);
      };

      // Requête 1 : par proprietaireId
      const q1 = query(collection(db, "maisons"), where("proprietaireId", "==", uid));
      const unsub1 = onSnapshot(q1, (snap) => {
        parId = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        reçuId = true;
        fusionner();
      });

      // Requête 2 : par numéro WhatsApp (maisons publiées avant inscription)
      let unsub2 = () => {};
      if (wp) {
        const q2 = query(collection(db, "maisons"), where("whatsapp", "==", wp));
        unsub2 = onSnapshot(q2, (snap) => {
          parWp = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          reçuWp = true;
          fusionner();
        });
      } else {
        reçuWp = true; // pas de WhatsApp → on ignore cette requête
      }

      unsubMaisons = () => { unsub1(); unsub2(); };
    });

    return () => { if (unsubMaisons) unsubMaisons(); };
  }, []);

  const statutBadge = (maison) => {
    if (maison.featured && maison.featuredUntil?.toDate() > new Date()) {
      return { label: "⭐ En avant", color: "#d97706", bg: "#fef3c7" };
    }
    if (!maison.disponible) {
      return { label: "🔴 Occupée", color: "#dc2626", bg: "#fef2f2" };
    }
    return { label: "🟢 Disponible", color: "#16a34a", bg: "#f0fdf4" };
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f0fdf4", padding: "20px" }}>
      <div style={{ maxWidth: "520px", margin: "0 auto" }}>

        {/* ── En-tête ── */}
        <div style={{
          background: "white", borderRadius: "16px", padding: "20px 24px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.08)", marginBottom: "16px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
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
          <button onClick={() => signOut(auth)}
            style={{ fontSize: "12px", padding: "6px 12px", background: "none",
              border: "1px solid #ddd", borderRadius: "8px",
              color: "#999", cursor: "pointer" }}>
            Déconnexion
          </button>
        </div>

        {/* ── Bandeau info ── */}
        <div style={{
          background: "#fffbeb", border: "1px solid #fde68a",
          borderRadius: "12px", padding: "14px 16px", marginBottom: "16px",
          fontSize: "13px", color: "#92400e", lineHeight: "1.6",
        }}>
          💡 <strong>Comment ça marche ?</strong><br />
          Notre équipe publie votre première maison gratuitement.
          Vous pouvez ensuite la gérer ici et la mettre en avant
          pour attirer plus de locataires.
        </div>

        {/* ── Liste des maisons ── */}
        {loading ? (
          <p style={{ textAlign: "center", color: "#16a34a" }}>Chargement...</p>
        ) : maisons.length === 0 ? (
          <div style={{
            background: "white", borderRadius: "16px", padding: "40px 24px",
            textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
          }}>
            <p style={{ fontSize: "40px", margin: "0 0 12px" }}>🏠</p>
            <p style={{ color: "#555", fontSize: "15px", marginBottom: "8px" }}>
              Aucune maison publiée pour l'instant.
            </p>
            <p style={{ color: "#888", fontSize: "13px" }}>
              Contactez-nous sur WhatsApp pour publier votre première maison gratuitement.
            </p>
            <a
              href="https://wa.me/22900000000?text=Bonjour%2C%20je%20veux%20publier%20ma%20maison%20sur%20AlloMaison"
              target="_blank" rel="noreferrer"
              style={{
                display: "inline-block", marginTop: "16px",
                padding: "10px 24px", background: "#16a34a",
                color: "white", borderRadius: "10px",
                textDecoration: "none", fontSize: "14px",
              }}>
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
                <div key={m.id} style={{
                  background: "white", borderRadius: "14px", marginBottom: "14px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.08)", overflow: "hidden",
                }}>
                  {/* Photo */}
                  {m.photo ? (
                    <img src={m.photo} alt={m.type}
                      style={{ width: "100%", height: "160px", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100px", background: "#f0fdf4",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "32px" }}>🏠</div>
                  )}

                  <div style={{ padding: "14px 16px" }}>
                    {/* Statut badge */}
                    <span style={{
                      display: "inline-block", padding: "3px 10px",
                      background: badge.bg, color: badge.color,
                      borderRadius: "20px", fontSize: "12px",
                      fontWeight: "bold", marginBottom: "8px",
                    }}>
                      {badge.label}
                    </span>

                    <h3 style={{ margin: "0 0 4px", fontSize: "15px", color: "#222" }}>
                      {m.type} — {m.quartier}
                    </h3>
                    <p style={{ margin: "0 0 4px", fontSize: "13px", color: "#555" }}>
                      💰 {Number(m.prix).toLocaleString()} FCFA {m.paiement}
                    </p>
                    {m.description && (
                      <p style={{ margin: "0 0 10px", fontSize: "12px", color: "#888",
                        lineHeight: "1.5" }}>
                        {m.description}
                      </p>
                    )}

                    {/* Bouton mise en avant */}
                    {!(m.featured && m.featuredUntil?.toDate() > new Date()) && (
                      <div style={{
                        background: "#fffbeb", border: "1px solid #fde68a",
                        borderRadius: "10px", padding: "10px 12px", marginTop: "8px",
                      }}>
                        <p style={{ margin: "0 0 8px", fontSize: "12px", color: "#92400e" }}>
                          ⭐ Mettez votre maison en avant pour apparaître en premier
                          et recevoir plus d'appels de locataires.
                        </p>
                        <button
                          onClick={() => alert("💳 Paiement bientôt disponible !\nContactez-nous sur WhatsApp pour activer la mise en avant.")}
                          style={{
                            width: "100%", padding: "9px",
                            background: "#d97706", color: "white",
                            border: "none", borderRadius: "8px",
                            fontSize: "13px", cursor: "pointer", fontWeight: "bold",
                          }}>
                          ⭐ Mettre en avant — 1 000 FCFA/semaine
                        </button>
                      </div>
                    )}

                    {/* Mise en avant active */}
                    {m.featured && m.featuredUntil?.toDate() > new Date() && (
                      <div style={{
                        background: "#fef3c7", borderRadius: "8px",
                        padding: "8px 12px", marginTop: "8px",
                        fontSize: "12px", color: "#92400e",
                      }}>
                        ⭐ En avant jusqu'au{" "}
                        <strong>
                          {m.featuredUntil.toDate().toLocaleDateString("fr-FR")}
                        </strong>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}