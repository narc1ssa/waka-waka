import {
  sprite, text, fillRoundRect, roundRect, flash, ring, animFrame,
  easeOutBack, easeOutCubic, norm, clamp, mulberry32,
} from '../draw.mjs';
import { backdrop, hexToRgba } from './bg.mjs';
import { PALETTE as P, FONT, COPY, GAME } from '../config.mjs';

const CARDS = [
  { x: 168, y: 600 },
  { x: 416, y: 600 },
  { x: 664, y: 600 },
  { x: 912, y: 600 },
  { x: 270, y: 940 },
  { x: 540, y: 940 },
  { x: 810, y: 940 },
];
const CARD_H = 250;
const SLOT_H = 112;
const SLOT_GAP = 16;
const SLOT_W = 7 * SLOT_H + 6 * SLOT_GAP;
const REWARD = 5;

export function draw(ctx, env) {
  const { W, H, local, anims, img, warn } = env;
  backdrop(ctx, env, { glow: '#FF5D8F', glowAlpha: 0.32, glowY: 0.4, base: img('assets/map/map.png'), baseAlpha: 0.14 });

  const found = clamp(Math.floor((local - 18) / 10) + 1, 0, GAME.rareCats);

  // --- заголовок
  text(ctx, {
    value: COPY.rareTitle, x: W / 2, y: 168, size: 58, family: FONT.bold,
    color: P.gold, spacing: 8, align: 'center', maxWidth: W - 90, warn, label: 'заголовок редких',
    shadow: { color: 'rgba(0,0,0,0.6)', blur: 20, offsetY: 4 },
  });
  text(ctx, {
    value: COPY.rareKicker, x: W / 2, y: 232, size: 32, family: FONT.medium,
    color: 'rgba(255,243,224,0.72)', spacing: 5, align: 'center', alpha: norm(4, 18, local),
    maxWidth: W - 120, warn, label: 'кикер редких',
  });

  // --- редкие коты вылетают по одному
  CARDS.forEach((card, i) => {
    const start = 18 + i * 10;
    const p = easeOutBack(norm(start, start + 13, local));
    if (p <= 0) return;
    const animName = `rare_enemy${i + 1}_idle`;
    const frames = anims[animName];
    const frame = animFrame(frames, env.frame / 30 + i, 5);

    // подложка-«карточка»
    ctx.save();
    ctx.globalAlpha = 0.9;
    fillRoundRect(ctx, card.x - 118, card.y - 150, 236, 300, 28, 'rgba(255,255,255,0.06)');
    roundRect(ctx, card.x - 118, card.y - 150, 236, 300, 28);
    ctx.strokeStyle = hexToRgba(P.pink, 0.35);
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    sprite(ctx, frame, card.x, card.y + CARD_H / 2 - 20, {
      height: CARD_H * p, anchor: 'bottom',
      shadow: { blur: 30, offsetY: 18, alpha: 0.5, color: hexToRgba(P.pink, 0.9) },
    });

    // бейдж награды
    if (p > 0.85) {
      const badgeAlpha = norm(start + 10, start + 18, local);
      text(ctx, {
        value: `+${REWARD}`, x: card.x + 92, y: card.y - 118, size: 40, family: FONT.black,
        color: P.gold, align: 'center', alpha: badgeAlpha,
        stroke: 'rgba(18,10,30,0.9)', strokeWidth: 7,
      });
    }

    // вспышка появления
    const age = local - start;
    if (age >= 0 && age < 18) {
      const t = age / 18;
      ring(ctx, card.x, card.y + 30, 60 + t * 190, `rgba(255,93,143,${(1 - t) * 0.8})`, 1, 8 * (1 - t) + 2);
    }
  });

  // --- слоты коллекции (настоящие иконки «найден» из игры)
  const slotX = (W - SLOT_W) / 2;
  const slotY = 1216;
  for (let i = 0; i < GAME.rareCats; i++) {
    const x = slotX + i * (SLOT_H + SLOT_GAP);
    fillRoundRect(ctx, x, slotY, SLOT_H, SLOT_H + 26, 22, 'rgba(255,255,255,0.07)');
    ctx.save();
    roundRect(ctx, x, slotY, SLOT_H, SLOT_H + 26, 22);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    text(ctx, {
      value: String(i + 1), x: x + SLOT_H / 2, y: slotY + SLOT_H + 12, size: 22,
      family: FONT.bold, color: 'rgba(255,243,224,0.35)', align: 'center',
    });

    if (i < found) {
      const p = easeOutBack(norm(18 + i * 10, 18 + i * 10 + 12, local));
      const icon = img(`assets/rare_enemies/0${i + 1}_found.png`);
      if (icon) {
        sprite(ctx, icon, x + SLOT_H / 2, slotY + SLOT_H / 2 + 4, {
          height: (SLOT_H - 14) * clamp(p, 0, 1.1), anchor: 'center',
          shadow: { blur: 18, offsetY: 6, alpha: 0.5, color: hexToRgba(P.gold, 0.9) },
        });
      }
    }
  }

  // --- счётчик коллекции
  text(ctx, {
    value: `СОБРАНО ${found} / ${GAME.rareCats}`, x: W / 2, y: 1430, size: 48, family: FONT.black,
    color: P.cream, spacing: 4, align: 'center', maxWidth: W - 120, warn, label: 'счёт коллекции',
    shadow: { color: 'rgba(0,0,0,0.7)', blur: 22, offsetY: 4 },
  });

  // --- финал сцены
  const finale = norm(104, 118, local);
  if (finale > 0) {
    ctx.save();
    ctx.globalAlpha = finale * 0.62;
    ctx.fillStyle = '#0C0514';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    const pop = easeOutBack(norm(108, 126, local));
    ctx.save();
    ctx.translate(W / 2, 960);
    ctx.scale(0.8 + pop * 0.2, 0.8 + pop * 0.2);
    text(ctx, {
      value: COPY.rareDone, x: 0, y: 0, size: 74, family: FONT.black, color: P.gold,
      spacing: 4, align: 'center', alpha: clamp(pop * 1.5, 0, 1),
      maxWidth: W - 90, warn, label: 'все коты собраны',
      stroke: 'rgba(18,10,30,0.9)', strokeWidth: 10,
      shadow: { color: 'rgba(255,140,40,0.8)', blur: 50, offsetY: 0 },
    });
    ctx.restore();
    text(ctx, {
      value: `КАЖДЫЙ +${REWARD} К СЧЁТУ`, x: W / 2, y: 1060, size: 34, family: FONT.bold,
      color: P.cream, spacing: 6, align: 'center', alpha: norm(118, 132, local),
      maxWidth: W - 140, warn, label: 'награда',
    });
  }

  if (local >= 104 && local < 108) flash(ctx, W, H, '#FFFFFF', 0.35 * (1 - (local - 104) / 4));
}
