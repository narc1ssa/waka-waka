import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

/**
 * Ищем ffmpeg: сначала переменная окружения FFMPEG, затем системный ffmpeg,
 * затем статический бинарь из пакета imageio-ffmpeg (ставится одной командой pip).
 */
export function ffmpegBin() {
  if (process.env.FFMPEG) return process.env.FFMPEG;

  const inPath = spawnSync('sh', ['-c', 'command -v ffmpeg'], { encoding: 'utf8' }).stdout.trim();
  if (inPath) return inPath;

  const home = process.env.HOME || '';
  const pythons = ['python3', 'python', join(home, '.cache/venv/bin/python'), join(home, '.venv/bin/python')];
  for (const py of pythons) {
    if (!py) continue;
    const res = spawnSync(
      py,
      ['-c', 'import imageio_ffmpeg, sys; sys.stdout.write(imageio_ffmpeg.get_ffmpeg_exe())'],
      { encoding: 'utf8' },
    );
    const out = (res.stdout || '').trim();
    if (out && !out.includes('Traceback')) return out;
  }

  throw new Error(
    'FFmpeg не найден. Укажите путь через FFMPEG=/путь/к/ffmpeg ' +
    'или поставьте статический бинарь: pip install imageio-ffmpeg',
  );
}
