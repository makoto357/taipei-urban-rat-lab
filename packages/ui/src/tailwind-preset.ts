import type { Config } from "tailwindcss";
import { colors, fonts } from "./tokens";

/**
 * Shared Tailwind preset so every app in the workspace draws from the same
 * design tokens instead of redefining hexes. See docs/design/design-system.md.
 */
const preset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        paper: colors.paper,
        card: colors.card,
        ink: colors.ink,
        accent: colors.accent,
        "accent-text": colors.accentText,
        unknown: colors.unknown,
        muted: colors.muted,
        activity: colors.activity,
        map: colors.map,
      },
      fontFamily: {
        brand: [fonts.brand],
        label: [fonts.label],
        heading: [fonts.heading],
        body: [fonts.body],
      },
      borderRadius: {
        none: "0px",
      },
      maxWidth: {
        container: "1360px",
      },
    },
  },
};

export default preset;
