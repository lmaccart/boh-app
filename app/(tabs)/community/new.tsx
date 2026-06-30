import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useCreatePost, useProfiles } from "@/api";
import { Avatar, Button, IconButton, Modal } from "@/components/ui";
import { text } from "@/constants/text";
import { mentionTokenFor } from "@/lib/mentions";
import { pickMedia, uploadMedia, type PickedMedia } from "@/lib/upload";
import { useAuth } from "@/providers/auth";
import { colors } from "@/theme/colors";

export default function NewPostScreen() {
  const { courseId } = useLocalSearchParams<{ courseId?: string }>();
  const router = useRouter();
  const { session } = useAuth();

  const createPost = useCreatePost();
  const profiles = useProfiles();

  const [draft, setDraft] = useState("");
  const [media, setMedia] = useState<PickedMedia | null>(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    const body = draft.trim();
    if (!body && !media) return;
    setSubmitting(true);
    try {
      let mediaUrl: string | null = null;
      if (media && session) mediaUrl = await uploadMedia(media, session.user.id);
      await createPost.mutateAsync({
        courseId: courseId ? courseId : null,
        body: body || null,
        mediaUrl,
      });
      router.back();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-row items-center gap-2 border-b border-border bg-background px-4 py-3">
        <IconButton name="close" accessibilityLabel={text.common.cancel} onPress={() => router.back()} />
        <Text className="flex-1 text-xl font-bold text-foreground">{text.community.newPost}</Text>
        <Button
          title={text.common.post}
          size="sm"
          loading={submitting}
          onPress={submit}
        />
      </View>

      <ScrollView contentContainerClassName="px-4 py-4" keyboardShouldPersistTaps="handled">
        <Text className="mb-4 text-sm text-muted-foreground">{text.community.newPostBody}</Text>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={text.community.postPlaceholder}
          placeholderTextColor={colors.muted.foreground}
          className="min-h-32 rounded-card border border-input bg-card px-4 py-3 text-base text-foreground"
          multiline
          textAlignVertical="top"
        />

        {media ? (
          <View className="mt-4">
            {media.kind === "image" ? (
              <Image
                source={{ uri: media.uri }}
                className="h-60 w-full rounded-card bg-muted"
                resizeMode="cover"
              />
            ) : (
              <View className="h-40 items-center justify-center rounded-card bg-muted">
                <Text className="text-sm text-muted-foreground">{media.mimeType}</Text>
              </View>
            )}
            <Pressable
              accessibilityRole="button"
              onPress={() => setMedia(null)}
              className="mt-2 self-start"
            >
              <Text className="text-sm font-medium text-destructive">{text.common.cancel}</Text>
            </Pressable>
          </View>
        ) : null}

        <View className="mt-4 flex-row gap-4">
          <Pressable
            accessibilityRole="button"
            onPress={async () => setMedia(await pickMedia())}
            className="flex-row items-center gap-2"
          >
            <IconButton
              name="image-outline"
              accessibilityLabel={text.community.addMedia}
              onPress={async () => setMedia(await pickMedia())}
            />
            <Text className="text-sm text-foreground">{text.community.addMedia}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setMentionOpen(true)}
            className="flex-row items-center gap-2"
          >
            <IconButton name="at" accessibilityLabel="Tag" onPress={() => setMentionOpen(true)} />
          </Pressable>
        </View>
      </ScrollView>

      <Modal visible={mentionOpen} onClose={() => setMentionOpen(false)} title="Tag a member">
        <ScrollView className="max-h-80">
          {(profiles.data ?? []).map((p) => (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              onPress={() => {
                setDraft((d) => `${d}${mentionTokenFor(p.name ?? "")}`);
                setMentionOpen(false);
              }}
              className="flex-row items-center gap-3 py-3"
            >
              <Avatar name={p.name} uri={p.avatar_url} size={32} />
              <Text className="text-base text-foreground">{p.name ?? "Member"}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </Modal>
    </SafeAreaView>
  );
}
