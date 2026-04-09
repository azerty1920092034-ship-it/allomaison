import { useState } from "react";
import { auth, db } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

export default function AuthPage() {
  const [isNew, setIsNew]             = useState(true);
  const [email, setEmail]             = useState("");
  const [whatsapp, setWhatsapp]       = useState("");
  const [password, setPassword]       = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");

  const handleSubmit = async () => {
    setError("");

    // ── Validations ───────────────────────────────────────────────────────────
    if (!email.trim())    return setError("❌ Entrez votre adresse email.");
    if (!password.trim()) return setError("❌ Entrez un mot de passe.");
    if (password.length < 6) return setError("❌ Le mot de passe doit faire au moins 6 caractères.");
    if (isNew) {
      const wp = whatsapp.replace(/[\s\-\+]/g, "");
      if (!/^\d{8,15}$/.test(wp))
        return setError("❌ Numéro WhatsApp invalide. Ex: 22967000000");
    }

    setLoading(true);
    try {
      if (isNew) {
        // ── Inscription ───────────────────────────────────────────────────────
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const wp   = whatsapp.replace(/[\s\-\+]/g, "");
        // Crée le profil dans Firestore
        await setDoc(doc(db, "users", cred.user.uid), {
          email:     email.trim(),
          whatsapp:  wp,
          role:      "proprietaire",
          dateInscription: new Date(),
          actif:     true,
        });
      } else {
        // ── Connexion ─────────────────────────────────────────────────────────
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (e) {
      const msg = {
        "auth/email-already-in-use":  "❌ Cet email est déjà utilisé. Connectez-vous.",
        "auth/invalid-email":         "❌ Adresse email invalide.",
        "auth/wrong-password":        "❌ Mot de passe incorrect.",
        "auth/user-not-found":        "❌ Aucun compte avec cet email.",
        "auth/too-many-requests":     "❌ Trop de tentatives. Réessayez dans quelques minutes.",
        "auth/invalid-credential":    "❌ Email ou mot de passe incorrect.",
      }[e.code] || ("❌ Erreur : " + e.message);
      setError(msg);
    }
    setLoading(false);
  };

  // ── Styles réutilisables ──────────────────────────────────────────────────
  const inputStyle = (hasError) => ({
    width: "100%", padding: "11px 12px",
    border: hasError ? "1px solid #dc2626" : "1px solid #ddd",
    borderRadius: "8px", fontSize: "14px",
    boxSizing: "border-box", outline: "none",
    transition: "border-color .2s",
  });

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: "100vh", background: "#f0fdf4",
      padding: "20px",
    }}>
      <div style={{
        background: "white", padding: "40px 36px", borderRadius: "20px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.1)", width: "100%", maxWidth: "360px",
      }}>
        {/* ── En-tête ── */}
        <h1 style={{ color: "#16a34a", textAlign: "center", marginBottom: "4px", fontSize: "26px" }}>
          🏠 ALLOmaison
        </h1>
        <p style={{ textAlign: "center", color: "#666", marginBottom: "28px", fontSize: "14px" }}>
          {isNew ? "Créer un compte propriétaire" : "Connexion propriétaire"}
        </p>

        {/* ── Email ── */}
        <div style={{ marginBottom: "12px" }}>
          <p style={{ margin: "0 0 4px", fontSize: "13px", color: "#555" }}>Adresse email</p>
          <input
            type="email"
            placeholder="Ex: kofficlean@gmail.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            style={inputStyle(false)}
          />
        </div>

        {/* ── WhatsApp (inscription uniquement) ── */}
        {isNew && (
          <div style={{ marginBottom: "12px" }}>
            <p style={{ margin: "0 0 4px", fontSize: "13px", color: "#555" }}>
              Numéro WhatsApp
            </p>
            <div style={{ position: "relative" }}>
              <span style={{
                position: "absolute", left: "12px", top: "50%",
                transform: "translateY(-50%)", fontSize: "13px", color: "#888",
              }}>🇧🇯</span>
              <input
                type="tel"
                placeholder="Ex: 22967000000"
                value={whatsapp}
                onChange={(e) => { setWhatsapp(e.target.value); setError(""); }}
                style={{ ...inputStyle(false), paddingLeft: "36px" }}
              />
            </div>
            <p style={{ fontSize: "11px", color: "#999", margin: "4px 0 0" }}>
              Les locataires vous contacteront via ce numéro.
            </p>
          </div>
        )}

        {/* ── Mot de passe ── */}
        <div style={{ marginBottom: "20px" }}>
          <p style={{ margin: "0 0 4px", fontSize: "13px", color: "#555" }}>Mot de passe</p>
          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder={isNew ? "Minimum 6 caractères" : "Votre mot de passe"}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              style={{ ...inputStyle(false), paddingRight: "80px" }}
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute", right: "10px", top: "50%",
                transform: "translateY(-50%)", background: "none",
                border: "none", cursor: "pointer", fontSize: "12px",
                color: "#16a34a", fontWeight: "bold", padding: "0",
              }}>
              {showPassword ? "Masquer" : "Afficher"}
            </button>
          </div>
        </div>

        {/* ── Erreur ── */}
        {error && (
          <div style={{
            background: "#fef2f2", border: "1px solid #fecaca",
            borderRadius: "8px", padding: "10px 12px", marginBottom: "16px",
            fontSize: "13px", color: "#dc2626", lineHeight: "1.5",
          }}>
            {error}
          </div>
        )}

        {/* ── Bouton principal ── */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: "100%", padding: "13px",
            background: loading ? "#86efac" : "#16a34a",
            color: "white", border: "none", borderRadius: "10px",
            fontSize: "15px", cursor: loading ? "not-allowed" : "pointer",
            fontWeight: "bold", transition: "background .2s",
          }}>
          {loading
            ? "⏳ Chargement..."
            : isNew ? "Créer mon compte 🏡" : "Se connecter"}
        </button>

        {/* ── Switcher inscription / connexion ── */}
        <p
          onClick={() => { setIsNew(!isNew); setError(""); }}
          style={{
            textAlign: "center", marginTop: "18px", color: "#16a34a",
            cursor: "pointer", fontSize: "13px", textDecoration: "underline",
          }}>
          {isNew
            ? "Déjà un compte ? Se connecter"
            : "Pas encore de compte ? S'inscrire"}
        </p>
      </div>
    </div>
  );
}