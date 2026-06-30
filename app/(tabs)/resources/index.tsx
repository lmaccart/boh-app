import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useResolvedFavorites } from "@/api";
import type { FavoriteContentType, ResolvedFavorite } from "@/api";
import { EmptyState, Header, ListItem, Spinner } from "@/components/ui";
import { text } from "@/constants/text";
import { cn } from "@/lib/cn";
import { colors } from "@/theme/colors";

const TYPES: FavoriteContentType[] = ["clip", "audio", "pdf", "lesson"];
const ICON: Record<FavoriteContentType, "videocam-outline" | "musical-notes-outline" | "document-outline" | "play-outline"> = {
  clip: "videocam-outline",
  audio: "musical-notes-outline",
  pdf: "document-outline",
  lesson: "play-outline",
};

type Filter = FavoriteContentType | "all";

function FilterChips({ value, onChange }: { value: Filter; onChange: (f: Filter) => void }) {
  const options: { key: Filter; label: string }[] = [
    { key: "all", label: text.resources.filterAll },
    ...TYPES.map((t) => ({ key: t as Filter, label: text.resources.types[t] })),
  ];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2 px-4 py-3"
    >
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <Pressable
            key={opt.key}
            accessibilityRole="button"
            onPress={() => onChange(opt.key)}
            className={cn(
              "rounded-full border px-4 py-2",
              active ? "border-primary bg-primary" : "border-border bg-card",
            )}
          >
            <Text className={cn("text-sm font-medium", active ? "text-primary-foreground" : "text-foreground")}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export default function ResourcesScreen() {
  const router = useRouter();
  const { data, isLoading } = useResolvedFavorites();
  const [filter, setFilter] = useState<Filter>("all");

  // Default sort: grouped by content type (TYPES order), then keep insertion
  // (most-recent-first) order within each group.
  const items = useMemo(() => {
    const all = data ?? [];
    const filtered = filter === "all" ? all : all.filter((f) => f.contentType === filter);
    return [...filtered].sort(
      (a, b) => TYPES.indexOf(a.contentType) - TYPES.indexOf(b.contentType),
    );
  }, [data, filter]);

  function open(item: ResolvedFavorite) {
    if (item.lessonId) {
      router.push(`/courses/lesson/${item.lessonId}`);
    } else if (item.url) {
      WebBrowser.openBrowserAsync(item.url);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <Header title={text.resources.title} />
      <FilterChips value={filter} onChange={setFilter} />
      {isLoading ? (
        <Spinner fill />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-4 pb-6"
          ListEmptyComponent={<EmptyState icon="bookmark-outline" title={text.resources.empty} />}
          renderItem={({ item }) => (
            <ListItem
              className="mb-3"
              title={item.title}
              subtitle={text.resources.types[item.contentType]}
              left={
                <View className="h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Ionicons name={ICON[item.contentType]} size={20} color={colors.muted.foreground} />
                </View>
              }
              chevron
              onPress={() => open(item)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}
