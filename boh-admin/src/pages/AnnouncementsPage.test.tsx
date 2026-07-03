import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AnnouncementsPage } from "./AnnouncementsPage";

const mocks = vi.hoisted(() => {
  const coursesOrder = vi.fn();
  const announcementsOrder = vi.fn();
  const insert = vi.fn();
  const deleteEq = vi.fn();
  const deleteFromAnnouncements = vi.fn(() => ({ eq: deleteEq }));
  const from = vi.fn((table: string) => {
    if (table === "courses") {
      return { select: vi.fn(() => ({ order: coursesOrder })) };
    }

    if (table === "announcements") {
      return {
        select: vi.fn(() => ({ order: announcementsOrder })),
        insert,
        delete: deleteFromAnnouncements,
      };
    }

    throw new Error(`Unexpected table: ${table}`);
  });

  return {
    announcementsOrder,
    coursesOrder,
    deleteEq,
    from,
    insert,
    useAuth: vi.fn(),
  };
});

vi.mock("@/lib/supabase", () => ({ supabase: { from: mocks.from } }));
vi.mock("@/providers/AuthProvider", () => ({ useAuth: mocks.useAuth }));

const courses = [{ id: "course-1", title: "Course One" }];
const existingAnnouncements = [
  {
    id: "announcement-1",
    body: "Existing update",
    course_id: null,
    posted_by: "admin-1",
    created_at: "2026-07-01T12:00:00.000Z",
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useAuth.mockReturnValue({ session: { user: { id: "admin-1" } } });
  mocks.coursesOrder.mockResolvedValue({ data: courses, error: null });
  mocks.announcementsOrder.mockResolvedValue({ data: existingAnnouncements, error: null });
  mocks.insert.mockResolvedValue({ error: null });
  mocks.deleteEq.mockResolvedValue({ error: null });
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("creates a course-scoped announcement", async () => {
  mocks.announcementsOrder
    .mockResolvedValueOnce({ data: [], error: null })
    .mockResolvedValueOnce({ data: existingAnnouncements, error: null });

  render(<AnnouncementsPage />);

  await screen.findByText("No announcements have been published yet.");
  await userEvent.selectOptions(screen.getByLabelText("Audience"), "course-1");
  await userEvent.type(screen.getByLabelText("Message"), "Course update");
  await userEvent.click(screen.getByRole("button", { name: "Publish announcement" }));

  await waitFor(() => {
    expect(mocks.insert).toHaveBeenCalledWith({
      body: "Course update",
      course_id: "course-1",
      posted_by: "admin-1",
    });
  });
});

test("shows Supabase insert errors", async () => {
  mocks.insert.mockResolvedValue({ error: { message: "permission denied" } });

  render(<AnnouncementsPage />);

  await screen.findByText("Existing update");
  await userEvent.type(screen.getByLabelText("Message"), "New update");
  await userEvent.click(screen.getByRole("button", { name: "Publish announcement" }));

  expect(await screen.findByText("Supabase error: permission denied")).toBeInTheDocument();
});

test("deletes an announcement after confirmation", async () => {
  render(<AnnouncementsPage />);

  await screen.findByText("Existing update");
  await userEvent.click(screen.getByRole("button", { name: "Delete" }));

  expect(window.confirm).toHaveBeenCalledWith("Delete this announcement? This cannot be undone.");
  await waitFor(() => expect(mocks.deleteEq).toHaveBeenCalledWith("id", "announcement-1"));
  expect(screen.queryByText("Existing update")).not.toBeInTheDocument();
});
