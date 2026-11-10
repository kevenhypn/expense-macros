import type { LucideIcon } from "lucide-react-native";

export type GlassTabBarProps<Name extends string> = {
  tabs: readonly { name: Name; icon: LucideIcon }[];
  active: Name;
  bottom: number;
  height: number;
  onSelect: (name: Name) => void;
};

// The native app uses the React Native navigation row.
export function GlassTabBar<Name extends string>(_props: GlassTabBarProps<Name>) {
  return null;
}
