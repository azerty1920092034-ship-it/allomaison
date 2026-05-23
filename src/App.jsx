import { useState, useEffect } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import AuthPage from "./pages/AuthPage";
import RoleChoice from "./pages/RoleChoice";
import MapPage from "./pages/MapPage";
import ListingForm from "./pages/ListingForm";
import AdminPage from "./pages/AdminPage";
import ProprietaireDashboard from "./pages/ProprietaireDashboard";
import LocataireDashboard from "./pages/LocataireDashboard";
import "./App.css";

const ADMIN_EMAIL = "appsk1653@gmail.com";

function App() {
  const [user, setUser]               = useState(null);
  const [ecran, setEcran]             = useState("choix");
  const [loading, setLoading]         = useState(true);
  const [carteChargee, setCarteChargee] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        // Attend que Firebase ait bien chargé le profil avant d'afficher
        await u.reload();
      }
      setUser(u);
      if (!u) setEcran("choix");
      // Petit délai pour éviter le flash de rendu
      setTimeout(() => setLoading(false), 100);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (ecran === "carte") {
      setCarteChargee(true);
      setTimeout(() => window.dispatchEvent(new Event("resize")), 50);
    }
  }, [ecran]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center",
      justifyContent: "center", height: "100vh", background: "#f0fdf4" }}>
      <p style={{ color: "#16a34a", fontSize: "18px" }}>🏠 Chargement...</p>
    </div>
  );

  if (!user) return <AuthPage />;
  if (user.email === ADMIN_EMAIL) return <AdminPage />;

  return (
    <>
      <div style={{ display: ecran === "choix" ? "block" : "none" }}>
        <RoleChoice setEcran={setEcran} />
      </div>

      {carteChargee && (
        <div style={{ display: ecran === "carte" ? "block" : "none",
          position: "fixed", inset: 0, zIndex: 1 }}>
          <MapPage setEcran={setEcran} user={user} />
        </div>
      )}

      {ecran === "dashboard"  && <ProprietaireDashboard setEcran={setEcran} />}
      {ecran === "locataire"  && <LocataireDashboard setEcran={setEcran} />}
      {ecran === "formulaire" && <ListingForm onPublished={() => setEcran("carte")} />}
    </>
  );
}

export default App;