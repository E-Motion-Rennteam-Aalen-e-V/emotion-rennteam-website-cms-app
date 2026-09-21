"use client";

import { useState } from "react";

/**
 * Invisible spam-trap field plus a timing trap. Real visitors never see or
 * fill the honeypot in; bots that blindly fill every input trip it. The
 * hidden "formRenderedAt" timestamp lets the server flag submissions
 * completed faster than any human could type (see MIN_HUMAN_SUBMIT_MS in
 * validation.ts). Either signal lets the API route silently discard the
 * submission without tipping the bot off (it still gets a success response).
 */
export default function HoneypotField() {
  const [renderedAt] = useState(() => Date.now());

  return (
    <div className="sr-only" aria-hidden="true">
      <label htmlFor="website">Firmenwebsite (bitte freilassen)</label>
      <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      <input type="hidden" name="formRenderedAt" defaultValue={String(renderedAt)} />
    </div>
  );
}
