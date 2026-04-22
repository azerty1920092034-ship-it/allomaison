import { useState, useEffect } from "react";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";

export default function RoleChoice({ setEcran }) {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
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
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setInstalled(true);
      setInstallPrompt(null);
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

        {/* Bouton installation PWA */}
        {!installed && installPrompt && (
          <button onClick={handleInstall}
            style={{ width: "100%", padding: "14px", marginBottom: "16px",
              background: "#7c3aed", color: "white", border: "none",
              borderRadius: "12px", fontSize: "15px", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: "8px" }}>
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

        <p onClick={() => signOut(auth)}
          style={{ color: "#999", fontSize: "13px", cursor: "pointer" }}>
          Se déconnecter
        </p>
      </div>
    </div>
  );
}