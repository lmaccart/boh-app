import { useRouter } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAnnouncements, useInProgressLessons } from "@/api";
import type { AnnouncementWithCourse, InProgressLesson } from "@/api";
import { Badge, Card, ListItem, Spinner } from "@/components/ui";
import { format, text } from "@/constants/text";
import { formatDate } from "@/lib/date";
import { useAuth } from "@/providers/auth";

function SectionTitle({ title }: { title: string }) {
  return <Text className="mb-3 text-lg font-bold text-foreground">{title}</Text>;
}

function AnnouncementCard({ announcement }: { announcement: AnnouncementWithCourse }) {
  return (
    <Card className="mb-3">
      <View className="mb-2 flex-row items-center justify-between">
        <Badge
          label={announcement.course?.title ?? text.startHere.appWide}
          variant={announcement.course ? "secondary" : "accent"}
        />
        <Text className="text-xs text-muted-foreground">{formatDate(announcement.created_at)}</Text>
      </View>
      <Text className="text-base text-foreground">{announcement.body}</Text>
    </Card>
  );
}

export default function StartHereScreen() {
  const router = useRouter();
  const { profile, session } = useAuth();
  const announcements = useAnnouncements();
  const inProgress = useInProgressLessons();

  const name = profile?.name?.trim() || session?.user.email?.split("@")[0] || text.startHere.greetingFallbackName;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView contentContainerClassName="px-6 py-6" showsVerticalScrollIndicator={false}>
        <Text className="mb-6 text-2xl font-bold text-foreground">
          {format(text.startHere.greeting, { name })}
        </Text>

        <View className="mb-8">
          <SectionTitle title={text.startHere.announcementsTitle} />
          {announcements.isLoading ? (
            <Spinner />
          ) : announcements.data && announcements.data.length > 0 ? (
            announcements.data.map((a) => <AnnouncementCard key={a.id} announcement={a} />)
          ) : (
            <Text className="text-sm text-muted-foreground">{text.startHere.announcementsEmpty}</Text>
          )}
        </View>

        <View className="mb-8">
          <SectionTitle title={text.startHere.hopBackInTitle} />
          {inProgress.isLoading ? (
            <Spinner />
          ) : inProgress.data && inProgress.data.length > 0 ? (
            inProgress.data.map((item: InProgressLesson) =>
              item.lesson ? (
                <ListItem
                  key={item.id}
                  className="mb-3"
                  title={item.lesson.title}
                  subtitle={format(text.startHere.secondsWatched, {
                    seconds: String(Math.round(item.position_seconds)),
                  })}
                  chevron
                  onPress={() => router.push(`/lesson/${item.lesson!.id}`)}
                />
              ) : null,
            )
          ) : (
            <Text className="text-sm text-muted-foreground">{text.startHere.hopBackInEmpty}</Text>
          )}
        </View>

        <ListItem
          title={text.startHere.settingsCard}
          subtitle={text.startHere.settingsCardBody}
          chevron
          onPress={() => router.push("/settings")}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
