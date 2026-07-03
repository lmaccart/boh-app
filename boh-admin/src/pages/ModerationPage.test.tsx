import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ModerationPage } from "./ModerationPage";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  storageFrom: vi.fn(),
  remove: vi.fn(),
  courses: [{ id: "course-1", title: "Course One" }],
  profiles: [
    { id: "user-1", name: "Alex Admin", avatar_url: null, role: "admin" },
    { id: "user-2", name: "Casey Client", avatar_url: null, role: "user" },
  ],
  posts: [
    {
      id: "post-1",
      body: "Global post body",
      course_id: null,
      created_at: "2026-07-01T10:00:00.000Z",
      media_url:
        "https://project.supabase.co/storage/v1/object/public/community-media/user-1/post.jpg",
      user_id: "user-1",
    },
    {
      id: "post-2",
      body: "Course post body",
      course_id: "course-1",
      created_at: "2026-07-01T11:00:00.000Z",
      media_url: null,
      user_id: "user-2",
    },
  ],
  replies: [
    {
      id: "reply-1",
      body: "First reply body",
      created_at: "2026-07-01T10:05:00.000Z",
      media_url: "user-2/reply.jpg",
      post_id: "post-1",
      user_id: "user-2",
    },
  ],
}));

class QueryBuilder {
  private filters: Array<{ column: string; operator: "eq" | "is" | "in"; value: unknown }> = [];
  private isDelete = false;
  private table: string;

  constructor(table: string) {
    this.table = table;
  }

  select() {
    return this;
  }

  order() {
    return this;
  }

  delete() {
    this.isDelete = true;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, operator: "eq", value });
    return this;
  }

  is(column: string, value: unknown) {
    this.filters.push({ column, operator: "is", value });
    return this;
  }

  in(column: string, value: unknown) {
    this.filters.push({ column, operator: "in", value });
    return this;
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.result()).then(onfulfilled, onrejected);
  }

  private result(): QueryResult {
    if (this.isDelete) return this.deleteResult();

    if (this.table === "courses") return { data: mocks.courses, error: null };
    if (this.table === "profiles") return { data: mocks.profiles, error: null };
    if (this.table === "community_posts") {
      const courseFilter = this.filters.find((filter) => filter.column === "course_id");
      return {
        data: mocks.posts.filter((post) => post.course_id === courseFilter?.value),
        error: null,
      };
    }
    if (this.table === "post_replies") {
      const postIds = this.filters.find((filter) => filter.column === "post_id")?.value as string[];
      return {
        data: mocks.replies.filter((reply) => postIds.includes(reply.post_id)),
        error: null,
      };
    }

    return { data: [], error: null };
  }

  private deleteResult(): QueryResult {
    const id = this.filters.find((filter) => filter.column === "id")?.value;
    if (this.table === "community_posts") {
      mocks.posts = mocks.posts.filter((post) => post.id !== id);
      mocks.replies = mocks.replies.filter((reply) => reply.post_id !== id);
    }
    if (this.table === "post_replies") {
      mocks.replies = mocks.replies.filter((reply) => reply.id !== id);
    }
    return { data: null, error: null };
  }
}

type QueryResult = { data: unknown; error: Error | null };

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: mocks.from,
    storage: { from: mocks.storageFrom },
  },
}));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ModerationPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mocks.courses = [{ id: "course-1", title: "Course One" }];
  mocks.profiles = [
    { id: "user-1", name: "Alex Admin", avatar_url: null, role: "admin" },
    { id: "user-2", name: "Casey Client", avatar_url: null, role: "user" },
  ];
  mocks.posts = [
    {
      id: "post-1",
      body: "Global post body",
      course_id: null,
      created_at: "2026-07-01T10:00:00.000Z",
      media_url:
        "https://project.supabase.co/storage/v1/object/public/community-media/user-1/post.jpg",
      user_id: "user-1",
    },
    {
      id: "post-2",
      body: "Course post body",
      course_id: "course-1",
      created_at: "2026-07-01T11:00:00.000Z",
      media_url: null,
      user_id: "user-2",
    },
  ];
  mocks.replies = [
    {
      id: "reply-1",
      body: "First reply body",
      created_at: "2026-07-01T10:05:00.000Z",
      media_url: "user-2/reply.jpg",
      post_id: "post-1",
      user_id: "user-2",
    },
  ];
  mocks.from.mockImplementation((table: string) => new QueryBuilder(table));
  mocks.remove.mockResolvedValue({ data: null, error: null });
  mocks.storageFrom.mockReturnValue({ remove: mocks.remove });
});

test("shows posts and replies for the selected feed", async () => {
  renderPage();

  expect(await screen.findByText("Global post body")).toBeInTheDocument();
  expect(screen.getByText("First reply body")).toBeInTheDocument();
  expect(screen.getByText("Alex Admin")).toBeInTheDocument();
  expect(screen.getByText("Casey Client")).toBeInTheDocument();

  await userEvent.selectOptions(screen.getByLabelText("Feed"), "course-1");
  expect(await screen.findByText("Course post body")).toBeInTheDocument();
  expect(screen.queryByText("Global post body")).not.toBeInTheDocument();
});

test("deletes a post after confirmation and removes post and reply media", async () => {
  renderPage();

  expect(await screen.findByText("Global post body")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Delete post" }));
  expect(screen.getByRole("dialog", { name: "Confirm deletion" })).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Confirm delete" }));

  await waitFor(() => {
    expect(mocks.remove).toHaveBeenCalledWith(["user-1/post.jpg", "user-2/reply.jpg"]);
    expect(screen.queryByText("Global post body")).not.toBeInTheDocument();
  });
});

test("deletes a reply after confirmation and removes reply media", async () => {
  renderPage();

  expect(await screen.findByText("First reply body")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Delete reply" }));
  await userEvent.click(screen.getByRole("button", { name: "Confirm delete" }));

  await waitFor(() => {
    expect(mocks.remove).toHaveBeenCalledWith(["user-2/reply.jpg"]);
    expect(screen.queryByText("First reply body")).not.toBeInTheDocument();
  });
});
