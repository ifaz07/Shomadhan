const fs = require("fs");
const path = require("path");
const Groq = require("groq-sdk");

const getGroqClient = () => {
  if (!process.env.GROQ_API_KEY) return null;
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
};

/**
 * Transcribe an audio file into text using Groq Whisper, Hugging Face, or Fallback.
 * @param {Object|String} fileOrPath - Multer file object or file path string
 * @param {String} [mimeType] - Optional mime type if fileOrPath is buffer/string
 * @returns {Promise<string>} Transcribed text from audio
 */
async function transcribeAudio(fileOrPath, mimeType = "audio/webm") {
  if (!fileOrPath) return "";

  let filePath = "";
  if (typeof fileOrPath === "string") {
    filePath = fileOrPath;
  } else if (fileOrPath.path) {
    filePath = fileOrPath.path;
  }

  if (!filePath || !fs.existsSync(filePath)) {
    console.warn("[TranscriptionService] Audio file path does not exist:", filePath);
    return "";
  }

  // 1. Try Groq Whisper API (Fastest & highly accurate for bn/en)
  const groq = getGroqClient();
  if (groq) {
    try {
      console.log("[TranscriptionService] Transcribing audio with Groq Whisper...");
      const fileStream = fs.createReadStream(filePath);
      const response = await groq.audio.transcriptions.create({
        file: fileStream,
        model: "whisper-large-v3-turbo",
        response_format: "json",
      });

      if (response && response.text) {
        const text = response.text.trim();
        console.log(`[TranscriptionService] Groq STT Success: "${text.slice(0, 80)}..."`);
        return text;
      }
    } catch (err) {
      console.warn("[TranscriptionService] Groq Whisper failed:", err.message);
    }
  }

  // 2. Try Hugging Face Whisper API Fallback
  const hfKey = process.env.HUGGINGFACE_API_KEY;
  if (hfKey && hfKey !== "your_huggingface_api_key_here") {
    try {
      console.log("[TranscriptionService] Transcribing audio with Hugging Face Whisper...");
      const audioBuffer = fs.readFileSync(filePath);
      const hfResponse = await fetch(
        "https://api-inference.huggingface.co/models/openai/whisper-large-v3",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${hfKey}`,
            "Content-Type": mimeType || "audio/webm",
          },
          body: audioBuffer,
        }
      );

      if (hfResponse.ok) {
        const result = await hfResponse.json();
        const text = (result.text || "").trim();
        if (text) {
          console.log(`[TranscriptionService] Hugging Face STT Success: "${text.slice(0, 80)}..."`);
          return text;
        }
      } else {
        const errText = await hfResponse.text();
        console.warn(`[TranscriptionService] HF Whisper status ${hfResponse.status}: ${errText}`);
      }
    } catch (hfErr) {
      console.warn("[TranscriptionService] HF Whisper failed:", hfErr.message);
    }
  }

  console.warn("[TranscriptionService] Audio transcription skipped (No active STT provider or API key)");
  return "";
}

module.exports = { transcribeAudio };
