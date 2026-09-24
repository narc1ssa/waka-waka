import {
  cover, sprite, text, radial, vignette, scrim, flash, animFrame,
  easeOutBack, easeOutCubic, norm, clamp,
} from '../draw.mjs';
import { PALETTE as P, FONT, COPY } from '../config.mjs';

export function draw(ctx, env) {
  const { W, H, local, dur, img, anims, warn } = env;
  const bg = img('assets/map/Max_a_убери_кнопки_и_надпи.png');
  const t = local / dur;

  cover(ctx, bg, 0, 0, W, H, { zoom: 1.16 - t * 0.12, offsetX: 0.5, offsetY: 0.42 });
  radial(ctx, W * 0.5, H * 0.44, W * 1.1, [
    [0, 'rgba(42,17,64,0.62)'],
    [0.6, 'rgba(18,10,30,0.78)'],
    [1, 'rgba(9,5,16,0.96)'],
  ]);
  vignette(ctx, W, H, 0.72, 0.3);
  scrim(ctx, W, H, 520, 520, 0.5);

  const logoPop = easeOutBack(norm(2, 22, local));
  ctx.save();
  ctx.translate(W / 2, 720);
  ctx.scale(0.72 + logoPop * 0.28, 0.72 + logoPop * 0.28);
  text(ctx, {
    value: COPY.logo, x: 0, y: 0, size: 232, family: FONT.black, color: P.cream,
    spacing: 8, align: 'center', alpha: clamp(logoPop * 1.4, 0, 1),
    maxWidth: W - 90, warn, label: 'логотип финал',
    stroke: 'rgba(255,209,102,0.9)', strokeWidth: 3,
    shadow: { color: 'rgba(255,168,80,0.85)', blur: 60, offsetY: 0 },
  });
  ctx.restore();

  const barW = 560 * easeOutCubic(norm(14, 32, local));
  if (barW > 2) {
    const g = ctx.createLinearGradient(W / 2 - barW / 2, 0, W / 2 + barW / 2, 0);
    g.addColorStop(0, 'rgba(255,209,102,0)');
    g.addColorStop(0.5, P.gold);
    g.addColorStop(1, 'rgba(255,209,102,0)');
    ctx.fillStyle = g;
    ctx.fillRect(W / 2 - barW / 2, 880, barW, 5);
  }

  text(ctx, {
    value: COPY.tagline, x: W / 2, y: 972, size: 50, family: FONT.bold,
    color: P.white, spacing: 8, align: 'center', alpha: norm(18, 34, local),
    maxWidth: W - 100, warn, label: 'слоган финал',
    shadow: { color: 'rgba(0,0,0,0.7)', blur: 20, offsetY: 4 },
  });

  const heroIn = easeOutBack(norm(16, 38, local));
  if (heroIn > 0) {
    const frames = anims['stage_1_idle'];
    sprite(ctx, animFrame(frames, env.frame / 30, 2), W / 2, 1560, {
      height: 520 * heroIn, anchor: 'bottom', alpha: clamp(heroIn * 1.4, 0, 1),
      shadow: { blur: 40, offsetY: 28, alpha: 0.55 },
    });
  }

  text(ctx, {
    value: COPY.footer, x: W / 2, y: 1760, size: 30, family: FONT.bold,
    color: 'rgba(255,243,224,0.72)', spacing: 8, align: 'center', alpha: norm(30, 44, local),
    maxWidth: W - 120, warn, label: 'футер',
  });

  const fade = norm(52, 60, local);
  if (fade > 0) flash(ctx, W, H, '#000000', fade);
}
