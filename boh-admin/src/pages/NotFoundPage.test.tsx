import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { text } from "@/constants/text";

import { NotFoundPage } from "./NotFoundPage";

test("shows the not-found copy and a link back to the inbox", () => {
  render(
    <MemoryRouter>
      <NotFoundPage />
    </MemoryRouter>,
  );

  expect(screen.getByText(text.notFound.code)).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: text.notFound.title })).toBeInTheDocument();
  expect(screen.getByText(text.notFound.body)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: text.notFound.backToInbox })).toHaveAttribute(
    "href",
    "/inbox",
  );
});
