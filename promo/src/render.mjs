#!/usr/bin/env node
/**
 * Рендер промо-ролика Waka.
 *
 * Кадры рисуются через Skia (@napi-rs/canvas) и по管道 отдаются в ffmpeg,
 * который собирает H.264 + AAC. Все ассеты — настоящие, взятые из игры.
 */
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { spawn } from 'node:child_process';
import { join, resolve } from 'node:path';
import { readFileSync, readdirSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { VIDEO, SCENES, PALETTE, FONT, COPY, GAME } from './config.mjs';
import { ffmpegBin } from './ffmpeg.mjs';
import { grain, makeGrainTile, flash } from './draw.mjs';
import * as intro from './scenes/intro.mjs';
import * as play from './scenes/play.mjs';
import * as ageing from './scenes/ageing.mjs';
import * as rare from './scenes/rare.mjs';
import * as oldage from './scenes/oldage.mjs';
import * as victory from './scenes/victory.mjs';
import * as outro from './scenes/outro.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PUBLIC = join(ROOT, 'public');
const OUT = join(ROOT, 'out');
const CACHE = join(ROOT, '.cache');

const SCENE_LIST = [
  { name: 'intro',   ...SCENES.intro,   mod: intro },
  { name: 'play',    ...SCENES.play,    mod: play },
  { name: 'ageing',  ...SCENES.ageing,  mod: ageing },
  { name: 'rare',    ...SCENES.rare,    mod: rare },
  { name: 'oldage',  ...SCENES.oldage,  mod: oldage },
  { name: 'victory', ...SCENES.victory, mod: victory },
  { name: 'outro',   ...SCENES.outro,   mod: outro },
];

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const value = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

/* ----------------------------------------------------------------- шрифты */

function registerFonts() {
  const dir = join(ROOT, 'node_modules/@fontsource/montserrat/files');
  const weights = { 500: FONT.regular, 600: FONT.medium, 800: FONT.bold, 900: FONT.black };
  for (const [weight, family] of Object.entries(weights)) {
    const file = join(dir, `montserrat-cyrillic-${weight}-normal.woff2`);
    if (!existsSync(file)) throw new Error(`нет файла шрифта: ${file}`);
    GlobalFonts.registerFromPath(file, family);
  }
}

/* ------------------------------------------------------------------ ассеты */

const manifest = JSON.parse(readFileSync(join(ROOT, 'src/generated/animations.json'), 'utf8'));
const fileMap = manifest.files; // путь в игре -> файл в public/

const images = new Map();

async function loadPublic(rel) {
  if (images.has(rel)) return images.get(rel);
  const image = await loadImage(join(PUBLIC, rel));
  image.__name = rel;
  images.set(rel, image);
  return image;
}

async function loadAssets() {
  const files = readdirSync(join(PUBLIC, 'assets')).filter((f) => /\.(png|jpe?g)$/i.test(f));
  await Promise.all(files.map((f) => loadPublic(`assets/${f}`)));
  const anims = {};
  for (const [name, animation] of Object.entries(manifest.animations)) {
    anims[name] = await Promise.all(animation.frames.map(loadPublic));
  }
  return anims;
}

/* ------------------------------------------------------------------ рендер */

async function main() {
  registerFonts();
  mkdirSync(OUT, { recursive: true });
  mkdirSync(CACHE, { recursive: true });

  const anims = await loadAssets();
  const img = (repoPath) => {
    const rel = fileMap[repoPath];
    if (!rel) {
      console.warn(`⚠️  нет ассета: ${repoPath}`);
      return null;
    }
    return images.get(rel) ?? null;
  };

  const timeline = play.buildTimeline(anims, VIDEO.fps);
  // звуковые cue для саундтрека: когда именно кот был съеден
  const eatCues = play.eatCueTimes(timeline, SCENES.play.from, VIDEO.fps);
  writeFileSync(join(CACHE, 'cues.json'), JSON.stringify({ eatCues }, null, 2));

  console.log(`🐱 симуляция геймплея: съедено котов ${timeline.events.length}, звуков поедания ${eatCues.length}`);

  const warnings = [];
  const warn = (msg) => { if (!warnings.includes(msg)) warnings.push(msg); };

  const { width: W, height: H, fps, durationInFrames } = VIDEO;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const grainTile = makeGrainTile(160);

  const sceneFor = (frame) => SCENE_LIST.find((s) => frame >= s.from && frame < s.to) ?? SCENE_LIST.at(-1);

  const envFor = (frame) => {
    const scene = sceneFor(frame);
    return {
      W, H, fps,
      frame,
      local: frame - scene.from,
      dur: scene.to - scene.from,
      t: (frame - scene.from) / (scene.to - scene.from),
      anims, img, warn, timeline, GAME, PALETTE, FONT, COPY,
      scene: scene.name,
    };
  };

  const drawFrame = (frame) => {
    const env = envFor(frame);
    const scene = sceneFor(frame);
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(0, 0, W, H);
    scene.mod.draw(ctx, env);
    ctx.restore();

    // склейка сцен — короткая белая вспышка, как резкая смена плана
    const boundary = [SCENES.play.from, SCENES.ageing.from, SCENES.rare.from,
      SCENES.oldage.from, SCENES.victory.from, SCENES.outro.from].includes(frame);
    if (boundary) flash(ctx, W, H, '#FFFFFF', 0.72);
    else if (boundaryAdjacent(frame)) flash(ctx, W, H, '#FFFFFF', 0.22);

    grain(ctx, grainTile, frame, 0.055);
  };

  const boundaryAdjacent = (frame) =>
    [SCENES.play.from, SCENES.ageing.from, SCENES.rare.from,
      SCENES.oldage.from, SCENES.victory.from, SCENES.outro.from].includes(frame - 1);

  /* ---------------------------------------------------------- режимы */

  if (has('--stats')) {
    await writeStats({ ctx, drawFrame, W, H, durationInFrames });
  }

  if (has('--stills')) {
    const dir = join(OUT, 'stills');
    mkdirSync(dir, { recursive: true });
    const list = (value('--stills', '') || '').split(',').filter(Boolean).map(Number);
    for (const frame of list) {
      drawFrame(frame);
      writeFileSync(join(dir, `frame-${String(frame).padStart(4, '0')}.png`), canvas.toBuffer('image/png'));
      console.log(`🖼  кадр ${frame} → out/stills/frame-${String(frame).padStart(4, '0')}.png`);
    }
  }

  if (!has('--video')) {
    report(warnings);
    return;
  }

  const audio = join(CACHE, 'soundtrack.m4a');
  if (!existsSync(audio)) {
    console.error('❌ Сначала соберите саундтрек: npm run audio');
    process.exit(1);
  }

  // Кадры пишем на диск (JPEG), а не в пайп: так ни один кадр не теряется
  // на backpressure, и рендер можно пересобирать без перерисовки.
  const framesDir = join(CACHE, 'frames');
  mkdirSync(framesDir, { recursive: true });
  const pattern = join(framesDir, 'f-%04d.jpg');

  const started = Date.now();
  let lastReport = 0;
  for (let frame = 0; frame < durationInFrames && !has('--encode-only'); frame++) {
    drawFrame(frame);
    writeFileSync(
      join(framesDir, `f-${String(frame).padStart(4, '0')}.jpg`),
      canvas.toBuffer('image/jpeg', 93),
    );
    const now = Date.now();
    if (now - lastReport > 2000) {
      lastReport = now;
      process.stdout.write(`\r🎞  кадр ${frame + 1}/${durationInFrames} (${Math.round((frame + 1) / durationInFrames * 100)}%)`);
    }
  }
  process.stdout.write(`\r🎞  кадры готовы (${((Date.now() - started) / 1000).toFixed(1)} с)                  \n`);

  const output = value('--out', join(OUT, 'waka-promo-vertical.mp4'));
  const ff = spawn(ffmpegBin(), [
    '-y',
    '-framerate', String(fps), '-i', pattern,
    '-i', audio,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', value('--crf', '20'),
    '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.2',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
    '-t', String(durationInFrames / fps),
    '-movflags', '+faststart', output,
  ], { stdio: ['ignore', 'inherit', 'inherit'] });

  await new Promise((res, rej) => {
    ff.on('exit', (code) => (code === 0 ? res() : rej(new Error(`ffmpeg завершился с кодом ${code}`))));
  });

  console.log(`✅ готово: ${output}`);
  report(warnings);
}

/* --------------------------------------------------- проверки без глаз */

async function writeStats({ drawFrame, ctx, W, H, durationInFrames }) {
  const step = 15;
  console.log('кадр  сцена    яркость  движение  заметка');
  let prev = null;
  for (let frame = 0; frame < durationInFrames; frame += step) {
    drawFrame(frame);
    const data = ctx.getImageData(0, 0, W, H).data;
    let sum = 0;
    const sample = [];
    for (let i = 0; i < data.length; i += 4 * 97) {
      const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      sum += lum;
      sample.push(lum);
    }
    const mean = sum / sample.length;
    let diff = 0;
    if (prev) {
      for (let i = 0; i < sample.length; i++) diff += Math.abs(sample[i] - prev[i]);
      diff /= sample.length;
    }
    let note = '';
    if (mean < 8) note = '⚠️ почти чёрный кадр';
    else if (mean > 235) note = '⚠️ почти белый кадр';
    if (prev && diff < 0.4) note += (note ? ' / ' : '') + 'статично';
    console.log(
      String(frame).padStart(4),
      (sceneName(frame) + '      ').slice(0, 8),
      mean.toFixed(1).padStart(7),
      (prev ? diff.toFixed(2) : '  -  ').padStart(9),
      note,
    );
    prev = sample;
  }
}

const sceneName = (frame) => (SCENE_LIST.find((s) => frame >= s.from && frame < s.to) ?? { name: '?' }).name;

function report(warnings) {
  if (warnings.length) {
    console.log(`\n⚠️  Предупреждения по вёрстке (${warnings.length}):`);
    warnings.forEach((w) => console.log('   •', w));
  } else {
    console.log('\n✅ Вёрстка: текст везде влезает в кадр');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
