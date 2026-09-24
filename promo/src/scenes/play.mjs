import {
  sprite, text, lines, vignette, scrim, ring, fillRoundRect, roundRect,
  easeOutCubic, easeOutExpo, norm, clamp, lerp, mulberry32, animFrame,
} from '../draw.mjs';
import { PALETTE as P, FONT, COPY, GAME } from '../config.mjs';

const WORLD = 2400;          // игровое поле в «мировых» пикселях
const HERO_H = 250;          // высота героя на экране
const CAT_H = 150;
const HERO_SPEED = 400;      // мировых px/с
const CAT_SPEED = 90;
const EAT_RADIUS = 95;

/**
 * Симулируем настоящий геймплей: герой догоняет ближайшего кота,
 * коты бегают кто куда. Из этого же прогона берутся звуковые cue для озвучки.
 */
export function buildTimeline(anims, fps = 30) {
  const rnd = mulberry32(0x5eed);
  const dt = 1 / fps;
  const frames = 210;
  const catAnims = ['enemy1_idle', 'enemy2_idle', 'enemy3_idle', 'enemy4_idle'];
  const cats = [];
  for (let i = 0; i < 18; i++) cats.push(spawn(i, rnd, { x: WORLD / 2, y: WORLD / 2 }));

  const hero = { x: WORLD / 2, y: WORLD / 2, flip: false, target: 0 };
  const cam = { x: hero.x - 540, y: hero.y - 960 };
  const out = [];
  const events = [];
  let eaten = 0;

  for (let f = 0; f < frames; f++) {
    // --- герой: преследует ближайшего живого кота
    let best = -1;
    let bestDist = Infinity;
    cats.forEach((c, i) => {
      if (!c.alive) return;
      const d = Math.hypot(c.x - hero.x, c.y - hero.y);
      if (d < bestDist) { bestDist = d; best = i; }
    });

    if (best >= 0) {
      const c = cats[best];
      const dx = c.x - hero.x;
      const dy = c.y - hero.y;
      const len = Math.hypot(dx, dy) || 1;
      hero.x += (dx / len) * HERO_SPEED * dt;
      hero.y += (dy / len) * HERO_SPEED * dt;
      hero.flip = dx < 0;
    }

    hero.x = clamp(hero.x, 90, WORLD - 90);
    hero.y = clamp(hero.y, 120, WORLD - 120);

    // --- коты: блуждают и меняют направление
    cats.forEach((c) => {
      if (!c.alive) {
        c.respawn -= dt;
        if (c.respawn <= 0) reset(c, rnd, hero);
        return;
      }
      c.timer -= dt;
      if (c.timer <= 0) {
        const a = rnd() * Math.PI * 2;
        c.vx = Math.cos(a) * CAT_SPEED * (0.6 + rnd() * 0.8);
        c.vy = Math.sin(a) * CAT_SPEED * (0.6 + rnd() * 0.8);
        c.timer = 0.5 + rnd() * 1.1;
      }
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      if (c.x < 80 || c.x > WORLD - 80) { c.vx *= -1; c.x = clamp(c.x, 80, WORLD - 80); }
      if (c.y < 100 || c.y > WORLD - 100) { c.vy *= -1; c.y = clamp(c.y, 100, WORLD - 100); }
    });

    // --- поедание
    cats.forEach((c, i) => {
      if (!c.alive) return;
      if (Math.hypot(c.x - hero.x, c.y - hero.y) < EAT_RADIUS) {
        c.alive = false;
        c.respawn = 0.45 + rnd() * 0.5;
        eaten++;
        events.push({ frame: f, x: c.x, y: c.y, index: i, count: eaten });
      }
    });

    // --- камера плавно идёт за героем
    const tx = clamp(hero.x - 540, 0, WORLD - 1080);
    const ty = clamp(hero.y - 960, 0, WORLD - 1920);
    cam.x = lerp(cam.x, tx, 0.12);
    cam.y = lerp(cam.y, ty, 0.12);

    out.push({
      hero: { x: hero.x, y: hero.y, flip: hero.flip },
      cats: cats.map((c) => ({ x: c.x, y: c.y, alive: c.alive, anim: c.anim, seed: c.seed })),
      cam: { x: cam.x, y: cam.y },
      eaten,
    });
  }

  return { frames: out, events, world: WORLD };
}

