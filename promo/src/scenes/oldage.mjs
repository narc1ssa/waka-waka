import {
  sprite, text, lines, flash, ring, radial, vignette, animFrame,
  easeOutBack, easeOutCubic, norm, clamp, lerp,
} from '../draw.mjs';
import { PALETTE as P, FONT, COPY, GAME } from '../config.mjs';

const TICK_FRAMES = 75;   // 2.5 секунды на обратный отсчёт
const DEATH_FROM = 75;
const PILL_FROM = 93;

export function draw(ctx, env) {
  const { W, H, local, anims, img, warn } = env;

  if (local < DEATH_FROM) drawCountdown(ctx, env);
  else if (local < PILL_FROM) drawDeath(ctx, env);
  else drawPill(ctx, env);
}

function drawCountdown(ctx, env) {
  const { W, H, local, anims, img, warn } = env;
  const map = img('assets/map/map.png');

  // тревожный фон: та же карта, но багровая
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.filter = 'blur(10px)';
  const s = Math.max(W / map.width, H / map.height) * 1.05;
  ctx.drawImage(map, (W - map.width * s) / 2, (H - map.height * s) / 2, map.width * s, map.height * s);
  ctx.filter = 'none';
  ctx.restore();

  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#2A0710');
  g.addColorStop(0.45, '#3A0A12');
  g.addColorStop(1, '#12040A');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  radial(ctx, W / 2, H * 0.45, W * 0.9, [
    [0, 'rgba(255,59,48,0.35)'],
    [1, 'rgba(0,0,0,0)'],
  ]);

  // герой на последней стадии: подрагивает
  const shake = Math.sin(local * 1.7) * (2 + local / TICK_FRAMES * 7);
  const frames = anims['stage_5_idle'];
  const frame = animFrame(frames, env.frame / 30, 2);
  sprite(ctx, frame, W / 2 + shake, 1440, {
    height: 660, anchor: 'bottom',
    shadow: { blur: 40, offsetY: 24, alpha: 0.5, color: 'rgba(255,59,48,0.9)' },
  });

  // обратный отсчёт
  const left = Math.ceil(GAME.oldAgeSeconds * (1 - local / TICK_FRAMES));
  const tickPulse = 1 - ((local % 4) / 4) * 0.12;
  text(ctx, {
    value: COPY.oldAgeLine, x: W / 2, y: 380, size: 62, family: FONT.black,
    color: P.cream, spacing: 4, align: 'center', alpha: norm(0, 12, local),
    maxWidth: W - 90, warn, label: 'старость 1',
    stroke: 'rgba(18,4,10,0.9)', strokeWidth: 8,
  });

  ctx.save();
  ctx.translate(W / 2, 640);
  ctx.scale(tickPulse, tickPulse);
  text(ctx, {
    value: String(left), x: 0, y: 0, size: 230, family: FONT.black, color: P.danger,
    align: 'center', maxWidth: W - 120, warn, label: 'таймер',
    stroke: 'rgba(20,2,6,0.9)', strokeWidth: 12,
    shadow: { color: 'rgba(255,59,48,0.9)', blur: 60, offsetY: 0 },
  });
  ctx.restore();

  text(ctx, {
    value: COPY.oldAgeLine2, x: W / 2, y: 830, size: 44, family: FONT.bold,
    color: 'rgba(255,243,224,0.85)', spacing: 5, align: 'center', alpha: norm(6, 20, local),
    maxWidth: W - 120, warn, label: 'старость 2',
  });

  // пульсация опасности
  const pulse = 0.10 + 0.10 * Math.sin(local * 0.55) + norm(40, TICK_FRAMES, local) * 0.16;
  ctx.save();
  ctx.globalAlpha = clamp(pulse, 0, 0.45);
  ctx.fillStyle = '#FF3B30';
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  vignette(ctx, W, H, 0.75, 0.28);
}

