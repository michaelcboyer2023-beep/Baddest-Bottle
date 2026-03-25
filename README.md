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
(raw is cached ~5 minutes; add `?v=1` to bust cache in some clients.)
