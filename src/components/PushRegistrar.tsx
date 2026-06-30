import { useEffect } from "react";

import { useRegisterPushToken } from "@/api";
import { registerForPushNotifications } from "@/lib/push";

export function PushRegistrar() {
  const { mutate } = useRegisterPushToken();
  useEffect(() => {
    registerForPushNotifications().then((result) => {
      if (result) mutate(result);
    });
  }, []);
  return null;
}
