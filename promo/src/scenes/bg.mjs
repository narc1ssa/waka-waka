import { sprite, radial, vignette, animFrame } from '../draw.mjs';

const CAT_ANIMS = ['enemy1_idle', 'enemy2_idle', 'enemy3_idle', 'enemy4_idle'];

const FLOATERS = [
  { x: 0.14, y: 0.12, h: 180, speed: 0.8, phase: 0.0, sway: 44, tint: '#3B1B58', alpha: 0.45 },
  { x: 0.86, y: 0.22, h: 140, speed: 1.0, phase: 1.7, sway: 58, tint: '#43205F', alpha: 0.4 },
  { x: 0.24, y: 0.44, h: 110, speed: 0.65, phase: 3.1, sway: 30, tint: '#331646', alpha: 0.5 },
  { x: 0.80, y: 0.56, h: 210, speed: 0.5, phase: 4.4, sway: 48, tint: '#2A1140', alpha: 0.55 },
  { x: 0.08, y: 0.72, h: 160, speed: 0.9, phase: 2.2, sway: 62, tint: '#3B1B58', alpha: 0.35 },
  { x: 0.92, y: 0.84, h: 190, speed: 0.7, phase: 5.0, sway: 40, tint: '#331646', alpha: 0.45 },
];

/** Тёмный фон с мягким светом и уплывающими котами-силуэтами. */
export function backdrop(ctx, env, opts = {}) {
  const { W, H, anims, img } = env;
  const { glow = '#4B2372', glowAlpha = 0.5, glowY = 0.42, cats = true, base = null, baseAlpha = 0.25 } = opts;

  if (base) {
    ctx.save();
    ctx.globalAlpha = baseAlpha;
    ctx.filter = 'blur(6px)';
    const s = Math.max(W / base.width, H / base.height);
    ctx.drawImage(base, (W - base.width * s) / 2, (H - base.height * s) / 2, base.width * s, base.height * s);
    ctx.filter = 'none';
    ctx.restore();
  }

  // Базовый градиент
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1A0D2B');
  g.addColorStop(0.5, '#150A22');
  g.addColorStop(1, '#0C0514');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  radial(ctx, W * 0.5, H * glowY, W * 0.95, [
    [0, hexToRgba(glow, glowAlpha)],
    [1, 'rgba(0,0,0,0)'],
  ]);

  if (cats) {
    FLOATERS.forEach((f, i) => {
      const anim = anims[CAT_ANIMS[i % CAT_ANIMS.length]];
      const frame = animFrame(anim, env.frame / 30, 4, i * 3);
      const travel = ((env.frame / 30) * f.speed * 40 + f.phase * 30) % (H * 1.3);
      const y = H * f.y - travel;
      const yy = y < -f.h ? y + H * 1.3 : y;
      sprite(ctx, frame, W * f.x + Math.sin(env.frame / 40 + f.phase) * f.sway, yy + f.h, {
        height: f.h, tint: f.tint, alpha: f.alpha, anchor: 'center',
      });
    });
  }

  vignette(ctx, W, H, 0.62, 0.3);
}

export function hexToRgba(hex, alpha = 1) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}
