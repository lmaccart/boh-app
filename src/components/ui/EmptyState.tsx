import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { cn } from "@/lib/cn";
import { colors } from "@/theme/colors";

export type EmptyStateProps = {
  title: string;
  body?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  className?: string;
};

export function EmptyState({ title, body, icon, className }: EmptyStateProps) {
  return (
    <View className={cn("flex-1 items-center justify-center px-8", className)}>
      {icon ? (
        <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Ionicons name={icon} size={28} color={colors.muted.foreground} />
        </View>
      ) : null}
      <Text className="text-center text-lg font-semibold text-foreground">{title}</Text>
      {body ? (
        <Text className="mt-2 text-center text-sm text-muted-foreground">{body}</Text>
      ) : null}
    </View>
  );
}
