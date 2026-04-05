import { auth } from "../firebase";
import { signOut } from "firebase/auth";

export default function RoleChoice({ setEcran }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: "100vh", background: "#f0fdf4"
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

        <p onClick={() => signOut(auth)}
          style={{ color: "#999", fontSize: "13px", cursor: "pointer" }}>
          Se déconnecter
        </p>
      </div>
    </div>
  );
}