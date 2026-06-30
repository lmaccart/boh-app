import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, IconButton, ListItem } from "@/components/ui";
import { text } from "@/constants/text";
import { useAuth } from "@/providers/auth";

const PRIVACY_URL = "https://thebizofhappiness.com/legal/#privacy";
const TERMS_URL = "https://thebizofhappiness.com/legal/#terms";

function SectionLabel({ label }: { label: string }) {
  return (
    <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {label}
    </Text>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { signOut, profile, session } = useAuth();

  const displayName = profile?.name?.trim() || session?.user.email || "";

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-row items-center gap-2 border-b border-border bg-background px-4 py-3">
        <IconButton name="chevron-back" accessibilityLabel="Back" onPress={() => router.back()} />
        <Text className="text-xl font-bold text-foreground">{text.settings.title}</Text>
      </View>

      <ScrollView contentContainerClassName="px-6 pb-10" showsVerticalScrollIndicator={false}>
        <SectionLabel label={text.settings.accountSection} />
        {displayName ? (
          <Text className="mb-3 text-base text-muted-foreground">
            {text.account.signedInAs} {displayName}
          </Text>
        ) : null}
        <Button title={text.settings.signOut} variant="outline" onPress={() => signOut()} />

        <SectionLabel label={text.settings.legalSection} />
        <ListItem
          title={text.settings.privacyPolicy}
          chevron
          className="mb-3"
          onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)}
        />
        <ListItem
          title={text.settings.termsOfService}
          chevron
          onPress={() => WebBrowser.openBrowserAsync(TERMS_URL)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
