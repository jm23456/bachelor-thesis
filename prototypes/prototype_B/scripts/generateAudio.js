import "dotenv/config";
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import voices from "../config/voices.js";

const openai = new OpenAI();
const ROOT = process.cwd();

const DEBATE_DIR = path.join(ROOT, "debate_text");
const OUTPUT_DIR = path.join(ROOT, "public/audio");

// Weibliche Sprecherinnen (für lautere Stimme)
const FEMALE_SPEAKERS = ["A", "C"];

// Basis-Geschwindigkeit (1.2x schneller)
const BASE_SPEED = 1.2;

// Nur diese Sections verarbeiten
const SECTIONS = {
  "Arguments Intro": "arguments_intro",
  "debate_script": "debate_script"
};

async function processFile(filename) {
  const lang = filename.includes(".de.") ? "de" : "en";

  const raw = JSON.parse(
    fs.readFileSync(path.join(DEBATE_DIR, filename), "utf-8")
  );

  for (const [sectionKey, sectionSlug] of Object.entries(SECTIONS)) {
    const entries = raw[sectionKey];

    if (!Array.isArray(entries)) continue;

    for (const entry of entries) {
      const { id, speaker, text } = entry;
      const voice = voices[speaker]?.[lang];

      if (!voice) {
        console.warn(`⚠️ No voice for speaker ${speaker} (${lang})`);
        continue;
      }

      const outDir = path.join(OUTPUT_DIR, lang);
      fs.mkdirSync(outDir, { recursive: true });

      const filename = `${sectionSlug}_speaker${speaker}_id${String(id).padStart(3, "0")}.mp3`;
      const outPath = path.join(outDir, filename);

      if (fs.existsSync(outPath)) {
        console.log("⏩ exists:", outPath);
        continue;
      }

      console.log("🎙️ generating:", outPath);

      // Makes Female voices louder
      const isFemale = FEMALE_SPEAKERS.includes(speaker);
      const instructions = isFemale 
        ? "Speak with a confident, clear, and slightly louder voice. Project your voice as if speaking to a larger audience."
        : undefined;

      const response = await openai.audio.speech.create({
        model: "gpt-4o-mini-tts",
        voice,
        input: text,
        speed: BASE_SPEED,
        ...(instructions && { instructions })
      });

      const buffer = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(outPath, buffer);
    }
  }
}

async function run() {
  const files = fs.readdirSync(DEBATE_DIR)
    .filter(f => f.endsWith(".json"));

  for (const file of files) {
    await processFile(file);
  }
}

run();
