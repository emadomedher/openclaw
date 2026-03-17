import type { SpeechProviderPlugin } from "../../plugins/types.js";

export function buildChatterboxSpeechProvider(): SpeechProviderPlugin {
  return {
    id: "chatterbox",
    label: "Chatterbox",
    isConfigured: ({ config }) => config.chatterbox.enabled,
    synthesize: async (req) => {
      const { chatterbox } = req.config;
      const responseFormat = req.target === "voice-note" ? "opus" : "mp3";

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), req.config.timeoutMs);

      const baseUrl = chatterbox.baseUrl.replace(/\/+$/, "");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (chatterbox.apiKey) {
        headers["Authorization"] = `Bearer ${chatterbox.apiKey}`;
      }

      const body: Record<string, unknown> = {
        model: chatterbox.model,
        input: req.text,
        voice: chatterbox.voice,
        response_format: responseFormat,
      };
      if (chatterbox.language) {
        body.language = chatterbox.language;
      }
      if (chatterbox.exaggeration !== 0.5) {
        body.exaggeration = chatterbox.exaggeration;
      }
      if (chatterbox.cfgWeight !== 0.5) {
        body.cfg_weight = chatterbox.cfgWeight;
      }
      if (chatterbox.speed !== 1.0) {
        body.speed = chatterbox.speed;
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
          throw new Error(`Chatterbox TTS API error (${response.status}): ${errorText}`);
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
