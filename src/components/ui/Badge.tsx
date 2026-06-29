import { Text, View } from "react-native";

import { cn } from "@/lib/cn";

type BadgeVariant = "default" | "secondary" | "accent" | "destructive" | "outline";

const containerVariants: Record<BadgeVariant, string> = {
  default: "bg-primary",
  secondary: "bg-secondary",
  accent: "bg-accent",
  destructive: "bg-destructive",
  outline: "border border-border bg-transparent",
};

const labelVariants: Record<BadgeVariant, string> = {
  default: "text-primary-foreground",
  secondary: "text-secondary-foreground",
  accent: "text-accent-foreground",
  destructive: "text-destructive-foreground",
  outline: "text-foreground",
};

export type BadgeProps = {
  label: string;
  variant?: BadgeVariant;
  className?: string;
};

export function Badge({ label, variant = "default", className }: BadgeProps) {
  return (
    <View
      className={cn("self-start rounded-full px-2.5 py-0.5", containerVariants[variant], className)}
    >
      <Text className={cn("text-xs font-medium", labelVariants[variant])}>{label}</Text>
    </View>
  );
}
