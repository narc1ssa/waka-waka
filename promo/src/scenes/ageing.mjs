import {
  sprite, text, fillRoundRect, roundRect, flash, animFrame,
  easeOutCubic, easeOutBack, norm, clamp, lerp,
} from '../draw.mjs';
import { backdrop } from './bg.mjs';
import { PALETTE as P, FONT, COPY, GAME } from '../config.mjs';

const STAGE_FRAMES = 33; // по 1.1 секунды на стадию
const CHIP_W = 186;
const CHIP_GAP = (1080 - 5 * CHIP_W) / 6;

export function draw(ctx, env) {
  const { W, H, local, anims, img, warn } = env;
  backdrop(ctx, env, { glow: '#4ECDC4', glowAlpha: 0.28, glowY: 0.46, base: img('assets/map/map.png'), baseAlpha: 0.18 });

  const idx = clamp(Math.floor(local / STAGE_FRAMES), 0, GAME.stages.length - 1);
  const nextIdx = Math.min(idx + 1, GAME.stages.length - 1);
  const stage = GAME.stages[idx];
  const inStage = local - idx * STAGE_FRAMES;
  const morph = norm(STAGE_FRAMES - 7, STAGE_FRAMES, inStage); // мягкий переход к следующей стадии

  // --- заголовок
  text(ctx, {
    value: COPY.ageingTitle, x: W / 2, y: 168, size: 58, family: FONT.bold,
    color: P.gold, spacing: 8, align: 'center', maxWidth: W - 90, warn, label: 'заголовок стадий',
    shadow: { color: 'rgba(0,0,0,0.6)', blur: 20, offsetY: 4 },
  });

  // --- «чипсы» стадий сверху
  GAME.stages.forEach((s, i) => {
    const x = CHIP_GAP + i * (CHIP_W + CHIP_GAP);
    const active = i === idx;
    const pop = active ? 1 + 0.1 * (1 - easeOutCubic(norm(0, 8, inStage))) : 1;
    const y = 262;
    ctx.save();
    ctx.translate(x + CHIP_W / 2, y + 36);
    ctx.scale(pop, pop);
    fillRoundRect(ctx, -CHIP_W / 2, -36, CHIP_W, 72, 36, active ? P.gold : 'rgba(255,255,255,0.08)');
    if (!active) {
      ctx.save();
      roundRect(ctx, -CHIP_W / 2, -36, CHIP_W, 72, 36);
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
    text(ctx, {
      value: s.name.toUpperCase(), x: 0, y: 2, size: 23, family: FONT.bold,
      color: active ? '#20122E' : 'rgba(255,243,224,0.55)', spacing: 1, align: 'center',
      maxWidth: CHIP_W - 24, warn, label: `чип ${s.name}`,
    });
    ctx.restore();
  });

  // --- крупное название текущей стадии
  const nameIn = easeOutBack(norm(0, 12, inStage));
  ctx.save();
  ctx.translate(W / 2, 560);
  ctx.scale(0.86 + nameIn * 0.14, 0.86 + nameIn * 0.14);
  text(ctx, {
    value: stage.name.toUpperCase(), x: 0, y: 0, size: 116, family: FONT.black,
    color: P.cream, spacing: 4, align: 'center', alpha: clamp(nameIn * 1.4, 0, 1),
    maxWidth: W - 80, warn, label: 'название стадии',
    stroke: 'rgba(18,10,30,0.85)', strokeWidth: 8,
    shadow: { color: 'rgba(78,205,196,0.7)', blur: 40, offsetY: 0 },
  });
  ctx.restore();

  // --- сам герой: растёт и «перетекает» в следующую стадию
  const heroH = 620 + idx * 22;
  const drawHero = (i, alpha) => {
    const frames = anims[`${GAME.stages[i].animation}_walk_right`];
    const frame = animFrame(frames, env.frame / 30, 6);
    sprite(ctx, frame, W / 2, 1330, {
      height: heroH + (i - idx) * 22, anchor: 'bottom', alpha,
      shadow: { blur: 40, offsetY: 30, alpha: 0.55 },
    });
  };
  if (morph > 0 && nextIdx !== idx) {
    drawHero(idx, 1 - morph);
    drawHero(nextIdx, morph);
  } else {
    drawHero(idx, 1);
  }

  // --- шкала скорости
  const barW = 640;
  const barX = (W - barW) / 2;
  const barY = 1452;
  const speedT = (stage.speed - 1.0) / 0.4;
  fillRoundRect(ctx, barX, barY, barW, 26, 13, 'rgba(255,255,255,0.12)');
  const fill = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  fill.addColorStop(0, P.mint);
  fill.addColorStop(1, P.gold);
  ctx.save();
  roundRect(ctx, barX, barY, barW * (0.25 + speedT * 0.75), 26, 13);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
  text(ctx, {
    value: 'СКОРОСТЬ', x: barX, y: barY - 34, size: 26, family: FONT.bold,
    color: 'rgba(255,243,224,0.65)', spacing: 5, warn, label: 'скорость',
  });
  text(ctx, {
    value: `×${stage.speed.toFixed(2)}`, x: barX + barW, y: barY - 34, size: 34, family: FONT.black,
    color: P.gold, spacing: 2, align: 'right', warn, label: 'множитель',
  });

  // --- подводка
  text(ctx, {
    value: COPY.ageingKicker, x: W / 2, y: 1600, size: 36, family: FONT.bold,
    color: 'rgba(255,243,224,0.8)', spacing: 5, align: 'center',
    maxWidth: W - 120, warn, label: 'кикер стадий',
  });
  text(ctx, {
    value: 'ОБРАТНОГО ПУТИ НЕТ', x: W / 2, y: 1668, size: 30, family: FONT.medium,
    color: P.pink, spacing: 7, align: 'center', alpha: norm(60, 80, local),
    maxWidth: W - 120, warn, label: 'пути нет',
  });

  // вспышка на стыке стадий
  if (inStage < 3 && idx > 0) flash(ctx, W, H, '#FFFFFF', 0.16 * (1 - inStage / 3));
}
