/**
 * SubNP image generation proxy (SSE → JSON for the designer).
 * Docs: https://subnp.com/free-api
 */

const SUBNP_BASES = ["https://subnp.com", "https://t2i.mcpcore.xyz"];
const SUBNP_MODELS = ["turbo", "flux", "magic"];

function parseSubnpSseBody(text) {
  let imageUrl = "";
  let lastError = "";
  for (const line of String(text || "").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const payload = trimmed.replace(/^data:\s*/, "");
    if (!payload || payload === "[DONE]") continue;
    try {
      const data = JSON.parse(payload);
      if (data.status === "complete") {
        imageUrl =
          data.imageUrl ||
          data.image ||
          data.url ||
          (data.images && data.images[0]) ||
          imageUrl;
      }
      if (data.status === "error") {
        lastError =
          data.message ||
          data.error ||
          data.details ||
          "SubNP generation failed";
      }
    } catch (_) {
      /* ignore partial JSON lines */
    }
  }
  if (imageUrl) return { imageUrl };
  return { error: lastError || "SubNP returned no image URL" };
}

async function generateViaSubnp(prompt, model, width, height, baseUrl) {
  const origin = baseUrl.replace(/\/$/, "");
  const response = await fetch(`${origin}/api/free/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, model, width, height }),
  });
  const text = await response.text();
  if (!response.ok) {
    return { error: `SubNP HTTP ${response.status}: ${text.slice(0, 200)}` };
  }
  return parseSubnpSseBody(text);
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "Invalid JSON body" });
    }
  }

  const prompt = String(body?.prompt || "").trim();
  if (!prompt) {
    return res.status(400).json({ error: "prompt is required" });
  }

  const width = Math.min(1024, Math.max(256, Number(body?.width) || 576));
  const height = Math.min(1024, Math.max(256, Number(body?.height) || 576));
  const models =
    body?.model && body.model !== "auto"
      ? [String(body.model)]
      : SUBNP_MODELS;

  const errors = [];

  for (const base of SUBNP_BASES) {
    for (const model of models) {
      try {
        const result = await generateViaSubnp(
          prompt,
          model,
          width,
          height,
          base
        );
        if (result.imageUrl) {
          return res.status(200).json({
            imageUrl: result.imageUrl,
            model,
            base,
            provider: "subnp",
          });
        }
        errors.push(
          `${base} (${model}): ${result.error || "unknown error"}`
        );
      } catch (err) {
        errors.push(`${base} (${model}): ${err.message || err}`);
      }
    }
  }

  const seed = Math.abs(hashPrompt(prompt)) % 2147483647;
  const pollinationsUrl =
    "https://image.pollinations.ai/prompt/" +
    encodeURIComponent(prompt.slice(0, 950)) +
    `?width=${width}&height=${height}&nologo=true&seed=${seed}&model=flux`;

  return res.status(200).json({
    imageUrl: pollinationsUrl,
    provider: "pollinations",
    fallback: true,
    subnpErrors: errors,
  });
};

function hashPrompt(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  }
  return h;
}
