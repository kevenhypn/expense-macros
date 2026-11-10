import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform, Pressable, StyleSheet, Text, TextInput, View, useColorScheme, type StyleProp, type TextStyle, type ViewStyle, type TextInputProps, type AccessibilityRole } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { ArrowDownLeft, BusFront, Clapperboard, Ellipsis, Moon, PiggyBank, ReceiptText, ShoppingBag, Sun, Utensils } from "lucide-react-native";
import type { TransactionCategory } from "../types";

const heroColors = {
  onHero: "#f4f7f5", heroMuted: "#c5d0ca", heroLine: "#31443b",
  heroGreen: "#8ee7bc", heroWarning: "#f5c07a", heroError: "#ffb1b1",
};

const light = {
  ...heroColors,
  bg: "#f3f6f4", surface: "#ffffff", ink: "#17211c", muted: "#4d5c55", faint: "#5d6c64",
  border: "#dce5df", accent: "#08714f", soft: "#e5f3ec", hero: "#15211c",
  error: "#9d1c28", green: "#08714f", warning: "#8a4b00", warningBg: "#fbf3e4",
  primary: "#08714f", onPrimary: "#ffffff",
  danger: "#fdecec", track: "#e3ebe6", shade: "rgba(16, 24, 20, 0.52)",
};

const dark: typeof light = {
  ...heroColors,
  bg: "#101412", surface: "#18211d", ink: "#f3f6f4", muted: "#c5d0ca", faint: "#a8b6af",
  border: "#2c3a34", accent: "#7ee0b8", soft: "#1a332b", hero: "#0e1915",
  error: "#ffb1b1", green: "#7ee0b8", warning: "#f5c07a", warningBg: "#3a2e1c",
  primary: "#7ee0b8", onPrimary: "#06281c",
  danger: "#3a2226", track: "#2a3832", shade: "rgba(6, 10, 8, 0.72)",
};

const lightCategories = {
  Food: { icon: Utensils, bg: "#f8efe4", color: "#8a4516", bar: "#e39a5c" },
  Shopping: { icon: ShoppingBag, bg: "#e7eef6", color: "#2d5278", bar: "#7ea4cc" },
  Transport: { icon: BusFront, bg: "#e4f1f3", color: "#1f5c68", bar: "#6aafbc" },
  Entertainment: { icon: Clapperboard, bg: "#f4f0e6", color: "#6d5420", bar: "#c2aa72" },
  Other: { icon: Ellipsis, bg: "#eceef2", color: "#4e5564", bar: "#a3a8b6" },
  Bills: { icon: ReceiptText, bg: "#fbeaea", color: "#8d3642", bar: "#e08b90" },
  Savings: { icon: PiggyBank, bg: "#e3f4ec", color: "#1f5c45", bar: "#74b89a" },
  Income: { icon: ArrowDownLeft, bg: "#e5f4e8", color: "#1f5c45", bar: "#7dbe96" },
};

const darkCategories: typeof lightCategories = {
  Food: { ...lightCategories.Food, bg: "#3a2a22", color: "#ffc093" },
  Shopping: { ...lightCategories.Shopping, bg: "#1d2c3d", color: "#b7d4f8" },
  Transport: { ...lightCategories.Transport, bg: "#1a3236", color: "#a5dce6" },
  Entertainment: { ...lightCategories.Entertainment, bg: "#38301e", color: "#ecd39a" },
  Other: { ...lightCategories.Other, bg: "#2c2e3a", color: "#d5d7e6" },
  Bills: { ...lightCategories.Bills, bg: "#3d262c", color: "#ffc0c8" },
  Savings: { ...lightCategories.Savings, bg: "#1b3830", color: "#b7ecd4" },
  Income: { ...lightCategories.Income, bg: "#1d382c", color: "#b7e6c8" },
};

const makeStyles = (c: typeof light) => StyleSheet.create({
  panel: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, borderCurve: "continuous" },
  row: { flexDirection: "row", alignItems: "center" },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 28, lineHeight: 34, letterSpacing: -0.4, color: c.ink, fontWeight: "700" },
  label: { color: c.ink, fontWeight: "600", fontSize: 15, lineHeight: 20 },
  muted: { color: c.muted, fontSize: 14, lineHeight: 20 },
  caption: { color: c.muted, fontSize: 13, lineHeight: 18, fontWeight: "600" },
  number: { fontVariant: ["tabular-nums"], color: c.ink, fontWeight: "700" },
  field: {
    minHeight: 48, borderWidth: 1, borderColor: c.border, backgroundColor: c.bg, borderRadius: 10,
    borderCurve: "continuous", color: c.ink, paddingHorizontal: 12, fontSize: 16,
  },
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
    <Icon size={18} color={c.accent} />
  </IconButton>;
}

export function Txt({ children, style, lines, selectable, accessibilityRole, maxFontSizeMultiplier = 1.6 }: {
  children: ReactNode; style?: StyleProp<TextStyle>; lines?: number; selectable?: boolean;
  accessibilityRole?: AccessibilityRole; maxFontSizeMultiplier?: number;
}) {
  const { c } = useTheme();
  return <Text accessibilityRole={accessibilityRole} selectable={selectable} maxFontSizeMultiplier={maxFontSizeMultiplier}
    numberOfLines={lines} style={[{ color: c.ink }, style]}>{children}</Text>;
}

