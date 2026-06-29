import { Tabs } from "expo-router";

import { text } from "@/constants/text";
import { colors } from "@/theme/colors";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary.DEFAULT,
        tabBarInactiveTintColor: colors.muted.foreground,
        tabBarStyle: {
          backgroundColor: colors.card.DEFAULT,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: text.tabs.startHere }} />
      <Tabs.Screen name="community" options={{ title: text.tabs.community }} />
      <Tabs.Screen name="courses" options={{ title: text.tabs.courses }} />
      <Tabs.Screen name="resources" options={{ title: text.tabs.resources }} />
    </Tabs>
  );
}
