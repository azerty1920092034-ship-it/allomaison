import { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";

export default function AdminPage() {
  const [maisons, setMaisons]     = useState([]);
  const [avis, setAvis]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [onglet, setOnglet]       = useState("stats");
  const [recherche, setRecherche] = useState("");

  useEffect(() => {
    const loadData = async () => {
      const [maisonSnap, avisSnap] = await Promise.all([
        getDocs(collection(db, "maisons")),
        getDocs(collection(db, "avis")),
      ]);
      setMaisons(maisonSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setAvis(avisSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };
    loadData();
  }, []);

  // ── Totaux ────────────────────────────────────────────────────────────────
  const totalVues     = maisons.reduce((s, m) => s + (m.vues || 0), 0);
  const totalWhatsapp = maisons.reduce((s, m) => s + (m.clicsWhatsapp || 0), 0);
  const proprietaires = [...new Set(maisons.map((m) => m.proprietaireId))].length;
  const totalLouees   = maisons.filter((m) => !m.disponible).length;

  // ── Locations par mois ────────────────────────────────────────────────────
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

  // ── Maisons filtrées ──────────────────────────────────────────────────────
  const maisonsFiltrees = maisons.filter((m) =>
    !recherche ||
    m.type?.toLowerCase().includes(recherche.toLowerCase()) ||
    m.quartier?.toLowerCase().includes(recherche.toLowerCase()) ||
    m.whatsapp?.includes(recherche) ||
    m.nom?.toLowerCase().includes(recherche.toLowerCase())
  );

  // ── Top 5 par vues ────────────────────────────────────────────────────────
  const topMaisons = [...maisons]
    .sort((a, b) => (b.vues || 0) - (a.vues || 0))
    .slice(0, 5);

  const handleDisponibilite = async (m) => {
    await updateDoc(doc(db, "maisons", m.id), { disponible: !m.disponible });
    setMaisons((prev) => prev.map((x) => x.id === m.id ? { ...x, disponible: !x.disponible } : x));
  };

  const handleSupprimer = async (id) => {
    if (!window.confirm("Supprimer cette maison ?")) return;
    await deleteDoc(doc(db, "maisons", id));
    setMaisons((prev) => prev.filter((m) => m.id !== id));
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const card = (titre, valeur, couleur, emoji) => (
    <div style={{ background: "white", borderRadius: "16px", padding: "20px 16px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.08)", flex: 1, minWidth: "120px",
      borderTop: "4px solid " + couleur, textAlign: "center" }}>
      <p style={{ fontSize: "26px", margin: "0 0 6px" }}>{emoji}</p>
      <p style={{ fontSize: "24px", fontWeight: "bold", color: couleur, margin: "0 0 4px" }}>{valeur}</p>
      <p style={{ fontSize: "12px", color: "#666", margin: 0 }}>{titre}</p>
    </div>
  );

  const tab = (id, label) => (
    <button onClick={() => setOnglet(id)}
      style={{ padding: "8px 18px", borderRadius: "8px", border: "none",
        cursor: "pointer", fontSize: "13px", fontWeight: "bold",
        background: onglet === id ? "#16a34a" : "#f3f4f6",
        color: onglet === id ? "white" : "#555", transition: "all .2s" }}>
      {label}
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

        {/* ── En-tête ── */}
        <div style={{ display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: "24px" }}>
          <div>
            <h1 style={{ color: "#16a34a", margin: "0 0 4px", fontSize: "22px" }}>
              🏠 ALLOmaison Admin
            </h1>
            <p style={{ color: "#666", margin: 0, fontSize: "13px" }}>Tableau de bord</p>
          </div>
          <button onClick={() => signOut(auth)}
            style={{ padding: "8px 16px", background: "#fee2e2", color: "#dc2626",
              border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}>
            Se déconnecter
          </button>
        </div>

        {/* ── Cartes stats ── */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
          {card("Maisons", maisons.length, "#16a34a", "🏡")}
          {card("Propriétaires", proprietaires, "#0284c7", "👤")}
          {card("Vues totales", totalVues, "#7c3aed", "👁️")}
          {card("Clics WhatsApp", totalWhatsapp, "#25d366", "📲")}
          {card("Louées", totalLouees, "#dc2626", "🔑")}
          {card("Avis", avis.length, "#f59e0b", "⭐")}
        </div>

        {/* ── Onglets ── */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
          {tab("stats", "📊 Statistiques")}
          {tab("locations", "🔑 Locations")}
          {tab("maisons", "🏡 Maisons")}
          {tab("avis", "⭐ Avis")}
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ── ONGLET STATS ── */}
        {onglet === "stats" && (
          <div>
            {/* Top 5 maisons les plus vues */}
            <div style={{ background: "white", borderRadius: "16px", padding: "20px 24px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)", marginBottom: "20px" }}>
              <h2 style={{ color: "#7c3aed", fontSize: "16px", marginBottom: "16px" }}>
                👁️ Top 5 — Maisons les plus vues
              </h2>
              {topMaisons.map((m, i) => (
                <div key={m.id} style={{ display: "flex", alignItems: "center",
                  gap: "12px", padding: "10px 0",
                  borderBottom: i < 4 ? "1px solid #f3f4f6" : "none" }}>
                  <span style={{ fontSize: "18px", minWidth: "28px",
                    color: i === 0 ? "#f59e0b" : "#999" }}>
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

            {/* Taux de conversion global */}
            <div style={{ background: "white", borderRadius: "16px", padding: "20px 24px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
              <h2 style={{ color: "#16a34a", fontSize: "16px", marginBottom: "16px" }}>
                📈 Taux de conversion global
              </h2>
              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: "140px", background: "#f0fdf4",
                  borderRadius: "12px", padding: "16px", textAlign: "center" }}>
                  <p style={{ margin: "0 0 4px", fontSize: "26px", fontWeight: "bold", color: "#7c3aed" }}>
                    {totalVues}
                  </p>
                  <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>Vues totales</p>
                </div>
                <div style={{ flex: 1, minWidth: "140px", background: "#f0fdf4",
                  borderRadius: "12px", padding: "16px", textAlign: "center" }}>
                  <p style={{ margin: "0 0 4px", fontSize: "26px", fontWeight: "bold", color: "#25d366" }}>
                    {totalWhatsapp}
                  </p>
                  <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>Clics WhatsApp</p>
                </div>
                <div style={{ flex: 1, minWidth: "140px", background: "#f0fdf4",
                  borderRadius: "12px", padding: "16px", textAlign: "center" }}>
                  <p style={{ margin: "0 0 4px", fontSize: "26px", fontWeight: "bold", color: "#f59e0b" }}>
                    {totalVues > 0 ? Math.round((totalWhatsapp / totalVues) * 100) : 0}%
                  </p>
                  <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>Taux vue → contact</p>
                </div>
                <div style={{ flex: 1, minWidth: "140px", background: "#fef2f2",
                  borderRadius: "12px", padding: "16px", textAlign: "center" }}>
                  <p style={{ margin: "0 0 4px", fontSize: "26px", fontWeight: "bold", color: "#dc2626" }}>
                    {maisons.length > 0 ? Math.round((totalLouees / maisons.length) * 100) : 0}%
                  </p>
                  <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>Taux d'occupation</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ── ONGLET LOCATIONS ── */}
        {onglet === "locations" && (
          <div style={{ background: "white", borderRadius: "16px", padding: "20px 24px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
            <h2 style={{ color: "#dc2626", fontSize: "16px", marginBottom: "6px" }}>
              🔑 Locations confirmées par mois
            </h2>
            <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#888" }}>
              {totalLouees} maison{totalLouees > 1 ? "s" : ""} louée{totalLouees > 1 ? "s" : ""} sur{" "}
              {maisons.length} publiée{maisons.length > 1 ? "s" : ""}{" "}
              ({maisons.length > 0 ? Math.round((totalLouees / maisons.length) * 100) : 0}% d'occupation)
            </p>

            {/* Graphique par mois */}
            {Object.keys(locationParMois).length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <p style={{ fontSize: "40px", margin: "0 0 12px" }}>🔑</p>
                <p style={{ color: "#999", fontSize: "14px" }}>
                  Aucune location confirmée pour le moment.<br/>
                  Les propriétaires doivent cliquer sur "Marquer comme loué"
                  dans leur dashboard.
                </p>
              </div>
            ) : (
              <div style={{ marginBottom: "24px" }}>
                {Object.entries(locationParMois)
                  .sort((a, b) => b[1] - a[1])
                  .map(([mois, count]) => {
                    const max = Math.max(...Object.values(locationParMois));
                    return (
                      <div key={mois} style={{ display: "flex", alignItems: "center",
                        gap: "12px", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
                        <span style={{ minWidth: "130px", fontSize: "13px", color: "#555",
                          textTransform: "capitalize" }}>{mois}</span>
                        <div style={{ flex: 1, background: "#f3f4f6",
                          borderRadius: "20px", height: "10px", overflow: "hidden" }}>
                          <div style={{ width: `${(count / max) * 100}%`,
                            height: "100%", background: "#dc2626",
                            borderRadius: "20px", transition: "width .4s" }} />
                        </div>
                        <span style={{ fontSize: "14px", fontWeight: "bold",
                          color: "#dc2626", minWidth: "20px", textAlign: "right" }}>
                          {count}
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* Liste des maisons louées */}
            <h3 style={{ fontSize: "14px", color: "#555", marginBottom: "12px" }}>
              Maisons actuellement occupées ({totalLouees})
            </h3>
            {maisons.filter((m) => !m.disponible).length === 0 ? (
              <p style={{ color: "#999", fontSize: "13px" }}>Aucune maison occupée.</p>
            ) : (
              maisons.filter((m) => !m.disponible).map((m) => (
                <div key={m.id} style={{ display: "flex", alignItems: "center",
                  gap: "12px", padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
                  {m.photo && (
                    <img src={m.photo} alt="" style={{ width: "48px", height: "40px",
                      borderRadius: "8px", objectFit: "cover" }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: "13px", fontWeight: "bold" }}>
                      {m.type} — {m.quartier}
                    </p>
                    <p style={{ margin: 0, fontSize: "12px", color: "#888" }}>
                      {m.nom || "?"} · {m.whatsapp}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ background: "#fee2e2", color: "#dc2626",
                      padding: "2px 8px", borderRadius: "20px", fontSize: "11px",
                      fontWeight: "bold" }}>🔴 Occupée</span>
                    {m.dateLocation && (
                      <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#888" }}>
                        {m.dateLocation.toDate().toLocaleDateString("fr-FR")}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ── ONGLET MAISONS ── */}
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
                    {["Propriétaire", "Type", "Quartier", "Prix", "👁️ Vues", "📲 WA", "Statut", "Actions"].map((h) => (
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
                            cursor: "pointer", fontSize: "12px" }}>
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ── ONGLET AVIS ── */}
        {onglet === "avis" && (
          <div style={{ background: "white", borderRadius: "16px", padding: "20px 24px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
            <h2 style={{ color: "#f59e0b", fontSize: "16px", marginBottom: "16px" }}>
              ⭐ Avis ({avis.length})
            </h2>
            {avis.length === 0 ? (
              <p style={{ color: "#999", textAlign: "center" }}>Aucun avis pour le moment</p>
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