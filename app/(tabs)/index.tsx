import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, Card, Header } from "@/components/ui";
import { text } from "@/constants/text";
import { useAuth } from "@/providers/auth";

export default function StartHereScreen() {
  const { profile, session, signOut } = useAuth();
  const displayName = profile?.name?.trim() || session?.user.email || "";

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <Header title={text.placeholders.startHere.title} />
      <View className="flex-1 gap-4 px-6 py-6">
        {displayName ? (
          <Text className="text-lg text-foreground">
            {text.account.signedInAs} {displayName}
          </Text>
        ) : null}
        <Card>
          <Text className="text-base text-muted-foreground">
            {text.placeholders.startHere.body}
          </Text>
        </Card>
        <Button title={text.auth.signOut} variant="outline" onPress={() => signOut()} />
      </View>
    </SafeAreaView>
  );
}
