import type { ThemeKey } from "../api/types";

export const THEME_PRESETS: Array<{ key: ThemeKey; label: string; description: string; swatches: string[] }> = [
  { key: "field-journal", label: "Field journal", description: "Warm paper and ink navy", swatches: ["#15283b", "#f7f0df", "#e8b34d"] },
  { key: "poolside", label: "Poolside", description: "Faded aqua and coral", swatches: ["#24505d", "#d7f0ec", "#e38c73"] },
  { key: "citrus-notebook", label: "Citrus notebook", description: "Lemon, leaf, and paper", swatches: ["#3d5b3b", "#fff0a9", "#e6a34c"] },
  { key: "moonlight-ink", label: "Moonlight ink", description: "Midnight, lavender, and silver", swatches: ["#182039", "#d6d3e3", "#9a9fc8"] },
];
