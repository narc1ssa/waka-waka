// Небольшая библиотечка рисования поверх @napi-rs/canvas (Skia).
// Здесь нет магии: всё детерминировано, чтобы рендер был воспроизводим.
import { createCanvas } from '@napi-rs/canvas';

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const norm = (a, b, v) => clamp((v - a) / (b - a), 0, 1);
export const smoothstep = (a, b, v) => {
  const t = norm(a, b, v);
  return t * t * (3 - 2 * t);
};
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInCubic = (t) => t * t * t;
export const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const easeOutBack = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
export const easeOutElastic = (t) => {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

/** Детерминированный ГПСЧ, чтобы каждый перерендер был идентичен. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------------------------------------------------------- картинки */

/** Рисует спрайт, центрируя его в точке (x, y) по низу (как персонаж, стоящий на земле). */
export function sprite(ctx, img, x, y, opts = {}) {
  if (!img) return;
  const {
    height = img.height,
    flip = false,
    alpha = 1,
    rot = 0,
    anchor = 'bottom', // bottom | center
    shadow = null, // {blur, color, offsetY, alpha}
    tint = null,
    cache = null,
  } = opts;
  const src = tint ? tinted(img, tint, cache ?? tintCache) : img;
  const h = height;
  const w = (src.width / src.height) * h;
  if (alpha <= 0.001 || h <= 0) return;

  ctx.save();
  ctx.globalAlpha = clamp(alpha, 0, 1);
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  if (flip) ctx.scale(-1, 1);

  if (shadow) {
    ctx.save();
    ctx.globalAlpha = clamp(alpha * (shadow.alpha ?? 0.35), 0, 1);
    ctx.filter = `blur(${shadow.blur ?? 18}px)`;
    ctx.drawImage(src, -w / 2, -(shadow.offsetY ?? 0) - (anchor === 'bottom' ? h : h / 2), w, h);
    ctx.restore();
    ctx.filter = 'none';
  }

  if (anchor === 'bottom') ctx.drawImage(src, -w / 2, -h, w, h);
  else ctx.drawImage(src, -w / 2, -h / 2, w, h);
  ctx.restore();
}

const tintCache = new Map();
/** Закрашивает спрайт одним цветом (для силуэтов). Результат кэшируется. */
function tinted(img, color, cache = tintCache) {
  const key = `${img.__name}|${color}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = createCanvas(img.width, img.height);
  const cx = c.getContext('2d');
  cx.drawImage(img, 0, 0);
  cx.globalCompositeOperation = 'source-in';
  cx.fillStyle = color;
  cx.fillRect(0, 0, img.width, img.height);
  cache.set(key, c);
  return c;
}

/** Индекс кадра анимации: Godot хранит скорость анимации в кадрах в секунду. */
export const animIndex = (frames, timeSeconds, fps = 5, offset = 0) =>
  Math.floor((timeSeconds * fps + offset) % frames.length);

export const animFrame = (frames, timeSeconds, fps = 5, offset = 0) =>
  frames[animIndex(frames, timeSeconds, fps, offset)];

/** Рисует фон картинкой «как object-fit: cover». */
export function cover(ctx, img, x, y, w, h, opts = {}) {
  if (!img) return;
  const { zoom = 1, offsetX = 0.5, offsetY = 0.5, alpha = 1, blur = 0 } = opts;
  const scale = Math.max(w / img.width, h / img.height) * zoom;
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = x + (w - dw) * offsetX;
  const dy = y + (h - dh) * offsetY;
  ctx.save();
  ctx.globalAlpha = alpha;
  if (blur) ctx.filter = `blur(${blur}px)`;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.filter = 'none';
  ctx.restore();
}

/* ------------------------------------------------------------------- текст */

function trackedWidth(ctx, str, spacing) {
  if (!spacing) return ctx.measureText(str).width;
  let w = 0;
  for (const ch of str) w += ctx.measureText(ch).width + spacing;
  return w - spacing;
}

function drawTracked(ctx, str, x, y, spacing) {
  if (!spacing) {
    ctx.fillText(str, x, y);
    return;
  }
  let cx = x;
  for (const ch of str) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  }
}

/**
 * Универсальный текст. Если строка не влезает в maxWidth — уменьшаем кегль
 * и сообщаем об этом в warnings (ролик рендерится без глаз, поэтому валидация важна).
 */
export function text(ctx, opts) {
  const {
    value,
    x,
    y,
    size = 48,
    family = 'Montserrat800',
    color = '#fff',
    align = 'center',
    baseline = 'middle',
    spacing = 0,
    alpha = 1,
    shadow = null,
    stroke = null,
    strokeWidth = 6,
    maxWidth = null,
    warn = null,
    label = '',
  } = opts;

  ctx.save();
  ctx.globalAlpha = clamp(alpha, 0, 1);
  ctx.font = `${size}px ${family}`;
  ctx.textBaseline = baseline;
  ctx.textAlign = 'left';

  let fontSize = size;
  let width = trackedWidth(ctx, value, spacing);
  if (maxWidth && width > maxWidth) {
    fontSize = Math.max(10, Math.floor(size * (maxWidth / width)));
    ctx.font = `${fontSize}px ${family}`;
    width = trackedWidth(ctx, value, spacing);
    if (warn && fontSize < size * 0.92) {
      warn(`текст «${value}» (${label}) сжат ${size}→${fontSize}px, чтобы влезть в ${maxWidth}px`);
    }
  }

  const startX = align === 'center' ? x - width / 2 : align === 'right' ? x - width : x;

  if (shadow) {
    ctx.save();
    ctx.shadowColor = shadow.color ?? 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = shadow.blur ?? 24;
    ctx.shadowOffsetY = shadow.offsetY ?? 6;
    ctx.fillStyle = shadow.color ?? 'rgba(0,0,0,0.55)';
    drawTracked(ctx, value, startX, y + (shadow.dy ?? 0), spacing);
    ctx.restore();
  }

  if (stroke) {
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = stroke;
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    if (strokeWidth > 0) drawTrackedStroked(ctx, value, startX, y, spacing);
  }

  ctx.fillStyle = color;
  drawTracked(ctx, value, startX, y, spacing);
  ctx.restore();
  return { width, size: fontSize };
}

function drawTrackedStroked(ctx, str, x, y, spacing) {
  if (!spacing) {
    ctx.strokeText(str, x, y);
    return;
  }
  let cx = x;
  for (const ch of str) {
    ctx.strokeText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  }
}

/** Меряет ширину строки без отрисовки (для подложек под текст). */
export function measure(ctx, value, size, family, spacing = 0) {
  ctx.save();
  ctx.font = `${size}px ${family}`;
  const w = trackedWidth(ctx, value, spacing);
  ctx.restore();
  return w;
}

/** Многострочный заголовок с построчным появлением. */
export function lines(ctx, values, opts) {
  const {
    x,
    y = 0,
    size = 64,
    lineHeight = size * 1.12,
    stagger = 6,
    frame = 0,
    startFrame = 0,
    family = 'Montserrat800',
    spacing = 0,
    rise = 26,
    ...rest
  } = opts;
  const top = y - ((values.length - 1) * lineHeight) / 2;
  values.forEach((line, i) => {
    const local = frame - startFrame - i * stagger;
    if (local < 0) return;
    const t = easeOutCubic(norm(0, 14, local));
    text(ctx, {
      value: line,
      x,
      y: top + i * lineHeight + (1 - t) * rise,
      size,
      family,
      spacing,
      alpha: t,
      ...rest,
    });
  });
}

/* ------------------------------------------------------------------- формы */

export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

export function fillRoundRect(ctx, x, y, w, h, r, fill) {
  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}

export function vGradient(ctx, x, y, w, h, stops) {
  const g = ctx.createLinearGradient(x, y, x, y + h);
  for (const [pos, color] of stops) g.addColorStop(pos, color);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

export function radial(ctx, x, y, r, stops, alpha = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  for (const [pos, color] of stops) g.addColorStop(pos, color);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}

/** Затемнение по краям кадра. */
export function vignette(ctx, w, h, strength = 0.55, inner = 0.35) {
  const g = ctx.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * inner, w / 2, h / 2, Math.max(w, h) * 0.78);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** Плёночное зерно: один тайл шума, который мотается по кадру. */
export function makeGrainTile(size = 160) {
  const c = createCanvas(size, size);
  const cx = c.getContext('2d');
  const data = cx.createImageData(size, size);
  const rnd = mulberry32(0xc0ffee);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = 110 + rnd() * 145;
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  cx.putImageData(data, 0, 0);
  return c;
}

export function grain(ctx, tile, frame, amount = 0.06) {
  if (amount <= 0) return;
  const rnd = mulberry32(frame * 2654435761);
  const ox = -Math.floor(rnd() * tile.width);
  const oy = -Math.floor(rnd() * tile.height);
  ctx.save();
  ctx.globalAlpha = amount;
  ctx.globalCompositeOperation = 'overlay';
  const pattern = ctx.createPattern(tile, 'repeat');
  ctx.translate(ox, oy);
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, ctx.canvas.width - ox, ctx.canvas.height - oy);
  ctx.restore();
}

export function flash(ctx, w, h, color = '#fff', alpha = 1) {
  if (alpha <= 0.001) return;
  ctx.save();
  ctx.globalAlpha = clamp(alpha, 0, 1);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Тёмная подложка под титры, чтобы текст читался на любой картинке. */
export function scrim(ctx, w, h, fromTop = 0, fromBottom = 0, strength = 0.8) {
  if (fromTop > 0) {
    const g = ctx.createLinearGradient(0, 0, 0, fromTop);
    g.addColorStop(0, `rgba(6,3,12,${strength})`);
    g.addColorStop(1, 'rgba(6,3,12,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, fromTop);
  }
  if (fromBottom > 0) {
    const g = ctx.createLinearGradient(0, h, 0, h - fromBottom);
    g.addColorStop(0, `rgba(6,3,12,${strength})`);
    g.addColorStop(1, 'rgba(6,3,12,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, h - fromBottom, w, fromBottom);
  }
}

/** Кольцевой «поп» — вспышка в точке события. */
export function ring(ctx, x, y, radius, color, alpha = 1, width = 8) {
  if (alpha <= 0.001) return;
  ctx.save();
  ctx.globalAlpha = clamp(alpha, 0, 1);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
