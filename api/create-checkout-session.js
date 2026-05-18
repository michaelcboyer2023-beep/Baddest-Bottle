const stripeSecret = process.env.STRIPE_SECRET_KEY;

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!stripeSecret) {
    return res.status(503).json({
      error: "STRIPE_SECRET_KEY is not configured. Add it in Vercel project settings."
    });
  }

  const Stripe = require("stripe");
  const stripe = new Stripe(stripeSecret);

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "Invalid JSON body" });
    }
  }

  const {
    orderId,
    priceNumber,
    sizeValue,
    labelTemplate,
    email,
    successUrl,
    cancelUrl
  } = body || {};

  if (!orderId || !priceNumber) {
    return res.status(400).json({ error: "orderId and priceNumber are required" });
  }

  const siteUrl = (process.env.SITE_URL || "").replace(/\/$/, "");
  const success =
    successUrl ||
    `${siteUrl}/?checkout=success&order_id=${encodeURIComponent(orderId)}`;
  const cancel =
    cancelUrl ||
    `${siteUrl}/?checkout=cancel&order_id=${encodeURIComponent(orderId)}`;

  const wrapLabel =
    labelTemplate === "halfWrap" ? "Half wrap label" : "Full wrap label";
  const sizeLabel = sizeValue ? `${sizeValue}" bottle` : "Custom bottle";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: Math.max(50, Math.round(Number(priceNumber) * 100)),
            product_data: {
              name: `BADDEST BOTTLE — ${sizeLabel}`,
              description: `${wrapLabel} · Order ${orderId}`
            }
          }
        }
      ],
      metadata: {
        orderId: String(orderId),
        sizeValue: String(sizeValue || ""),
        labelTemplate: String(labelTemplate || "fullWrap")
      },
      success_url: success,
      cancel_url: cancel
    });

    return res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("Stripe checkout error", err);
    return res.status(500).json({ error: err.message || "Checkout failed" });
  }
};
