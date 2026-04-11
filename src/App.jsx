import { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import AuthPage from "./pages/AuthPage";
import RoleChoice from "./pages/RoleChoice";
import MapPage from "./pages/MapPage";
import ListingForm from "./pages/ListingForm";
import AdminPage from "./pages/AdminPage";
import ProprietaireDashboard from "./pages/ProprietaireDashboard";
import "./App.css";

const ADMIN_EMAIL = "appsk1653@gmail.com";

function App() {
  const [user, setUser] = useState(null);
  const [ecran, setEcran] = useState("choix");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      // Réinitialise toujours sur "choix" à chaque connexion
      if (!u) setEcran("choix");
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) return (
    <div style={{
      display: "flex", alignItems: "center",
      justifyContent: "center", height: "100vh", background: "#f0fdf4",
    }}>
      <p style={{ color: "#16a34a", fontSize: "18px" }}>🏠 Chargement...</p>
    </div>
  );

  if (!user) return <AuthPage />;
  if (user.email === ADMIN_EMAIL) return <AdminPage />;

  // ✅ Tout utilisateur connecté voit d'abord le choix
  return (
  <>
    <div style={{ display: ecran === "choix" ? "block" : "none" }}>
      <RoleChoice setEcran={setEcran} />
    </div>
    {ecran === "carte" ? (
  <MapPage setEcran={setEcran} user={user} />
) : null}
    {ecran === "dashboard" && <ProprietaireDashboard setEcran={setEcran} />}
    {ecran === "formulaire" && <ListingForm onPublished={() => setEcran("carte")} />}
  </>
);
}

export default App;