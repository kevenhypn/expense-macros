import { View } from "react-native";
import { isoDate } from "../lib/budget";
import { Txt, c, s } from "./ui";

export function DateField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <View style={{ gap: 7 }}>
    <Txt style={s.label}>Date</Txt>
    <input type="date" value={value} max={isoDate()} aria-label="Date" onChange={event => onChange(event.target.value)}
      style={{ boxSizing: "border-box", width: "100%", minWidth: 0, height: 48, border: `1px solid ${c.border}`,
        borderRadius: 13, padding: "0 12px", background: c.bg, color: c.ink, font: "16px system-ui" }} />
  </View>;
}
