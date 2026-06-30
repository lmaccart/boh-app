import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  queryKeys,
  useCreateReply,
  usePost,
  usePostReplies,
  useProfileMap,
  useRealtimeInserts,
} from "@/api";
import type { PostReplyRow, Profile } from "@/api";
import { AuthorRow } from "@/components/community/AuthorRow";
import { MentionText } from "@/components/community/MentionText";
import { VideoPlayer } from "@/components/media/VideoPlayer";
import { Card, IconButton, Spinner } from "@/components/ui";
import { text } from "@/constants/text";
import { isVideoUrl, isAudioUrl } from "@/lib/media";
import { pickMedia, uploadMedia, type PickedMedia } from "@/lib/upload";
import { useAuth } from "@/providers/auth";
import { colors } from "@/theme/colors";

function PostMedia({ url }: { url: string }) {
  if (isVideoUrl(url)) return <VideoPlayer uri={url} />;
  if (isAudioUrl(url)) return null;
  return <Image source={{ uri: url }} className="h-60 w-full rounded-card bg-muted" resizeMode="cover" />;
}

function ReplyRow({ reply, profiles, author }: { reply: PostReplyRow; profiles: Profile[]; author?: Profile }) {
  return (
    <Card className="mb-3">
      <AuthorRow author={author} date={reply.created_at} />
      {reply.body ? (
        <MentionText body={reply.body} profiles={profiles} className="mt-2 text-base text-foreground" />
      ) : null}
      {reply.media_url && !isVideoUrl(reply.media_url) && !isAudioUrl(reply.media_url) ? (
        <Image
          source={{ uri: reply.media_url }}
          className="mt-2 h-44 w-full rounded-card bg-muted"
          resizeMode="cover"
        />
      ) : null}
    </Card>
  );
}

export default function PostDetailScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const router = useRouter();
  const { session } = useAuth();

  const post = usePost(postId);
  const replies = usePostReplies(postId);
  const { map: profileMap, data: profiles } = useProfileMap();
  const createReply = useCreateReply();
  useRealtimeInserts("post-replies", "post_replies", queryKeys.postReplies(postId), !!postId);

  const [draft, setDraft] = useState("");
  const [media, setMedia] = useState<PickedMedia | null>(null);

  async function submit() {
    const body = draft.trim();
    if (!body && !media) return;
    let mediaUrl: string | null = null;
    if (media && session) mediaUrl = await uploadMedia(media, session.user.id);
    await createReply.mutateAsync({ postId: postId!, body: body || null, mediaUrl });
    setDraft("");
    setMedia(null);
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-row items-center gap-2 border-b border-border bg-background px-4 py-3">
        <IconButton name="chevron-back" accessibilityLabel="Back" onPress={() => router.back()} />
        <Text className="text-xl font-bold text-foreground">{text.community.repliesTitle}</Text>
      </View>

      {post.isLoading ? (
        <Spinner fill />
      ) : (
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <FlatList
            data={replies.data ?? []}
            keyExtractor={(item) => item.id}
            contentContainerClassName="px-4 py-4"
            ListHeaderComponent={
              post.data ? (
                <Card className="mb-4">
                  <AuthorRow author={profileMap.get(post.data.user_id)} date={post.data.created_at} />
                  {post.data.body ? (
                    <MentionText
                      body={post.data.body}
                      profiles={profiles ?? []}
                      className="mt-3 text-base text-foreground"
                    />
                  ) : null}
                  {post.data.media_url ? (
                    <View className="mt-3">
                      <PostMedia url={post.data.media_url} />
                    </View>
                  ) : null}
                </Card>
              ) : null
            }
            ListEmptyComponent={
              <Text className="px-1 text-sm text-muted-foreground">{text.community.repliesEmpty}</Text>
            }
            renderItem={({ item }) => (
              <ReplyRow reply={item} profiles={profiles ?? []} author={profileMap.get(item.user_id)} />
            )}
          />

          <View className="flex-row items-center gap-2 border-t border-border bg-background px-4 py-3">
            <IconButton
              name={media ? "image" : "image-outline"}
              accessibilityLabel={text.community.addMedia}
              color={media ? colors.primary.DEFAULT : colors.foreground}
              onPress={async () => setMedia(await pickMedia())}
            />
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={text.community.replyPlaceholder}
              placeholderTextColor={colors.muted.foreground}
              className="flex-1 rounded-card border border-input bg-card px-4 py-2 text-base text-foreground"
              multiline
            />
            <IconButton
              name="send"
              accessibilityLabel={text.common.send}
              color={colors.primary.DEFAULT}
              disabled={createReply.isPending}
              onPress={submit}
            />
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
