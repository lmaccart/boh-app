import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ColorValue } from "react-native";

import { text } from "@/constants/text";
import { colors } from "@/theme/colors";

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(focusedName: IconName, unfocusedName: IconName) {
  return ({ focused, color, size }: { focused: boolean; color: ColorValue; size: number }) => (
    <Ionicons name={focused ? focusedName : unfocusedName} size={size} color={color as string} />
  );
}

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
      <Tabs.Screen
        name="index"
        options={{
          title: text.tabs.startHere,
          tabBarIcon: tabIcon("home", "home-outline"),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: text.tabs.community,
          tabBarIcon: tabIcon("people", "people-outline"),
        }}
      />
      <Tabs.Screen
        name="courses"
        options={{
          title: text.tabs.courses,
          tabBarIcon: tabIcon("book", "book-outline"),
        }}
      />
      <Tabs.Screen
        name="resources"
        options={{
          title: text.tabs.resources,
          tabBarIcon: tabIcon("bookmark", "bookmark-outline"),
        }}
      />
    </Tabs>
  );
}
