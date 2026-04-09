import { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import AuthPage        from "./pages/AuthPage";
import RoleChoice      from "./pages/RoleChoice";
import MapPage         from "./pages/MapPage";
import ListingForm     from "./pages/ListingForm";
import AdminPage       from "./pages/AdminPage";
import ProprietaireDashboard from "./pages/ProprietaireDashboard";
import "./App.css";

const ADMIN_EMAIL = "appsk1653@gmail.com";

function App() {
  const [user, setUser]       = useState(null);
  const [role, setRole]       = useState(null);   // "proprietaire" | null
  const [ecran, setEcran]     = useState("choix");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u && u.email !== ADMIN_EMAIL) {
        // Charge le rôle depuis Firestore
        try {
          const snap = await getDoc(doc(db, "users", u.uid));
          if (snap.exists()) setRole(snap.data().role || null);
          else setRole(null);
        } catch {
          setRole(null);
        }
      } else {
        setRole(null);
      }
      if (!u) setEcran("choix");
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ── Écran de chargement ───────────────────────────────────────────────────
  if (loading) return (
    <div style={{
      display: "flex", alignItems: "center",
      justifyContent: "center", height: "100vh", background: "#f0fdf4",
    }}>
      <p style={{ color: "#16a34a", fontSize: "18px" }}>🏠 Chargement...</p>
    </div>
  );

  // ── Routing ───────────────────────────────────────────────────────────────
  if (!user)                      return <AuthPage />;
  if (user.email === ADMIN_EMAIL) return <AdminPage />;
  if (role === "proprietaire")    return <ProprietaireDashboard />;

  // Visiteur classique (cherche une maison)
  if (ecran === "carte")      return <MapPage setEcran={setEcran} />;
  if (ecran === "formulaire") return <ListingForm onPublished={() => setEcran("carte")} />;
  return <RoleChoice setEcran={setEcran} />;
}

export default App;