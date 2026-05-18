# BADDEST BOTTLE

Custom reusable bottle designer, community gallery, and ecommerce flow aligned with the brand strategy guide.

## Recommended platform stack

| Layer | Choice | Why |
|--------|--------|-----|
| **Hosting** | [Vercel](https://vercel.com) | Fast static deploy for `index.html`, serverless `/api` for Stripe, preview URLs, custom domain |
| **Payments** | [Stripe Checkout](https://stripe.com) | Apple/Google Pay, webhooks, scales with orders |
| **Backend** | [Firebase](https://firebase.google.com) | Auth (already wired), Firestore orders, Storage for uploads & production files |
| **AI images** | Cloudflare Worker + OpenAI (when ready) | Worker proxy already referenced in the app; add OpenAI Image API for production quality |
| **Media** | Cloudinary (later) | User uploads, transforms, CDN |
| **Email** | Klaviyo (later) | Post-purchase, challenges, drops |
| **Shipping** | ShipStation + tracking page (later) | Label generation after payment |

**Production hosting is Vercel** (static site + Stripe API routes). GitHub Pages is optional for preview-only mirrors without checkout.

## What’s in this repo

- **`index.html`** — Full product: AI builder (full/half wrap), uploads, Social feed, The Baddest hall, landing sections (hero, benefits, sustainability, apparel teaser), cart, Firebase auth
- **`api/create-checkout-session.js`** — Stripe Checkout session (Vercel serverless)
- **`api/stripe-webhook.js`** — Marks orders paid / moves status (needs Firebase Admin env vars)

## Deploy to Vercel (recommended)

1. Import this repo in Vercel.
2. Copy [`.env.example`](.env.example) values into **Project → Settings → Environment Variables**.
3. Set `SITE_URL` to your production URL (e.g. `https://baddestbottle.com`).
4. In Stripe Dashboard → Developers → Webhooks, add endpoint:  
   `https://YOUR_DOMAIN/api/stripe-webhook`  
   Event: `checkout.session.completed` → copy signing secret to `STRIPE_WEBHOOK_SECRET`.
5. Deploy. Open the site → **Build** → design → **Continue to Checkout**.

## Firebase setup

1. Project **`baddest-bottle`** (config is already in `index.html`).
2. Enable **Authentication** (Google, email), **Firestore**, **Storage**.
3. Firestore collection: **`orders`** (document ID = order ID, e.g. `BB-…`).
4. Start with test rules, then lock down before launch:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /orders/{orderId} {
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null;
      allow update: if false; // server/webhook only
    }
  }
}
```

Adjust for public order lookup by ID + email if you want guest tracking without login.

## Optional: GitHub Pages mirror

Pages can host the static `index.html` for demos, but **checkout requires Vercel** (`/api/create-checkout-session`).

## Customer journey (implemented / planned)

1. Landing hero → **Build your bottle** → designer  
2. Full/half wrap → theme/style → AI or upload → preview  
3. Cart → Stripe Checkout (Vercel + env keys)  
4. Order saved to Firestore → webhook advances status  
5. **Track** in header → order timeline (strategy guide statuses)  
6. Post-purchase → Social / #BaddestBottleChallenge (UGC)

## Order status flow

`order_received` → `label_generating` → `production_approved` → `printing_label` → `packaging_bottle` → `shipment_created` → `in_transit` → `delivered`

Update statuses from Firebase Console, a small admin script, or ShipStation integration later.

---

**Confirm file on GitHub:**  
https://raw.githubusercontent.com/michaelcboyer2023-beep/Baddest-Bottle/main/index.html

### raw.githack caching

Use a **full 40-char commit SHA** in the URL, not `main`, or you may see an old cached build. See comments at the top of `index.html`.
