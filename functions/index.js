const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { Resend } = require("resend");

initializeApp();
const db = getFirestore();
const resend = new Resend("re_9sxqy65i_KKfXFA6ctHubXCvc9KEK69Bk");

exports.rappelProprietaires = onSchedule("every 336 hours", async () => {
  try {
    // Récupère toutes les maisons disponibles
    const snap = await db.collection("maisons")
      .where("disponible", "==", true)
      .get();

    console.log(`${snap.docs.length} maisons trouvées`);

    for (const docSnap of snap.docs) {
      const maison = docSnap.data();
      const maisonId = docSnap.id;

      // Récupère l'email du propriétaire
      const userSnap = await db.collection("users")
        .doc(maison.proprietaireId)
        .get();

      if (!userSnap.exists) continue;

      const email = userSnap.data().email;
      if (!email) continue;

      // Envoie l'email
      await resend.emails.send({
        from: "AlloMaison <onboarding@resend.dev>",
        to: email,
        subject: "Votre maison est-elle toujours disponible ?",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #16a34a; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🏠 ALLOmaison</h1>
            </div>
            
            <h2 style="color: #333;">Bonjour !</h2>
            
            <p style="color: #555; font-size: 15px; line-height: 1.6;">
              Votre <strong>${maison.type}</strong> située à <strong>${maison.quartier}</strong> 
              est toujours visible sur ALLOmaison.
            </p>

            <p style="color: #555; font-size: 15px; line-height: 1.6;">
              Est-elle <strong>toujours disponible</strong> à la location ?
            </p>

            <div style="background: #f0fdf4; border-radius: 12px; padding: 16px; margin: 24px 0;">
              <p style="margin: 0; font-size: 14px; color: #16a34a;">
                📍 ${maison.type} — ${maison.quartier}<br/>
                💰 ${maison.prix ? Number(maison.prix).toLocaleString() + " FCFA " + maison.paiement : "Prix non renseigné"}
              </p>
            </div>

            <p style="color: #555; font-size: 15px; line-height: 1.6;">
              Si votre maison <strong>n'est plus disponible</strong>, merci de la supprimer 
              depuis votre espace propriétaire pour éviter de recevoir des appels inutiles.
            </p>

            <div style="text-align: center; margin: 32px 0;">
              <a href="https://allomaison.vercel.app" 
                style="background: #16a34a; color: white; padding: 14px 28px; 
                border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 15px;">
                Gérer ma maison →
              </a>
            </div>

            <p style="color: #999; font-size: 12px; text-align: center; margin-top: 32px;">
              ALLomaison — Cotonou, Bénin<br/>
              Vous recevez cet email car vous avez publié une maison sur ALLomaison.
            </p>
          </div>
        `,
      });

      console.log(`Email envoyé à ${email} pour maison ${maisonId}`);
    }

    console.log("Rappels envoyés avec succès !");
  } catch (error) {
    console.error("Erreur:", error);
  }
});