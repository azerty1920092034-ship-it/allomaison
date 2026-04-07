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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) setEcran("choix");
    });
    return () => unsub();
  }, []);

  if (!user) return <AuthPage />;
  if (user.email === ADMIN_EMAIL) return <AdminPage />;
  if (ecran === "choix") return <RoleChoice setEcran={setEcran} />;
  if (ecran === "carte") return <MapPage setEcran={setEcran} />;
  if (ecran === "formulaire") return (
    <ListingForm onPublished={() => setEcran("carte")} />
  );
}

export default App;