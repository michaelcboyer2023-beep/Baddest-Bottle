# Baddest Bottle — designer (static)

## Why you see “nothing” / 404

The repo **does** have `index.html` on `main`, but **GitHub Pages must be turned on** once per repository. Until then, `https://michaelcboyer2023-beep.github.io/Baddest-Bottle/` returns **404**.

### Option A — simplest (no Actions)

1. GitHub repo → **Settings** → **Pages**
2. **Build and deployment** → **Source**: **Deploy from a branch**
3. Branch: **`main`**, folder: **`/ (root)`** → **Save**
4. Wait 1–3 minutes, then open: **https://michaelcboyer2023-beep.github.io/Baddest-Bottle/**

### Option B — GitHub Actions (this repo includes a workflow)

1. **Settings** → **Pages** → **Source**: **GitHub Actions**
2. Push to `main` (or **Actions** → run **Deploy GitHub Pages**)

---

**Confirm file on GitHub:**  
https://raw.githubusercontent.com/michaelcboyer2023-beep/Baddest-Bottle/main/index.html  

### If raw.githack links look broken or don’t show your latest deploy

1. **Wrong or short SHA** — The path must be the **full** commit hash (40 characters). A truncated hash returns a broken page.
2. **`…/main/…` on raw.githack** — High-traffic or default URLs often get **redirected to the CDN**, which caches **`main` for a long time**. You see an **old build** even after you push. **Fix:** use a URL that includes the **commit SHA** instead of `main`, or use **GitHub Pages** (above).
3. **Security interstitial** — Opening HTML via raw.githack shows **“One more step”**. Click **Open the page**; that’s normal.

**Pinned build (example — replace SHA after each deploy with `git rev-parse HEAD`):**  
https://raw.githack.com/michaelcboyer2023-beep/Baddest-Bottle/f250f5af255c82daef603c66973108385967e8f4/index.html  

**Same file, raw CDN (also needs full SHA; then click through warning):**  
https://rawcdn.githack.com/michaelcboyer2023-beep/Baddest-Bottle/f250f5af255c82daef603c66973108385967e8f4/index.html
