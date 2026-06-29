import { fireEvent, render, screen } from "@testing-library/react-native";

import { Button } from "@/components/ui/Button";

// RNTL v14's render/fireEvent are async (they use the new async act + test-renderer root).
describe("Button", () => {
  it("renders its title", async () => {
    await render(<Button title="Sign in" />);
    expect(screen.getByText("Sign in")).toBeOnTheScreen();
  });

  it("calls onPress when tapped", async () => {
    const onPress = jest.fn();
    await render(<Button title="Tap" onPress={onPress} />);
    await fireEvent.press(screen.getByText("Tap"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("does not call onPress while loading", async () => {
    const onPress = jest.fn();
    await render(<Button title="Tap" onPress={onPress} loading />);
    await fireEvent.press(screen.getByRole("button"));
    expect(onPress).not.toHaveBeenCalled();
  });
});
