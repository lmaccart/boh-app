import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WhitelistPage } from "./WhitelistPage";

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

const mocks = vi.hoisted(() => {
  const coursesOrder = vi.fn();
  const whitelistOrder = vi.fn();
  const usersIn = vi.fn();
  const usersMaybeSingle = vi.fn();
  const usersEq = vi.fn(() => ({ maybeSingle: usersMaybeSingle }));
  const insert = vi.fn();
  const deleteEqUser = vi.fn();
  const deleteEqCourse = vi.fn(() => ({ eq: deleteEqUser }));
  const deleteWhitelist = vi.fn(() => ({ eq: deleteEqCourse }));
  const from = vi.fn((table: string) => {
    if (table === "courses") {
      return { select: vi.fn(() => ({ order: coursesOrder })) };
    }

    if (table === "course_whitelist") {
      return {
        select: vi.fn(() => ({ order: whitelistOrder })),
        insert,
        delete: deleteWhitelist,
      };
    }

    if (table === "users") {
      return {
        select: vi.fn(() => ({ in: usersIn, eq: usersEq })),
      };
    }

    throw new Error(`Unexpected table: ${table}`);
  });

  return {
    coursesOrder,
    deleteEqCourse,
    deleteEqUser,
    from,
    insert,
    usersEq,
    usersIn,
    usersMaybeSingle,
    whitelistOrder,
  };
});

vi.mock("@/lib/supabase", () => ({ supabase: { from: mocks.from } }));

const courses = [{ id: "course-1", title: "Course One", start_date: "2026-07-01" }];
const whitelistRows = [
  {
    course_id: "course-1",
    user_id: "user-1",
    created_at: "2026-07-02T12:00:00.000Z",
  },
];
const users = [{ id: "user-1", email: "student@example.com", name: "Student One" }];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.coursesOrder.mockResolvedValue({ data: courses, error: null });
  mocks.whitelistOrder.mockResolvedValue({ data: whitelistRows, error: null });
  mocks.usersIn.mockResolvedValue({ data: users, error: null });
  mocks.usersMaybeSingle.mockResolvedValue({
    data: { id: "user-2", email: "new@example.com", name: "New Student" },
    error: null,
  });
  mocks.insert.mockResolvedValue({ error: null });
  mocks.deleteEqUser.mockResolvedValue({ error: null });
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("lists whitelisted users for the selected course", async () => {
  renderWithClient(<WhitelistPage />);

  expect(await screen.findByText("Student One")).toBeInTheDocument();
  expect(screen.getByText("student@example.com")).toBeInTheDocument();
  expect(screen.getByText(/1 user whitelisted/)).toBeInTheDocument();
});

test("adds an existing user by email", async () => {
  mocks.whitelistOrder
    .mockResolvedValueOnce({ data: [], error: null })
    .mockResolvedValueOnce({ data: whitelistRows, error: null });

  renderWithClient(<WhitelistPage />);

  await screen.findByText("No users have access to this course yet.");
  await userEvent.type(screen.getByLabelText("User email"), "new@example.com");
  await userEvent.click(screen.getByRole("button", { name: "Add to whitelist" }));

  await waitFor(() => {
    expect(mocks.usersEq).toHaveBeenCalledWith("email", "new@example.com");
    expect(mocks.insert).toHaveBeenCalledWith({ course_id: "course-1", user_id: "user-2" });
  });
});

test("shows a clear error for an unmatched email", async () => {
  mocks.usersMaybeSingle.mockResolvedValue({ data: null, error: null });

  renderWithClient(<WhitelistPage />);

  await screen.findByText("Student One");
  await userEvent.type(screen.getByLabelText("User email"), "missing@example.com");
  await userEvent.click(screen.getByRole("button", { name: "Add to whitelist" }));

  expect(
    await screen.findByText("Supabase error: No user account matches that email. The account must exist first."),
  ).toBeInTheDocument();
});

test("removes a whitelisted user after confirmation", async () => {
  mocks.whitelistOrder
    .mockResolvedValueOnce({ data: whitelistRows, error: null })
    .mockResolvedValueOnce({ data: [], error: null });

  renderWithClient(<WhitelistPage />);

  await screen.findByText("Student One");
  await userEvent.click(screen.getByRole("button", { name: "Remove" }));

  expect(window.confirm).toHaveBeenCalledWith("Remove this user from the course whitelist?");
  await waitFor(() => {
    expect(mocks.deleteEqCourse).toHaveBeenCalledWith("course_id", "course-1");
    expect(mocks.deleteEqUser).toHaveBeenCalledWith("user_id", "user-1");
  });
  expect(screen.queryByText("Student One")).not.toBeInTheDocument();
});
