import { useEffect } from "react";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

import { cn } from "@/lib/cn";

export type SkeletonProps = {
  // Tailwind sizing/spacing classes (e.g. "h-4 w-32").
  className?: string;
};

// Pulsing placeholder block for loading states.
export function Skeleton({ className }: SkeletonProps) {
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={style} className={cn("rounded-card bg-muted", className)} />;
}
