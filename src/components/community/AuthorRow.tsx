import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

import type { Profile } from "@/api";
import { Avatar } from "@/components/ui";
import { formatDate } from "@/lib/date";

export type AuthorRowProps = {
  author: Profile | undefined;
  date: string;
  // When true, tapping the name/avatar opens a DM with the author.
  linkToDm?: boolean;
};

// Avatar + name + date row used on posts and replies. The name is tappable to
// start a direct message, satisfying "click on other people's names to DM".
export function AuthorRow({ author, date, linkToDm = true }: AuthorRowProps) {
  const router = useRouter();
  const name = author?.name?.trim() || "Member";

  const content = (
    <View className="flex-row items-center gap-2">
      <Avatar name={name} uri={author?.avatar_url} size={32} />
      <View>
        <Text className="text-sm font-semibold text-foreground">{name}</Text>
        <Text className="text-xs text-muted-foreground">{formatDate(date)}</Text>
      </View>
    </View>
  );

  if (linkToDm && author) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(`/community/dms/${author.id}`)}
      >
        {content}
      </Pressable>
    );
  }
  return content;
}
