import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  useCompleteLesson,
  useFavorites,
  useLesson,
  useLessonProgress,
  useLessonResources,
  useSaveProgress,
  useToggleFavorite,
} from "@/api";
import type { FavoriteContentType, SectionType } from "@/api";
import { AudioPlayer } from "@/components/media/AudioPlayer";
import { VideoPlayer } from "@/components/media/VideoPlayer";
import { Badge, Card, IconButton, Spinner } from "@/components/ui";
import { text } from "@/constants/text";
import { isAudioUrl } from "@/lib/media";
import { colors } from "@/theme/colors";

const SAVE_INTERVAL_SECONDS = 5;
const NEXT_LESSON_COMPLETES_PREVIOUS_AT = 30;

function favoriteTypeFor(sectionType: SectionType | undefined, audio: boolean): FavoriteContentType {
  const isVault = sectionType === "nsr" || sectionType === "meditation";
  if (!isVault) return "lesson";
  return audio ? "audio" : "clip";
}

export default function LessonPlayerScreen() {
  const { lessonId, type, prev } = useLocalSearchParams<{
    lessonId: string;
    type?: SectionType;
    prev?: string;
  }>();
  const router = useRouter();

  const lesson = useLesson(lessonId);
  const progress = useLessonProgress(lessonId);
  const resources = useLessonResources(lessonId);
  const favorites = useFavorites();
  const saveProgress = useSaveProgress();
  const completeLesson = useCompleteLesson();
  const toggleFavorite = useToggleFavorite();

  const [justCompleted, setJustCompleted] = useState(false);
  const lastSavedRef = useRef(0);
  const firedPrevRef = useRef(false);

  const audio = isAudioUrl(lesson.data?.video_url);
  const favType = favoriteTypeFor(type, audio);
  const isFavorited = !!favorites.data?.some(
    (f) => f.content_type === favType && f.content_id === lessonId,
  );
  const completed = !!progress.data?.completed_at || justCompleted;

  const handleProgress = useCallback(
    (seconds: number) => {
      if (seconds - lastSavedRef.current >= SAVE_INTERVAL_SECONDS) {
        lastSavedRef.current = seconds;
        saveProgress.mutate({ lessonId: lessonId!, positionSeconds: seconds });
      }
      // Watching the next module lesson past the threshold completes the prior one.
      if (prev && !firedPrevRef.current && seconds >= NEXT_LESSON_COMPLETES_PREVIOUS_AT) {
        firedPrevRef.current = true;
        completeLesson.mutate(prev);
      }
    },
    [lessonId, prev, saveProgress, completeLesson],
  );

  const handleEnded = useCallback(() => {
    completeLesson.mutate(lessonId!);
    setJustCompleted(true);
  }, [lessonId, completeLesson]);

  // Wait for both the lesson and its saved progress so playback resumes at the
  // correct position.
  if (lesson.isLoading || progress.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
        <Spinner fill />
      </SafeAreaView>
    );
  }

  const mediaUrl = lesson.data?.video_url ?? null;
  const initial = progress.data?.position_seconds ?? 0;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
      <View className="flex-row items-center gap-2 border-b border-border bg-background px-4 py-3">
        <IconButton name="chevron-back" accessibilityLabel="Back" onPress={() => router.back()} />
        <Text className="flex-1 text-lg font-bold text-foreground" numberOfLines={1}>
          {lesson.data?.title ?? ""}
        </Text>
        <IconButton
          name={isFavorited ? "heart" : "heart-outline"}
          accessibilityLabel="Favorite"
          color={isFavorited ? colors.primary.DEFAULT : colors.foreground}
          onPress={() => toggleFavorite.mutate({ contentType: favType, contentId: lessonId! })}
        />
      </View>

      <ScrollView contentContainerClassName="px-6 py-6" showsVerticalScrollIndicator={false}>
        {mediaUrl ? (
          audio ? (
            <AudioPlayer
              uri={mediaUrl}
              initialPositionSeconds={initial}
              onProgress={handleProgress}
              onEnded={handleEnded}
            />
          ) : (
            <VideoPlayer
              uri={mediaUrl}
              initialPositionSeconds={initial}
              onProgress={handleProgress}
              onEnded={handleEnded}
            />
          )
        ) : null}

        {completed ? (
          <View className="mt-4 flex-row items-center gap-2">
            <Ionicons name="checkmark-circle" size={18} color={colors.secondary.DEFAULT} />
            <Text className="text-sm font-medium text-foreground">{text.courses.completed}</Text>
          </View>
        ) : null}

        <Text className="mb-3 mt-8 text-base font-semibold text-foreground">
          {text.courses.resourcesTitle}
        </Text>
        {!completed ? (
          <Text className="text-sm text-muted-foreground">{text.courses.resourcesLocked}</Text>
        ) : resources.data && resources.data.length > 0 ? (
          resources.data.map((r) => (
            <Card key={r.id} className="mb-3">
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="flex-1 pr-2 text-base font-medium text-foreground">{r.title}</Text>
                <Badge label={text.resources.types[r.type]} variant="secondary" />
              </View>
              {r.type === "pdf" ? (
                <IconButton
                  name="open-outline"
                  accessibilityLabel={r.title}
                  onPress={() => WebBrowser.openBrowserAsync(r.url)}
                  className="self-start"
                />
              ) : (
                <AudioPlayer uri={r.url} />
              )}
            </Card>
          ))
        ) : (
          <Text className="text-sm text-muted-foreground">{text.courses.lessonsEmpty}</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
