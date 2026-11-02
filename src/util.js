export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, w | 0);
  c.height = Math.max(1, h | 0);
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  return [c, x];
}

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;

export function fmtMoney(n) {
  return '$' + Math.floor(n).toLocaleString('es-AR');
}

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgb(r, g, b) {
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

/** f < 1 oscurece, f > 1 aclara */
export function shade(hex, f) {
  let [r, g, b] = hexToRgb(hex);
  if (f < 1) {
    r *= f; g *= f; b *= f;
  } else {
    const k = f - 1;
    r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k;
  }
  return rgb(r, g, b);
}

/** Crea un sprite a partir de filas de texto y una paleta {char: color} */
export function mapSprite(rows, pal) {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const [c, x] = makeCanvas(w, h);
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let i = 0; i < row.length; i++) {
      const col = pal[row[i]];
      if (!col) continue;
      x.fillStyle = col;
      x.fillRect(i, y, 1, 1);
    }
  }
  return c;
}

export function flipH(src) {
  const [c, x] = makeCanvas(src.width, src.height);
  x.translate(src.width, 0);
  x.scale(-1, 1);
  x.drawImage(src, 0, 0);
  return c;
}

/** Devuelve una copia con contorno de 1px alrededor de los píxeles opacos */
export function outlined(src, color) {
  const w = src.width + 2, h = src.height + 2;
  const [c, x] = makeCanvas(w, h);
  const sx = src.getContext('2d');
  const data = sx.getImageData(0, 0, src.width, src.height).data;
  const op = (i, j) => i >= 0 && j >= 0 && i < src.width && j < src.height && data[(j * src.width + i) * 4 + 3] > 0;
  x.fillStyle = color;
  for (let j = -1; j <= src.height; j++) {
    for (let i = -1; i <= src.width; i++) {
      if (op(i, j)) continue;
      if (op(i - 1, j) || op(i + 1, j) || op(i, j - 1) || op(i, j + 1)) x.fillRect(i + 1, j + 1, 1, 1);
    }
  }
  x.drawImage(src, 1, 1);
  return c;
}

/** Línea de píxeles (Bresenham) */
export function pixelLine(ctx, x0, y0, x1, y1, color) {
  x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
  ctx.fillStyle = color;
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (let n = 0; n < 200; n++) {
    ctx.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}
