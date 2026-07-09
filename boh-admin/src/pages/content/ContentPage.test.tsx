import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { text } from "@/constants/text";

import { ContentPage } from "./ContentPage";
import type { Course, CourseSection } from "./contentData";

const mocks = vi.hoisted(() => ({
  fetchCourses: vi.fn(),
  fetchSections: vi.fn(),
  fetchLessons: vi.fn(),
  fetchLessonResources: vi.fn(),
}));

vi.mock("./contentData", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./contentData")>()),
  fetchCourses: mocks.fetchCourses,
  fetchSections: mocks.fetchSections,
  fetchLessons: mocks.fetchLessons,
  fetchLessonResources: mocks.fetchLessonResources,
}));

const course = { id: "course-1", title: "Course One", start_date: null } as Course;
const section = {
  id: "section-1",
  course_id: "course-1",
  title: "Welcome week",
  type: "welcome",
  order: 0,
  go_live_date: null,
} as CourseSection;

function renderContentPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ContentPage />
    </QueryClientProvider>,
  );
}

test("does not show an error banner when courses load successfully", async () => {
  mocks.fetchCourses.mockResolvedValue([]);
  mocks.fetchSections.mockResolvedValue([]);
  mocks.fetchLessons.mockResolvedValue([]);
  mocks.fetchLessonResources.mockResolvedValue([]);

  renderContentPage();

  expect(await screen.findByText(text.content.emptyCourses)).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.queryByText(text.content.saveError)).not.toBeInTheDocument();
});

test("sections render collapsed and expand into their editor on click", async () => {
  mocks.fetchCourses.mockResolvedValue([course]);
  mocks.fetchSections.mockResolvedValue([section]);
  mocks.fetchLessons.mockResolvedValue([]);
  mocks.fetchLessonResources.mockResolvedValue([]);

  const user = userEvent.setup();
  renderContentPage();

  const row = await screen.findByRole("button", { name: /Welcome week/ });
  expect(row).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByRole("button", { name: text.content.saveSection })).not.toBeInTheDocument();

  await user.click(row);

  expect(row).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("button", { name: text.content.saveSection })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: text.common.delete })).toBeInTheDocument();
});

test("add section form reveals its submit button only after a title is entered", async () => {
  mocks.fetchCourses.mockResolvedValue([course]);
  mocks.fetchSections.mockResolvedValue([]);
  mocks.fetchLessons.mockResolvedValue([]);
  mocks.fetchLessonResources.mockResolvedValue([]);

  const user = userEvent.setup();
  renderContentPage();

  await user.click(await screen.findByRole("button", { name: text.content.addSection }));

  // The ghost row is replaced by the staged form: only the title field and
  // cancel are visible until a title is typed.
  expect(screen.queryByRole("button", { name: text.content.addSection })).not.toBeInTheDocument();
  expect(screen.queryByLabelText(text.content.fieldType)).not.toBeInTheDocument();

  await user.type(screen.getByLabelText(text.content.fieldTitle), "Week 1");

  expect(screen.getByLabelText(text.content.fieldType)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: text.content.addSection })).toBeInTheDocument();
});
