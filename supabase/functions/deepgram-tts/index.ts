import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

// Deepgram Aura "asteria" — light, friendly, confident female voice.
// See https://developers.deepgram.com/docs/tts-models for full list.
const VOICE_MODEL = "aura-asteria-en";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "text required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const DEEPGRAM_API_KEY = Deno.env.get("DEEPGRAM_API_KEY");
    if (!DEEPGRAM_API_KEY) {
      return new Response(JSON.stringify({ error: "DEEPGRAM_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deepgram caps a single TTS request at ~2000 chars; truncate kindly.
    const safeText = text.length > 1800 ? text.slice(0, 1800) + "…" : text;

    const upstream = await fetch(
      `https://api.deepgram.com/v1/speak?model=${VOICE_MODEL}&encoding=mp3`,
      {
        method: "POST",
        headers: {
          Authorization: `Token ${DEEPGRAM_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: safeText }),
      },
    );

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error("Deepgram error", upstream.status, errText);
      return new Response(JSON.stringify({ error: "Deepgram TTS failed", detail: errText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const audioBuffer = await upstream.arrayBuffer();
    const audioBase64 = base64Encode(new Uint8Array(audioBuffer));

    return new Response(JSON.stringify({ audio: audioBase64, mime: "audio/mpeg" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("deepgram-tts error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
