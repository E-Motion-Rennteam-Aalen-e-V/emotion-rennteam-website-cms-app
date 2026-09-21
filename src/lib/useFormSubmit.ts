"use client";

import { useCallback, useState } from "react";

export type SubmitStatus = "idle" | "sending" | "sent" | "error";

type ApiResponse = {
  ok: boolean;
  error?: string;
  errors?: Record<string, string>;
};

/**
 * Shared client-side submit logic for the site's forms: posts JSON to the
 * given API route, surfaces field-level errors returned by the server, and
 * tracks a small status machine the form UI can render against.
 */
export function useFormSubmit(endpoint: string) {
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const submit = useCallback(
    async (data: Record<string, unknown>) => {
      setStatus("sending");
      setErrors({});
      setErrorMessage(null);

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        let result: ApiResponse | null = null;
        try {
          result = (await response.json()) as ApiResponse;
        } catch {
          result = null;
        }

        if (response.ok && result?.ok) {
          setStatus("sent");
          return true;
        }

        setErrors(result?.errors ?? {});
        setErrorMessage(
          result?.error ?? "Etwas ist schiefgelaufen. Bitte versuche es erneut."
        );
        setStatus("error");
        return false;
      } catch {
        setErrorMessage("Verbindung fehlgeschlagen. Bitte überprüfe deine Internetverbindung.");
        setStatus("error");
        return false;
      }
    },
    [endpoint]
  );

  return { status, errors, errorMessage, submit };
}
