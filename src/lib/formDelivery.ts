/**
 * Delivers a validated form submission somewhere useful. If
 * FORM_WEBHOOK_URL is configured (e.g. a Slack/Teams incoming webhook, or a
 * small internal relay that sends email), the submission is POSTed there as
 * JSON. If that's not configured, or the webhook call fails, the submission
 * is appended to a local fallback file instead of only being logged -
 * console output is easy to lose (log rotation, container restarts,
 * ephemeral hosting), so this keeps a durable, operator-recoverable copy of
 * every submission that couldn't be delivered live.
 */
import { appendFileSync } from "node:fs";
import path from "node:path";

/** Max time to wait for the webhook before giving up and logging a failure. */
const WEBHOOK_TIMEOUT_MS = 8000;

// Same directory convention as .cms-users.json: a local, gitignored file
// that survives log rotation and process restarts on a persistent server.
const FALLBACK_FILE = path.join(process.cwd(), ".pending-form-submissions.jsonl");

export type FormSubmission = {
  form: "contact" | "newsletter" | "mitmachen" | "sponsoring" | "mediakit";
  submittedAt: string;
  data: Record<string, string>;
};

function persistToFallbackFile(submission: FormSubmission, reason: string): void {
  try {
    appendFileSync(FALLBACK_FILE, JSON.stringify({ ...submission, reason }) + "\n", "utf-8");
  } catch (error) {
    // Filesystem may be read-only (some serverless hosts) - the console log
    // below is the last resort in that case.
    console.error(`[form:${submission.form}] failed to write fallback file`, error);
  }
}

export async function deliverFormSubmission(
  form: FormSubmission["form"],
  data: Record<string, string>
): Promise<void> {
  const submission: FormSubmission = {
    form,
    submittedAt: new Date().toISOString(),
    data,
  };

  const webhookUrl = process.env.FORM_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error(
      `[form:${form}] ACTION REQUIRED: FORM_WEBHOOK_URL is not configured - submission written to ${FALLBACK_FILE} instead of being delivered live.`
    );
    persistToFallbackFile(submission, "no_webhook_configured");
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submission),
      // Every route handler `await`s this call before responding, so a
      // slow or unresponsive webhook endpoint would otherwise hold the
      // visitor's form submission open indefinitely (fetch has no default
      // timeout). Bound it so a misbehaving webhook degrades to a logged
      // failure instead of hanging the request.
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });
    if (!response.ok) {
      console.error(`[form:${form}] webhook delivery failed with status ${response.status}`);
      persistToFallbackFile(submission, `webhook_status_${response.status}`);
    }
  } catch (error) {
    console.error(`[form:${form}] webhook delivery threw`, error);
    persistToFallbackFile(submission, "webhook_threw");
  }
}