function focusRing(color: string, focused: boolean): ViewStyle {
  return focused && Platform.OS === "web"
    ? { outlineWidth: 2, outlineStyle: "solid", outlineColor: color, outlineOffset: 2 }
    : {};
}

export function Action({ children, onPress, tone = "primary", disabled, label, style }: {
  children: ReactNode; onPress: () => void; tone?: "primary" | "soft" | "plain" | "danger";
  disabled?: boolean; label?: string; style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const [focused, setFocused] = useState(false);
  const bg = { primary: c.primary, soft: c.soft, plain: c.surface, danger: c.danger }[tone];
  const fg = { primary: c.onPrimary, soft: c.accent, plain: c.ink, danger: c.error }[tone];
  const border = tone === "plain" ? c.border : "transparent";
  return <Pressable accessibilityRole="button" accessibilityLabel={label}
    accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress}
    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => [{ minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 10,
      borderCurve: "continuous", flexDirection: "row", gap: 8, paddingHorizontal: 16, backgroundColor: bg,
      borderWidth: 1, borderColor: border, opacity: disabled ? 0.48 : pressed ? 0.82 : 1 }, focusRing(c.accent, focused), style]}>
    {typeof children === "string" ? <Txt style={{ color: fg, fontSize: 15, fontWeight: "600" }}>{children}</Txt> : children}
  </Pressable>;
}

export function IconButton({ label, children, onPress, disabled, style }: {
  label: string; children: ReactNode; onPress: () => void; disabled?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const [focused, setFocused] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} disabled={disabled}
    accessibilityState={{ disabled: !!disabled }}
    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => [{ minHeight: 44, minWidth: 44, borderRadius: 10, borderCurve: "continuous",
      alignItems: "center", justifyContent: "center", opacity: disabled ? 0.32 : pressed ? 0.7 : 1 },
      focusRing(c.accent, focused), style]}>{children}</Pressable>;
}

export function Brand({ small = false }: { small?: boolean }) {
  const { c, s } = useTheme();
  return <View style={[s.row, { gap: 8 }]}>
    <View style={{ backgroundColor: "#08714f", borderRadius: 8, borderCurve: "continuous", width: 32, height: 32, alignItems: "center", justifyContent: "center" }}>
      <Svg width={20} height={20} viewBox="0 0 28 28">
        <Rect x={4} y={15} width={4.5} height={9} rx={2} fill="#b7e6cc" />
        <Rect x={11.75} y={10} width={4.5} height={14} rx={2} fill="#ffffff" />
        <Rect x={19.5} y={4} width={4.5} height={20} rx={2} fill="#8ee7bc" />
      </Svg>
    </View>
    <Txt style={{ fontSize: small ? 16 : 18, fontWeight: "700", letterSpacing: -0.3 }}>Expense Macros</Txt>
  </View>;
}

export function Field({ label, style, ...props }: TextInputProps & { label: string }) {
  const { c, s, scheme } = useTheme();
  const [focused, setFocused] = useState(false);
  return <View style={{ gap: 8 }}>
    <Txt style={s.label}>{label}</Txt>
    <TextInput accessibilityLabel={label} keyboardAppearance={scheme} placeholderTextColor={c.faint}
      {...props}
      onFocus={event => { setFocused(true); props.onFocus?.(event); }}
      onBlur={event => { setFocused(false); props.onBlur?.(event); }}
      style={[s.field, focused && Platform.OS === "web" ? { borderColor: c.accent } : null, style]} />
  </View>;
}

export function Banner({ tone = "info", title, children }: {
  tone?: "info" | "warning" | "error"; title?: string; children: ReactNode;
}) {
  const { c } = useTheme();
  const color = tone === "error" ? c.error : tone === "warning" ? c.warning : c.accent;
  const bg = tone === "error" ? c.danger : tone === "warning" ? c.warningBg : c.soft;
  return <View accessibilityRole="alert" style={{ backgroundColor: bg, borderRadius: 12, borderCurve: "continuous", padding: 12, gap: 4 }}>
    {!!title && <Txt style={{ color, fontWeight: "700", fontSize: 15 }}>{title}</Txt>}
    <Txt style={{ color, fontSize: 14, lineHeight: 20 }}>{children}</Txt>
  </View>;
}

export function Meter({ percent, color, track, label }: { percent: number | null; color: string; track: string; label: string }) {
  const width = percent === null ? 0 : Math.max(0, Math.min(100, percent));
  return <View accessibilityLabel={label} style={{ height: 8, borderRadius: 4, backgroundColor: track, overflow: "hidden" }}>
    <View style={{ width: `${width}%`, height: 8, backgroundColor: color }} />
  </View>;
}

export function Badge({ category, size = 36 }: { category: TransactionCategory; size?: number }) {
  const { cat } = useTheme();
  const { icon: Icon, bg, color } = cat[category] ?? cat.Other;
  return <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center", borderRadius: 8, borderCurve: "continuous", backgroundColor: bg }}>
    <Icon size={size * 0.46} color={color} strokeWidth={1.9} />
  </View>;
}
