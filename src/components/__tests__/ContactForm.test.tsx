import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ContactForm from "@/components/ContactForm";

describe("ContactForm", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders a honeypot field that is hidden from view", () => {
    render(<ContactForm />);
    const honeypot = document.getElementById("website");
    expect(honeypot).not.toBeNull();
    expect(honeypot).toHaveAttribute("tabindex", "-1");
  });

  it("submits the form data as JSON and shows the success state", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<ContactForm />);

    await user.type(screen.getByLabelText(/^Name/), "Ada Lovelace");
    await user.type(screen.getByLabelText(/^E-Mail/), "ada@example.com");
    await user.type(screen.getByLabelText(/^Nachricht/), "Testnachricht");
    await user.click(screen.getByLabelText(/stimme zu/));
    await user.click(screen.getByRole("button", { name: /nachricht senden/i }));

    await waitFor(() => {
      expect(screen.getByText(/danke für deine nachricht/i)).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/contact",
      expect.objectContaining({ method: "POST" })
    );
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body.name).toBe("Ada Lovelace");
    expect(body.email).toBe("ada@example.com");
    expect(body.consent).toBe("true");
  });

  it("shows a server-side field error without clearing the form", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ ok: false, errors: { email: "Bitte gib eine gültige E-Mail-Adresse an." } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<ContactForm />);

    await user.type(screen.getByLabelText(/^Name/), "Ada Lovelace");
    await user.type(screen.getByLabelText(/^E-Mail/), "ada@example.com");
    await user.type(screen.getByLabelText(/^Nachricht/), "Testnachricht");
    await user.click(screen.getByLabelText(/stimme zu/));
    await user.click(screen.getByRole("button", { name: /nachricht senden/i }));

    await waitFor(() => {
      expect(screen.getByText("Bitte gib eine gültige E-Mail-Adresse an.")).toBeInTheDocument();
    });
  });
});
