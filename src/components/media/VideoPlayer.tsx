import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { cn } from "@/lib/cn";
import { text } from "@/constants/text";

const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;

export type VideoPlayerProps = {
  uri: string;
  initialPositionSeconds?: number;
  // Fired ~once per second with the current playback position.
  onProgress?: (seconds: number) => void;
  // Fired when the video reaches the end.
  onEnded?: () => void;
};

export function VideoPlayer({ uri, initialPositionSeconds = 0, onProgress, onEnded }: VideoPlayerProps) {
  const [rate, setRate] = useState(1);
  // Keep latest callbacks in refs so listeners attached once stay current.
  const onProgressRef = useRef(onProgress);
  const onEndedRef = useRef(onEnded);
  useEffect(() => {
    onProgressRef.current = onProgress;
    onEndedRef.current = onEnded;
  });

  const player = useVideoPlayer(uri, (p) => {
    p.timeUpdateEventInterval = 1;
    if (initialPositionSeconds > 0) p.currentTime = initialPositionSeconds;
  });

  useEffect(() => {
    const timeSub = player.addListener("timeUpdate", (payload: { currentTime: number }) => {
      onProgressRef.current?.(payload.currentTime);
    });
    const endSub = player.addListener("playToEnd", () => {
      onEndedRef.current?.();
    });
    return () => {
      timeSub.remove();
      endSub.remove();
    };
  }, [player]);

  // expo-video exposes playback speed via an imperative setter on the player
  // instance; mutating it here is the intended API.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    player.playbackRate = rate;
  }, [player, rate]);

  return (
    <View>
      <VideoView
        player={player}
        style={{ width: "100%", aspectRatio: 16 / 9, backgroundColor: "black" }}
        contentFit="contain"
      />
      <View className="mt-3 flex-row items-center px-1">
        <Text className="mr-2 text-sm text-muted-foreground">{text.courses.playbackSpeed}</Text>
        <View className="flex-row gap-2">
          {SPEEDS.map((s) => (
            <Pressable
              key={s}
              accessibilityRole="button"
              onPress={() => setRate(s)}
              className={cn(
                "rounded-full border px-3 py-1",
                rate === s ? "border-primary bg-primary" : "border-border bg-card",
              )}
            >
              <Text
                className={cn(
                  "text-xs font-medium",
                  rate === s ? "text-primary-foreground" : "text-foreground",
                )}
              >
                {s}x
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}
