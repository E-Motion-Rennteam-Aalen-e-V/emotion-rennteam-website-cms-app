"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="de">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0a0a",
          color: "#f5f5f5",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "2rem 1rem",
        }}
      >
        <p style={{ fontSize: "0.75rem", letterSpacing: "0.3em", textTransform: "uppercase", color: "#f87171" }}>
          Kritischer Fehler
        </p>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0.75rem 0 0.5rem" }}>
          Etwas ist schiefgelaufen
        </h1>
        <p style={{ fontSize: "0.875rem", color: "#9ca3af", maxWidth: "400px", margin: "0 0 2rem" }}>
          Es ist ein unerwarteter Fehler aufgetreten. Bitte versuche es erneut oder lade die Seite neu.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            padding: "0.625rem 1.25rem",
            borderRadius: "0.5rem",
            background: "linear-gradient(to right, #0071b5, #00a8e8)",
            color: "#fff",
            fontWeight: 600,
            fontSize: "0.875rem",
            border: "none",
            cursor: "pointer",
          }}
        >
          Erneut versuchen
        </button>
      </body>
    </html>
  );
}
