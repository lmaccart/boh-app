import { render, waitFor } from "@testing-library/react-native";

import { registerForPushNotifications } from "@/lib/push";

import { PushRegistrar } from "./PushRegistrar";

const mockMutate = jest.fn();

jest.mock("@/api", () => ({
  useRegisterPushToken: () => ({ mutate: mockMutate }),
}));

jest.mock("@/lib/push", () => ({
  registerForPushNotifications: jest.fn(),
}));

const mockRegisterForPushNotifications = jest.mocked(registerForPushNotifications);

beforeEach(() => {
  jest.clearAllMocks();
});

describe("PushRegistrar", () => {
  it("renders null", async () => {
    mockRegisterForPushNotifications.mockResolvedValue(null);
    const { toJSON } = await render(<PushRegistrar />);
    expect(toJSON()).toBeNull();
  });

  it("mutates with token when permission granted", async () => {
    mockRegisterForPushNotifications.mockResolvedValue({
      token: "ExponentPushToken[abc123]",
      platform: "ios",
    });
    await render(<PushRegistrar />);
    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith({
        token: "ExponentPushToken[abc123]",
        platform: "ios",
      });
    });
  });

  it("does not call mutate when permission denied", async () => {
    mockRegisterForPushNotifications.mockResolvedValue(null);
    await render(<PushRegistrar />);
    await waitFor(() => {
      expect(mockMutate).not.toHaveBeenCalled();
    });
  });
});
