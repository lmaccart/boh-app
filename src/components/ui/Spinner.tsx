import { ActivityIndicator, View } from "react-native";

import { cn } from "@/lib/cn";
import { colors } from "@/theme/colors";

export type SpinnerProps = {
  // When true, fills and centers within its parent. Otherwise renders inline.
  fill?: boolean;
  size?: "small" | "large";
  className?: string;
};

export function Spinner({ fill = false, size = "small", className }: SpinnerProps) {
  return (
    <View className={cn(fill && "flex-1 items-center justify-center", className)}>
      <ActivityIndicator color={colors.primary.DEFAULT} size={size} />
    </View>
  );
}
