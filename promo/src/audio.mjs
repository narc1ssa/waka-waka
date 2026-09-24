#!/usr/bin/env node
/**
 * Собирает саундтрек ролика из настоящего OST игры (music/):
 * музыка по сценам + звуки поедания на реальных моментах из симуляции
 * + колокольчики редких котов + низкие «переходы» между сценами.
 */
import { spawn } from 'node:child_process';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';

import { AUDIO, SCENES, VIDEO, GAME } from './config.mjs';
import { buildTimeline, eatCueTimes } from './scenes/play.mjs';
import { ffmpegBin } from './ffmpeg.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const ASSETS = join(ROOT, 'public', 'assets');
const CACHE = join(ROOT, '.cache');

const MS = (s) => Math.round(s * 1000);
const sfx = (file) => join(ASSETS, file);

async function main() {
  mkdirSync(CACHE, { recursive: true });
  const out = join(CACHE, 'soundtrack.m4a');

  // Моменты поедания берём из той же симуляции, что и картинка — звук совпадёт с кадром
  const timeline = buildTimeline(null, VIDEO.fps);
  const eatCues = eatCueTimes(timeline, SCENES.play.from, VIDEO.fps);

  // Список входов: музыка + по одному входу на каждое sfх-событие
  const musicFiles = [...new Set(AUDIO.music.map((m) => m.file))];
  const chimeFile = 'chime.wav';
  const eatFile = 'sound_eat.mp3';

  const chimeTimes = [];
  for (let i = 0; i < GAME.rareCats; i++) chimeTimes.push((SCENES.rare.from + 18 + i * 10 + 8) / VIDEO.fps);
  chimeTimes.push((SCENES.oldage.from + 93 + 20) / VIDEO.fps); // таблетка молодости

  const inputs = [...musicFiles.map((f) => sfx(f))];

  const filter = [];
  const mixInputs = [];

  // 1. Музыкальные куски
  AUDIO.music.forEach((seg, i) => {
    const inputIndex = musicFiles.indexOf(seg.file);
    const duration = seg.to - seg.from;
    const label = `m${i}`;
    filter.push(
      `[${inputIndex}:a]atrim=start=${seg.offset}:duration=${duration.toFixed(2)},asetpts=PTS-STARTPTS,` +
      `volume=${seg.volume},afade=t=in:st=0:d=${seg.fadeIn},` +
      `afade=t=out:st=${(duration - seg.fadeOut).toFixed(2)}:d=${seg.fadeOut},` +
      `adelay=${MS(seg.from)}|${MS(seg.from)}[${label}]`,
    );
    mixInputs.push(label);
  });

  // 2. Звуки поедания (по реальным событиям симуляции)
  eatCues.forEach((time, i) => {
    const inputIndex = inputs.length;
    inputs.push(sfx(eatFile));
    const label = `e${i}`;
    filter.push(
      `[${inputIndex}:a]atrim=0:duration=0.35,asetpts=PTS-STARTPTS,volume=0.5,` +
      `afade=t=out:st=0.18:d=0.17,adelay=${MS(time)}|${MS(time)}[${label}]`,
    );
    mixInputs.push(label);
  });

  // 3. Колокольчики: редкие коты и таблетка
  chimeTimes.forEach((time, i) => {
    const inputIndex = inputs.length;
    inputs.push(sfx(chimeFile));
    const label = `c${i}`;
    filter.push(
      `[${inputIndex}:a]atrim=0:duration=0.9,asetpts=PTS-STARTPTS,volume=0.42,` +
      `afade=t=in:st=0:d=0.02,afade=t=out:st=0.45:d=0.45,adelay=${MS(time)}|${MS(time)}[${label}]`,
    );
    mixInputs.push(label);
  });

  // 4. Глубокие переходы между сценами (тот же колокол, но с пониженным тоном)
  AUDIO.whoosh.forEach((time, i) => {
    const inputIndex = inputs.length;
    inputs.push(sfx(chimeFile));
    const label = `w${i}`;
    filter.push(
      `[${inputIndex}:a]atrim=0:duration=1.1,asetpts=PTS-STARTPTS,asetrate=22050,aresample=48000,` +
      `volume=0.5,afade=t=in:st=0:d=0.04,afade=t=out:st=0.7:d=0.4,adelay=${MS(time)}|${MS(time)}[${label}]`,
    );
    mixInputs.push(label);
  });

  // 5. Сведение
  const fade = AUDIO.masterFadeOut;
  filter.push(
    `${mixInputs.map((l) => `[${l}]`).join('')}amix=inputs=${mixInputs.length}:normalize=0:dropout_transition=0,` +
    `alimiter=limit=0.95,afade=t=out:st=${fade.start}:d=${fade.duration},apad,atrim=0:duration=${VIDEO.durationInFrames / VIDEO.fps}[out]`,
  );

  const args = ['-y'];
  inputs.forEach((file) => args.push('-i', file));
  args.push(
    '-filter_complex', filter.join(';'),
    '-map', '[out]',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
    out,
  );

  console.log(`🎧 Собираю саундтрек: ${mixInputs.length} дорожек (${eatCues.length} звуков поедания)`);
  await new Promise((res, rej) => {
    const ff = spawn(ffmpegBin(), args, { stdio: ['ignore', 'inherit', 'inherit'] });
    ff.on('exit', (code) => (code === 0 ? res() : rej(new Error(`ffmpeg код ${code}`))));
  });
  console.log(`✅ саундтрек: ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
