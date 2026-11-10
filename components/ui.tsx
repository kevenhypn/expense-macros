import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform, Pressable, StyleSheet, Text, TextInput, View, useColorScheme, type StyleProp, type TextStyle, type ViewStyle, type TextInputProps } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { ArrowDownLeft, BusFront, Clapperboard, Ellipsis, Moon, PiggyBank, ReceiptText, ShoppingBag, Sun, Utensils } from "lucide-react-native";
import type { TransactionCategory } from "../types";

const light = {
  bg: "#f7f7fb", surface: "#ffffff", ink: "#18182d", muted: "#606177", faint: "#73748a",
  border: "#e7e7f0", purple: "#5740dc", soft: "#eeebff", hero: "#211c45",
  lime: "#d7fa86", error: "#ad3156", green: "#247053", primary: "#5740dc", onPrimary: "#ffffff",
  onHero: "#ffffff", danger: "#fce8ef", track: "#eeedf5", shade: "rgba(24, 20, 48, 0.52)",
};

const dark: typeof light = {
  bg: "#11111b", surface: "#1a1a2a", ink: "#f4f2ff", muted: "#c1bed4", faint: "#aaa6bf",
  border: "#35334a", purple: "#c0b1ff", soft: "#30264e", hero: "#29214a",
  lime: "#d7fa86", error: "#ffabc4", green: "#93ddba", primary: "#654ce7", onPrimary: "#ffffff",
  onHero: "#ffffff", danger: "#462539", track: "#36334b", shade: "rgba(8, 7, 17, 0.7)",
};

const lightCategories = {
  Food: { icon: Utensils, bg: "#fff0e0", color: "#9b4d19", bar: "#eea063" },
  Shopping: { icon: ShoppingBag, bg: "#eee9ff", color: "#6340be", bar: "#9c83eb" },
  Transport: { icon: BusFront, bg: "#e4efff", color: "#3561a6", bar: "#78a9f5" },
  Entertainment: { icon: Clapperboard, bg: "#ffe8f2", color: "#9c3971", bar: "#e887b5" },
  Other: { icon: Ellipsis, bg: "#ebedf3", color: "#53596d", bar: "#9da2b4" },
  Bills: { icon: ReceiptText, bg: "#fde9e9", color: "#9c3e4a", bar: "#ed8b90" },
  Savings: { icon: PiggyBank, bg: "#ddf4ea", color: "#28644f", bar: "#6dbfa0" },
  Income: { icon: ArrowDownLeft, bg: "#e4f4e7", color: "#28644f", bar: "#7cc697" },
};

const darkCategories: typeof lightCategories = {
  Food: { ...lightCategories.Food, bg: "#402c25", color: "#ffba87" },
  Shopping: { ...lightCategories.Shopping, bg: "#352950", color: "#ceb5ff" },
  Transport: { ...lightCategories.Transport, bg: "#263553", color: "#a9caff" },
  Entertainment: { ...lightCategories.Entertainment, bg: "#44273d", color: "#f9aed7" },
  Other: { ...lightCategories.Other, bg: "#313247", color: "#ced0e7" },
  Bills: { ...lightCategories.Bills, bg: "#432936", color: "#ffabb8" },
  Savings: { ...lightCategories.Savings, bg: "#203c36", color: "#9ae4c9" },
  Income: { ...lightCategories.Income, bg: "#223b31", color: "#a1dfb6" },
};

const makeStyles = (c: typeof light) => StyleSheet.create({
  panel: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 23 },
  row: { flexDirection: "row", alignItems: "center" },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 22, letterSpacing: -0.65, color: c.ink, fontWeight: "700" },
  label: { color: c.ink, fontWeight: "600", fontSize: 14 },
  muted: { color: c.muted, fontSize: 14, lineHeight: 20 },
  eyebrow: { color: c.faint, fontSize: 10, fontWeight: "800", letterSpacing: 1.65 },
  number: { fontVariant: ["tabular-nums"], color: c.ink, fontWeight: "700" },
  field: { minHeight: 48, borderWidth: 1, borderColor: c.border, backgroundColor: c.bg, borderRadius: 13, color: c.ink, paddingHorizontal: 13, fontSize: 16 },
  divider: { height: 1, backgroundColor: c.border },
});

type Scheme = "light" | "dark";
const palettes = {
  light: { c: light, s: makeStyles(light), cat: lightCategories },
  dark: { c: dark, s: makeStyles(dark), cat: darkCategories },
};
const themeKey = "expense_macros_appearance";
const Theme = createContext({
  ...palettes.light,
  scheme: "light" as Scheme,
  toggle: () => {},
});

