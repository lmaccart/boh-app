import { Ionicons } from "@expo/vector-icons";
import { type ReactNode } from "react";
import { Pressable, Text, View, type PressableProps } from "react-native";

import { cn } from "@/lib/cn";
import { colors } from "@/theme/colors";

export type ListItemProps = Omit<PressableProps, "children"> & {
  title: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
  // Show a chevron on the right when the row navigates somewhere.
  chevron?: boolean;
  className?: string;
};

export function ListItem({
  title,
  subtitle,
  left,
  right,
  chevron = false,
  className,
  ...props
}: ListItemProps) {
  return (
    <Pressable
      accessibilityRole={props.onPress ? "button" : undefined}
      className={cn(
        "flex-row items-center gap-3 rounded-card border border-border bg-card px-4 py-3",
        className,
      )}
      {...props}
    >
      {left ? <View>{left}</View> : null}
      <View className="flex-1">
        <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="mt-0.5 text-sm text-muted-foreground" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View>{right}</View> : null}
      {chevron ? (
        <Ionicons name="chevron-forward" size={18} color={colors.muted.foreground} />
      ) : null}
    </Pressable>
  );
}
