import type { ThemeKey } from "../api/types";
import { THEME_PRESETS } from "./theme-presets";

export function ThemePicker({ value, canEdit, onChange }: { value: ThemeKey; canEdit: boolean; onChange: (theme: ThemeKey) => Promise<void> }) {
  return <fieldset className="theme-picker" disabled={!canEdit}><legend>Paper mood</legend><div className="theme-options">{THEME_PRESETS.map((theme) => <label className="theme-option" key={theme.key}><input type="radio" name="theme" value={theme.key} checked={value === theme.key} onChange={() => void onChange(theme.key)} /><span className="theme-card"><span className="swatches">{theme.swatches.map((swatch) => <i key={swatch} style={{ backgroundColor: swatch }} />)}</span><strong>{theme.label}</strong><small>{theme.description}</small></span></label>)}</div></fieldset>;
}
