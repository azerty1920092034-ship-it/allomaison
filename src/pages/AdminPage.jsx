import { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { collection, getDocs, doc, updateDoc, deleteDoc,
  query, orderBy, onSnapshot } from "firebase/firestore";
import { signOut } from "firebase/auth";
import "../styles/design-system.css";
import "./AdminPage.css";

const RESA_BADGE = (statut) => ({
  en_attente: { label: "En attente", color: "var(--amber-600)", bg: "var(--amber-50)"  },
  acceptee:   { label: "Acceptée",   color: "var(--green-600)", bg: "var(--green-50)"  },
  refusee:    { label: "Refusée",    color: "var(--red-600)",   bg: "var(--red-50)"    },
  autre_date: { label: "Autre date", color: "var(--purple-600)", bg: "var(--purple-50)"},
}[statut] || { label: statut, color: "var(--gray-500)", bg: "var(--gray-100)" });

export default function AdminPage() {
  const [maisons, setMaisons]           = useState([]);
  const [avis, setAvis]                 = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [onglet, setOnglet]             = useState("stats");
  const [recherche, setRecherche]       = useState("");

  useEffect(() => {
    const loadStatic = async () => {
      const [maisonSnap, avisSnap] = await Promise.all([
        getDocs(collection(db, "maisons")),
        getDocs(collection(db, "avis")),
      ]);
      setMaisons(maisonSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setAvis(avisSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };
    loadStatic();
    const unsub = onSnapshot(
      query(collection(db, "reservations"), orderBy("dateCreation", "desc")),
      snap => setReservations(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, []);

  /* ── Compteurs ── */
  const totalVues      = maisons.reduce((s, m) => s + (m.vues || 0), 0);
  const totalWhatsapp  = maisons.reduce((s, m) => s + (m.clicsWhatsapp || 0), 0);
  const proprietaires  = [...new Set(maisons.map(m => m.proprietaireId))].length;
  const totalLouees    = maisons.filter(m => !m.disponible).length;
  const resaEnAttente  = reservations.filter(r => r.statut === "en_attente").length;
  const resaAcceptees  = reservations.filter(r => r.statut === "acceptee").length;
  const resaAujourdhui = reservations.filter(r => {
    try {
      const d = r.dateCreation?.toDate();
      return d && d.toDateString() === new Date().toDateString();
    } catch { return false; }
  }).length;

  const locationParMois = maisons
    .filter(m => !m.disponible && m.dateLocation)
    .reduce((acc, m) => {
      try {
        const cle = m.dateLocation.toDate().toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
        acc[cle] = (acc[cle] || 0) + 1;
      } catch {}
      return acc;
    }, {});

  const maisonsFiltrees = maisons.filter(m =>
    !recherche ||
    m.type?.toLowerCase().includes(recherche.toLowerCase()) ||
    m.quartier?.toLowerCase().includes(recherche.toLowerCase()) ||
    m.whatsapp?.includes(recherche) ||
    m.nom?.toLowerCase().includes(recherche.toLowerCase())
  );

  const topMaisons = [...maisons].sort((a, b) => (b.vues || 0) - (a.vues || 0)).slice(0, 5);

  const handleDisponibilite = async (m) => {
    await updateDoc(doc(db, "maisons", m.id), { disponible: !m.disponible });
    setMaisons(prev => prev.map(x => x.id === m.id ? { ...x, disponible: !x.disponible } : x));
  };

  const handleSupprimer = async (id) => {
    if (!window.confirm("Supprimer cette maison ?")) return;
    await deleteDoc(doc(db, "maisons", id));
    setMaisons(prev => prev.filter(m => m.id !== id));
  };

  /* ── Loader ── */
  if (loading) return (
    <div className="ap-loader">
      <div style={{ fontSize: 32 }}>🏠</div>
      <div className="ap-loader-dots">
        <div className="ap-loader-dot" />
        <div className="ap-loader-dot" />
        <div className="ap-loader-dot" />
      </div>
    </div>
  );

  const STAT_CARDS = [
    { label: "Maisons",       val: maisons.length,       color: "var(--green-600)",  emoji: "🏡" },
    { label: "Propriétaires", val: proprietaires,         color: "var(--blue-600)",   emoji: "👤" },
    { label: "Vues totales",  val: totalVues,             color: "var(--purple-600)", emoji: "👁️" },
    { label: "Clics WhatsApp",val: totalWhatsapp,         color: "#25d366",           emoji: "📲" },
    { label: "Louées",        val: totalLouees,           color: "var(--red-600)",    emoji: "🔑" },
    { label: "Réservations",  val: reservations.length,   color: "var(--blue-600)",   emoji: "📅" },
    { label: "Avis",          val: avis.length,           color: "var(--amber-500)",  emoji: "⭐" },
  ];

  const TABS = [
    { id: "stats",        label: "📊 Statistiques" },
    { id: "locations",    label: "🔑 Locations" },
    { id: "reservations", label: "📅 Réservations", badge: resaEnAttente },
    { id: "maisons",      label: "🏡 Maisons" },
    { id: "avis",         label: "⭐ Avis" },
  ];

  return (
    <div className="ap-screen">
      <div className="ap-inner">

        {/* ── Header ── */}
        <div className="ap-header">
          <div>
            <h1>🏠 ALLOmaison Admin</h1>
            <p className="ap-header-sub">Tableau de bord</p>
          </div>
          <button className="ap-signout" onClick={() => signOut(auth)}>
            Se déconnecter
          </button>
        </div>

        {/* ── Alerte ── */}
        {resaAujourdhui > 0 && (
          <div className="ap-alert">
            <span className="ap-alert-icon">🔔</span>
            <div>
              <p className="ap-alert-title">
                {resaAujourdhui} nouvelle{resaAujourdhui > 1 ? "s" : ""} réservation{resaAujourdhui > 1 ? "s" : ""} aujourd'hui
              </p>
              <p className="ap-alert-sub">Cliquez sur l'onglet Réservations pour voir les détails.</p>
            </div>
            <button className="ap-alert-btn" onClick={() => setOnglet("reservations")}>
              Voir →
            </button>
          </div>
        )}

        {/* ── Stat cards ── */}
        <div className="ap-stats">
          {STAT_CARDS.map(({ label, val, color, emoji }) => (
            <div key={label} className="ap-stat-card" style={{ borderTopColor: color }}>
              <div className="ap-stat-emoji">{emoji}</div>
              <p className="ap-stat-val" style={{ color }}>{val}</p>
              <p className="ap-stat-label">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Onglets ── */}
        <div className="ap-tabs">
          {TABS.map(({ id, label, badge }) => (
            <button key={id}
              className={`ap-tab${onglet === id ? " active" : ""}`}
              onClick={() => setOnglet(id)}>
              {label}
              {badge > 0 && <span className="ap-tab-badge">{badge}</span>}
            </button>
          ))}
        </div>

        {/* ══ STATS ══ */}
        {onglet === "stats" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="ap-panel">
              <p className="ap-panel-title" style={{ color: "var(--purple-600)" }}>
                👁️ Top 5 — Maisons les plus vues
              </p>
              {topMaisons.map((m, i) => (
                <div key={m.id} className="ap-top-row">
                  <span className="ap-top-rank">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i+1}`}
                  </span>
                  <div className="ap-top-info">
                    <p className="ap-top-name">{m.type} — {m.quartier}</p>
                    <p className="ap-top-sub">{m.nom || "?"} · {m.whatsapp}</p>
                  </div>
                  <div className="ap-top-stats">
                    <p className="ap-top-vues">👁️ {m.vues || 0}</p>
                    <p className="ap-top-wa">📲 {m.clicsWhatsapp || 0}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="ap-panel">
              <p className="ap-panel-title" style={{ color: "var(--green-700)" }}>
                📈 Taux de conversion global
              </p>
              <div className="ap-conv-grid">
                {[
                  { val: totalVues,    label: "Vues totales",        color: "var(--purple-600)" },
                  { val: totalWhatsapp,label: "Clics WhatsApp",      color: "#25d366" },
                  { val: totalVues > 0 ? Math.round((totalWhatsapp/totalVues)*100)+"%" : "0%",
                    label: "Taux vue → contact", color: "var(--amber-600)" },
                  { val: maisons.length > 0 ? Math.round((totalLouees/maisons.length)*100)+"%" : "0%",
                    label: "Taux d'occupation", color: "var(--red-600)" },
                  { val: resaAcceptees, label: "Visites acceptées",  color: "var(--green-600)" },
                ].map(({ val, label, color }) => (
                  <div key={label} className="ap-conv-card">
                    <p className="ap-conv-val" style={{ color }}>{val}</p>
                    <p className="ap-conv-label">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ LOCATIONS ══ */}
        {onglet === "locations" && (
          <div className="ap-panel">
            <p className="ap-panel-title" style={{ color: "var(--red-600)" }}>
              🔑 Locations confirmées par mois
            </p>
            <p style={{ margin: "-8px 0 16px", fontSize: "var(--text-sm)", color: "var(--gray-400)" }}>
              {totalLouees} maison{totalLouees > 1 ? "s" : ""} louée{totalLouees > 1 ? "s" : ""} sur {maisons.length} publiée{maisons.length > 1 ? "s" : ""}
            </p>
            {Object.keys(locationParMois).length === 0 ? (
              <div className="ap-empty">
                <div className="ap-empty-icon">🔑</div>
                <p>Aucune location confirmée.</p>
              </div>
            ) : (
              Object.entries(locationParMois)
                .sort((a, b) => b[1] - a[1])
                .map(([mois, count]) => {
                  const max = Math.max(...Object.values(locationParMois));
                  return (
                    <div key={mois} className="ap-bar-row">
                      <span className="ap-bar-month">{mois}</span>
                      <div className="ap-bar-track">
                        <div className="ap-bar-fill" style={{ width: `${(count/max)*100}%` }} />
                      </div>
                      <span className="ap-bar-count">{count}</span>
                    </div>
                  );
                })
            )}
          </div>
        )}

        {/* ══ RÉSERVATIONS ══ */}
        {onglet === "reservations" && (
          <div className="ap-panel">
            <p className="ap-panel-title" style={{ color: "var(--blue-600)" }}>
              📅 Réservations ({reservations.length})
              {resaEnAttente > 0 && (
                <span style={{ background: "var(--amber-50)", color: "var(--amber-600)",
                  padding: "2px 8px", borderRadius: "var(--radius-full)", fontSize: "var(--text-xs)" }}>
                  {resaEnAttente} en attente
                </span>
              )}
              {resaAcceptees > 0 && (
                <span style={{ background: "var(--green-50)", color: "var(--green-600)",
                  padding: "2px 8px", borderRadius: "var(--radius-full)", fontSize: "var(--text-xs)" }}>
                  {resaAcceptees} acceptée{resaAcceptees > 1 ? "s" : ""}
                </span>
              )}
            </p>

            <div className="ap-resa-summary">
              {[
                { label: "En attente", count: resaEnAttente, color: "var(--amber-600)", bg: "var(--amber-50)" },
                { label: "Acceptées",  count: resaAcceptees, color: "var(--green-600)", bg: "var(--green-50)" },
                { label: "Refusées",   count: reservations.filter(r => r.statut === "refusee").length,    color: "var(--red-600)",    bg: "var(--red-50)"    },
                { label: "Autre date", count: reservations.filter(r => r.statut === "autre_date").length, color: "var(--purple-600)", bg: "var(--purple-50)" },
              ].map(({ label, count, color, bg }) => (
                <div key={label} className="ap-resa-chip" style={{ background: bg }}>
                  <p className="ap-resa-chip-val" style={{ color }}>{count}</p>
                  <p className="ap-resa-chip-label">{label}</p>
                </div>
              ))}
            </div>

            {reservations.length === 0 ? (
              <div className="ap-empty"><p>Aucune réservation</p></div>
            ) : reservations.map(r => {
              const badge = RESA_BADGE(r.statut);
              const hasBorder = ["acceptee", "en_attente"].includes(r.statut);
              return (
                <div key={r.id}
                  className={`ap-resa-row${hasBorder ? " bordered" : ""}`}
                  style={hasBorder ? { borderLeftColor: badge.color } : {}}>
                  <div className="ap-resa-head">
                    <div>
                      <p className="ap-resa-type">{r.maisonType} — {r.maisonQuartier}</p>
                      <p className="ap-resa-created">
                        {r.dateCreation?.toDate?.()?.toLocaleDateString("fr-FR", {
                          day: "numeric", month: "long", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        }) || ""}
                      </p>
                    </div>
                    <span className="ap-resa-badge" style={{ background: badge.bg, color: badge.color }}>
                      {badge.label}
                    </span>
                  </div>
                  <p className="ap-resa-info">
                    👤 <strong>{r.locataireNom}</strong> · 📱 {r.locataireTelephone}
                  </p>
                  <p className="ap-resa-info">
                    📅 Visite demandée : <strong>{r.dateVisite}</strong>
                    {r.dateProposee && (
                      <span style={{ color: "var(--purple-600)" }}> → Proposée : <strong>{r.dateProposee}</strong></span>
                    )}
                  </p>
                  {r.message && (
                    <p className="ap-resa-info" style={{ fontStyle: "italic" }}>
                      💬 "{r.message}"
                    </p>
                  )}
                  {r.statut === "acceptee" && (
                    <a href={`https://wa.me/${r.locataireTelephone}`}
                      target="_blank" rel="noreferrer"
                      className="ap-resa-wa">
                      💬 Contacter {r.locataireNom}
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ══ MAISONS ══ */}
        {onglet === "maisons" && (
          <div className="ap-panel">
            <div className="ap-table-header">
              <p className="ap-panel-title" style={{ color: "var(--green-700)", margin: 0 }}>
                🏡 Maisons ({maisonsFiltrees.length})
              </p>
              <input
                className="ap-search"
                placeholder="🔍 Rechercher..."
                value={recherche}
                onChange={e => setRecherche(e.target.value)}
              />
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="ap-table">
                <thead>
                  <tr>
                    {["Propriétaire","Type","Quartier","Prix","Vues","WhatsApp","Statut",""].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {maisonsFiltrees.map(m => (
                    <tr key={m.id}>
                      <td>
                        <p className="ap-table-name">{m.nom || "—"}</p>
                        <p className="ap-table-wp">{m.whatsapp}</p>
                      </td>
                      <td>{m.type}</td>
                      <td>{m.quartier}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{Number(m.prix).toLocaleString()} F</td>
                      <td style={{ color: "var(--purple-600)", fontWeight: 700 }}>{m.vues || 0}</td>
                      <td style={{ color: "#25d366", fontWeight: 700 }}>{m.clicsWhatsapp || 0}</td>
                      <td>
                        <span
                          className="ap-dispo-badge"
                          style={{
                            background: m.disponible ? "var(--green-50)" : "var(--red-50)",
                            color: m.disponible ? "var(--green-600)" : "var(--red-600)",
                            border: `1px solid ${m.disponible ? "var(--green-200)" : "#fecaca"}`,
                          }}
                          onClick={() => handleDisponibilite(m)}>
                          {m.disponible ? "✅ Dispo" : "🔴 Occupé"}
                        </span>
                      </td>
                      <td>
                        <button className="ap-del-btn" onClick={() => handleSupprimer(m.id)}>🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ AVIS ══ */}
        {onglet === "avis" && (
          <div className="ap-panel">
            <p className="ap-panel-title" style={{ color: "var(--amber-600)" }}>
              ⭐ Avis ({avis.length})
            </p>
            {avis.length === 0 ? (
              <div className="ap-empty">
                <div className="ap-empty-icon">⭐</div>
                <p>Aucun avis</p>
              </div>
            ) : avis.map(a => (
              <div key={a.id} className="ap-avis-row">
                <div className="ap-stars">
                  {[1,2,3,4,5].map(i => (
                    <span key={i} style={{ color: i <= a.etoiles ? "var(--amber-500)" : "var(--gray-200)" }}>★</span>
                  ))}
                </div>
                <p className="ap-avis-text">{a.commentaire || "Pas de commentaire"}</p>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}