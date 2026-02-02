#!/usr/bin/env node
/**
 * Generates "Djokovic" TTS audio file using the system TTS (say on macOS, SAPI on Windows).
 * Run: node scripts/generate-djokovic.js
 * Output: public/sounds/djokovic.wav
 *
 * Requires: npm install say
 * Export is supported on macOS and Windows only.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const say = require('say');
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'public', 'sounds');
const outPath = path.join(outDir, 'djokovic.wav');

fs.mkdirSync(outDir, { recursive: true });

say.export('Djokovic', 'Alex', 0.6, outPath, (err) => {
  if (err) {
    console.error('TTS export failed:', err.message);
    console.error('Note: Export is supported on macOS and Windows. On Linux, install a TTS that can write to file.');
    process.exit(1);
  }
  console.log('Generated:', outPath);
});
