import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  queryKeys,
  useRealtimeInserts,
  useSendMessage,
  useThread,
  useUserProfile,
} from "@/api";
import { IconButton, Spinner } from "@/components/ui";
import { text } from "@/constants/text";
import { cn } from "@/lib/cn";
import { formatTime } from "@/lib/date";
import { useAuth } from "@/providers/auth";
import { colors } from "@/theme/colors";

export default function DmThreadScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const myId = session?.user.id;

  const partner = useUserProfile(userId);
  const thread = useThread(userId);
  const sendMessage = useSendMessage();
  useRealtimeInserts("dm-thread", "direct_messages", queryKeys.thread(userId ?? ""), !!userId);

  const [draft, setDraft] = useState("");

  async function submit() {
    const body = draft.trim();
    if (!body || !userId) return;
    setDraft("");
    await sendMessage.mutateAsync({ recipientId: userId, body });
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-row items-center gap-2 border-b border-border bg-background px-4 py-3">
        <IconButton name="chevron-back" accessibilityLabel="Back" onPress={() => router.back()} />
        <Text className="text-xl font-bold text-foreground" numberOfLines={1}>
          {partner.data?.name ?? text.dms.title}
        </Text>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {thread.isLoading ? (
          <Spinner fill />
        ) : (
          <FlatList
            data={thread.data ?? []}
            keyExtractor={(item) => item.id}
            contentContainerClassName="px-4 py-4"
            renderItem={({ item }) => {
              const mine = item.sender_id === myId;
              return (
                <View
                  className={cn("mb-2 max-w-[80%] rounded-card px-4 py-2", mine ? "self-end bg-primary" : "self-start bg-card border border-border")}
                >
                  <Text className={cn("text-base", mine ? "text-primary-foreground" : "text-foreground")}>
                    {item.body}
                  </Text>
                  <Text
                    className={cn("mt-1 text-xs", mine ? "text-primary-foreground/70" : "text-muted-foreground")}
                  >
                    {formatTime(item.created_at)}
                  </Text>
                </View>
              );
            }}
          />
        )}

        <View className="flex-row items-center gap-2 border-t border-border bg-background px-4 py-3">
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={text.dms.messagePlaceholder}
            placeholderTextColor={colors.muted.foreground}
            className="flex-1 rounded-card border border-input bg-card px-4 py-2 text-base text-foreground"
            multiline
          />
          <IconButton
            name="send"
            accessibilityLabel={text.common.send}
            color={colors.primary.DEFAULT}
            disabled={sendMessage.isPending}
            onPress={submit}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
