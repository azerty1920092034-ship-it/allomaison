import { useState, useEffect } from "react";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";

export default function RoleChoice({ setEcran }) {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    // Détecte si mobile
    setIsMobile(/Android|iPhone|iPad/i.test(navigator.userAgent));

    // Capture l'événement d'installation
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Vérifie si déjà installé
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === "accepted") {
        setInstalled(true);
        setInstallPrompt(null);
      }
    } else {
      // Affiche le guide manuel
      setShowGuide(true);
    }
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: "100vh", background: "#f0fdf4"
    }}>
      <div style={{
        background: "white", padding: "40px", borderRadius: "16px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.1)", width: "340px",
        textAlign: "center"
      }}>
        <h1 style={{ color: "#16a34a", marginBottom: "8px" }}>🏠 ALLOmaison</h1>
        <p style={{ color: "#666", marginBottom: "32px" }}>
          Que voulez-vous faire ?
        </p>

        <button onClick={() => setEcran("carte")}
          style={{ width: "100%", padding: "16px", marginBottom: "16px",
            background: "#16a34a", color: "white", border: "none",
            borderRadius: "12px", fontSize: "16px", cursor: "pointer" }}>
          🔍 Localiser une maison
        </button>

        <button onClick={() => setEcran("formulaire")}
          style={{ width: "100%", padding: "16px", marginBottom: "24px",
            background: "#0284c7", color: "white", border: "none",
            borderRadius: "12px", fontSize: "16px", cursor: "pointer" }}>
          🏡 Mettre ma maison en ligne
        </button>

        {/* Bouton installation */}
        {!installed && (
          <button onClick={handleInstall}
            style={{ width: "100%", padding: "14px", marginBottom: "16px",
              background: "#7c3aed", color: "white", border: "none",
              borderRadius: "12px", fontSize: "15px", cursor: "pointer" }}>
            📲 Installer l'application
          </button>
        )}

        {installed && (
          <div style={{ marginBottom: "16px", padding: "10px",
            background: "#f0fdf4", borderRadius: "10px",
            fontSize: "13px", color: "#16a34a" }}>
            ✅ Application installée !
          </div>
        )}

        {/* Guide manuel pour mobile */}
        {showGuide && (
          <div style={{
            marginBottom: "16px", padding: "14px",
            background: "#f5f3ff", borderRadius: "12px",
            fontSize: "13px", color: "#5b21b6", textAlign: "left",
            border: "1px solid #ddd8fe"
          }}>
            <p style={{ fontWeight: "bold", marginBottom: "8px" }}>
              📱 Comment installer :
            </p>
            {/Android/i.test(navigator.userAgent) ? (
              <ol style={{ margin: 0, paddingLeft: "16px", lineHeight: "1.8" }}>
                <li>Clique sur les <strong>3 points ⋮</strong> en haut à droite</li>
                <li>Sélectionne <strong>"Ajouter à l'écran d'accueil"</strong></li>
                <li>Clique <strong>"Ajouter"</strong> ✅</li>
              </ol>
            ) : (
              <ol style={{ margin: 0, paddingLeft: "16px", lineHeight: "1.8" }}>
                <li>Clique sur <strong>Partager</strong> 📤</li>
                <li>Sélectionne <strong>"Sur l'écran d'accueil"</strong></li>
                <li>Clique <strong>"Ajouter"</strong> ✅</li>
              </ol>
            )}
            <p style={{ marginTop: "8px", fontSize: "12px", color: "#888" }}>
              L'icône AlloMaison apparaîtra sur ton écran !
            </p>
          </div>
        )}

        <p onClick={() => signOut(auth)}
          style={{ color: "#999", fontSize: "13px", cursor: "pointer" }}>
          Se déconnecter
        </p>
      </div>
    </div>
  );
}