import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Header } from "@/components/ui";

// Shared empty-state screen used by the v0 navigation shell. Real content for
// each tab is built in v1.
export function PlaceholderScreen({ title, body }: { title: string; body: string }) {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <Header title={title} />
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-center text-base text-muted-foreground">{body}</Text>
      </View>
    </SafeAreaView>
  );
}
