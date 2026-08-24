import { classMap } from "@decky/ui";

// Steam ships several copies of the QAM CSS module and the hashes shift
// between client builds, so collect every module exposing the semantic keys
// and target all of them, plus the tested client's hashes as a fallback.
const QAM_CLASS_FALLBACK: Record<string, string> = {
  PanelSection: "_3gY0aBuNR8_NPTpXIYfkby",
  PanelSectionTitle: "_1IigUZ3GHaZS2Y-3V3T2rT",
};

export function qamClasses(key: string): string[] {
  const found = new Set<string>([QAM_CLASS_FALLBACK[key]]);
  try {
    for (const mod of classMap as any[]) {
      const value = mod?.[key];
      if (typeof value === "string" && value) found.add(value);
    }
  } catch (error) {
  }
  return Array.from(found);
}

const selectorList = (scope: string, key: string) => qamClasses(key).map((cls) => `${scope} .${cls}`).join(", ");

// The QuickAccessMenu PanelSection title is small grey uppercase; Steam's
// full-page settings groups use a plain white 16px/500 header with 36px of
// height. This CSS restyles PanelSection titles under `scope` to the
// full-page look. Used both for the sections injected into Steam's settings
// pages and for the fullscreen /nebel-control page (but NOT for QAM
// surfaces - there uppercase is Steam's native style).
export function nativeSectionTitleCss(scope: string): string {
  return `
      ${selectorList(scope, "PanelSectionTitle")} {
        padding-bottom: 0;
        line-height: 36px;
        color: rgb(220, 222, 223);
        font-weight: 500;
        letter-spacing: normal;
        text-transform: none;
      }
    `;
}

// Full native-group alignment for blocks injected into Steam's own settings
// pages: full-width rows (no QAM side inset - native rows pad themselves),
// 24px margin-top between groups (the native DialogSettingsSection
// convention), plus the title normalization above.
export function nativeSectionSpacingCss(scope: string): string {
  return `
      ${selectorList(scope, "PanelSection")} {
        padding-left: 0;
        padding-right: 0;
        margin: 24px 0 0;
      }
      ${qamClasses("PanelSection").map((cls) => `${scope} .${cls}:first-of-type`).join(", ")} {
        margin: 24px 0 0;
      }
    ` + nativeSectionTitleCss(scope);
}
