import { useState } from "react";
import { auth, db } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import "../styles/design-system.css";
import "./AuthPage.css";

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
    if (!email.trim())    return setError("Entrez votre adresse email.");
    if (!password.trim()) return setError("Entrez un mot de passe.");
    if (password.length < 6) return setError("Le mot de passe doit faire au moins 6 caractères.");
    setLoading(true);
    try {
      if (isNew) {
        const wp = whatsapp.replace(/[\s\-\+]/g, "");
        if (!/^\d{8,15}$/.test(wp)) {
          setLoading(false);
          return setError("Numéro WhatsApp invalide. Ex: 22967000000");
        }
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await sendEmailVerification(cred.user);
        await setDoc(doc(db, "users", cred.user.uid), {
          email: email.trim(), whatsapp: wp, role: "proprietaire",
          dateInscription: new Date(), actif: true, emailVerifie: false,
        });
        setVerifEnvoye(true);
      } else {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        if (!cred.user.emailVerified) {
          await sendEmailVerification(cred.user);
          setError("Email non vérifié. Un nouveau lien de confirmation a été envoyé.");
          await auth.signOut();
          setLoading(false);
          return;
        }
        if (whatsapp.trim()) {
          const wp = whatsapp.replace(/[\s\-\+]/g, "");
          await setDoc(doc(db, "users", cred.user.uid), { email: email.trim(), whatsapp: wp }, { merge: true });
        }
      }
    } catch (e) {
      const msg = {
        "auth/email-already-in-use": "Cet email est déjà utilisé. Connectez-vous.",
        "auth/invalid-email":        "Adresse email invalide.",
        "auth/wrong-password":       "Mot de passe incorrect.",
        "auth/user-not-found":       "Aucun compte avec cet email.",
        "auth/too-many-requests":    "Trop de tentatives. Réessayez dans quelques minutes.",
        "auth/invalid-credential":   "Email ou mot de passe incorrect.",
      }[e.code] || e.message;
      setError(msg);
    }
    setLoading(false);
  };

  const handleReset = async () => {
    if (!email.trim()) return setError("Entrez votre email pour réinitialiser.");
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetSent(true); setError("");
    } catch { setError("Email introuvable."); }
  };

  const switchMode = () => {
    setIsNew(!isNew);
    setError("");
    setWhatsapp("");
    setShowReset(false);
    setResetSent(false);
  };

  /* ── Écran confirmation email ── */
  if (verifEnvoye) return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-verif">
          <div className="auth-verif-icon">📧</div>
          <h2 className="auth-verif-title">Vérifiez votre email</h2>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)",
            marginBottom: 6 }}>Lien envoyé à</p>
          <p className="auth-verif-email">{email}</p>
          <p className="auth-verif-hint">
            Cliquez sur le lien dans l'email, puis revenez vous connecter.
          </p>
          <button className="btn-primary"
            onClick={() => { setVerifEnvoye(false); setIsNew(false); }}>
            Aller à la connexion
          </button>
        </div>
      </div>
    </div>
  );

  /* ── Formulaire principal ── */
  return (
    <div className="auth-screen">
      <div className="auth-card">

        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon-wrap">🏠</div>
          <div className="auth-logo-text">
            ALLO<span>maison</span>
          </div>
        </div>

        {/* Onglets */}
        <div className="auth-tabs" role="tablist">
          <button
            className={`auth-tab${isNew ? "" : " active"}`}
            role="tab"
            onClick={() => !loading && switchMode()}
          >
            Connexion
          </button>
          <button
            className={`auth-tab${isNew ? " active" : ""}`}
            role="tab"
            onClick={() => !loading && switchMode()}
          >
            Inscription
          </button>
        </div>

        {/* Champs */}
        <div className="auth-fields">

          {/* Email */}
          <div className="auth-field">
            <label className="field-label">Adresse email</label>
            <input
              className="input"
              type="email"
              placeholder="kofficlean@gmail.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>

          {/* WhatsApp — inscription uniquement */}
          {isNew && (
            <div className="auth-field">
              <label className="field-label">
                Numéro WhatsApp <span style={{ color: "var(--red-500)" }}>*</span>
              </label>
              <div className="input-with-prefix">
                <span className="input-prefix">🇧🇯</span>
                <input
                  className="input"
                  type="tel"
                  placeholder="22967000000"
                  value={whatsapp}
                  onChange={(e) => { setWhatsapp(e.target.value); setError(""); }}
                />
              </div>
              <span className="field-hint">
                Les locataires vous contacteront via ce numéro.
              </span>
            </div>
          )}

          {/* Mot de passe */}
          <div className="auth-field">
            <label className="field-label">Mot de passe</label>
            <div className="input-with-suffix">
              <input
                className="input"
                type={showPassword ? "text" : "password"}
                placeholder={isNew ? "Minimum 6 caractères" : "Votre mot de passe"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
              <button
                className="input-suffix-btn"
                onClick={() => setShowPassword(!showPassword)}
                type="button"
              >
                {showPassword ? "Masquer" : "Afficher"}
              </button>
            </div>
          </div>
        </div>

        {/* Erreur */}
        {error && (
          <div className="error-box fade-in" style={{ marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Bouton principal */}
        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <span className="btn-loading-dots">
              <span /><span /><span />
            </span>
          ) : isNew ? "Créer mon compte" : "Se connecter"}
        </button>

        {/* Reset mot de passe */}
        {!isNew && (
          <div className="auth-reset">
            {!showReset ? (
              <button className="auth-link" onClick={() => setShowReset(true)}>
                Mot de passe oublié ?
              </button>
            ) : resetSent ? (
              <span className="auth-success">✓ Email de réinitialisation envoyé !</span>
            ) : (
              <button className="auth-link" onClick={handleReset}>
                Envoyer le lien de réinitialisation
              </button>
            )}
          </div>
        )}

        {/* Switch mode */}
        <div className="auth-switch">
          <button className="auth-switch-btn" onClick={switchMode}>
            {isNew
              ? "Déjà un compte ? Se connecter →"
              : "Pas encore de compte ? S'inscrire →"}
          </button>
        </div>

      </div>
    </div>
  );
}