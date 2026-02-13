"use client";

import * as React from "react";

type MonacoApi = typeof import("monaco-editor");

type MonacoThemeHook = {
  isDark: boolean;
  applyEditorTheme: (monaco: MonacoApi, darkMode: boolean) => void;
  resolveFontFamily: () => string;
};

export function useMonacoTheme(): MonacoThemeHook {
  const [isDark, setIsDark] = React.useState(false);

  const applyEditorTheme = React.useCallback(
    (monaco: MonacoApi, darkMode: boolean) => {
      const resolver = document.createElement("span");
      resolver.style.position = "absolute";
      resolver.style.opacity = "0";
      resolver.style.pointerEvents = "none";
      document.body.appendChild(resolver);

      const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
      const toHex = (value: number) =>
        Math.round(clamp01(value) * 255)
          .toString(16)
          .padStart(2, "0");

      const oklchToHex = (input: string) => {
        const match = input.match(/^oklch\((.*)\)$/i);
        if (!match) {
          return "";
        }
        const [values, alphaPart] = match[1].split("/");
        const parts = values
          .trim()
          .split(/\s+/)
          .map((part) => part.trim());
        if (parts.length < 3) {
          return "";
        }

        let l = parseFloat(parts[0]);
        if (parts[0].includes("%") || l > 1) {
          l /= 100;
        }
        const c = parseFloat(parts[1]);
        const hRaw = parts[2];
        let h = parseFloat(hRaw);
        if (hRaw.includes("turn")) {
          h *= 360;
        } else if (hRaw.includes("rad")) {
          h = (h * 180) / Math.PI;
        } else if (hRaw.includes("grad")) {
          h *= 0.9;
        }

        const hr = (h * Math.PI) / 180;
        const a = c * Math.cos(hr);
        const b = c * Math.sin(hr);

        const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
        const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
        const s_ = l - 0.0894841775 * a - 1.291485548 * b;

        const l3 = l_ * l_ * l_;
        const m3 = m_ * m_ * m_;
        const s3 = s_ * s_ * s_;

        let r = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
        let g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
        let bOut = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;

        const encode = (channel: number) => {
          const clamped = clamp01(channel);
          return clamped <= 0.0031308
            ? 12.92 * clamped
            : 1.055 * clamped ** (1 / 2.4) - 0.055;
        };

        r = encode(r);
        g = encode(g);
        bOut = encode(bOut);

        const alpha = alphaPart
          ? parseFloat(alphaPart.trim()) / (alphaPart.includes("%") ? 100 : 1)
          : 1;

        if (Number.isNaN(alpha)) {
          return "";
        }

        return `#${toHex(r)}${toHex(g)}${toHex(bOut)}`;
      };

      const labToHex = (input: string) => {
        const match = input.match(/^lab\((.*)\)$/i);
        if (!match) {
          return "";
        }
        const [values, alphaPart] = match[1].split("/");
        const parts = values
          .trim()
          .split(/\s+/)
          .map((part) => part.trim());
        if (parts.length < 3) {
          return "";
        }

        let l = parseFloat(parts[0]);
        if (parts[0].includes("%")) {
          l = (l / 100) * 100;
        }
        const a = parseFloat(parts[1]);
        const b = parseFloat(parts[2]);

        const fy = (l + 16) / 116;
        const fx = fy + a / 500;
        const fz = fy - b / 200;

        const delta = 6 / 29;
        const finv = (t: number) =>
          t > delta ? t * t * t : (t - 16 / 116) / 7.787;

        const x50 = 0.96422 * finv(fx);
        const y50 = 1.0 * finv(fy);
        const z50 = 0.82521 * finv(fz);

        const x = 0.9555766 * x50 - 0.0230393 * y50 + 0.0631636 * z50;
        const y = -0.0282895 * x50 + 1.0099416 * y50 + 0.0210077 * z50;
        const z = 0.0122982 * x50 - 0.020483 * y50 + 1.3299098 * z50;

        let r = 3.2406 * x - 1.5372 * y - 0.4986 * z;
        let g = -0.9689 * x + 1.8758 * y + 0.0415 * z;
        let bOut = 0.0557 * x - 0.204 * y + 1.057 * z;

        const encode = (channel: number) => {
          const clamped = clamp01(channel);
          return clamped <= 0.0031308
            ? 12.92 * clamped
            : 1.055 * clamped ** (1 / 2.4) - 0.055;
        };

        r = encode(r);
        g = encode(g);
        bOut = encode(bOut);

        const alpha = alphaPart
          ? parseFloat(alphaPart.trim()) / (alphaPart.includes("%") ? 100 : 1)
          : 1;

        if (Number.isNaN(alpha)) {
          return "";
        }

        return `#${toHex(r)}${toHex(g)}${toHex(bOut)}`;
      };

      const normalizeColor = (input: string, fallback: string) => {
        const raw = input.trim();
        if (!raw) {
          return fallback;
        }

        if (raw.startsWith("#")) {
          return raw;
        }

        if (raw.startsWith("rgb")) {
          const numbers = raw
            .replace(/rgba?\(|\)/g, "")
            .split(/\s*,\s*/)
            .map((value) => parseFloat(value));
          if (numbers.length >= 3) {
            return `#${toHex(numbers[0] / 255)}${toHex(
              numbers[1] / 255,
            )}${toHex(numbers[2] / 255)}`;
          }
        }

        if (raw.startsWith("oklch")) {
          const converted = oklchToHex(raw);
          return converted || fallback;
        }

        if (raw.startsWith("lab")) {
          const converted = labToHex(raw);
          return converted || fallback;
        }

        return fallback;
      };

      const resolveColor = (cssValue: string, fallback: string) => {
        resolver.style.color = cssValue;
        const color = getComputedStyle(resolver).color;
        if (!color || color === "rgba(0, 0, 0, 0)") {
          return fallback;
        }
        return normalizeColor(color, fallback);
      };

      const background = resolveColor("var(--card)", "#ffffff");
      const foreground = resolveColor("var(--foreground)", "#111111");
      const muted = resolveColor("var(--muted)", "#f5f5f5");
      const mutedForeground = resolveColor(
        "var(--muted-foreground)",
        "#6b6b6b",
      );
      const border = resolveColor("var(--border)", "#e5e5e5");
      const accent = resolveColor("var(--accent)", "#f0f0f0");
      const primary = resolveColor("var(--primary)", "#111111");

      const latte = {
        rosewater: "#dc8a78",
        flamingo: "#dd7878",
        pink: "#ea76cb",
        mauve: "#8839ef",
        red: "#d20f39",
        maroon: "#e64553",
        peach: "#fe640b",
        yellow: "#df8e1d",
        green: "#40a02b",
        teal: "#179299",
        sky: "#04a5e5",
        sapphire: "#209fb5",
        blue: "#1e66f5",
        lavender: "#7287fd",
        text: "#4c4f69",
        subtext1: "#5c5f77",
        subtext0: "#6c6f85",
        overlay2: "#7c7f93",
        overlay1: "#8c8fa1",
        overlay0: "#9ca0b0",
      };

      const mocha = {
        rosewater: "#f5e0dc",
        flamingo: "#f2cdcd",
        pink: "#f5c2e7",
        mauve: "#cba6f7",
        red: "#f38ba8",
        maroon: "#eba0ac",
        peach: "#fab387",
        yellow: "#f9e2af",
        green: "#a6e3a1",
        teal: "#94e2d5",
        sky: "#89dceb",
        sapphire: "#74c7ec",
        blue: "#89b4fa",
        lavender: "#b4befe",
        text: "#cdd6f4",
        subtext1: "#bac2de",
        subtext0: "#a6adc8",
        overlay2: "#9399b2",
        overlay1: "#7f849c",
        overlay0: "#6c7086",
      };

      const cat = darkMode ? mocha : latte;

      monaco.editor.defineTheme(darkMode ? "usql-dark" : "usql-light", {
        base: darkMode ? "vs-dark" : "vs",
        inherit: true,
        rules: [
          { token: "comment", foreground: cat.overlay1 },
          { token: "keyword", foreground: cat.mauve },
          { token: "number", foreground: cat.peach },
          { token: "string", foreground: cat.green },
          { token: "delimiter", foreground: cat.overlay2 },
          { token: "type", foreground: cat.yellow },
          { token: "identifier", foreground: cat.text },
          { token: "predefined.sql", foreground: cat.sapphire },
          { token: "table.identifier", foreground: cat.blue },
          { token: "column.identifier", foreground: cat.teal },
        ],
        colors: {
          "editor.background": background,
          "editor.foreground": foreground,
          "editorLineNumber.foreground": mutedForeground,
          "editorLineNumber.activeForeground": foreground,
          "editorLineNumber.dimmedForeground": mutedForeground,
          "editorCursor.foreground": primary,
          "editor.selectionBackground": accent,
          "editor.inactiveSelectionBackground": muted,
          "editor.lineHighlightBackground": muted,
          "editor.lineHighlightBorder": border,
          "editorIndentGuide.background": border,
          "editorIndentGuide.activeBackground": mutedForeground,
          "editorWidget.background": background,
          "editorWidget.border": border,
          "editorSuggestWidget.background": background,
          "editorSuggestWidget.border": border,
          "editorSuggestWidget.selectedBackground": accent,
          "editorHoverWidget.background": background,
          "editorHoverWidget.border": border,
          "editorGutter.background": background,
          "editorBracketMatch.background": muted,
          "editorBracketMatch.border": border,
        },
      });

      monaco.editor.setTheme(darkMode ? "usql-dark" : "usql-light");

      document.body.removeChild(resolver);
    },
    [],
  );

  React.useEffect(() => {
    const readTheme = () => document.documentElement.classList.contains("dark");
    setIsDark(readTheme());

    const observer = new MutationObserver(() => {
      setIsDark(readTheme());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  const resolveFontFamily = React.useCallback(() => {
    return [
      "CascadiaCode Nerd Font",
      "Cascadia Mono",
      "ui-monospace",
      "SFMono-Regular",
      "Menlo",
      "Monaco",
      "Consolas",
      "Liberation Mono",
      "Courier New",
      "monospace",
    ].join(", ");
  }, []);

  return { isDark, applyEditorTheme, resolveFontFamily };
}
