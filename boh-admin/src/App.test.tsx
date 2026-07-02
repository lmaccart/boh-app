import { render, screen } from "@testing-library/react";

import { text } from "@/constants/text";

import App from "./App";

test("renders the app name", () => {
  render(<App />);
  expect(screen.getByText(text.appName)).toBeInTheDocument();
});
