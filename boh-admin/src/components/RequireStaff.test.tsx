import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { text } from "@/constants/text";

import { RequireStaff } from "./RequireStaff";

const mocks = vi.hoisted(() => ({ useAuth: vi.fn() }));

vi.mock("@/providers/AuthProvider", () => ({ useAuth: mocks.useAuth }));

function renderGuard() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/sign-in" element={<div>sign-in page</div>} />
        <Route element={<RequireStaff />}>
          <Route path="/" element={<div>admin content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

test("staff sees protected content", () => {
  mocks.useAuth.mockReturnValue({ status: "staff" });
  renderGuard();
  expect(screen.getByText("admin content")).toBeInTheDocument();
});

test("signed-out redirects to sign-in", () => {
  mocks.useAuth.mockReturnValue({ status: "signed-out" });
  renderGuard();
  expect(screen.getByText("sign-in page")).toBeInTheDocument();
});

test("loading shows the loading state", () => {
  mocks.useAuth.mockReturnValue({ status: "loading" });
  renderGuard();
  expect(screen.getByText(text.common.loading)).toBeInTheDocument();
});
