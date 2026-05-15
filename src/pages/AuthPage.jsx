import { useState } from "react";
import { auth, db } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

export default function AuthPage() {
  const [isNew, setIsNew]               = useState(true);
  const [email, setEmail]               = useState("");
  const [whatsapp, setWhatsapp]         = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [resetSent, setResetSent]       = useState(false);
  const [showReset, setShowReset]       = useState(false);
  const [verifEnvoye, setVerifEnvoye]   = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!email.trim()) return setError("❌ Entrez votre adresse email.");
    if (!password.trim()) return setError("❌ Entrez un mot de passe.");
    if (password.length < 6) return setError("❌ Le mot de passe doit faire au moins 6 caractères.");

    setLoading(true);
    try {
      if (isNew) {
        const wp = whatsapp.replace(/[\s\-\+]/g, "");
        if (!/^\d{8,15}$/.test(wp))
          return setError("❌ Numéro WhatsApp invalide. Ex: 22967000000");

        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);

        // Envoie email de vérification
        await sendEmailVerification(cred.user);

        await setDoc(doc(db, "users", cred.user.uid), {
          email: email.trim(),
          whatsapp: wp,
          role: "proprietaire",
          dateInscription: new Date(),
          actif: true,
          emailVerifie: false,
        });

        setVerifEnvoye(true);

      } else {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);

        // Vérifie si l'email est confirmé
        if (!cred.user.emailVerified) {
          await sendEmailVerification(cred.user);
          setError("❌ Votre email n'est pas vérifié. Un nouvel email de vérification a été envoyé.");
          await auth.signOut();
          setLoading(false);
          return;
        }

        if (whatsapp.trim()) {
          const wp = whatsapp.replace(/[\s\-\+]/g, "");
          await setDoc(doc(db, "users", cred.user.uid), {
            email: email.trim(), whatsapp: wp,
          }, { merge: true });
        }
      }
    } catch (e) {
      const msg = {
        "auth/email-already-in-use": "❌ Cet email est déjà utilisé. Connectez-vous.",
        "auth/invalid-email":        "❌ Adresse email invalide.",
        "auth/wrong-password":       "❌ Mot de passe incorrect.",
        "auth/user-not-found":       "❌ Aucun compte avec cet email.",
        "auth/too-many-requests":    "❌ Trop de tentatives. Réessayez dans quelques minutes.",
        "auth/invalid-credential":   "❌ Email ou mot de passe incorrect.",
      }[e.code] || ("❌ Erreur : " + e.message);
      setError(msg);
    }
    setLoading(false);
  };

  const handleReset = async () => {
    if (!email.trim()) return setError("❌ Entrez votre email pour réinitialiser.");
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetSent(true);
      setError("");
    } catch (e) {
      setError("❌ Email introuvable.");
    }
  };

  const inputStyle = () => ({
    width: "100%", padding: "11px 12px", border: "1px solid #ddd",
    borderRadius: "8px", fontSize: "14px",
    boxSizing: "border-box", outline: "none", transition: "border-color .2s",
  });

  // Écran confirmation email envoyé
  if (verifEnvoye) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: "100vh", background: "#f0fdf4", padding: "20px" }}>
      <div style={{ background: "white", padding: "40px 36px", borderRadius: "20px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.1)", width: "100%", maxWidth: "360px",
        textAlign: "center" }}>
        <p style={{ fontSize: "48px", margin: "0 0 16px" }}>📧</p>
        <h2 style={{ color: "#16a34a", margin: "0 0 12px" }}>Vérifiez votre email !</h2>
        <p style={{ color: "#555", fontSize: "14px", margin: "0 0 8px" }}>
          Un email de confirmation a été envoyé à :
        </p>
        <p style={{ color: "#16a34a", fontWeight: "bold", margin: "0 0 16px" }}>{email}</p>
        <p style={{ color: "#888", fontSize: "13px", margin: "0 0 24px" }}>
          Cliquez sur le lien dans l'email puis revenez vous connecter.
        </p>
        <button onClick={() => { setVerifEnvoye(false); setIsNew(false); }}
          style={{ width: "100%", padding: "13px", background: "#16a34a",
            color: "white", border: "none", borderRadius: "10px",
            fontSize: "15px", cursor: "pointer", fontWeight: "bold" }}>
          Aller à la connexion
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: "100vh", background: "#f0fdf4", padding: "20px" }}>
      <div style={{ background: "white", padding: "40px 36px", borderRadius: "20px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.1)", width: "100%", maxWidth: "360px" }}>

        <h1 style={{ color: "#16a34a", textAlign: "center", marginBottom: "4px", fontSize: "26px" }}>
          🏠 ALLOmaison
        </h1>
        <p style={{ textAlign: "center", color: "#666", marginBottom: "28px", fontSize: "14px" }}>
          {isNew ? "Créer un compte" : "Se connecter"}
        </p>

        {/* Email */}
        <div style={{ marginBottom: "12px" }}>
          <p style={{ margin: "0 0 4px", fontSize: "13px", color: "#555" }}>Adresse email</p>
          <input type="email" placeholder="Ex: kofficlean@gmail.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            style={inputStyle()} />
        </div>

        {/* WhatsApp seulement à l'inscription */}
        {isNew && (
          <div style={{ marginBottom: "12px" }}>
            <p style={{ margin: "0 0 4px", fontSize: "13px", color: "#555" }}>
              Numéro WhatsApp <span style={{ color: "#dc2626" }}>*</span>
            </p>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "12px", top: "50%",
                transform: "translateY(-50%)", fontSize: "13px", color: "#888" }}>🇧🇯</span>
              <input type="tel" placeholder="Ex: 22967000000"
                value={whatsapp}
                onChange={(e) => { setWhatsapp(e.target.value); setError(""); }}
                style={{ ...inputStyle(), paddingLeft: "36px" }} />
            </div>
            <p style={{ fontSize: "11px", color: "#999", margin: "4px 0 0" }}>
              Les locataires vous contacteront via ce numéro.
            </p>
          </div>
        )}

        {/* Mot de passe */}
        <div style={{ marginBottom: "20px" }}>
          <p style={{ margin: "0 0 4px", fontSize: "13px", color: "#555" }}>Mot de passe</p>
          <div style={{ position: "relative" }}>
            <input type={showPassword ? "text" : "password"}
              placeholder={isNew ? "Minimum 6 caractères" : "Votre mot de passe"}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              style={{ ...inputStyle(), paddingRight: "80px" }} />
            <button onClick={() => setShowPassword(!showPassword)}
              style={{ position: "absolute", right: "10px", top: "50%",
                transform: "translateY(-50%)", background: "none",
                border: "none", cursor: "pointer", fontSize: "12px",
                color: "#16a34a", fontWeight: "bold", padding: "0" }}>
              {showPassword ? "Masquer" : "Afficher"}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca",
            borderRadius: "8px", padding: "10px 12px", marginBottom: "16px",
            fontSize: "13px", color: "#dc2626", lineHeight: "1.5" }}>
            {error}
          </div>
        )}

        <button onClick={handleSubmit} disabled={loading}
          style={{ width: "100%", padding: "13px",
            background: loading ? "#86efac" : "#16a34a",
            color: "white", border: "none", borderRadius: "10px",
            fontSize: "15px", cursor: loading ? "not-allowed" : "pointer",
            fontWeight: "bold", transition: "background .2s" }}>
          {loading ? "⏳ Chargement..." : isNew ? "Créer mon compte 🏡" : "Se connecter"}
        </button>

        {/* Mot de passe oublié */}
        {!isNew && (
          <div style={{ marginTop: "12px", textAlign: "center" }}>
            {!showReset ? (
              <p onClick={() => setShowReset(true)}
                style={{ color: "#0284c7", fontSize: "13px", cursor: "pointer" }}>
                Mot de passe oublié ?
              </p>
            ) : resetSent ? (
              <p style={{ color: "#16a34a", fontSize: "13px" }}>
                ✅ Email de réinitialisation envoyé !
              </p>
            ) : (
              <button onClick={handleReset}
                style={{ background: "none", border: "none", color: "#0284c7",
                  fontSize: "13px", cursor: "pointer", textDecoration: "underline" }}>
                Envoyer un email de réinitialisation
              </button>
            )}
          </div>
        )}

        <p onClick={() => { setIsNew(!isNew); setError(""); setWhatsapp(""); }}
          style={{ textAlign: "center", marginTop: "18px", color: "#16a34a",
            cursor: "pointer", fontSize: "13px", textDecoration: "underline" }}>
          {isNew ? "Déjà un compte ? Se connecter" : "Pas encore de compte ? S'inscrire"}
        </p>
      </div>
    </div>
  );
}