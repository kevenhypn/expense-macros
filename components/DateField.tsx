import { useState } from "react";
import { Platform, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { CalendarDays } from "lucide-react-native";
import { dateLabel, isoDate, localDate } from "../lib/budget";
import { Action, Txt, useTheme } from "./ui";

export function DateField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { c, s, scheme } = useTheme();
  const [visible, setVisible] = useState(false);
  return <View style={{ gap: 7 }}>
    <Txt style={s.label}>Date</Txt>
    <Action tone="soft" label="Change transaction date" onPress={() => setVisible(!visible)}>
      <CalendarDays size={16} color={c.accent} /><Txt style={[s.label, { color: c.accent }]}>{dateLabel(value, { dateStyle: "medium" })}</Txt>
    </Action>
    {visible && <DateTimePicker value={localDate(value)} maximumDate={localDate(isoDate())} mode="date"
      display={Platform.OS === "ios" ? "spinner" : "default"} themeVariant={scheme} onChange={(_, date) => {
        if (Platform.OS !== "ios") setVisible(false);
        if (date) onChange(isoDate(date));
      }} />}
    {visible && Platform.OS === "ios" && <Action tone="soft" onPress={() => setVisible(false)}>Done choosing date</Action>}
  </View>;
}
