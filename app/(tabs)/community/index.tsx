import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { queryKeys, useCourses, usePosts, useProfileMap, useRealtimeInserts } from "@/api";
import type { CommunityPostRow, Profile } from "@/api";
import { AuthorRow } from "@/components/community/AuthorRow";
import { MentionText } from "@/components/community/MentionText";
import { Badge, Card, EmptyState, IconButton, Spinner } from "@/components/ui";
import { text } from "@/constants/text";
import { cn } from "@/lib/cn";
import { isVideoUrl } from "@/lib/media";
import { colors } from "@/theme/colors";

// null represents the global Business of Happiness feed.
type FeedSelection = string | null;

function FeedChips({
  courses,
  selected,
  onSelect,
}: {
  courses: { id: string; title: string }[];
  selected: FeedSelection;
  onSelect: (value: FeedSelection) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2 px-4 py-3"
    >
      {[{ id: null, title: text.community.globalFeed }, ...courses].map((feed) => {
        const active = selected === feed.id;
        return (
          <Pressable
            key={feed.id ?? "global"}
            accessibilityRole="button"
            onPress={() => onSelect(feed.id)}
            className={cn(
              "rounded-full border px-4 py-2",
              active ? "border-primary bg-primary" : "border-border bg-card",
            )}
          >
            <Text
              className={cn(
                "text-sm font-medium",
                active ? "text-primary-foreground" : "text-foreground",
              )}
            >
              {feed.title}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function PostPreview({
  post,
  profiles,
  author,
  onPress,
}: {
  post: CommunityPostRow;
  profiles: Profile[];
  author: Profile | undefined;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Card className="mb-3">
        <AuthorRow author={author} date={post.created_at} />
        {post.body ? (
          <MentionText body={post.body} profiles={profiles} className="mt-3 text-base text-foreground" />
        ) : null}
        {post.media_url ? (
          isVideoUrl(post.media_url) ? (
            <View className="mt-3 h-44 items-center justify-center rounded-card bg-muted">
              <Ionicons name="play-circle" size={48} color={colors.muted.foreground} />
            </View>
          ) : (
            <Image
              source={{ uri: post.media_url }}
              className="mt-3 h-44 w-full rounded-card bg-muted"
              resizeMode="cover"
            />
          )
        ) : null}
        <View className="mt-3 flex-row items-center gap-1">
          <Badge label={text.community.tapToExpand} variant="outline" />
        </View>
      </Card>
    </Pressable>
  );
}

export default function CommunityScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<FeedSelection>(null);

  const courses = useCourses();
  const posts = usePosts(selected);
  const { map: profileMap, data: profiles } = useProfileMap();
  useRealtimeInserts("community-feed", "community_posts", queryKeys.posts(selected));

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-row items-center justify-between border-b border-border bg-background px-4 py-3">
        <Text className="text-xl font-bold text-foreground">{text.community.title}</Text>
        <IconButton
          name="chatbubbles-outline"
          accessibilityLabel={text.dms.title}
          onPress={() => router.push("/community/dms")}
        />
      </View>

      <FeedChips
        courses={courses.data ?? []}
        selected={selected}
        onSelect={setSelected}
      />

      {posts.isLoading ? (
        <Spinner fill />
      ) : (
        <FlatList
          data={posts.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-4 pb-24 pt-1"
          ListEmptyComponent={
            <EmptyState icon="chatbubble-ellipses-outline" title={text.community.feedEmpty} />
          }
          renderItem={({ item }) => (
            <PostPreview
              post={item}
              profiles={profiles ?? []}
              author={profileMap.get(item.user_id)}
              onPress={() => router.push(`/community/${item.id}`)}
            />
          )}
        />
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={text.community.newPost}
        onPress={() => router.push(`/community/new?courseId=${selected ?? ""}`)}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg"
      >
        <Ionicons name="add" size={28} color={colors.primary.foreground} />
      </Pressable>
    </SafeAreaView>
  );
}
