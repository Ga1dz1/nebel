// RRGGBB hex <-> RGB <-> HSB conversions shared by every color picker in
// the Lighting tab (base color, flash colors, duotone A/B).

export function hexToRgb(hex: string): [number, number, number] {
  const clean = /^[0-9A-Fa-f]{6}$/.test(hex) ? hex : "0050FF";
  return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16)];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return [clamp(r), clamp(g), clamp(b)].map((n) => n.toString(16).padStart(2, "0")).join("").toUpperCase();
}

// h: 0-360, s/v: 0-100 (percent) - the ranges people actually think in when
// picking a color, unlike 0-255 RGB channels that don't map to anything
// intuitive (hue, how saturated, how bright).
export function rgbToHsb(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = 60 * (((gn - bn) / delta) % 6);
    else if (max === gn) h = 60 * ((bn - rn) / delta + 2);
    else h = 60 * ((rn - gn) / delta + 4);
  }
  if (h < 0) h += 360;

  const s = max === 0 ? 0 : delta / max;
  const v = max;
  return [h, s * 100, v * 100];
}

export function hsbToRgb(h: number, s: number, v: number): [number, number, number] {
  const hn = ((h % 360) + 360) % 360;
  const sn = Math.max(0, Math.min(100, s)) / 100;
  const vn = Math.max(0, Math.min(100, v)) / 100;

  const c = vn * sn;
  const x = c * (1 - Math.abs(((hn / 60) % 2) - 1));
  const m = vn - c;

  let [r1, g1, b1] = [0, 0, 0];
  if (hn < 60) [r1, g1, b1] = [c, x, 0];
  else if (hn < 120) [r1, g1, b1] = [x, c, 0];
  else if (hn < 180) [r1, g1, b1] = [0, c, x];
  else if (hn < 240) [r1, g1, b1] = [0, x, c];
  else if (hn < 300) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];

  return [(r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255];
}

export function hexToHsb(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHsb(r, g, b);
}

export function hsbToHex(h: number, s: number, v: number): string {
  const [r, g, b] = hsbToRgb(h, s, v);
  return rgbToHex(r, g, b);
}
