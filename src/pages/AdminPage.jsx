import { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { collection, getDocs, doc, updateDoc, deleteDoc,
  query, orderBy, onSnapshot } from "firebase/firestore";
import { signOut } from "firebase/auth";

export default function AdminPage() {
  const [maisons, setMaisons]           = useState([]);
  const [avis, setAvis]                 = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [onglet, setOnglet]             = useState("stats");
  const [recherche, setRecherche]       = useState("");

  useEffect(() => {
    // Maisons et avis — chargement une fois
    const loadStatic = async () => {
      const [maisonSnap, avisSnap] = await Promise.all([
        getDocs(collection(db, "maisons")),
        getDocs(collection(db, "avis")),
      ]);
      setMaisons(maisonSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setAvis(avisSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };
    loadStatic();

    // Réservations — temps réel avec onSnapshot
    const unsubResa = onSnapshot(
      query(collection(db, "reservations"), orderBy("dateCreation", "desc")),
      (snap) => {
        setReservations(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );
    return () => unsubResa();
  }, []);

  // ── Compteurs ──────────────────────────────────────────────────────────────
  const totalVues         = maisons.reduce((s, m) => s + (m.vues || 0), 0);
  const totalWhatsapp     = maisons.reduce((s, m) => s + (m.clicsWhatsapp || 0), 0);
  const proprietaires     = [...new Set(maisons.map((m) => m.proprietaireId))].length;
  const totalLouees       = maisons.filter((m) => !m.disponible).length;
  const resaEnAttente     = reservations.filter(r => r.statut === "en_attente").length;
  const resaAcceptees     = reservations.filter(r => r.statut === "acceptee").length;
  const resaAujourdhui    = reservations.filter(r => {
    try {
      const d = r.dateCreation?.toDate();
      const auj = new Date();
      return d && d.toDateString() === auj.toDateString();
    } catch { return false; }
  }).length;

  const locationParMois = maisons
    .filter((m) => !m.disponible && m.dateLocation)
    .reduce((acc, m) => {
      try {
        const date = m.dateLocation.toDate();
        const cle  = date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
        acc[cle] = (acc[cle] || 0) + 1;
      } catch {}
      return acc;
    }, {});

  const maisonsFiltrees = maisons.filter((m) =>
    !recherche ||
    m.type?.toLowerCase().includes(recherche.toLowerCase()) ||
    m.quartier?.toLowerCase().includes(recherche.toLowerCase()) ||
    m.whatsapp?.includes(recherche) ||
    m.nom?.toLowerCase().includes(recherche.toLowerCase())
  );

  const topMaisons = [...maisons].sort((a, b) => (b.vues || 0) - (a.vues || 0)).slice(0, 5);

  const handleDisponibilite = async (m) => {
    await updateDoc(doc(db, "maisons", m.id), { disponible: !m.disponible });
    setMaisons((prev) => prev.map((x) => x.id === m.id ? { ...x, disponible: !x.disponible } : x));
  };

  const handleSupprimer = async (id) => {
    if (!window.confirm("Supprimer cette maison ?")) return;
    await deleteDoc(doc(db, "maisons", id));
    setMaisons((prev) => prev.filter((m) => m.id !== id));
  };

  const resaBadge = (statut) => ({
    en_attente: { label: "⏳ En attente",  color: "#d97706", bg: "#fffbeb" },
    acceptee:   { label: "✅ Acceptée",    color: "#16a34a", bg: "#f0fdf4" },
    refusee:    { label: "❌ Refusée",     color: "#dc2626", bg: "#fef2f2" },
    autre_date: { label: "📅 Autre date",  color: "#7c3aed", bg: "#faf5ff" },
  }[statut] || { label: statut, color: "#555", bg: "#f3f4f6" });

  const card = (titre, valeur, couleur, emoji) => (
    <div style={{ background: "white", borderRadius: "16px", padding: "20px 16px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.08)", flex: 1, minWidth: "120px",
      borderTop: "4px solid " + couleur, textAlign: "center" }}>
      <p style={{ fontSize: "26px", margin: "0 0 6px" }}>{emoji}</p>
      <p style={{ fontSize: "24px", fontWeight: "bold", color: couleur, margin: "0 0 4px" }}>{valeur}</p>
      <p style={{ fontSize: "12px", color: "#666", margin: 0 }}>{titre}</p>
    </div>
  );

  const tab = (id, label, badge = 0) => (
    <button onClick={() => setOnglet(id)}
      style={{ padding: "8px 18px", borderRadius: "8px", border: "none",
        cursor: "pointer", fontSize: "13px", fontWeight: "bold", position: "relative",
        background: onglet === id ? "#16a34a" : "#f3f4f6",
        color: onglet === id ? "white" : "#555", transition: "all .2s" }}>
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

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <p style={{ color: "#16a34a" }}>⏳ Chargement...</p>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f0fdf4", padding: "20px" }}>
      <div style={{ maxWidth: "960px", margin: "0 auto" }}>

        {/* En-tête */}
        <div style={{ display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: "24px" }}>
          <div>
            <h1 style={{ color: "#16a34a", margin: "0 0 4px", fontSize: "22px" }}>🏠 ALLOmaison Admin</h1>
            <p style={{ color: "#666", margin: 0, fontSize: "13px" }}>Tableau de bord</p>
          </div>
          <button onClick={() => signOut(auth)}
            style={{ padding: "8px 16px", background: "#fee2e2", color: "#dc2626",
              border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}>
            Se déconnecter
          </button>
        </div>

        {/* ── Bandeau alerte réservations acceptées aujourd'hui ── */}
        {resaAujourdhui > 0 && (
          <div style={{ background: "#f0fdf4", border: "2px solid #16a34a",
            borderRadius: "12px", padding: "14px 18px", marginBottom: "20px",
            display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "28px" }}>🔔</span>
            <div>
              <p style={{ margin: 0, fontWeight: "bold", color: "#16a34a", fontSize: "14px" }}>
                {resaAujourdhui} nouvelle{resaAujourdhui > 1 ? "s" : ""} réservation{resaAujourdhui > 1 ? "s" : ""} aujourd'hui
              </p>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#555" }}>
                Cliquez sur l'onglet Réservations pour voir les détails.
              </p>
            </div>
            <button onClick={() => setOnglet("reservations")}
              style={{ marginLeft: "auto", padding: "7px 14px", background: "#16a34a",
                color: "white", border: "none", borderRadius: "8px",
                cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>
              Voir →
            </button>
          </div>
        )}

        {/* Cartes stats */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
          {card("Maisons", maisons.length, "#16a34a", "🏡")}
          {card("Propriétaires", proprietaires, "#0284c7", "👤")}
          {card("Vues totales", totalVues, "#7c3aed", "👁️")}
          {card("Clics WhatsApp", totalWhatsapp, "#25d366", "📲")}
          {card("Louées", totalLouees, "#dc2626", "🔑")}
          {card("Réservations", reservations.length, "#1d4ed8", "📅")}
          {card("Avis", avis.length, "#f59e0b", "⭐")}
        </div>

        {/* Onglets */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
          {tab("stats", "📊 Statistiques")}
          {tab("locations", "🔑 Locations")}
          {tab("reservations", "📅 Réservations", resaEnAttente)}
          {tab("maisons", "🏡 Maisons")}
          {tab("avis", "⭐ Avis")}
        </div>

        {/* ══ ONGLET STATS ══ */}
        {onglet === "stats" && (
          <div>
            <div style={{ background: "white", borderRadius: "16px", padding: "20px 24px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)", marginBottom: "20px" }}>
              <h2 style={{ color: "#7c3aed", fontSize: "16px", marginBottom: "16px" }}>
                👁️ Top 5 — Maisons les plus vues
              </h2>
              {topMaisons.map((m, i) => (
                <div key={m.id} style={{ display: "flex", alignItems: "center",
                  gap: "12px", padding: "10px 0",
                  borderBottom: i < 4 ? "1px solid #f3f4f6" : "none" }}>
                  <span style={{ fontSize: "18px", minWidth: "28px", color: i === 0 ? "#f59e0b" : "#999" }}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: "13px", fontWeight: "bold" }}>
                      {m.type} — {m.quartier}
                    </p>
                    <p style={{ margin: 0, fontSize: "12px", color: "#888" }}>
                      {m.nom || "?"} · {m.whatsapp}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ margin: 0, fontSize: "13px", fontWeight: "bold", color: "#7c3aed" }}>
                      👁️ {m.vues || 0}
                    </p>
                    <p style={{ margin: 0, fontSize: "12px", color: "#25d366" }}>
                      📲 {m.clicsWhatsapp || 0}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: "white", borderRadius: "16px", padding: "20px 24px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
              <h2 style={{ color: "#16a34a", fontSize: "16px", marginBottom: "16px" }}>
                📈 Taux de conversion global
              </h2>
              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                {[
                  { val: totalVues, label: "Vues totales", color: "#7c3aed" },
                  { val: totalWhatsapp, label: "Clics WhatsApp", color: "#25d366" },
                  { val: totalVues > 0 ? Math.round((totalWhatsapp / totalVues) * 100) + "%" : "0%", label: "Taux vue → contact", color: "#f59e0b" },
                  { val: maisons.length > 0 ? Math.round((totalLouees / maisons.length) * 100) + "%" : "0%", label: "Taux d'occupation", color: "#dc2626" },
                  { val: resaAcceptees, label: "Visites acceptées", color: "#16a34a" },
                ].map(({ val, label, color }) => (
                  <div key={label} style={{ flex: 1, minWidth: "120px", background: "#f0fdf4",
                    borderRadius: "12px", padding: "16px", textAlign: "center" }}>
                    <p style={{ margin: "0 0 4px", fontSize: "26px", fontWeight: "bold", color }}>{val}</p>
                    <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ ONGLET LOCATIONS ══ */}
        {onglet === "locations" && (
          <div style={{ background: "white", borderRadius: "16px", padding: "20px 24px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
            <h2 style={{ color: "#dc2626", fontSize: "16px", marginBottom: "6px" }}>
              🔑 Locations confirmées par mois
            </h2>
            <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#888" }}>
              {totalLouees} maison{totalLouees > 1 ? "s" : ""} louée{totalLouees > 1 ? "s" : ""} sur{" "}
              {maisons.length} publiée{maisons.length > 1 ? "s" : ""}
            </p>
            {Object.keys(locationParMois).length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <p style={{ fontSize: "40px", margin: "0 0 12px" }}>🔑</p>
                <p style={{ color: "#999", fontSize: "14px" }}>Aucune location confirmée.</p>
              </div>
            ) : (
              Object.entries(locationParMois).sort((a, b) => b[1] - a[1]).map(([mois, count]) => {
                const max = Math.max(...Object.values(locationParMois));
                return (
                  <div key={mois} style={{ display: "flex", alignItems: "center",
                    gap: "12px", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
                    <span style={{ minWidth: "130px", fontSize: "13px", color: "#555",
                      textTransform: "capitalize" }}>{mois}</span>
                    <div style={{ flex: 1, background: "#f3f4f6", borderRadius: "20px",
                      height: "10px", overflow: "hidden" }}>
                      <div style={{ width: `${(count / max) * 100}%`, height: "100%",
                        background: "#dc2626", borderRadius: "20px", transition: "width .4s" }} />
                    </div>
                    <span style={{ fontSize: "14px", fontWeight: "bold",
                      color: "#dc2626", minWidth: "20px", textAlign: "right" }}>{count}</span>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ══ ONGLET RÉSERVATIONS ══ */}
        {onglet === "reservations" && (
          <div style={{ background: "white", borderRadius: "16px", padding: "20px 24px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
            <h2 style={{ color: "#1d4ed8", fontSize: "16px", marginBottom: "16px" }}>
              📅 Réservations ({reservations.length})
              {resaEnAttente > 0 && (
                <span style={{ marginLeft: "8px", background: "#fffbeb", color: "#d97706",
                  padding: "2px 8px", borderRadius: "20px", fontSize: "12px" }}>
                  {resaEnAttente} en attente
                </span>
              )}
              {resaAcceptees > 0 && (
                <span style={{ marginLeft: "8px", background: "#f0fdf4", color: "#16a34a",
                  padding: "2px 8px", borderRadius: "20px", fontSize: "12px" }}>
                  {resaAcceptees} acceptée{resaAcceptees > 1 ? "s" : ""}
                </span>
              )}
            </h2>

            {/* Résumé rapide */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
              {[
                { label: "En attente", count: resaEnAttente, color: "#d97706", bg: "#fffbeb" },
                { label: "Acceptées", count: resaAcceptees, color: "#16a34a", bg: "#f0fdf4" },
                { label: "Refusées", count: reservations.filter(r => r.statut === "refusee").length, color: "#dc2626", bg: "#fef2f2" },
                { label: "Autre date", count: reservations.filter(r => r.statut === "autre_date").length, color: "#7c3aed", bg: "#faf5ff" },
              ].map(({ label, count, color, bg }) => (
                <div key={label} style={{ background: bg, borderRadius: "10px",
                  padding: "10px 16px", textAlign: "center", minWidth: "80px" }}>
                  <p style={{ margin: 0, fontSize: "20px", fontWeight: "bold", color }}>{count}</p>
                  <p style={{ margin: 0, fontSize: "11px", color: "#666" }}>{label}</p>
                </div>
              ))}
            </div>

            {reservations.length === 0 ? (
              <p style={{ color: "#999", textAlign: "center" }}>Aucune réservation</p>
            ) : (
              reservations.map((r) => {
                const badge = resaBadge(r.statut);
                return (
                  <div key={r.id} style={{ borderBottom: "1px solid #f3f4f6",
                    padding: "14px 0",
                    borderLeft: r.statut === "acceptee" ? "3px solid #16a34a" :
                                r.statut === "en_attente" ? "3px solid #d97706" : "none",
                    paddingLeft: ["acceptee", "en_attente"].includes(r.statut) ? "12px" : "0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between",
                      alignItems: "flex-start", marginBottom: "6px" }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: "bold", fontSize: "13px" }}>
                          {r.maisonType} — {r.maisonQuartier}
                        </p>
                        <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#888" }}>
                          {r.dateCreation?.toDate?.()?.toLocaleDateString("fr-FR", {
                            day: "numeric", month: "long", year: "numeric",
                            hour: "2-digit", minute: "2-digit"
                          }) || ""}
                        </p>
                      </div>
                      <span style={{ background: badge.bg, color: badge.color,
                        padding: "2px 8px", borderRadius: "20px",
                        fontSize: "11px", fontWeight: "bold", whiteSpace: "nowrap" }}>
                        {badge.label}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: "12px", color: "#555" }}>
                      👤 <strong>{r.locataireNom}</strong> · 📱 {r.locataireTelephone}
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#888" }}>
                      📅 Visite demandée : <strong>{r.dateVisite}</strong>
                      {r.dateProposee && (
                        <span style={{ color: "#7c3aed" }}> → Proposée : <strong>{r.dateProposee}</strong></span>
                      )}
                    </p>
                    {r.message && (
                      <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#666", fontStyle: "italic" }}>
                        💬 "{r.message}"
                      </p>
                    )}
                    {/* Bouton contacter le locataire directement */}
                    {r.statut === "acceptee" && (
                      <a href={`https://wa.me/${r.locataireTelephone}`}
                        target="_blank" rel="noreferrer"
                        style={{ display: "inline-block", marginTop: "8px",
                          padding: "5px 12px", background: "#25d366",
                          color: "white", borderRadius: "8px",
                          textDecoration: "none", fontSize: "12px", fontWeight: "bold" }}>
                        💬 Contacter {r.locataireNom}
                      </a>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ══ ONGLET MAISONS ══ */}
        {onglet === "maisons" && (
          <div style={{ background: "white", borderRadius: "16px", padding: "20px 24px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ color: "#16a34a", fontSize: "16px", margin: 0 }}>
                🏡 Maisons ({maisonsFiltrees.length})
              </h2>
              <input placeholder="🔍 Rechercher..."
                value={recherche} onChange={(e) => setRecherche(e.target.value)}
                style={{ padding: "7px 12px", border: "1px solid #ddd",
                  borderRadius: "8px", fontSize: "13px", width: "180px" }} />
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: "#f0fdf4" }}>
                    {["Propriétaire", "Type", "Quartier", "Prix", "👁️", "📲", "Statut", ""].map((h) => (
                      <th key={h} style={{ padding: "10px 8px", textAlign: "left",
                        borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {maisonsFiltrees.map((m) => (
                    <tr key={m.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "10px 8px" }}>
                        <p style={{ margin: 0, fontWeight: "bold" }}>{m.nom || "—"}</p>
                        <p style={{ margin: 0, color: "#888", fontSize: "11px" }}>{m.whatsapp}</p>
                      </td>
                      <td style={{ padding: "10px 8px" }}>{m.type}</td>
                      <td style={{ padding: "10px 8px" }}>{m.quartier}</td>
                      <td style={{ padding: "10px 8px", whiteSpace: "nowrap" }}>
                        {Number(m.prix).toLocaleString()} F
                      </td>
                      <td style={{ padding: "10px 8px", color: "#7c3aed", fontWeight: "bold" }}>
                        {m.vues || 0}
                      </td>
                      <td style={{ padding: "10px 8px", color: "#25d366", fontWeight: "bold" }}>
                        {m.clicsWhatsapp || 0}
                      </td>
                      <td style={{ padding: "10px 8px" }}>
                        <span style={{
                          background: m.disponible ? "#dcfce7" : "#fee2e2",
                          color: m.disponible ? "#16a34a" : "#dc2626",
                          padding: "2px 8px", borderRadius: "20px", fontSize: "11px",
                          cursor: "pointer", whiteSpace: "nowrap",
                        }} onClick={() => handleDisponibilite(m)}>
                          {m.disponible ? "✅ Dispo" : "🔴 Occupé"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 8px" }}>
                        <button onClick={() => handleSupprimer(m.id)}
                          style={{ padding: "4px 10px", background: "#fee2e2",
                            color: "#dc2626", border: "none", borderRadius: "6px",
                            cursor: "pointer", fontSize: "12px" }}>🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ ONGLET AVIS ══ */}
        {onglet === "avis" && (
          <div style={{ background: "white", borderRadius: "16px", padding: "20px 24px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
            <h2 style={{ color: "#f59e0b", fontSize: "16px", marginBottom: "16px" }}>
              ⭐ Avis ({avis.length})
            </h2>
            {avis.length === 0 ? (
              <p style={{ color: "#999", textAlign: "center" }}>Aucun avis</p>
            ) : (
              avis.map((a) => (
                <div key={a.id} style={{ borderBottom: "1px solid #f3f4f6", padding: "12px 0" }}>
                  <div style={{ display: "flex", gap: "4px", marginBottom: "4px" }}>
                    {[1,2,3,4,5].map((i) => (
                      <span key={i} style={{ color: i <= a.etoiles ? "#f59e0b" : "#ddd" }}>★</span>
                    ))}
                  </div>
                  <p style={{ margin: 0, fontSize: "13px", color: "#555" }}>
                    {a.commentaire || "Pas de commentaire"}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
}