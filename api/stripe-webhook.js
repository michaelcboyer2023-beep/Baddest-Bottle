module.exports.config = {
  api: { bodyParser: false }
};

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

async function updateOrderStatus(orderId, patch) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    console.warn("Firebase admin env missing; skipping Firestore update for", orderId);
    return;
  }

  let admin;
  try {
    admin = require("firebase-admin");
  } catch {
    console.warn("firebase-admin not installed");
    return;
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey })
    });
  }

  const db = admin.firestore();
  const ref = db.collection(process.env.FIRESTORE_ORDERS_COLLECTION || "orders").doc(orderId);
  await ref.set(
    {
      ...patch,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    },
    { merge: true }
  );
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }
  if (!stripeSecret || !webhookSecret) {
    return res.status(503).send("Stripe webhook not configured");
  }

  const Stripe = require("stripe");
  const stripe = new Stripe(stripeSecret);

  const sig = req.headers["stripe-signature"];
  let event;
  const rawBody = req.rawBody || req.body;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature error", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const orderId = session.metadata && session.metadata.orderId;
    if (orderId) {
      await updateOrderStatus(orderId, {
        status: "label_generating",
        stripeSessionId: session.id,
        paidAt: new Date().toISOString(),
        statusHistory: [{ status: "label_generating", at: new Date().toISOString() }]
      });
    }
  }

  return res.status(200).json({ received: true });
};
