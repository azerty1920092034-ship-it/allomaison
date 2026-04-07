import { useState, useEffect } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import AuthPage from "./pages/AuthPage";
import RoleChoice from "./pages/RoleChoice";
import MapPage from "./pages/MapPage";
import ListingForm from "./pages/ListingForm";
import AdminPage from "./pages/AdminPage";
import "./App.css";

const ADMIN_EMAIL = "appsk1653@gmail.com";

function App() {
  const [user, setUser] = useState(null);
  const [ecran, setEcran] = useState("choix");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) setEcran("choix");
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) return (
    <div style={{
      display: "flex", alignItems: "center",
      justifyContent: "center", height: "100vh", background: "#f0fdf4"
    }}>
      <p style={{ color: "#16a34a", fontSize: "18px" }}>🏠 Chargement...</p>
    </div>
  );

  if (!user) return <AuthPage />;
  if (user.email === ADMIN_EMAIL) return <AdminPage />;
  if (ecran === "choix") return <RoleChoice setEcran={setEcran} />;
  if (ecran === "carte") return <MapPage setEcran={setEcran} />;
  if (ecran === "formulaire") return (
    <ListingForm onPublished={() => setEcran("carte")} />
  );

  return <RoleChoice setEcran={setEcran} />;
}

export default App;