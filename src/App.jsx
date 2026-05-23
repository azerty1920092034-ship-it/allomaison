import { useState, useEffect, useRef } from "react";
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
  const [user, setUser]                   = useState(undefined); // undefined = pas encore connu
  const [ecran, setEcran]                 = useState("choix");
  const [carteChargee, setCarteChargee]   = useState(false);
  const premierAppel                      = useRef(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      // Firebase appelle onAuthStateChanged immédiatement au montage
      // puis une 2ème fois si la session change — on ignore le 2ème appel
      // si l'utilisateur est déjà connu et n'a pas changé
      if (!premierAppel.current && u?.uid === user?.uid) return;
      premierAppel.current = false;

      setUser(u ?? null);
      if (!u) setEcran("choix");
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (ecran === "carte") {
      setCarteChargee(true);
      setTimeout(() => window.dispatchEvent(new Event("resize")), 50);
    }
  }, [ecran]);

  // undefined = Firebase n'a pas encore répondu
  if (user === undefined) return (
    <div style={{ display: "flex", alignItems: "center",
      justifyContent: "center", height: "100vh", background: "#f0fdf4" }}>
      <p style={{ color: "#16a34a", fontSize: "18px" }}>🏠 Chargement...</p>
    </div>
  );

  if (!user) return <AuthPage />;
  if (user.email === ADMIN_EMAIL) return <AdminPage />;

  return (
    <>
      {ecran === "choix" && <RoleChoice setEcran={setEcran} />}

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