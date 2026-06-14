import fs from 'fs';
import path from 'path';

const transcriptPath = 'C:\\Users\\soulmad\\.gemini\\antigravity\\brain\\b16d8653-ef20-4448-8f61-5fc823afb2c2\\.system_generated\\logs\\transcript_full.jsonl';
const outputPath = './prompts.txt';

if (!fs.existsSync(transcriptPath)) {
  console.error('Transcript file not found:', transcriptPath);
  process.exit(1);
}

const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');
let promptCount = 0;
let outputText = '========================================= \n';
outputText += '   COSMIC ENTITY PROJECT PROMPTS RECORD   \n';
outputText += '========================================= \n\n';

const historicalPrompts = [
  "the quality should be 8k quality of everything",
  "what the fuck is that formation and what the fuck is that rotation and also the disperse of dust its too fucking comedy if anyone looks at that design theyll laugh and spit on it make it proper and accurate human shape and make it fucking eye cathcing and fucking fix the animations",
  "make edges sharper they are so fucking blunt edges fix that",
  "the dispersing of human shouuld look like a little smoke coming from heart area and slowly all particles dispersing",
  "and the human should form with red and blue particles",
  "COSMIC ENTITY V2 — FIXED IMPLEMENTATION\n\nThe previous implementation looked artificial because too many particles moved simultaneously and the human behaved like a rotating object rather than a living being.\n\nDiscard all existing formation, rotation, and explosion logic.\n\nThe new goal is to create a living cosmic entity.\n\nThe experience should feel emotional, mysterious, cinematic, and premium.\n\nThink:\nInterstellar\nArrival\nDune\nMarvel Celestial\nrather than a Three.js particle demo.\n\nCORE RULE\nThe human must NEVER rotate.\nThe human must NEVER spin.\nThe human must NEVER perform unrealistic movements.\nThe human should feel alive and conscious.\n\nPARTICLE COUNT\nDesktop:\n100,000 particles\nMobile:\n30,000 particles\nAll movement GPU accelerated.\n\nVISUAL STYLE\nPure black background.\nBlue-white energy particles.\nSoft bloom.\nSubtle volumetric atmosphere.\nNo bright colors.\nNo rainbow effects.\nNo flashy effects."
];

historicalPrompts.forEach((p) => {
  promptCount++;
  outputText += `PROMPT #${promptCount} (Historical)\n`;
  outputText += `--------------------------------------------------\n`;
  outputText += `${p}\n\n`;
});

lines.forEach(line => {
  if (!line.trim()) return;
  try {
    const step = JSON.parse(line);
    if (step.type === 'USER_INPUT') {
      promptCount++;
      let content = step.content || '';
      
      // Clean tags
      content = content.replace(/<USER_REQUEST>/g, '').replace(/<\/USER_REQUEST>/g, '');
      
      // Remove ADDITIONAL_METADATA if any
      const metadataIdx = content.indexOf('<ADDITIONAL_METADATA>');
      if (metadataIdx !== -1) {
        content = content.substring(0, metadataIdx);
      }
      
      content = content.trim();
      
      // Extract date/time
      const dateStr = step.created_at ? new Date(step.created_at).toLocaleString() : 'Unknown Time';
      
      outputText += `PROMPT #${promptCount} (${dateStr})\n`;
      outputText += `--------------------------------------------------\n`;
      outputText += `${content}\n\n`;
    }
  } catch (err) {
    // ignore parse errors
  }
});

fs.writeFileSync(outputPath, outputText, 'utf8');
console.log(`Successfully compiled ${promptCount} prompts (including historical ones) to ${outputPath}`);
