import {
  sprite, text, flash, radial, vignette, animFrame, mulberry32,
  easeOutBack, easeOutCubic, norm, clamp, lerp,
} from '../draw.mjs';
import { PALETTE as P, FONT, COPY, GAME } from '../config.mjs';

const CONFETTI = (() => {
  const rnd = mulberry32(0xbeef);
  const list = [];
  for (let i = 0; i < 18; i++) {
    list.push({
      x: rnd(),
      y: rnd(),
      size: 90 + rnd() * 110,
      rot: rnd() * Math.PI * 2,
      spin: (rnd() - 0.5) * 0.12,
      fall: 0.55 + rnd() * 0.75,
      anim: Math.floor(rnd() * 4),
      tint: [null, '#FFD166', '#FF5D8F', '#4ECDC4'][Math.floor(rnd() * 4)],
    });
  }
  return list;
})();

export function draw(ctx, env) {
  const { W, H, local, anims, img, warn } = env;
  const catAnims = ['enemy1_idle', 'enemy2_idle', 'enemy3_idle', 'enemy4_idle'];

  // --- тёплый фон победы
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#2B1608');
  g.addColorStop(0.45, '#3A1E0B');
  g.addColorStop(1, '#150A04');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  radial(ctx, W / 2, H * 0.4, W * 1.0, [[0, 'rgba(255,209,102,0.42)'], [1, 'rgba(0,0,0,0)']]);

  // --- вращающиеся лучи
  ctx.save();
  ctx.translate(W / 2, 900);
  ctx.rotate(local * 0.006);
  ctx.globalAlpha = 0.10;
  for (let i = 0; i < 14; i++) {
    ctx.rotate((Math.PI * 2) / 14);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(1400, -110);
    ctx.lineTo(1400, 110);
    ctx.closePath();
    ctx.fillStyle = P.gold;
    ctx.fill();
  }
  ctx.restore();

  // --- конфетти из котов
  CONFETTI.forEach((c) => {
    const y = ((c.y * H + (local / 30) * c.fall * 900) % (H + 400)) - 200;
    const x = c.x * W + Math.sin((local / 30) * 1.6 + c.rot) * 60;
    const frames = anims[catAnims[c.anim]];
    const frame = animFrame(frames, env.frame / 30 + c.rot, 5);
    sprite(ctx, frame, x, y, {
      height: c.size, anchor: 'center', rot: c.rot + local * c.spin,
      alpha: 0.85, tint: c.tint,
    });
  });

  // --- счётчик добивает до победы
  const value = Math.round(lerp(GAME.winTotal - 60, GAME.winTotal, easeOutCubic(norm(0, 32, local))));
  const bump = 1 + 0.18 * (1 - norm(0, 32, local));
  ctx.save();
  ctx.translate(W / 2, 600);
  ctx.scale(bump, bump);
  text(ctx, {
    value: String(value), x: 0, y: 0, size: 200, family: FONT.black, color: P.gold,
    align: 'center', maxWidth: W - 120, warn, label: 'счёт победы',
    stroke: 'rgba(21,10,4,0.9)', strokeWidth: 12,
    shadow: { color: 'rgba(255,140,40,0.9)', blur: 60, offsetY: 0 },
  });
  ctx.restore();
  text(ctx, {
    value: `ИЗ ${GAME.winTotal} НУЖНЫХ`, x: W / 2, y: 760, size: 36, family: FONT.bold,
    color: 'rgba(255,243,224,0.8)', spacing: 6, align: 'center',
    maxWidth: W - 140, warn, label: 'из нужных',
  });

  // --- ПОБЕДА
  const pop = easeOutBack(norm(18, 36, local));
  ctx.save();
  ctx.translate(W / 2, 1060);
  ctx.scale(0.75 + pop * 0.25, 0.75 + pop * 0.25);
  text(ctx, {
    value: COPY.victory, x: 0, y: 0, size: 172, family: FONT.black, color: P.cream,
    spacing: 6, align: 'center', alpha: clamp(pop * 1.6, 0, 1),
    maxWidth: W - 80, warn, label: 'победа',
    stroke: 'rgba(255,209,102,0.95)', strokeWidth: 5,
    shadow: { color: 'rgba(255,168,80,0.9)', blur: 70, offsetY: 0 },
  });
  ctx.restore();

  text(ctx, {
    value: COPY.victorySub, x: W / 2, y: 1220, size: 38, family: FONT.bold,
    color: P.cream, spacing: 5, align: 'center', alpha: norm(34, 46, local),
    maxWidth: W - 120, warn, label: 'подзаголовок победы',
  });

  // --- герой радуется внизу
  const heroFrames = anims['stage_1_idle'];
  const hop = Math.abs(Math.sin(local * 0.22)) * 26;
  sprite(ctx, animFrame(heroFrames, env.frame / 30, 3), W / 2, 1740 - hop, {
    height: 470, anchor: 'bottom',
    shadow: { blur: 40, offsetY: 24, alpha: 0.5 },
  });

  vignette(ctx, W, H, 0.5, 0.34);
  if (local < 2) flash(ctx, W, H, '#FFF3E0', 0.22 * (1 - local / 2));
}
