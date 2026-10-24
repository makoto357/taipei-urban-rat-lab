/**
 * Design tokens synced from docs/design/design-system.md (Taipei Urban Rat Lab Design System v01).
 * Source of truth is the Claude Artifact "TAIPEI RAT LAB" Design canvas; re-sync this file
 * whenever that artifact changes (see docs/design/design-system.md §1 同步規則).
 */

export const colors = {
  paper: "#F4EEDD",
  card: "#FDF9ED",
  ink: "#000000",
  accent: "#D65B37",
  accentText: "#B4472A",
  unknown: "#D7D4CC",
  muted: "#6B6658",

  activity: {
    l0: "#F8E8A8",
    l1: "#F2CC67",
    l2: "#E99843",
    l3: "#D65B37",
    l4: "#9E352F",
  },

  map: {
    water: "#B8CFCA",
    teal: "#8CC3BD",
    green: "#3E7B66",
    purple: "#776A97",
  },
} as const;

export const fonts = {
  brand: "'Imbue', serif",
  label: "'Antonio', sans-serif",
  heading: "'Noto Serif TC', serif",
  body: "'Noto Sans TC', sans-serif",
} as const;

export const spacing = [4, 8, 12, 14, 16, 20, 24, 28, 32, 40, 48, 56, 72] as const;

export const radii = {
  none: "0px",
  sm: "4px",
  pill: "999px",
} as const;

export const layout = {
  maxWidth: "1360px",
  desktopPadding: "40px",
  controlMinHeight: "44px",
  touchTarget: "44px",
} as const;
