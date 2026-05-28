/**
 * Baddest Bottle — AI image generation worker
 * Endpoint: https://aigenerate.michaelcboyer2023.workers.dev
 *
 * Accepts:
 *   POST  { prompt, width?, height?, model? }   → returns image bytes (image/png)
 *   GET   ?url=<encoded url>                    → image proxy (passthrough for existing code)
 *   GET   ?requestId=<id>                       → legacy poll endpoint, no-op for compat
 *
 * Generation strategy:
 *   1. Cloudflare Workers AI — @cf/black-forest-labs/flux-1-schnell (free tier, fast, no CORS)
 *   2. Pollinations Flux fallback if Cloudflare fails or is rate-limited
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

const DEFAULT_WIDTH = 576;
const DEFAULT_HEIGHT = 576;
const MAX_PROMPT_LEN = 950;

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    const proxyUrl = url.searchParams.get("url");
    if (proxyUrl) {
      return proxyImage(proxyUrl);
    }

    const requestId = url.searchParams.get("requestId");
    if (requestId) {
      return jsonResponse({ status: "complete", message: "legacy endpoint" }, 200);
    }

    if (request.method !== "POST") {
      return jsonResponse(
        { error: "Use POST with JSON body { prompt, width?, height? } or GET ?url=..." },
        405
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const prompt = String(body.prompt || "").slice(0, MAX_PROMPT_LEN).trim();
    if (!prompt) {
      return jsonResponse({ error: "Missing prompt" }, 400);
    }
    const width = clampDimension(body.width, DEFAULT_WIDTH);
    const height = clampDimension(body.height, DEFAULT_HEIGHT);

    try {
      const cfImage = await generateWithCloudflareFlux(env, prompt, width, height);
      if (cfImage) {
        return new Response(cfImage, {
          status: 200,
          headers: {
            ...CORS_HEADERS,
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=3600",
            "X-Image-Source": "cloudflare-flux-schnell",
          },
        });
      }
    } catch (err) {
      console.warn("Cloudflare Flux failed:", err.message || err);
    }

    try {
      const pollinationsImage = await generateWithPollinations(prompt, width, height);
      if (pollinationsImage) {
        return new Response(pollinationsImage, {
          status: 200,
          headers: {
            ...CORS_HEADERS,
            "Content-Type": "image/jpeg",
            "Cache-Control": "public, max-age=3600",
            "X-Image-Source": "pollinations-flux",
          },
        });
      }
    } catch (err) {
      console.warn("Pollinations failed:", err.message || err);
    }

    return jsonResponse(
      { error: "All image generation services are currently unavailable. Try again in a moment." },
      503
    );
  },
};

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function clampDimension(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  const snapped = Math.round(n / 64) * 64;
  return Math.max(256, Math.min(2048, snapped));
}

async function generateWithCloudflareFlux(env, prompt, width, height) {
  if (!env.AI || typeof env.AI.run !== "function") {
    throw new Error("Workers AI binding not configured");
  }

  const result = await env.AI.run("@cf/black-forest-labs/flux-1-schnell", {
    prompt,
    width,
    height,
    num_steps: 4,
  });

  if (!result || !result.image) {
    throw new Error("No image returned from Cloudflare AI");
  }

  const binary = atob(result.image);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function generateWithPollinations(prompt, width, height) {
  const seed = Math.floor(Math.random() * 2147483647);
  const encoded = encodeURIComponent(prompt);
  const pollUrl =
    `https://image.pollinations.ai/prompt/${encoded}` +
    `?width=${width}&height=${height}&nologo=true&nofeed=true&safe=true` +
    `&seed=${seed}&model=flux&referrer=baddestbottle.com`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    const res = await fetch(pollUrl, {
      method: "GET",
      cf: { cacheTtl: 0 },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Pollinations HTTP ${res.status}`);
    const contentType = res.headers.get("content-type") || "";
    if (!/^image\//i.test(contentType)) {
      throw new Error(`Pollinations returned ${contentType}`);
    }
    return new Uint8Array(await res.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}

async function proxyImage(targetUrl) {
  try {
    const decoded = decodeURIComponent(targetUrl);
    const allowed = /^https:\/\/(image\.pollinations\.ai|.*\.subnp\.com|subnp\.com|.*\.cloudflareimages\.com)/i;
    if (!allowed.test(decoded)) {
      return jsonResponse({ error: "URL host not allowed" }, 403);
    }
    const upstream = await fetch(decoded, { cf: { cacheTtl: 3600 } });
    const headers = new Headers(upstream.headers);
    Object.entries(CORS_HEADERS).forEach(([k, v]) => headers.set(k, v));
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (err) {
    return jsonResponse({ error: "Proxy failed: " + (err.message || err) }, 502);
  }
}