function spawn(i, rnd, hero) {
  const c = { anim: i % 4, seed: rnd() * 100 };
  reset(c, rnd, hero);
  return c;
}

function reset(c, rnd, hero) {
  let x = 0;
  let y = 0;
  for (let tries = 0; tries < 24; tries++) {
    x = 140 + rnd() * (WORLD - 280);
    y = 160 + rnd() * (WORLD - 320);
    if (Math.hypot(x - hero.x, y - hero.y) > 380) break;
  }
  c.x = x;
  c.y = y;
  const a = rnd() * Math.PI * 2;
  c.vx = Math.cos(a) * CAT_SPEED;
  c.vy = Math.sin(a) * CAT_SPEED;
  c.timer = 0.4 + rnd() * 1.0;
  c.alive = true;
  c.respawn = 0;
}

/** Абсолютные моменты (в секундах ролика), когда кот был съеден. */
export function eatCueTimes(timeline, sceneFrom, fps = 30, max = 14) {
  const all = timeline.events.map((e) => (sceneFrom + e.frame) / fps);
  if (all.length <= max) return all;
  const step = all.length / max;
  return Array.from({ length: max }, (_, i) => all[Math.floor(i * step)]);
}

export function draw(ctx, env) {
  const { W, H, local, img, anims, warn, timeline } = env;
  const map = img('assets/map/map.png');
  const state = timeline.frames[Math.min(local, timeline.frames.length - 1)];
  const { cam } = state;
  const catAnims = ['enemy1_idle', 'enemy2_idle', 'enemy3_idle', 'enemy4_idle'];

  // 1. Карта уровня (настоящий тайлмап игры) с лёгким дыханием камеры
  const breathe = 1 + Math.sin(local / 46) * 0.008;
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(breathe, breathe);
  ctx.translate(-W / 2, -H / 2);
  ctx.drawImage(map, -cam.x, -cam.y, WORLD, WORLD);
  ctx.restore();

  // 2. Затемнение полей, чтобы HUD читался
  radialWarm(ctx, W, H);

  // 3. Коты
  state.cats.forEach((c, i) => {
    if (!c.alive) return;
    const frames = anims[catAnims[c.anim % catAnims.length]];
    const f = animFrame(frames, env.frame / 30 + c.seed, 5);
    const sx = c.x - cam.x;
    const sy = c.y - cam.y;
    if (sx < -200 || sx > W + 200 || sy < -300 || sy > H + 300) return;
    sprite(ctx, f, sx, sy, {
      height: CAT_H, anchor: 'center',
      shadow: { blur: 14, offsetY: 10, alpha: 0.35 },
    });
  });

  // 4. Герой (первая стадия — младенец)
  const heroAnim = state.hero.flip ? 'stage_1_walk_left' : 'stage_1_walk_right';
  const heroFrame = animFrame(anims[heroAnim], env.frame / 30, 6);
  const hx = state.hero.x - cam.x;
  const hy = state.hero.y - cam.y;
  sprite(ctx, heroFrame, hx, hy + 40, {
    height: HERO_H, anchor: 'center',
    shadow: { blur: 26, offsetY: 26, alpha: 0.45 },
  });

  // 5. Эффекты поедания
  timeline.events.forEach((e) => {
    const age = local - e.frame;
    if (age < 0 || age > 26) return;
    const p = age / 26;
    const sx = e.x - cam.x;
    const sy = e.y - cam.y;
    ring(ctx, sx, sy, 30 + p * 130, `rgba(255,209,102,${(1 - p) * 0.9})`, 1, 10 * (1 - p) + 2);
    const flashCat = anims[catAnims[e.index % catAnims.length]][0];
    sprite(ctx, flashCat, sx, sy, {
      height: CAT_H * (1 + p * 0.9), anchor: 'center', alpha: 1 - p,
    });
    text(ctx, {
      value: '+1', x: sx, y: sy - 90 - p * 90, size: 54, family: FONT.black,
      color: P.gold, align: 'center', alpha: 1 - p * p,
      stroke: 'rgba(18,10,30,0.85)', strokeWidth: 8,
    });
  });

  vignette(ctx, W, H, 0.55, 0.32);

  // 6. HUD
  drawHud(ctx, env, state);

  // 7. Титры
  scrim(ctx, W, H, 0, 620, 0.85);
  if (local < 78) {
    lines(ctx, COPY.play1, {
      x: W / 2, y: 1470, size: 86, family: FONT.black, lineHeight: 104,
      startFrame: 4, stagger: 7, frame: local, color: P.cream,
      maxWidth: W - 110, warn, label: 'титр 1',
      stroke: 'rgba(18,10,30,0.9)', strokeWidth: 10,
      shadow: { color: 'rgba(0,0,0,0.75)', blur: 28, offsetY: 8 },
    });
  } else if (local >= 88 && local < 165) {
    lines(ctx, COPY.play2, {
      x: W / 2, y: 1470, size: 70, family: FONT.black, lineHeight: 92,
      startFrame: 88, stagger: 7, frame: local, color: P.cream,
      maxWidth: W - 110, warn, label: 'титр 2',
      stroke: 'rgba(18,10,30,0.9)', strokeWidth: 10,
      shadow: { color: 'rgba(0,0,0,0.75)', blur: 28, offsetY: 8 },
    });
  }
}

