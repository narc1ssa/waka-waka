import { readFileSync } from 'node:fs';

const readJson = (rel) =>
  JSON.parse(readFileSync(new URL(`./generated/${rel}`, import.meta.url), 'utf8'));

// Факты о игре берутся напрямую из её исходников (data/stages + scripts/age_manager.gd),
// чтобы ролик не врал: меняется баланс в игре — меняются цифры в промо.
export const GAME = readJson('game.json');
export const ANIM = readJson('animations.json').animations;

export const VIDEO = {
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: 900, // 30 секунд
};

export const SCENES = {
  intro:   { from: 0,   to: 90  },
  play:    { from: 90,  to: 300 },
  ageing:  { from: 300, to: 465 },
  rare:    { from: 465, to: 615 },
  oldage:  { from: 615, to: 765 },
  victory: { from: 765, to: 840 },
  outro:   { from: 840, to: 900 },
};

export const PALETTE = {
  ink: '#120A1E',
  inkSoft: '#1E1030',
  purple: '#2A1140',
  purpleLight: '#4B2372',
  warm: '#8A4D1A',      // дефолтный цвет фона сцены в Godot
  gold: '#FFD166',
  amber: '#F2A65A',
  cream: '#FFF3E0',
  pink: '#FF5D8F',
  mint: '#4ECDC4',
  danger: '#FF3B30',
  white: '#FFFFFF',
};

export const FONT = {
  regular: 'Montserrat500',
  medium: 'Montserrat600',
  bold: 'Montserrat800',
  black: 'Montserrat900',
};

export const COPY = {
  logo: GAME.title.toUpperCase(),
  kicker: 'АРКАДА ПРО ЖИЗНЬ ОДНОГО КОТА',
  tagline: 'ЕШЬ · ВЗРОСЛЕЙ · ВЫЖИВАЙ',
  play1: ['ТЫ — КОТ.', 'И ТЫ ЕШЬ КОТОВ.'],
  play2: ['ЧЕМ БОЛЬШЕ СЪЕЛ —', 'ТЕМ БЫСТРЕЕ СТАРЕЕШЬ'],
  ageingTitle: `${GAME.maxStage} СТАДИЙ ЖИЗНИ`,
  ageingKicker: `КАЖДЫЕ ${GAME.killsPerStage} КОТОВ — НОВЫЙ ВОЗРАСТ`,
  rareTitle: `${GAME.rareCats} РЕДКИХ КОТОВ`,
  rareKicker: 'СОБЕРИ ВСЕХ · КАЖДЫЙ +5 К СЧЁТУ',
  rareDone: 'ВСЕ КОТЫ СОБРАНЫ',
  oldAgeLine: `У ТЕБЯ ${GAME.oldAgeSeconds} СЕКУНД`,
  oldAgeLine2: 'ДО СМЕРТИ ОТ СТАРОСТИ',
  death: 'ИЛИ УМРИ ОТ СТАРОСТИ',
  pill: 'ТАБЛЕТКА МОЛОДОСТИ',
  pillSub: 'И СНОВА МЛАДЕНЕЦ',
  victory: 'ПОБЕДА',
  victorySub: `${GAME.winTotal} КОТОВ СЪЕДЕНО`,
  footer: 'GODOT 4 · КОТО-АРКАДА',
  controls: 'СТРЕЛКИ / WASD — УПРАВЛЕНИЕ',
};

// Музыкальная раскадровка (секунды) — реальный OST игры из music/
export const AUDIO = {
  music: [
    { file: 'music_menu.mp3',  from: 0.0,  to: 3.2,  offset: 8,  volume: 0.85, fadeIn: 0.3, fadeOut: 0.6 },
    { file: 'music_level.mp3', from: 3.0,  to: 20.6, offset: 6,  volume: 0.65, fadeIn: 0.35, fadeOut: 0.5 },
    { file: 'horror.mp3',      from: 20.4, to: 25.6, offset: 1,  volume: 0.8,  fadeIn: 0.2,  fadeOut: 0.5 },
    { file: 'win.mp3',         from: 25.4, to: 28.2, offset: 0,  volume: 0.9,  fadeIn: 0.1,  fadeOut: 0.4 },
    { file: 'music_level.mp3', from: 28.0, to: 30.2, offset: 26, volume: 0.6,  fadeIn: 0.4,  fadeOut: 0.9 },
  ],
  // Глубокие «вуши» на склейках сделаны из того же колокольчика, но с пониженным тоном.
  whoosh: [3.0, 10.0, 15.5, 20.5, 25.5, 28.0],
  masterFadeOut: { start: 29.0, duration: 0.9 },
};
