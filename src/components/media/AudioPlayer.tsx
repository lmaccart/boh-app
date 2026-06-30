import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useEffect, useRef } from "react";
import { Pressable, Text, View } from "react-native";

import { colors } from "@/theme/colors";

export type AudioPlayerProps = {
  uri: string;
  initialPositionSeconds?: number;
  onProgress?: (seconds: number) => void;
  onEnded?: () => void;
};

function clock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AudioPlayer({ uri, initialPositionSeconds = 0, onProgress, onEnded }: AudioPlayerProps) {
  const player = useAudioPlayer({ uri });
  const status = useAudioPlayerStatus(player);

  const seekedRef = useRef(false);
  const finishedRef = useRef(false);
  const onProgressRef = useRef(onProgress);
  const onEndedRef = useRef(onEnded);
  useEffect(() => {
    onProgressRef.current = onProgress;
    onEndedRef.current = onEnded;
  });

  // Seek to the saved position once the track has loaded.
  useEffect(() => {
    if (status.isLoaded && !seekedRef.current && initialPositionSeconds > 0) {
      seekedRef.current = true;
      player.seekTo(initialPositionSeconds);
    }
  }, [status.isLoaded, initialPositionSeconds, player]);

  useEffect(() => {
    if (status.isLoaded) onProgressRef.current?.(status.currentTime);
    if (status.didJustFinish && !finishedRef.current) {
      finishedRef.current = true;
      onEndedRef.current?.();
    }
  }, [status.currentTime, status.didJustFinish, status.isLoaded]);

  function toggle() {
    if (status.playing) {
      player.pause();
    } else {
      player.play();
    }
  }

  return (
    <View className="flex-row items-center gap-3 rounded-card border border-border bg-card p-4">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={status.playing ? "Pause" : "Play"}
        onPress={toggle}
        className="h-12 w-12 items-center justify-center rounded-full bg-primary"
      >
        <Ionicons
          name={status.playing ? "pause" : "play"}
          size={22}
          color={colors.primary.foreground}
        />
      </Pressable>
      <View className="flex-1">
        <View className="h-1.5 overflow-hidden rounded-full bg-muted">
          <View
            className="h-full rounded-full bg-primary"
            style={{
              width: `${status.duration ? Math.min(100, (status.currentTime / status.duration) * 100) : 0}%`,
            }}
          />
        </View>
        <Text className="mt-1.5 text-xs text-muted-foreground">
          {clock(status.currentTime)} / {clock(status.duration ?? 0)}
        </Text>
      </View>
    </View>
  );
}
