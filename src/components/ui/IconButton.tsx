import { Ionicons } from "@expo/vector-icons";
import { Pressable, type PressableProps } from "react-native";

import { cn } from "@/lib/cn";
import { colors } from "@/theme/colors";

export type IconButtonProps = Omit<PressableProps, "children"> & {
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string;
  accessibilityLabel: string;
  className?: string;
};

export function IconButton({
  name,
  size = 24,
  color = colors.foreground,
  accessibilityLabel,
  disabled,
  className,
  ...props
}: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      hitSlop={8}
      className={cn("items-center justify-center", disabled && "opacity-50", className)}
      {...props}
    >
      <Ionicons name={name} size={size} color={color} />
    </Pressable>
  );
}
