import { PanelSectionRow } from "@decky/ui";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { useCallback, useEffect, useRef } from "react";
import { hexToHsb, hsbToHex, hsbToRgb } from "../lib/color";

// Photoshop-style graphical color picker: a saturation/brightness square
// (drag anywhere to pick both at once) plus a separate hue strip below it,
// replacing the old plain R/G/B sliders. Used for every color picker in the
// Lighting tab (base color, flash colors, duotone A/B) - the swatch+hex
// preview up top gives an at-a-glance readout to go with it.
const SV_WIDTH = 252;
const SV_HEIGHT = 140;
const HUE_HEIGHT = 18;
const CURSOR_RADIUS = 6;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Position within an element's own box, clamped to [0, size] on each axis -
// shared by both the SV square and the hue strip's pointer handlers.
function pointerOffset(event: ReactPointerEvent<HTMLCanvasElement>): { x: number; y: number } {
  const rect = event.currentTarget.getBoundingClientRect();
  return {
    x: clamp(event.clientX - rect.left, 0, rect.width),
    y: clamp(event.clientY - rect.top, 0, rect.height),
  };
}

export function ColorPicker({ label, hex, onChange }: {
  label?: ReactNode;
  hex: string;
  onChange: (hex: string) => void;
}) {
  const [h, s, v] = hexToHsb(hex);
  const svCanvasRef = useRef<HTMLCanvasElement>(null);
  const hueCanvasRef = useRef<HTMLCanvasElement>(null);

  // The SV square's own gradient depends on the current hue (it's a
  // gradient of "this hue" from white/black to fully saturated/bright), so
  // it has to redraw whenever h changes - the hue strip itself is the same
  // full rainbow regardless of the current color, so it only draws once.
  useEffect(() => {
    const canvas = svCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const [r, g, b] = hsbToRgb(h, 100, 100);
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(0, 0, SV_WIDTH, SV_HEIGHT);

    // Left (white, s=0) -> right (pure hue, s=100).
    const satGradient = ctx.createLinearGradient(0, 0, SV_WIDTH, 0);
    satGradient.addColorStop(0, "rgba(255,255,255,1)");
    satGradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = satGradient;
    ctx.fillRect(0, 0, SV_WIDTH, SV_HEIGHT);

    // Top (v=100) -> bottom (black, v=0).
    const valGradient = ctx.createLinearGradient(0, 0, 0, SV_HEIGHT);
    valGradient.addColorStop(0, "rgba(0,0,0,0)");
    valGradient.addColorStop(1, "rgba(0,0,0,1)");
    ctx.fillStyle = valGradient;
    ctx.fillRect(0, 0, SV_WIDTH, SV_HEIGHT);
  }, [h]);

  useEffect(() => {
    const canvas = hueCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, SV_WIDTH, 0);
    for (const stop of [0, 60, 120, 180, 240, 300, 360]) {
      const [r, g, b] = hsbToRgb(stop, 100, 100);
      gradient.addColorStop(stop / 360, `rgb(${r}, ${g}, ${b})`);
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, SV_WIDTH, HUE_HEIGHT);
  }, []);

  const handleSvPointer = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      const { x, y } = pointerOffset(event);
      const nextS = (x / SV_WIDTH) * 100;
      const nextV = 100 - (y / SV_HEIGHT) * 100;
      onChange(hsbToHex(h, nextS, nextV));
    },
    [h, onChange],
  );

  const handleHuePointer = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      const { x } = pointerOffset(event);
      // 359.999 rather than 360 - hue wraps, and 360 would round-trip to the
      // same red as 0 anyway, so clamping there just avoids an off-by-one at
      // the strip's rightmost pixel.
      const nextH = clamp((x / SV_WIDTH) * 360, 0, 359.999);
      onChange(hsbToHex(nextH, s, v));
    },
    [s, v, onChange],
  );

  const svCursorX = clamp((s / 100) * SV_WIDTH, CURSOR_RADIUS, SV_WIDTH - CURSOR_RADIUS);
  const svCursorY = clamp((1 - v / 100) * SV_HEIGHT, CURSOR_RADIUS, SV_HEIGHT - CURSOR_RADIUS);
  const hueCursorX = clamp((h / 360) * SV_WIDTH, 0, SV_WIDTH);

  return (
    <>
      <PanelSectionRow>
        <div className="nebel-color-preview-row">
          {label !== undefined && <span className="nebel-color-preview-label">{label}</span>}
          <div className="nebel-color-swatch" style={{ backgroundColor: `#${hex}` }} />
          <span className="nebel-color-preview-hex">#{hex}</span>
        </div>
      </PanelSectionRow>
      <PanelSectionRow>
        <div className="nebel-color-picker">
          <div className="nebel-color-sv-wrap" style={{ width: SV_WIDTH, height: SV_HEIGHT }}>
            <canvas
              ref={svCanvasRef}
              width={SV_WIDTH}
              height={SV_HEIGHT}
              className="nebel-color-sv-canvas"
              onPointerDown={handleSvPointer}
              onPointerMove={(event) => event.buttons === 1 && handleSvPointer(event)}
            />
            <div
              className="nebel-color-cursor"
              style={{ left: svCursorX, top: svCursorY, backgroundColor: `#${hex}` }}
            />
          </div>
          <div className="nebel-color-hue-wrap" style={{ width: SV_WIDTH, height: HUE_HEIGHT }}>
            <canvas
              ref={hueCanvasRef}
              width={SV_WIDTH}
              height={HUE_HEIGHT}
              className="nebel-color-hue-canvas"
              onPointerDown={handleHuePointer}
              onPointerMove={(event) => event.buttons === 1 && handleHuePointer(event)}
            />
            <div className="nebel-color-hue-cursor" style={{ left: hueCursorX }} />
          </div>
        </div>
      </PanelSectionRow>
    </>
  );
}
