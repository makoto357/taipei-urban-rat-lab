import type { Config } from "tailwindcss";
import { tailwindPreset } from "@taipei-rat-lab/ui";

export default {
  presets: [tailwindPreset],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
} satisfies Config;
