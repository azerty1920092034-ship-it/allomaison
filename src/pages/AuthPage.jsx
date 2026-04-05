import { useState } from "react";
import { auth } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "firebase/auth";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isNew, setIsNew] = useState(true);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async () => {
    setError("");
    try {
      if (isNew) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (e) {
      setError("Erreur : " + e.message);
    }
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: "100vh", background: "#f0fdf4"
    }}>
      <div style={{
        background: "white", padding: "40px", borderRadius: "16px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.1)", width: "320px"
      }}>
        <h1 style={{ color: "#16a34a", textAlign: "center", marginBottom: "8px" }}>
          🏠 ALLOmaison
        </h1>
        <p style={{ textAlign: "center", color: "#666", marginBottom: "24px" }}>
          {isNew ? "Créer un compte" : "Se connecter"}
        </p>

        <input
          type="email"
          placeholder="Votre email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: "100%", padding: "10px", marginBottom: "12px",
            border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px",
            boxSizing: "border-box"
          }}
        />

        <div style={{ position: "relative", marginBottom: "16px" }}>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%", padding: "10px", paddingRight: "40px",
              border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px",
              boxSizing: "border-box"
            }}
          />
          <button
    onClick={() => setShowPassword(!showPassword)}
    style={{
      position: "absolute", right: "10px", top: "50%",
      transform: "translateY(-50%)", background: "none",
      border: "none", cursor: "pointer", fontSize: "13px",
      color: "#16a34a", fontWeight: "bold", padding: "0"
    }}
  >
    {showPassword ? "Masquer" : "Afficher"}
  </button>
        </div>

        {error && (
          <p style={{ color: "red", fontSize: "13px", marginBottom: "12px" }}>
            {error}
          </p>
        )}

        <button
          onClick={handleSubmit}
          style={{
            width: "100%", padding: "12px", background: "#16a34a",
            color: "white", border: "none", borderRadius: "8px",
            fontSize: "16px", cursor: "pointer"
          }}
        >
          {isNew ? "Créer mon compte" : "Se connecter"}
        </button>

        <p
          onClick={() => setIsNew(!isNew)}
          style={{
            textAlign: "center", marginTop: "16px", color: "#16a34a",
            cursor: "pointer", fontSize: "14px"
          }}
        >
          {isNew ? "Déjà un compte ? Se connecter" : "Pas de compte ? S'inscrire"}
        </p>
      </div>
    </div>
  );
}