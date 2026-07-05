import { arrayMove } from "@dnd-kit/sortable";
import { createCourse, deleteLesson, uploadCourseContent } from "./contentData";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  storageFrom: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: mocks.from,
    storage: { from: mocks.storageFrom },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

test("createCourse inserts a course and returns the created row", async () => {
  const createdCourse = {
    id: "course-1",
    title: "Business of Happiness",
    start_date: "2026-07-01",
    created_at: "2026-07-01T00:00:00Z",
  };
  const single = vi.fn().mockResolvedValue({ data: createdCourse, error: null });
  const select = vi.fn(() => ({ single }));
  const insert = vi.fn(() => ({ select }));
  mocks.from.mockReturnValue({ insert });

  await expect(
    createCourse({ title: "Business of Happiness", start_date: "2026-07-01" }),
  ).resolves.toEqual(createdCourse);

  expect(mocks.from).toHaveBeenCalledWith("courses");
  expect(insert).toHaveBeenCalledWith({ title: "Business of Happiness", start_date: "2026-07-01" });
});

test("deleteLesson surfaces Supabase mutation errors", async () => {
  const eq = vi.fn().mockResolvedValue({ data: null, error: { message: "RLS denied delete" } });
  const deleteMock = vi.fn(() => ({ eq }));
  mocks.from.mockReturnValue({ delete: deleteMock });

  await expect(deleteLesson("lesson-1")).rejects.toThrow("RLS denied delete");
  expect(mocks.from).toHaveBeenCalledWith("lessons");
  expect(eq).toHaveBeenCalledWith("id", "lesson-1");
});

test("drag-to-reorder: arrayMove reindexes order correctly", () => {
  const items = [
    { id: "a", order: 0 },
    { id: "b", order: 1 },
    { id: "c", order: 2 },
  ];
  const moved = arrayMove(items, 0, 2).map((item, i) => ({ ...item, order: i }));
  expect(moved).toEqual([
    { id: "b", order: 0 },
    { id: "c", order: 1 },
    { id: "a", order: 2 },
  ]);
});

test("uploadCourseContent uploads to course-content and returns the public URL", async () => {
  vi.spyOn(crypto, "randomUUID").mockReturnValue("00000000-0000-4000-8000-000000000001");
  const upload = vi.fn().mockResolvedValue({
    data: { path: "videos/00000000-0000-4000-8000-000000000001-intro.mp4" },
    error: null,
  });
  const getPublicUrl = vi.fn().mockReturnValue({
    data: { publicUrl: "https://example.supabase.co/storage/v1/object/public/course-content/intro.mp4" },
  });
  mocks.storageFrom.mockReturnValue({ upload, getPublicUrl });

  const file = new File(["video"], "Intro.mp4", { type: "video/mp4" });
  await expect(uploadCourseContent(file, "videos")).resolves.toBe(
    "https://example.supabase.co/storage/v1/object/public/course-content/intro.mp4",
  );

  expect(mocks.storageFrom).toHaveBeenCalledWith("course-content");
  expect(upload).toHaveBeenCalledWith(
    "videos/00000000-0000-4000-8000-000000000001-intro.mp4",
    file,
    { contentType: "video/mp4", upsert: false },
  );
});
