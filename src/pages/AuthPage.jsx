import { useState } from "react";
import { auth, db } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import "../theme.css";

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
    if (!email.trim()) return setError("Entrez votre adresse email.");
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

  if (verifEnvoye) return (
    <div className="am-loading" style={{ padding: "20px", background: "var(--page-bg)" }}>
      <div className="am-card" style={{ maxWidth: 360, width: "100%", textAlign: "center", padding: "40px 32px" }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>📧</div>
        <h2 style={{ margin: "0 0 10px", color: "var(--green-700)", fontSize: "var(--font-size-xl)", fontWeight: 700 }}>
          Vérifiez votre email
        </h2>
        <p style={{ color: "var(--slate-500)", fontSize: "var(--font-size-sm)", margin: "0 0 6px" }}>
          Lien de confirmation envoyé à
        </p>
        <p style={{ color: "var(--green-600)", fontWeight: 600, margin: "0 0 20px", wordBreak: "break-all" }}>{email}</p>
        <p style={{ color: "var(--slate-400)", fontSize: "var(--font-size-sm)", margin: "0 0 28px", lineHeight: 1.6 }}>
          Cliquez sur le lien dans l'email, puis revenez vous connecter.
        </p>
        <button className="am-btn am-btn-primary"
          onClick={() => { setVerifEnvoye(false); setIsNew(false); }}>
          Aller à la connexion
        </button>
      </div>
    </div>
  );

  return (
    <div className="am-loading" style={{ padding: "20px", background: "var(--page-bg)" }}>
      <div className="am-card" style={{ maxWidth: 360, width: "100%", padding: "36px 32px" }}>

        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 52, height: 52, borderRadius: "var(--radius-md)",
            background: "var(--green-50)", marginBottom: 14 }}>
            <span style={{ fontSize: 26 }}>🏠</span>
          </div>
          <h1 style={{ margin: "0 0 4px", fontSize: "var(--font-size-xl)", fontWeight: 700,
            color: "var(--slate-900)", letterSpacing: "-0.03em" }}>
            ALLOmaison
          </h1>
          <p style={{ margin: 0, color: "var(--slate-500)", fontSize: "var(--font-size-sm)" }}>
            {isNew ? "Créer un compte" : "Connexion"}
          </p>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label className="am-label">Adresse email</label>
          <input className="am-input" type="email" placeholder="kofficlean@gmail.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
        </div>

        {isNew && (
          <div style={{ marginBottom: 14 }}>
            <label className="am-label">
              Numéro WhatsApp <span style={{ color: "var(--red-500)" }}>*</span>
            </label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                fontSize: 14, pointerEvents: "none" }}>🇧🇯</span>
              <input className="am-input" type="tel" placeholder="22967000000"
                value={whatsapp}
                onChange={(e) => { setWhatsapp(e.target.value); setError(""); }}
                style={{ paddingLeft: 40 }} />
            </div>
            <p style={{ margin: "5px 0 0", fontSize: "var(--font-size-xs)", color: "var(--slate-400)" }}>
              Les locataires vous contacteront via ce numéro.
            </p>
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <label className="am-label">Mot de passe</label>
          <div style={{ position: "relative" }}>
            <input className="am-input" type={showPassword ? "text" : "password"}
              placeholder={isNew ? "Minimum 6 caractères" : "Votre mot de passe"}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              style={{ paddingRight: 80 }} />
            <button onClick={() => setShowPassword(!showPassword)}
              style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer",
                fontSize: "var(--font-size-xs)", color: "var(--green-600)", fontWeight: 600, padding: 0 }}>
              {showPassword ? "Masquer" : "Afficher"}
            </button>
          </div>
        </div>

        {error && <div className="am-error-box" style={{ marginBottom: 16 }}>{error}</div>}

        <button className="am-btn am-btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? "Chargement…" : isNew ? "Créer mon compte" : "Se connecter"}
        </button>

        {!isNew && (
          <div style={{ marginTop: 14, textAlign: "center" }}>
            {!showReset ? (
              <button onClick={() => setShowReset(true)}
                style={{ background: "none", border: "none", color: "var(--blue-600)",
                  fontSize: "var(--font-size-sm)", cursor: "pointer" }}>
                Mot de passe oublié ?
              </button>
            ) : resetSent ? (
              <p className="am-success-box" style={{ margin: 0 }}>Email de réinitialisation envoyé !</p>
            ) : (
              <button onClick={handleReset}
                style={{ background: "none", border: "none", color: "var(--blue-600)",
                  fontSize: "var(--font-size-sm)", cursor: "pointer", textDecoration: "underline" }}>
                Envoyer un lien de réinitialisation
              </button>
            )}
          </div>
        )}

        <div style={{ marginTop: 20, textAlign: "center", borderTop: "1px solid var(--slate-100)", paddingTop: 18 }}>
          <button onClick={() => { setIsNew(!isNew); setError(""); setWhatsapp(""); }}
            style={{ background: "none", border: "none", color: "var(--green-600)",
              fontSize: "var(--font-size-sm)", cursor: "pointer", textDecoration: "underline" }}>
            {isNew ? "Déjà un compte ? Se connecter" : "Pas de compte ? S'inscrire"}
          </button>
        </div>
      </div>
    </div>
  );
}