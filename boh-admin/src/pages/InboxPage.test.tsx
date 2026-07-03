import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { InboxPage } from "./InboxPage";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  from: vi.fn(),
  staffUsers: [
    { id: "admin-1", name: "Tarryn", email: "tarryn@example.com", role: "tarryn" },
  ],
  participantUsers: [
    { id: "user-a", name: "Alice Client", email: "alice@example.com", role: "user" },
    { id: "user-b", name: "Bob Client", email: "bob@example.com", role: "user" },
  ],
  messages: [
    {
      id: "m3",
      sender_id: "user-b",
      recipient_id: "admin-1",
      body: "Can I ask about the course?",
      created_at: "2026-07-02T11:00:00.000Z",
    },
    {
      id: "m2",
      sender_id: "admin-1",
      recipient_id: "user-a",
      body: "Thank you for reaching out.",
      created_at: "2026-07-02T10:05:00.000Z",
    },
    {
      id: "m1",
      sender_id: "user-a",
      recipient_id: "admin-1",
      body: "I need help with today.",
      created_at: "2026-07-02T10:00:00.000Z",
    },
  ],
  insertedRows: [] as Array<{ sender_id: string; recipient_id: string; body: string }>,
  insertError: null as Error | null,
}));

vi.mock("@/providers/AuthProvider", () => ({ useAuth: mocks.useAuth }));
vi.mock("@/lib/supabase", () => ({ supabase: { from: mocks.from } }));

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function renderPage() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <InboxPage />
    </QueryClientProvider>,
  );
}

function mockSupabase() {
  mocks.from.mockImplementation((table: string) => {
    if (table === "users") {
      return {
        select: () => ({
          in: (column: string) =>
            Promise.resolve({
              data: column === "role" ? mocks.staffUsers : mocks.participantUsers,
              error: null,
            }),
        }),
      };
    }

    if (table === "direct_messages") {
      return {
        select: () => ({
          or: () => ({
            order: () => Promise.resolve({ data: mocks.messages, error: null }),
          }),
        }),
        insert: (row: { sender_id: string; recipient_id: string; body: string }) => {
          mocks.insertedRows.push(row);
          return {
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: mocks.insertError
                    ? null
                    : {
                        id: "m4",
                        created_at: "2026-07-02T12:00:00.000Z",
                        ...row,
                      },
                  error: mocks.insertError,
                }),
            }),
          };
        },
      };
    }

    throw new Error(`Unexpected table ${table}`);
  });
}

beforeEach(() => {
  mocks.useAuth.mockReturnValue({ session: { user: { id: "admin-1" } } });
  mocks.from.mockReset();
  mocks.insertedRows.length = 0;
  mocks.insertError = null;
  mockSupabase();
});

test("groups messages into conversations and shows the selected user's history", async () => {
  const user = userEvent.setup();
  renderPage();

  expect(await screen.findByRole("button", { name: /Bob Client/ })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Alice Client/ })).toBeInTheDocument();
  expect(screen.getByText("Unread")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: /Alice Client/ }));

  expect(screen.getByRole("heading", { name: "Alice Client" })).toBeInTheDocument();
  expect(screen.getByText("I need help with today.")).toBeInTheDocument();
  expect(screen.getAllByText("Thank you for reaching out.").length).toBeGreaterThan(0);
});

test("sending a reply inserts a direct message from the current admin to the selected user", async () => {
  const user = userEvent.setup();
  renderPage();

  await user.click(await screen.findByRole("button", { name: /Alice Client/ }));
  await user.type(screen.getByLabelText("Reply message"), "We are here for you.");
  await user.click(screen.getByRole("button", { name: "Send reply" }));

  await waitFor(() => {
    expect(mocks.insertedRows).toEqual([
      {
        sender_id: "admin-1",
        recipient_id: "user-a",
        body: "We are here for you.",
      },
    ]);
  });
});
