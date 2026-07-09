import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";

import { text } from "@/constants/text";

import App from "./App";

const mocks = vi.hoisted(() => ({ useAuth: vi.fn() }));

vi.mock("@/pages/AnnouncementsPage", () => ({
  AnnouncementsPage: () => <div>Announcements page</div>,
}));
vi.mock("@/pages/content/ContentPage", () => ({ ContentPage: () => <div>Content page</div> }));
vi.mock("@/pages/InboxPage", () => ({ InboxPage: () => <div>Inbox page</div> }));
vi.mock("@/pages/ModerationPage", () => ({ ModerationPage: () => <div>Moderation page</div> }));
vi.mock("@/pages/WhitelistPage", () => ({ WhitelistPage: () => <div>Whitelist page</div> }));

vi.mock("@/providers/AuthProvider", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: mocks.useAuth,
}));

test("staff lands on the inbox with full navigation", async () => {
  mocks.useAuth.mockReturnValue({ status: "staff", signOut: vi.fn() });
  window.history.pushState({}, "", "/");
  render(<App />);

  expect(await screen.findByText("Inbox page")).toBeInTheDocument();

  const labels = [
    text.nav.inbox,
    text.nav.content,
    text.nav.whitelist,
    text.nav.announcements,
    text.nav.moderation,
  ];
  for (const label of labels) {
    expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
  }
});

test("sign-out button calls signOut from the auth context", async () => {
  const signOut = vi.fn();
  mocks.useAuth.mockReturnValue({ status: "staff", signOut });
  window.history.pushState({}, "", "/");
  render(<App />);

  await screen.findByText("Inbox page");
  await userEvent.click(screen.getByRole("button", { name: text.nav.signOut }));
  expect(signOut).toHaveBeenCalled();
});

test("signed-out users land on the sign-in page", async () => {
  mocks.useAuth.mockReturnValue({ status: "signed-out", signOut: vi.fn() });
  window.history.pushState({}, "", "/");
  render(<App />);

  expect(
    await screen.findByRole("button", { name: text.signIn.googleButton }),
  ).toBeInTheDocument();
});