function radialWarm(ctx, W, H) {
  const g = ctx.createRadialGradient(W / 2, H * 0.52, W * 0.2, W / 2, H / 2, H * 0.62);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(24,8,4,0.45)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function drawHud(ctx, env, state) {
  const { W, img, warn, anims, local } = env;
  // --- счётчик котов
  const panelW = 430;
  fillRoundRect(ctx, 48, 96, panelW, 116, 58, 'rgba(12,6,20,0.62)');
  ctx.save();
  roundRect(ctx, 48, 96, panelW, 116, 58);
  ctx.strokeStyle = 'rgba(255,209,102,0.35)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  sprite(ctx, anims['enemy1_idle'][0], 112, 140, { height: 84, anchor: 'center' });

  text(ctx, {
    value: 'КОТЫ', x: 168, y: 132, size: 26, family: FONT.bold, color: 'rgba(255,243,224,0.7)',
    spacing: 4, warn, label: 'HUD подпись',
  });

  const lastEat = env.timeline.events.filter((e) => e.frame <= local).pop();
  const bump = lastEat ? 1 + 0.28 * (1 - easeOutCubic(norm(0, 9, local - lastEat.frame))) : 1;
  ctx.save();
  ctx.translate(168, 176);
  ctx.scale(bump, bump);
  text(ctx, {
    value: String(state.eaten), x: 0, y: 0, size: 62, family: FONT.black, color: P.gold,
    warn, label: 'HUD счёт',
    shadow: { color: 'rgba(255,140,40,0.8)', blur: 24, offsetY: 0 },
  });
  ctx.restore();

  // --- стадия героя
  const chipW = 330;
  fillRoundRect(ctx, W - 48 - chipW, 96, chipW, 116, 58, 'rgba(12,6,20,0.62)');
  ctx.save();
  roundRect(ctx, W - 48 - chipW, 96, chipW, 116, 58);
  ctx.strokeStyle = 'rgba(78,205,196,0.35)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
  text(ctx, {
    value: GAME.stages[0].name.toUpperCase(), x: W - 48 - chipW / 2, y: 136, size: 30,
    family: FONT.bold, color: P.mint, spacing: 3, align: 'center',
    maxWidth: chipW - 40, warn, label: 'HUD стадия',
  });
  text(ctx, {
    value: `×${GAME.stages[0].speed.toFixed(2)} СКОРОСТЬ`, x: W - 48 - chipW / 2, y: 178, size: 24,
    family: FONT.medium, color: 'rgba(255,243,224,0.65)', spacing: 2, align: 'center',
    maxWidth: chipW - 40, warn, label: 'HUD скорость',
  });
}
