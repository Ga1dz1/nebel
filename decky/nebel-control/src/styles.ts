export const styles = `
      .nebel-control-tabs {
        height: 95%;
        width: 316px;
        position: fixed;
        margin-top: -12px;
        margin-left: -8px;
        overflow: hidden;
      }
      .nc-tab-title {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 3px;
        padding: 2px 0;
      }
      .nc-tab-title svg {
        width: 18px;
        height: 18px;
      }
      .nc-tab-title span {
        font-size: 8px;
        line-height: 1;
        letter-spacing: -0.1px;
        opacity: 0.75;
        max-width: 44px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .nebel-control-tabs > div > div:first-child::before {
        background: #0D141C;
        box-shadow: none;
        backdrop-filter: none;
      }
      .nebel-control-tabs [role="tabpanel"] {
        padding-left: 0 !important;
        padding-right: 0 !important;
      }
      .nebel-control-tabs .nebel-control-tab-content {
        padding-bottom: 24px;
      }
      .nebel-control-root .nebel-slider-field {
        width: 100%;
        max-width: none;
        overflow: hidden;
      }
      .nebel-control-root .nebel-slider-field * {
        min-width: 0 !important;
        max-width: 100% !important;
      }
      .nebel-control-root .nebel-reset-row {
        padding: 0 14px 8px;
      }
      .nebel-control-root .nebel-color-preview-row {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        padding: 4px 0;
      }
      .nebel-control-root .nebel-color-preview-label {
        flex: 1 1 auto;
        opacity: 0.87;
      }
      .nebel-control-root .nebel-color-swatch {
        flex: 0 0 auto;
        width: 32px;
        height: 32px;
        border-radius: 6px;
        border: 1px solid rgba(255, 255, 255, 0.25);
        box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.35);
      }
      .nebel-control-root .nebel-color-preview-hex {
        flex: 0 0 auto;
        font-variant-numeric: tabular-nums;
        opacity: 0.62;
        font-size: 12px;
      }
      .nebel-control-root .nebel-preset-swatch {
        width: 34px;
        height: 34px;
        border-radius: 6px;
        border: 1px solid rgba(255, 255, 255, 0.25);
        box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.35);
        cursor: pointer;
      }
      .nebel-control-root .nebel-color-picker {
        display: flex;
        flex-direction: column;
        gap: 8px;
        align-items: center;
        width: 100%;
      }
      .nebel-control-root .nebel-color-sv-wrap,
      .nebel-control-root .nebel-color-hue-wrap {
        position: relative;
      }
      .nebel-control-root .nebel-color-sv-canvas {
        display: block;
        border-radius: 6px;
        touch-action: none;
        cursor: crosshair;
      }
      .nebel-control-root .nebel-color-hue-canvas {
        display: block;
        border-radius: 4px;
        touch-action: none;
        cursor: ew-resize;
      }
      .nebel-control-root .nebel-color-cursor {
        position: absolute;
        width: 12px;
        height: 12px;
        margin-left: -6px;
        margin-top: -6px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.6), 0 1px 3px rgba(0, 0, 0, 0.5);
        pointer-events: none;
      }
      .nebel-control-root .nebel-color-hue-cursor {
        position: absolute;
        top: -2px;
        width: 4px;
        height: calc(100% + 4px);
        margin-left: -2px;
        border-radius: 2px;
        background: white;
        box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.6);
        pointer-events: none;
      }
      .nebel-control-root .nebel-compat-note,
      .nebel-native .nebel-compat-note {
        box-sizing: border-box;
        width: 100%;
        padding: 8px 16px 8px;
        font-size: 12px;
        line-height: 16px;
        opacity: 0.62;
        text-align: left;
        justify-content: flex-start;
        align-self: stretch;
      }
      .nebel-control-page {
        display: flex;
        width: 100%;
        height: 100%;
        background: #0D141C;
        color: #dbe2e6;
        overflow: hidden;
        /* Custom routes render under Steam's status/title bar; Decky exposes
           no header-height constant, so pad by a safe fixed ~64px (Steam's
           gamepad-UI header is 56-64px depending on DPI). QAM is unaffected. */
        padding-top: 64px;
        box-sizing: border-box;
      }
      .nc-page-sidebar {
        flex: 0 0 216px;
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 32px 12px;
        overflow-y: auto;
        border-right: 1px solid rgba(255, 255, 255, 0.08);
      }
      .nc-page-tab {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 14px;
        border-radius: 6px;
        font-size: 14px;
        opacity: 0.7;
        cursor: pointer;
      }
      .nc-page-tab svg {
        flex: 0 0 auto;
        width: 20px;
        height: 20px;
      }
      .nc-page-tab.nc-active {
        background: rgba(255, 255, 255, 0.12);
        opacity: 1;
      }
      .nc-page-content {
        flex: 1 1 auto;
        overflow-y: auto;
        padding: 24px 32px 48px;
      }
      .nc-page-content-inner {
        width: 100%;
        max-width: 680px;
        margin: 0 auto;
      }
    `;
