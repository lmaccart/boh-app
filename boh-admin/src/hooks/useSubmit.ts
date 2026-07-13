import { useState, type FormEvent } from "react";

export function useSubmit(work: () => Promise<boolean>, onDone?: () => void) {
  const [busy, setBusy] = useState(false);
  const handle = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    void work()
      .then((ok) => {
        if (ok) onDone?.();
      })
      .finally(() => setBusy(false));
  };
  return { busy, handle };
}
