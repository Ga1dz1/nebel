import { PanelSectionRow } from "@decky/ui";
import { useEffect, useRef } from "react";
import { hexToRgb, hsbToRgb } from "../lib/color";

// Small animated preview of the selected stick-lighting mode: four dots
// arranged like the real HTR3212 LED ring (N/E/S/W, matching the actual
// 4-zone-per-stick hardware layout), animated with a simplified version of
// each mode's real algorithm. Not a pixel-exact simulation of the backend
// (ambilight in particular can't be, since it mirrors the screen) - just
// enough motion to tell the modes apart at a glance before committing to one,
// same job Steam's own settings previews do.
const SIZE = 96;
const CENTER = SIZE / 2;
const DOT_RADIUS = 10;
const RING_RADIUS = SIZE / 2 - DOT_RADIUS - 4;
// Two dots on top, two on the bottom - matches the physical HTR3212 ring
// layout (zones 1=SW, 2=NW, 3=NE, 4=SE) when the stick is viewed from above.
// Ordered clockwise: NE (top-right), SE (bottom-right), SW (bottom-left), NW (top-left).
const ZONE_ANGLES = [-45, 45, 135, 225];
// Canvas index -> hardware zone, per the confirmed live mapping above.
const INDEX_TO_ZONE = [3, 4, 1, 2];
// Same split as the backend's DUOTONE_ZONE_GROUPS: which zones take color A.
const DUOTONE_GROUP_A: Record<string, number[]> = {
  horizontal: [2, 3], // top (NW+NE)
  vertical: [4, 3], //   right (SE+NE)
  diagonal: [4, 2], //   SE+NW
};

function rgbCss([r, g, b]: [number, number, number], alpha = 1): string {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`;
}

function zonePosition(angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CENTER + RING_RADIUS * Math.cos(rad), y: CENTER + RING_RADIUS * Math.sin(rad) };
}

export function ModePreview({ mode, color, duotoneColorA, duotoneColorB, duotoneOrientation }: {
  mode: string;
  color: string;
  duotoneColorA: string;
  duotoneColorB: string;
  duotoneOrientation?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const base = hexToRgb(color);
    const colorA = hexToRgb(duotoneColorA);
    const colorB = hexToRgb(duotoneColorB);
    let raf = 0;
    const start = performance.now();
    // A handful of fixed pseudo-random phases so "starlight" twinkles look
    // scattered instead of perfectly synchronized - not meant to match the
    // backend's actual RNG, just to avoid an obviously-fake unison blink.
    const twinklePhases = [0.15, 0.6, 0.35, 0.85];

    function zoneColor(i: number, t: number): [number, number, number] {
      switch (mode) {
        case "static":
          return base;
        case "breathing": {
          const level = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 2.2));
          return [base[0] * level, base[1] * level, base[2] * level];
        }
        case "rainbow": {
          const [r, g, b] = hsbToRgb((t * 70) % 360, 100, 100);
          return [r, g, b];
        }
        case "wave": {
          const [r, g, b] = hsbToRgb((t * 70 + i * 90) % 360, 100, 100);
          return [r, g, b];
        }
        case "starlight": {
          const phase = twinklePhases[i];
          const level = 0.15 + 0.85 * Math.max(0, Math.sin((t * 1.4 + phase * 8) % (Math.PI * 2)));
          return [base[0] * level, base[1] * level, base[2] * level];
        }
        case "spin": {
          const litIndex = Math.floor((t * 1.6) % 4);
          const dist = Math.min((i - litIndex + 4) % 4, (litIndex - i + 4) % 4);
          const level = dist === 0 ? 1 : dist === 1 ? 0.25 : 0.05;
          return [base[0] * level, base[1] * level, base[2] * level];
        }
        case "reactive": {
          // Simplified stand-in for a button flash: a soft pulse every ~1.6s
          // rather than a real input event, since there's nothing to react to here.
          const pulse = Math.max(0, Math.sin(t * 1.2 - Math.PI / 2));
          const level = 0.2 + 0.8 * Math.pow(pulse, 3);
          return [base[0] * level, base[1] * level, base[2] * level];
        }
        case "multidot": {
          const litIndex = Math.floor((t * 2.4) % 4);
          const trailIndex = (litIndex + 3) % 4;
          if (i === litIndex) return base;
          if (i === trailIndex) return [base[0] * 0.35, base[1] * 0.35, base[2] * 0.35];
          return [0, 0, 0];
        }
        case "ambilight": {
          // Real mode mirrors the screen - approximated here with a slow,
          // generic hue drift so it still reads as "alive" rather than static.
          const [r, g, b] = hsbToRgb((t * 25 + i * 30) % 360, 70, 90);
          return [r, g, b];
        }
        case "duotone": {
          const level = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 1.8));
          const groupA = DUOTONE_GROUP_A[duotoneOrientation || "horizontal"] || DUOTONE_GROUP_A.horizontal;
          const isA = groupA.includes(INDEX_TO_ZONE[i]);
          const [pr, pg, pb] = isA ? colorA : colorB;
          return isA
            ? [pr, pg, pb]
            : [pr * level, pg * level, pb * level];
        }
        default:
          return base;
      }
    }

    function draw(now: number) {
      const t = (now - start) / 1000;
      ctx!.clearRect(0, 0, SIZE, SIZE);

      // Faint ring guide so empty/dim zones still read as "part of the stick".
      ctx!.strokeStyle = "rgba(255,255,255,0.08)";
      ctx!.lineWidth = 1;
      ctx!.beginPath();
      ctx!.arc(CENTER, CENTER, RING_RADIUS, 0, Math.PI * 2);
      ctx!.stroke();

      ZONE_ANGLES.forEach((angle, i) => {
        const { x, y } = zonePosition(angle);
        const rgb = zoneColor(i, t);
        ctx!.beginPath();
        ctx!.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
        ctx!.fillStyle = rgbCss(rgb);
        ctx!.shadowColor = rgbCss(rgb, 0.9);
        ctx!.shadowBlur = 8;
        ctx!.fill();
        ctx!.shadowBlur = 0;
      });

      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [mode, color, duotoneColorA, duotoneColorB, duotoneOrientation]);

  return (
    <PanelSectionRow>
      <div className="nebel-mode-preview-wrap">
        <canvas ref={canvasRef} width={SIZE} height={SIZE} className="nebel-mode-preview-canvas" />
      </div>
    </PanelSectionRow>
  );
}
