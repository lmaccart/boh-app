import { Image, Text, View } from "react-native";

import { cn } from "@/lib/cn";

export type AvatarProps = {
  name?: string | null;
  uri?: string | null;
  size?: number;
  className?: string;
};

function initials(name?: string | null) {
  if (!name) return "";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function Avatar({ name, uri, size = 40, className }: AvatarProps) {
  // Width/height/radius are layout dimensions (not colors), so inline style is fine.
  const dimension = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={dimension}
        className={cn("bg-muted", className)}
        accessibilityIgnoresInvertColors
      />
    );
  }

  return (
    <View style={dimension} className={cn("items-center justify-center bg-muted", className)}>
      <Text className="font-semibold text-muted-foreground">{initials(name)}</Text>
    </View>
  );
}
