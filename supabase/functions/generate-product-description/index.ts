// Generates a Plugin Warehouse–voice description via Lovable AI Gateway.
import { corsHeaders, requireAdmin, json } from "../_shared/auth.ts";

const SYSTEM = `You are the copywriter for "Plugin Warehouse", a music production plugin storefront.

VOICE RULES — strict:
- Bold, direct, gear-savvy. Talks to producers as a peer.
- NEVER use exclamation points.
- NEVER use clichés like "elevate your sound", "take your music to the next level", "unleash", "unlock", "game-changing", "revolutionize".
- No corporate filler, no marketing fluff.
- 2 to 3 sentences total. Hard limit.

CONTENT RULES:
1. INFER WHAT THE PLUGIN IS from the name first. The name is the strongest signal.
   Examples of inference: "Modular Bass Beast" → bass synth with modular routing.
   "Cosmic Reverb Pro" → ambient reverb effect.
   "Vintage Tape Saturator" → analog tape saturation effect.
   "808 Foundry" → 808 / drum kit or generator.
   "Granular Garden" → granular sampler / synth.
   Refine the inference with category, tags, and supported DAWs if provided.
2. Sentence 1: state what the plugin does in concrete terms.
3. Sentence 2: highlight what makes it different or notable.
4. Optional Sentence 3: hint of vibe or use case.
5. If the name is genuinely ambiguous and you cannot tell, write a flexible description the user can edit. Do not invent specific features.

Return ONLY the description text. No quotes, no preface, no labels.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    await requireAdmin(req);
    const { name, category, tags, daws } = await req.json();
    if (typeof name !== "string" || !name.trim()) return json({ error: "name required" }, 400);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

    const ctx = [
      `Plugin name: ${name.trim()}`,
      category ? `Category: ${category}` : null,
      Array.isArray(tags) && tags.length ? `Tags: ${tags.join(", ")}` : null,
      Array.isArray(daws) && daws.length ? `Compatible DAWs: ${daws.join(", ")}` : null,
    ].filter(Boolean).join("\n");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: ctx },
        ],
        temperature: 0.8,
      }),
    });

    if (res.status === 429) return json({ error: "Rate limited — try again in a moment." }, 429);
    if (res.status === 402) return json({ error: "AI credits exhausted. Add credits in Workspace → Usage." }, 402);
    if (!res.ok) {
      const t = await res.text();
      console.error("Gateway error", res.status, t);
      return json({ error: `AI gateway error (${res.status})` }, 500);
    }
    const data = await res.json();
    const description = (data?.choices?.[0]?.message?.content ?? "").trim().replace(/^["']|["']$/g, "");
    return json({ description });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("generate-product-description", e);
    return json({ error: (e as Error).message ?? "Internal error" }, 500);
  }
});
