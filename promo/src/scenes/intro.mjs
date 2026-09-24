import {
  cover, sprite, text, lines, radial, vignette, scrim,
  easeOutBack, easeOutCubic, norm, clamp, animFrame,
} from '../draw.mjs';
import { PALETTE as P, FONT, COPY } from '../config.mjs';

// Плавающие коты на фоне: детерминированные, чтобы перерендер был тем же.
const floaters = [
  { x: 0.16, y: 0.10, h: 190, speed: 0.85, phase: 0.0, sway: 40, tint: '#3B1B58', alpha: 0.55 },
  { x: 0.84, y: 0.16, h: 150, speed: 1.05, phase: 1.7, sway: 55, tint: '#3B1B58', alpha: 0.5 },
  { x: 0.26, y: 0.30, h: 120, speed: 0.7,  phase: 3.1, sway: 34, tint: '#43205F', alpha: 0.45 },
  { x: 0.78, y: 0.38, h: 230, speed: 0.55, phase: 4.4, sway: 46, tint: '#331646', alpha: 0.6 },
  { x: 0.10, y: 0.56, h: 165, speed: 0.95, phase: 2.2, sway: 60, tint: '#3B1B58', alpha: 0.4 },
  { x: 0.90, y: 0.64, h: 200, speed: 0.75, phase: 5.0, sway: 42, tint: '#331646', alpha: 0.5 },
  { x: 0.50, y: 0.20, h: 105, speed: 1.15, phase: 0.9, sway: 28, tint: '#43205F', alpha: 0.35 },
];

const CAT_ANIMS = ['enemy1_idle', 'enemy2_idle', 'enemy3_idle', 'enemy4_idle'];

export function draw(ctx, env) {
  const { W, H, local, dur, img, anims, warn } = env;
  const t = local / dur;
  const bg = img('assets/map/Max_a_убери_кнопки_и_надпи.png');
  const heroFrames = anims['stage_1_idle'];

  // 1. Фон меню игры с медленным наездом
  cover(ctx, bg, 0, 0, W, H, { zoom: 1.0 + t * 0.14, offsetX: 0.5, offsetY: 0.42 });

  // 2. Фирменный градиент поверх
  radial(ctx, W * 0.5, H * 0.44, W * 1.15, [
    [0, 'rgba(42,17,64,0.55)'],
    [0.55, 'rgba(18,10,30,0.72)'],
    [1, 'rgba(9,5,16,0.95)'],
  ]);

  // 3. Силуэты котов, уплывающих вверх
  floaters.forEach((f, i) => {
    const anim = anims[CAT_ANIMS[i % CAT_ANIMS.length]];
    const frame = animFrame(anim, env.frame / 30, 4, i * 3);
    const y = H * f.y - (((env.frame / 30) * f.speed * 46 + f.phase * 30) % (H * 1.4));
    const yy = y < -f.h ? y + H * 1.4 : y;
    sprite(ctx, frame, W * f.x + Math.sin(env.frame / 42 + f.phase) * f.sway, yy + f.h, {
      height: f.h, tint: f.tint, alpha: f.alpha, anchor: 'center',
    });
  });

  vignette(ctx, W, H, 0.7, 0.3);

  // 4. Титульный блок
  scrim(ctx, W, H, 420, 560, 0.55);

  const appear = easeOutCubic(norm(2, 20, local));
  const logoPop = easeOutBack(norm(4, 26, local));

  text(ctx, {
    value: COPY.kicker, x: W / 2, y: 470, size: 36, family: FONT.bold,
    color: P.gold, spacing: 9, align: 'center', alpha: appear,
    maxWidth: W - 120, warn, label: 'кикер',
    shadow: { color: 'rgba(0,0,0,0.6)', blur: 18, offsetY: 3 },
  });

  // Логотип
  ctx.save();
  ctx.translate(W / 2, 700);
  ctx.scale(0.7 + logoPop * 0.3, 0.7 + logoPop * 0.3);
  text(ctx, {
    value: COPY.logo, x: 0, y: 0, size: 260, family: FONT.black,
    color: P.cream, spacing: 6, align: 'center', alpha: clamp(appear * 1.2, 0, 1),
    maxWidth: W - 90, warn, label: 'логотип',
    stroke: 'rgba(255,209,102,0.9)', strokeWidth: 3,
    shadow: { color: 'rgba(255,168,80,0.85)', blur: 60, offsetY: 0 },
  });
  ctx.restore();

  // Разделитель под логотипом
  const barW = 520 * easeOutExpoLocal(norm(22, 40, local));
  if (barW > 2) {
    const g = ctx.createLinearGradient(W / 2 - barW / 2, 0, W / 2 + barW / 2, 0);
    g.addColorStop(0, 'rgba(255,209,102,0)');
    g.addColorStop(0.5, P.gold);
    g.addColorStop(1, 'rgba(255,209,102,0)');
    ctx.fillStyle = g;
    ctx.fillRect(W / 2 - barW / 2, 856, barW, 5);
  }

  lines(ctx, COPY.tagline.split(' · '), {
    x: W / 2, y: 940, size: 50, family: FONT.bold, spacing: 4,
    lineHeight: 62, startFrame: 30, stagger: 5, frame: local,
    color: P.white, maxWidth: W - 100, warn, label: 'слоган',
    shadow: { color: 'rgba(0,0,0,0.7)', blur: 20, offsetY: 4 },
  });

  // 5. Появление героя-котёнка снизу
  const heroIn = easeOutBack(norm(34, 62, local));
  if (heroIn > 0) {
    const heroFrame = animFrame(heroFrames, env.frame / 30, 2);
    sprite(ctx, heroFrame, W / 2, 1560 + (1 - heroIn) * 320, {
      height: 430, alpha: clamp(heroIn * 1.4, 0, 1), anchor: 'bottom',
      shadow: { blur: 40, offsetY: 28, alpha: 0.5, color: 'rgba(0,0,0,0.8)' },
    });
  }

  // 6. Нижняя подсказка
  text(ctx, {
    value: COPY.controls, x: W / 2, y: 1760, size: 30, family: FONT.medium,
    color: 'rgba(255,243,224,0.6)', spacing: 5, alpha: norm(52, 70, local),
    maxWidth: W - 140, warn, label: 'управление',
  });
}

const easeOutExpoLocal = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