export const useTheme = () => useContext(Theme);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreference] = useState<Scheme>();
  const changed = useRef(false);
  const scheme = preference ?? (system === "dark" ? "dark" : "light");

  useEffect(() => {
    AsyncStorage.getItem(themeKey).then(value => {
      if (!changed.current && (value === "light" || value === "dark")) setPreference(value);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    document.documentElement.style.colorScheme = scheme;
    document.documentElement.style.backgroundColor = palettes[scheme].c.bg;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", palettes[scheme].c.bg);
  }, [scheme]);

  function toggle() {
    const next = scheme === "dark" ? "light" : "dark";
    changed.current = true;
    setPreference(next);
    AsyncStorage.setItem(themeKey, next).catch(() => {});
  }

  return <Theme.Provider value={{ ...palettes[scheme], scheme, toggle }}>{children}</Theme.Provider>;
}

export function ThemeToggle() {
  const { c, scheme, toggle } = useTheme();
  const isDark = scheme === "dark";
  const Icon = isDark ? Sun : Moon;
  return <IconButton label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    onPress={toggle} style={{ backgroundColor: c.soft }}>
    <Icon size={19} color={c.purple} />
  </IconButton>;
}

export function Txt({ children, style, lines }: { children: ReactNode; style?: StyleProp<TextStyle>; lines?: number }) {
  const { c } = useTheme();
  return <Text numberOfLines={lines} style={[{ color: c.ink }, style]}>{children}</Text>;
}

export function Action({ children, onPress, tone = "primary", disabled, label, style }: {
  children: ReactNode; onPress: () => void; tone?: "primary" | "soft" | "plain" | "danger";
  disabled?: boolean; label?: string; style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const bg = { primary: c.primary, soft: c.soft, plain: c.surface, danger: c.danger }[tone];
  const fg = { primary: c.onPrimary, soft: c.purple, plain: c.ink, danger: c.error }[tone];
  return <Pressable accessibilityRole="button" accessibilityLabel={label}
    accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [{ minHeight: 46, alignItems: "center", justifyContent: "center", borderRadius: 13,
      flexDirection: "row", gap: 7, paddingHorizontal: 14, backgroundColor: bg, opacity: disabled ? 0.48 : pressed ? 0.76 : 1 }, style]}>
    {typeof children === "string" ? <Txt style={{ color: fg, fontSize: 14, fontWeight: "700" }}>{children}</Txt> : children}
  </Pressable>;
}

export function IconButton({ label, children, onPress, disabled, style }: {
  label: string; children: ReactNode; onPress: () => void; disabled?: boolean; style?: StyleProp<ViewStyle>;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} disabled={disabled}
    accessibilityState={{ disabled: !!disabled }}
    style={({ pressed }) => [{ minHeight: 44, minWidth: 44, borderRadius: 13, alignItems: "center",
      justifyContent: "center", opacity: disabled ? 0.32 : pressed ? 0.55 : 1 }, style]}>{children}</Pressable>;
}

export function Brand({ small = false }: { small?: boolean }) {
  const { c, s } = useTheme();
  return <View style={[s.row, { gap: 9 }]}>
    <View style={{ backgroundColor: c.primary, borderRadius: 11, width: 34, height: 34, alignItems: "center", justifyContent: "center" }}>
      <Svg width={22} height={22} viewBox="0 0 28 28">
        <Rect x={4} y={15} width={4.5} height={9} rx={2} fill="#c7b8ff" />
        <Rect x={11.75} y={10} width={4.5} height={14} rx={2} fill="#ffffff" />
        <Rect x={19.5} y={4} width={4.5} height={20} rx={2} fill={c.lime} />
      </Svg>
    </View>
    <Txt style={{ fontSize: small ? 17 : 19, fontWeight: "800", letterSpacing: -0.65 }}>Expense Macros</Txt>
  </View>;
}

export function Field({ label, style, ...props }: TextInputProps & { label: string }) {
  const { c, s, scheme } = useTheme();
  return <View style={{ gap: 7 }}>
    <Txt style={s.label}>{label}</Txt>
    <TextInput accessibilityLabel={label} keyboardAppearance={scheme} placeholderTextColor={c.faint} style={[s.field, style]} {...props} />
  </View>;
}

export function Badge({ category, size = 40 }: { category: TransactionCategory; size?: number }) {
  const { cat } = useTheme();
  const { icon: Icon, bg, color } = cat[category] ?? cat.Other;
  return <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center", borderRadius: 13, backgroundColor: bg }}>
    <Icon size={size * 0.47} color={color} strokeWidth={1.85} />
  </View>;
}

export function Arc({ percent, over, size }: { percent: number | null; over: boolean; size: number }) {
  const { c } = useTheme();
  const sweep = 2 * Math.PI * 49;
  return <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}
    accessibilityLabel={percent === null ? "No allowance" : `${percent}% of allowance used`}>
    <Svg width={size} height={size} viewBox="0 0 120 120" style={StyleSheet.absoluteFill}>
      <Circle cx={60} cy={60} r={49} fill="none" stroke="#474066" strokeWidth={9} />
      {percent !== null && percent > 0 && <Circle cx={60} cy={60} r={49} fill="none" stroke={over ? "#ffc0d2" : c.lime} strokeWidth={9}
        strokeLinecap="round" strokeDasharray={`${sweep * Math.min(percent, 100) / 100} ${sweep}`} transform="rotate(-90 60 60)" />}
    </Svg>
    <Txt style={{ fontSize: size * 0.23, color: "#fff", fontWeight: "800", letterSpacing: -1 }}>{percent === null ? "—" : percent > 999 ? "999+%" : `${percent}%`}</Txt>
    <Txt style={{ color: "#d8d2ec", fontSize: 10, fontWeight: "600" }}>{percent === null ? "no target" : "used"}</Txt>
  </View>;
}

export function Contours() {
  return <View pointerEvents="none" style={{ position: "absolute", right: -43, top: -82, opacity: 0.61 }}>
    <Svg width={290} height={280} viewBox="0 0 290 280">
      <Path d="M21 249C92 237 46 153 124 129S182 57 158 0M47 266C120 253 74 166 150 145S215 70 183 0M73 280C146 267 103 182 177 158S241 79 212 0M108 280C171 263 133 198 203 174S268 91 240 0M144 280C194 262 167 218 228 190S290 100 267 0M173 280C220 261 198 235 255 206S319 114 297 0" stroke="#55467e" strokeWidth="1" fill="none" />
    </Svg>
  </View>;
}