function drawDeath(ctx, env) {
  const { W, H, local, anims, warn } = env;
  const p = norm(DEATH_FROM, DEATH_FROM + 4, local);
  ctx.fillStyle = '#12040A';
  ctx.fillRect(0, 0, W, H);
  radial(ctx, W / 2, H * 0.5, W * 0.9, [[0, `rgba(255,59,48,${0.4 * (1 - p)})`], [1, 'rgba(0,0,0,0)']]);

  const frames = anims['death'];
  const idx = clamp(Math.floor(norm(DEATH_FROM, DEATH_FROM + 16, local) * frames.length), 0, frames.length - 1);
  sprite(ctx, frames[idx], W / 2, 1400, {
    height: 620, anchor: 'bottom', alpha: clamp(1 - norm(DEATH_FROM + 12, DEATH_FROM + 18, local) * 0.85, 0.15, 1),
    shadow: { blur: 50, offsetY: 20, alpha: 0.5, color: 'rgba(255,59,48,0.9)' },
  });

  text(ctx, {
    value: COPY.death, x: W / 2, y: 620, size: 68, family: FONT.black, color: P.cream,
    spacing: 3, align: 'center', alpha: norm(DEATH_FROM + 2, DEATH_FROM + 10, local),
    maxWidth: W - 100, warn, label: 'смерть',
    stroke: 'rgba(18,4,10,0.9)', strokeWidth: 10,
  });

  if (local >= DEATH_FROM && local < DEATH_FROM + 3) flash(ctx, W, H, '#FF3B30', 0.5 * (1 - (local - DEATH_FROM) / 3));
}

function drawPill(ctx, env) {
  const { W, H, local, anims, img, warn } = env;
  const p = local - PILL_FROM;

  // мягкий тёплый фон «второй шанс»
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1B1030');
  g.addColorStop(0.5, '#241338');
  g.addColorStop(1, '#0E0720');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  radial(ctx, W / 2, H * 0.42, W * 0.95, [
    [0, `rgba(78,205,196,${0.28 * norm(0, 12, p)})`],
    [1, 'rgba(0,0,0,0)'],
  ]);

  if (p < 4) flash(ctx, W, H, '#FFFFFF', 0.75 * (1 - p / 4));

  // таблетка (в игре она выглядит как домик) опускается сверху
  const pill = img('assets/pill/Max_a_создай_спрайт_домика.png');
  const pillIn = easeOutBack(norm(2, 20, p));
  const burst = norm(20, 30, p);
  if (pillIn > 0) {
    sprite(ctx, pill, W / 2, lerp(360, 700, easeOutCubic(norm(2, 22, p))), {
      height: 420 * pillIn, anchor: 'center', alpha: clamp(pillIn * 1.4, 0, 1),
      shadow: { blur: 60, offsetY: 0, alpha: 0.7, color: 'rgba(78,205,196,0.95)' },
    });
  }
  if (burst > 0 && burst < 1) {
    ring(ctx, W / 2, 700, 120 + burst * 520, `rgba(78,205,196,${(1 - burst) * 0.85})`, 1, 14 * (1 - burst) + 3);
  }

  // герой снова младенец
  const heroIn = easeOutBack(norm(22, 38, p));
  if (heroIn > 0) {
    const frames = anims['stage_1_idle'];
    const frame = animFrame(frames, env.frame / 30, 2);
    sprite(ctx, frame, W / 2, 1520, {
      height: 560 * heroIn, anchor: 'bottom', alpha: clamp(heroIn * 1.4, 0, 1),
      shadow: { blur: 40, offsetY: 26, alpha: 0.5 },
    });
  }

  lines(ctx, [COPY.pill], {
    x: W / 2, y: 300, size: 70, family: FONT.black, lineHeight: 86,
    startFrame: 8, stagger: 0, frame: p, color: P.mint, spacing: 3,
    maxWidth: W - 100, warn, label: 'таблетка',
    stroke: 'rgba(14,7,32,0.9)', strokeWidth: 10,
    shadow: { color: 'rgba(78,205,196,0.8)', blur: 40, offsetY: 0 },
  });
  text(ctx, {
    value: COPY.pillSub, x: W / 2, y: 396, size: 42, family: FONT.bold,
    color: P.cream, spacing: 6, align: 'center', alpha: norm(16, 26, p),
    maxWidth: W - 120, warn, label: 'снова младенец',
  });
  text(ctx, {
    value: 'СТАРОСТЬ ОТСТУПАЕТ. СЧЁТ ОСТАЁТСЯ.', x: W / 2, y: 1720, size: 32, family: FONT.medium,
    color: 'rgba(255,243,224,0.75)', spacing: 4, align: 'center', alpha: norm(32, 44, p),
    maxWidth: W - 120, warn, label: 'счёт остаётся',
  });
}
