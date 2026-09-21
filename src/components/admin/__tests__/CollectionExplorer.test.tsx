import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import CollectionExplorer from "@/components/admin/CollectionExplorer";
import type { CollectionDef } from "@/lib/cms/collections";

const sponsorCollection: CollectionDef = {
  name: "sponsor",
  label: "Sponsoren",
  path: "content/sponsors",
  fields: [
    { name: "name", label: "Name", type: "string", isTitle: true, required: true },
    { name: "tier", label: "Sponsoring-Stufe", type: "select", options: ["Gold", "Silber"], required: true },
  ],
};

// Regression coverage: saving/deleting used to call closePanel() in the same
// tick as the success/warning message was set on ContentForm's own state, so
// the panel (and that message) unmounted before an editor could ever read
// it — most importantly a warning that a change was only saved locally and
// NOT committed to GitHub. CollectionExplorer must show that feedback itself
// so it survives the panel closing.
describe("CollectionExplorer save/delete feedback", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps the 'not committed to GitHub' warning visible after the panel closes on save", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            slug: "bosch",
            committedToGithub: false,
            commitUrl: null,
            warning: "GitHub-Anbindung ist nicht konfiguriert. Änderung wurde nur lokal gespeichert.",
          }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({ items: [] }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<CollectionExplorer collectionName="sponsor" collection={sponsorCollection} initialItems={[]} />);

    await user.click(screen.getByRole("button", { name: "+ Neuer Eintrag" }));
    await user.type(screen.getByLabelText(/^Name/), "Bosch");
    await user.selectOptions(screen.getByLabelText(/Sponsoring-Stufe/), "Gold");
    await user.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("status")).toHaveTextContent("nur lokal gespeichert");
  });

  it("shows the GitHub confirmation after the panel closes on delete", async () => {
    const user = userEvent.setup();
    const item = { slug: "bosch", data: { name: "Bosch", tier: "Gold" }, body: "" };
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ committedToGithub: true, commitUrl: "https://github.com/example/commit/1" }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({ items: [] }) });
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<CollectionExplorer collectionName="sponsor" collection={sponsorCollection} initialItems={[item]} />);

    await user.click(screen.getByRole("button", { name: /Bosch/ }));
    await user.click(screen.getByRole("button", { name: /Löschen/ }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("status")).toHaveTextContent("als Commit auf GitHub gesichert");
  });
});
