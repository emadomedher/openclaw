import type { SpeechProviderPlugin } from "../../plugins/types.js";

export function buildKokoroSpeechProvider(): SpeechProviderPlugin {
  return {
    id: "kokoro",
    label: "Kokoro",
    isConfigured: ({ config }) => config.kokoro.enabled,
    synthesize: async (req) => {
      const { kokoro } = req.config;
      const responseFormat = req.target === "voice-note" ? "opus" : "mp3";

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), req.config.timeoutMs);

      const baseUrl = kokoro.baseUrl.replace(/\/+$/, "");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (kokoro.apiKey) {
        headers["Authorization"] = `Bearer ${kokoro.apiKey}`;
      }

      const body: Record<string, unknown> = {
        model: "kokoro",
        input: req.text,
        voice: kokoro.voice,
        response_format: responseFormat,
      };
      if (kokoro.speed !== 1.0) {
        body.speed = kokoro.speed;
      }

      try {
        const response = await fetch(`${baseUrl}/v1/audio/speech`, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        if (!response.ok) {
          const errorText = await response.text().catch(() => "");
          throw new Error(`Kokoro TTS API error (${response.status}): ${errorText}`);
        }
        const audioBuffer = Buffer.from(await response.arrayBuffer());
        return {
          audioBuffer,
          outputFormat: responseFormat,
          fileExtension: responseFormat === "opus" ? ".opus" : ".mp3",
          voiceCompatible: req.target === "voice-note",
        };
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
