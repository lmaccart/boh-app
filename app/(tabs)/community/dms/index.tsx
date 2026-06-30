import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useProfileMap, useTarrynUser, useThreads } from "@/api";
import { Avatar, EmptyState, IconButton, ListItem, Spinner } from "@/components/ui";
import { text } from "@/constants/text";
import { colors } from "@/theme/colors";

export default function DmListScreen() {
  const router = useRouter();
  const threads = useThreads();
  const tarryn = useTarrynUser();
  const { map: profileMap } = useProfileMap();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-row items-center gap-2 border-b border-border bg-background px-4 py-3">
        <IconButton name="chevron-back" accessibilityLabel="Back" onPress={() => router.back()} />
        <Text className="text-xl font-bold text-foreground">{text.dms.title}</Text>
      </View>

      <FlatList
        data={threads.data ?? []}
        keyExtractor={(item) => item.otherUserId}
        contentContainerClassName="px-4 py-4"
        ListHeaderComponent={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={text.dms.reachOut}
            disabled={!tarryn.data}
            onPress={() => {
              if (tarryn.data) router.push(`/community/dms/${tarryn.data.id}`);
            }}
            className="mb-4 flex-row items-center justify-between rounded-card bg-primary p-4"
          >
            <View className="flex-1 pr-2">
              <Text className="text-base font-bold text-primary-foreground">{text.dms.reachOut}</Text>
              <Text className="mt-0.5 text-sm text-primary-foreground/80">
                {text.dms.reachOutSubtitle}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={22} color={colors.primary.foreground} />
          </Pressable>
        }
        ListEmptyComponent={
          threads.isLoading ? (
            <Spinner />
          ) : (
            <EmptyState icon="chatbubbles-outline" title={text.dms.empty} />
          )
        }
        renderItem={({ item }) => {
          const partner = profileMap.get(item.otherUserId);
          return (
            <ListItem
              className="mb-3"
              title={partner?.name ?? "Member"}
              subtitle={item.lastMessage.body}
              left={<Avatar name={partner?.name} uri={partner?.avatar_url} size={40} />}
              chevron
              onPress={() => router.push(`/community/dms/${item.otherUserId}`)}
            />
          );
        }}
      />
    </SafeAreaView>
  );
}
