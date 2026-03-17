import type { SpeechProviderPlugin } from "../../plugins/types.js";

export function buildPiperSpeechProvider(): SpeechProviderPlugin {
  return {
    id: "piper",
    label: "Piper",
    isConfigured: ({ config }) => config.piper.enabled,
    synthesize: async (req) => {
      const { piper } = req.config;
      const responseFormat = req.target === "voice-note" ? "opus" : "mp3";

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), req.config.timeoutMs);

      const baseUrl = piper.baseUrl.replace(/\/+$/, "");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (piper.apiKey) {
        headers["Authorization"] = `Bearer ${piper.apiKey}`;
      }

      const body: Record<string, unknown> = {
        model: piper.voice, // Piper uses voice name as model
        input: req.text,
        voice: piper.voice,
        response_format: responseFormat,
      };
      if (piper.speakerId !== undefined) {
        body.speaker_id = piper.speakerId;
      }
      if (piper.lengthScale !== 1.0) {
        body.length_scale = piper.lengthScale;
      }
      if (piper.noiseScale !== 0.667) {
        body.noise_scale = piper.noiseScale;
      }
      if (piper.noiseW !== 0.8) {
        body.noise_w = piper.noiseW;
      }
      if (piper.sentenceSilence !== 0.2) {
        body.sentence_silence = piper.sentenceSilence;
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
          throw new Error(`Piper TTS API error (${response.status}): ${errorText}`);
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
