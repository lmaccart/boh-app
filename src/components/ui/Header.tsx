import { type ReactNode } from "react";
import { Text, View, type ViewProps } from "react-native";

import { cn } from "@/lib/cn";

export type HeaderProps = ViewProps & {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  className?: string;
};

export function Header({ title, subtitle, right, className, ...props }: HeaderProps) {
  return (
    <View
      className={cn(
        "flex-row items-center justify-between border-b border-border bg-background px-4 py-3",
        className,
      )}
      {...props}
    >
      <View className="flex-1 pr-3">
        <Text className="text-xl font-bold text-foreground">{title}</Text>
        {subtitle ? <Text className="text-sm text-muted-foreground">{subtitle}</Text> : null}
      </View>
      {right ? <View>{right}</View> : null}
    </View>
  );
}
