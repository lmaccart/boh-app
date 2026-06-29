import { PlaceholderScreen } from "@/components/PlaceholderScreen";
import { text } from "@/constants/text";

export default function CoursesScreen() {
  return (
    <PlaceholderScreen
      title={text.placeholders.courses.title}
      body={text.placeholders.courses.body}
    />
  );
}
