import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import "../styles/design-system.css";
import "./RoleChoice.css";

const ACTIONS = (aMaisons, setEcran) => [
  {
    icon: "🔍", cls: "role-action-primary",
    label: "Trouver une maison",
    desc:  "Explorez les logements disponibles sur la carte",
    onClick: () => setEcran("carte"),
  },
  {
    icon: "📅", cls: "role-action-blue",
    label: "Mes demandes de visite",
    desc:  "Suivez l'état de vos réservations",
    onClick: () => setEcran("locataire"),
  },
  ...(aMaisons ? [{
    icon: "🏡", cls: "role-action-amber",
    label: "Espace propriétaire",
    desc:  "Gérez vos réservations reçues",
    onClick: () => setEcran("dashboard"),
  }] : []),
  {
    icon: "➕", cls: "role-action-purple",
    label: "Mettre ma maison en ligne",
    desc:  "Publiez votre logement en quelques minutes",
    onClick: () => setEcran("formulaire"),
  },
];

export default function RoleChoice({ setEcran }) {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled]         = useState(false);
  const [showGuide, setShowGuide]         = useState(false);
  const [aMaisons, setAMaisons]           = useState(false);
  const [chargement, setChargement]       = useState(true);
  const [userEmail, setUserEmail]         = useState("");

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);

    const uid = auth.currentUser?.uid;
    setUserEmail(auth.currentUser?.email || "");

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
      setShowGuide(!showGuide);
    }
  };

  /* ── Loader ── */
  if (chargement) return (
    <div className="role-loader">
      <div className="role-loader-icon">🏠</div>
      <div className="role-loader-dots">
        <div className="role-loader-dot" />
        <div className="role-loader-dot" />
        <div className="role-loader-dot" />
      </div>
    </div>
  );

  const actions = ACTIONS(aMaisons, setEcran);

  return (
    <div className="role-screen">
      <div className="role-inner">

        {/* ── Header ── */}
        <div className="role-header">
          <div className="role-logo-icon-wrap">🏠</div>
          <h1 className="role-logo-text">
            ALLO<span>maison</span>
          </h1>
          <p className="role-logo-sub">Que souhaitez-vous faire ?</p>
        </div>

        {/* ── Actions ── */}
        <div className="role-actions">
          {actions.map((a, i) => (
            <button
              key={i}
              className={`role-action-btn ${a.cls}`}
              onClick={a.onClick}
            >
              <div className="role-action-icon">{a.icon}</div>
              <div className="role-action-text">
                <p className="role-action-label">{a.label}</p>
                <p className="role-action-desc">{a.desc}</p>
              </div>
              <svg className="role-action-arrow" width="16" height="16"
                viewBox="0 0 16 16" fill="none">
                <path d="M6 4l4 4-4 4" stroke="currentColor"
                  strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ))}
        </div>

        {/* ── Installer l'app ── */}
        {!installed && (
          <button className="role-install-btn" onClick={handleInstall}>
            📲 Installer l'application
          </button>
        )}

        {installed && (
          <div className="role-installed">✓ Application installée</div>
        )}

        {/* Guide installation */}
        {showGuide && (
          <div className="role-guide">
            <p className="role-guide-title">Comment installer</p>
            {/Android/i.test(navigator.userAgent) ? (
              <ol className="role-guide-steps">
                <li>Appuyez sur les <strong>3 points ⋮</strong></li>
                <li>Sélectionnez <strong>"Ajouter à l'écran d'accueil"</strong></li>
                <li>Confirmez en appuyant sur <strong>"Ajouter"</strong></li>
              </ol>
            ) : (
              <ol className="role-guide-steps">
                <li>Appuyez sur <strong>Partager</strong> 📤</li>
                <li>Sélectionnez <strong>"Sur l'écran d'accueil"</strong></li>
                <li>Confirmez en appuyant sur <strong>"Ajouter"</strong></li>
              </ol>
            )}
          </div>
        )}

        {/* ── Déconnexion ── */}
        <button className="role-signout-btn" onClick={() => signOut(auth)}>
          Se déconnecter
        </button>

        {userEmail && (
          <p className="role-user-email">{userEmail}</p>
        )}

      </div>
    </div>
  );
}