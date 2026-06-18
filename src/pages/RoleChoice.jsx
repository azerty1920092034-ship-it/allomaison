import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import "../styles/design-system.css";

export default function RoleChoice({ setEcran }) {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled]         = useState(false);
  const [showGuide, setShowGuide]         = useState(false);
  const [aMaisons, setAMaisons]           = useState(false);
  const [chargement, setChargement]       = useState(true);

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);

    const uid = auth.currentUser?.uid;
    if (uid) {
      (async () => {
        try {
          const userSnap = await getDoc(doc(db, "users", uid));
          const wp = userSnap.exists() ? userSnap.data().whatsapp || "" : "";
          const [snap1, snap2] = await Promise.all([
            getDocs(query(collection(db, "maisons"), where("proprietaireId", "==", uid))),
            wp ? getDocs(query(collection(db, "maisons"), where("whatsapp", "==", wp))) : Promise.resolve({ empty: true }),
          ]);
          setAMaisons(!snap1.empty || !snap2.empty);
        } catch { setAMaisons(false); }
        setChargement(false);
      })();
    } else {
      setChargement(false);
    }
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === "accepted") { setInstalled(true); setInstallPrompt(null); }
    } else {
      setShowGuide(true);
    }
  };

  if (chargement) return (
    <div className="am-loading">
      <div className="am-loading-dot" />
      <p style={{ color: "var(--slate-500)", fontSize: "var(--font-size-sm)", margin: 0 }}>Chargement…</p>
    </div>
  );

  const actions = [
    {
      icon: "🔍",
      label: "Trouver une maison",
      desc: "Explorez les logements disponibles sur la carte",
      onClick: () => setEcran("carte"),
      cls: "am-btn-primary",
    },
    {
      icon: "📅",
      label: "Mes demandes de visite",
      desc: "Suivez l'état de vos réservations",
      onClick: () => setEcran("locataire"),
      cls: "am-btn-blue",
    },
    ...(aMaisons ? [{
      icon: "🏡",
      label: "Espace propriétaire",
      desc: "Gérez vos réservations reçues",
      onClick: () => setEcran("dashboard"),
      cls: "am-btn-amber",
    }] : []),
    {
      icon: "➕",
      label: "Mettre ma maison en ligne",
      desc: "Publiez votre logement en quelques minutes",
      onClick: () => setEcran("formulaire"),
      cls: "am-btn-purple",
    },
  ];

  return (
    <div className="am-loading" style={{ background: "var(--page-bg)", padding: "20px", alignItems: "stretch" }}>
      <div style={{ maxWidth: 360, width: "100%", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28, paddingTop: 8 }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 60, height: 60, borderRadius: "var(--radius-lg)",
            background: "var(--green-600)", marginBottom: 14, boxShadow: "0 4px 16px rgba(22,163,74,0.3)" }}>
            <span style={{ fontSize: 30 }}>🏠</span>
          </div>
          <h1 style={{ margin: "0 0 4px", fontSize: "var(--font-size-2xl)", fontWeight: 700,
            color: "var(--slate-900)", letterSpacing: "-0.04em" }}>
            ALLOmaison
          </h1>
          <p style={{ margin: 0, color: "var(--slate-500)", fontSize: "var(--font-size-sm)" }}>
            Que souhaitez-vous faire ?
          </p>
        </div>

        {/* Action cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          {actions.map((a, i) => (
            <button key={i} onClick={a.onClick}
              style={{ display: "flex", alignItems: "center", gap: 14,
                background: "var(--white)", border: "1.5px solid var(--slate-100)",
                borderRadius: "var(--radius-lg)", padding: "14px 16px",
                cursor: "pointer", textAlign: "left", transition: "border-color 0.15s, box-shadow 0.15s",
                boxShadow: "var(--shadow-sm)" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--slate-200)"; e.currentTarget.style.boxShadow = "var(--shadow-md)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--slate-100)"; e.currentTarget.style.boxShadow = "var(--shadow-sm)"; }}>
              <div style={{ width: 44, height: 44, borderRadius: "var(--radius-sm)",
                background: "var(--slate-50)", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                {a.icon}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: "0 0 2px", fontWeight: 600, fontSize: "var(--font-size-base)",
                  color: "var(--slate-800)" }}>{a.label}</p>
                <p style={{ margin: 0, fontSize: "var(--font-size-xs)", color: "var(--slate-400)", lineHeight: 1.5 }}>
                  {a.desc}
                </p>
              </div>
              <span style={{ color: "var(--slate-300)", fontSize: 18 }}>›</span>
            </button>
          ))}
        </div>

        {/* Install */}
        {!installed && (
          <button onClick={handleInstall}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              width: "100%", padding: "12px", background: "var(--slate-800)", color: "var(--white)",
              border: "none", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)",
              fontWeight: 500, cursor: "pointer", marginBottom: 10 }}>
            📲 Installer l'application
          </button>
        )}

        {installed && (
          <div className="am-success-box" style={{ marginBottom: 10, textAlign: "center" }}>
            Application installée ✓
          </div>
        )}

        {/* Guide installation */}
        {showGuide && (
          <div style={{ background: "var(--purple-50)", borderRadius: "var(--radius-md)",
            padding: "14px 16px", marginBottom: 10, fontSize: "var(--font-size-sm)",
            color: "var(--purple-600)", border: "1px solid #e9d5ff" }}>
            <p style={{ fontWeight: 600, margin: "0 0 8px" }}>Comment installer</p>
            {/Android/i.test(navigator.userAgent) ? (
              <ol style={{ margin: 0, paddingLeft: 16, lineHeight: 1.9 }}>
                <li>Appuyez sur les <strong>3 points ⋮</strong></li>
                <li>Sélectionnez <strong>"Ajouter à l'écran d'accueil"</strong></li>
                <li>Confirmez en appuyant sur <strong>"Ajouter"</strong></li>
              </ol>
            ) : (
              <ol style={{ margin: 0, paddingLeft: 16, lineHeight: 1.9 }}>
                <li>Appuyez sur <strong>Partager</strong> 📤</li>
                <li>Sélectionnez <strong>"Sur l'écran d'accueil"</strong></li>
                <li>Confirmez en appuyant sur <strong>"Ajouter"</strong></li>
              </ol>
            )}
          </div>
        )}

        {/* Déconnexion */}
        <button onClick={() => signOut(auth)}
          style={{ width: "100%", padding: "11px", background: "none",
            border: "1.5px solid var(--slate-200)", borderRadius: "var(--radius-md)",
            color: "var(--slate-400)", fontSize: "var(--font-size-sm)", cursor: "pointer" }}>
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
