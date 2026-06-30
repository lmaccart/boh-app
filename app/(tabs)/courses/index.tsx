import { useRouter } from "expo-router";
import { FlatList, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useCourses } from "@/api";
import { EmptyState, Header, ListItem, Spinner } from "@/components/ui";
import { text } from "@/constants/text";
import { formatDate } from "@/lib/date";

export default function CoursesScreen() {
  const router = useRouter();
  const { data, isLoading } = useCourses();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <Header title={text.courses.title} />
      {isLoading ? (
        <Spinner fill />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-6 py-6"
          ListEmptyComponent={<EmptyState icon="school-outline" title={text.courses.empty} />}
          ItemSeparatorComponent={() => <View className="h-3" />}
          renderItem={({ item }) => (
            <ListItem
              title={item.title}
              subtitle={item.start_date ? formatDate(item.start_date) : undefined}
              chevron
              onPress={() => router.push(`/courses/${item.id}`)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}
