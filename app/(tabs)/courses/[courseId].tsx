import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useCourses, useCourseSections, useSectionLessons } from "@/api";
import type { CourseSectionRow, SectionType } from "@/api";
import { EmptyState, IconButton, ListItem, Spinner } from "@/components/ui";
import { text } from "@/constants/text";

// Fixed on-screen ordering of section categories.
const SECTION_ORDER: SectionType[] = ["welcome", "nsr", "meditation", "module", "live"];

function SectionBlock({ section }: { section: CourseSectionRow }) {
  const router = useRouter();
  const { data, isLoading } = useSectionLessons(section.id);
  const isModule = section.type === "module";

  return (
    <View className="mb-6">
      <Text className="mb-2 text-base font-semibold text-foreground">{section.title}</Text>
      {isLoading ? (
        <Spinner />
      ) : data && data.length > 0 ? (
        data.map((lesson, index) => {
          // For modules, watching the next lesson >30s completes the previous one.
          const prev = isModule && index > 0 ? data[index - 1].id : "";
          return (
            <ListItem
              key={lesson.id}
              className="mb-2"
              title={lesson.title}
              chevron
              onPress={() =>
                router.push(`/lesson/${lesson.id}?type=${section.type}&prev=${prev}`)
              }
            />
          );
        })
      ) : (
        <Text className="text-sm text-muted-foreground">{text.courses.lessonsEmpty}</Text>
      )}
    </View>
  );
}

export default function CourseHomeScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const router = useRouter();
  const courses = useCourses();
  const { data: sections, isLoading } = useCourseSections(courseId);

  const course = courses.data?.find((c) => c.id === courseId);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-row items-center gap-2 border-b border-border bg-background px-4 py-3">
        <IconButton name="chevron-back" accessibilityLabel="Back" onPress={() => router.back()} />
        <Text className="flex-1 text-xl font-bold text-foreground" numberOfLines={1}>
          {course?.title ?? text.courses.title}
        </Text>
      </View>

      {isLoading ? (
        <Spinner fill />
      ) : (
        <ScrollView contentContainerClassName="px-6 py-6" showsVerticalScrollIndicator={false}>
          {SECTION_ORDER.map((type) => {
            const ofType = (sections ?? []).filter((s) => s.type === type);
            if (ofType.length === 0) return null;
            return (
              <View key={type} className="mb-4">
                <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {text.courses.sections[type]}
                </Text>
                {ofType.map((section) => (
                  <SectionBlock key={section.id} section={section} />
                ))}
              </View>
            );
          })}
          {(sections ?? []).length === 0 ? (
            <EmptyState icon="albums-outline" title={text.courses.lessonsEmpty} />
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
