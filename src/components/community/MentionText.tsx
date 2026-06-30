import { useRouter } from "expo-router";
import { Text } from "react-native";

import type { Profile } from "@/api";
import { parseBody } from "@/lib/mentions";

export type MentionTextProps = {
  body: string;
  profiles: Profile[];
  className?: string;
};

// Renders a post/reply body with @mentions highlighted; tapping a resolved
// mention opens a DM with that member.
export function MentionText({ body, profiles, className }: MentionTextProps) {
  const router = useRouter();
  const tokens = parseBody(body, profiles);

  return (
    <Text className={className ?? "text-base text-foreground"}>
      {tokens.map((token, i) =>
        token.kind === "mention" && token.userId ? (
          <Text
            key={i}
            className="font-semibold text-primary"
            onPress={() => router.push(`/community/dms/${token.userId}`)}
          >
            {token.value}
          </Text>
        ) : token.kind === "mention" ? (
          <Text key={i} className="font-semibold text-muted-foreground">
            {token.value}
          </Text>
        ) : (
          <Text key={i}>{token.value}</Text>
        ),
      )}
    </Text>
  );
}
