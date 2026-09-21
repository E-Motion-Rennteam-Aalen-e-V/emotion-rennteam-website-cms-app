import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ContentForm from "@/components/admin/ContentForm";
import type { CollectionDef } from "@/lib/cms/collections";

const sponsorCollection: CollectionDef = {
  name: "sponsor",
  label: "Sponsoren",
  path: "content/sponsors",
  fields: [
    { name: "name", label: "Name", type: "string", isTitle: true, required: true },
    { name: "tier", label: "Sponsoring-Stufe", type: "select", options: ["Gold", "Silber"], required: true },
    { name: "body", label: "Beschreibung", type: "richText" },
  ],
};

// Regression coverage for the "close the panel and silently lose your
// edits" bug: EditorPanel closes on backdrop click / Escape / the × button
// without any confirmation, so CollectionExplorer needs to know whether the
// form has unsaved changes before it allows that close to go through.
describe("ContentForm dirty tracking", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports not dirty right after mount with no edits", () => {
    const onDirtyChange = vi.fn();
    render(
      <ContentForm
        collectionName="sponsor"
        collection={sponsorCollection}
        mode="edit"
        initialSlug="bosch"
        initialData={{ name: "Bosch", tier: "Gold" }}
        initialBody=""
        onSaved={() => {}}
        onDirtyChange={onDirtyChange}
      />
    );
    expect(onDirtyChange).toHaveBeenCalledWith(false);
    expect(onDirtyChange).not.toHaveBeenCalledWith(true);
  });

  it("reports dirty once a field is edited, and clean again once reverted", async () => {
    const onDirtyChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ContentForm
        collectionName="sponsor"
        collection={sponsorCollection}
        mode="edit"
        initialSlug="bosch"
        initialData={{ name: "Bosch", tier: "Gold" }}
        initialBody=""
        onSaved={() => {}}
        onDirtyChange={onDirtyChange}
      />
    );

    const nameInput = screen.getByLabelText(/^Name/);
    await user.type(nameInput, " GmbH");
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);

    await user.clear(nameInput);
    await user.type(nameInput, "Bosch");
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
  });

  it("does not report dirty for a brand-new create form", () => {
    const onDirtyChange = vi.fn();
    render(
      <ContentForm
        collectionName="sponsor"
        collection={sponsorCollection}
        mode="create"
        onSaved={() => {}}
        onDirtyChange={onDirtyChange}
      />
    );
    expect(onDirtyChange).toHaveBeenCalledWith(false);
    expect(onDirtyChange).not.toHaveBeenCalledWith(true);
  });
});

// Regression coverage for a double-submit bug found in hands-on testing:
// the submit button's `disabled` attribute only takes effect on React's
// next render, so two click events dispatched in the same tick (a fast
// real double-click included) both ran handleSubmit and fired two POST
// requests, creating duplicate content.
describe("ContentForm submit guard", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("only sends one request when the submit button is clicked twice synchronously", async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    const fetchMock = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ContentForm
        collectionName="sponsor"
        collection={sponsorCollection}
        mode="create"
        onSaved={() => {}}
      />
    );

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/^Name/), "Bosch");
    await user.selectOptions(screen.getByLabelText(/Sponsoring-Stufe/), "Gold");

    const submitButton = screen.getByRole("button", { name: /Speichern/ });
    // Two click events in the same tick, bypassing React's re-render (and
    // therefore the `disabled` attribute) between them — this is what a
    // genuine fast double-click does, and what caused the duplicate POST.
    submitButton.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    submitButton.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFetch({ ok: true, json: async () => ({ slug: "bosch", committedToGithub: false }) });
  });
});
