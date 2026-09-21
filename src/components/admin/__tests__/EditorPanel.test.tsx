import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import EditorPanel from "@/components/admin/EditorPanel";

// Regression coverage for a keyboard-accessibility bug found in hands-on
// testing: the panel is a `role="dialog"` with `aria-modal="true"`, but
// nothing actually moved focus into it or trapped Tab inside it, so a
// keyboard user tabbing past the trigger button landed on the (visually
// hidden behind the backdrop) page content, and closing the panel dropped
// focus onto <body> instead of back on the element that opened it.
describe("EditorPanel focus management", () => {
  function Harness({ open }: { open: boolean }) {
    return (
      <div>
        <button type="button">Trigger</button>
        {open && (
          <EditorPanel title="Test-Panel" onClose={() => {}}>
            <button type="button">Erstes Feld</button>
            <button type="button">Letztes Feld</button>
          </EditorPanel>
        )}
      </div>
    );
  }

  it("moves focus into the panel (the close button) when it opens", () => {
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    trigger.focus();

    render(<EditorPanel title="Test-Panel" onClose={() => {}}>
      <button type="button">Feld</button>
    </EditorPanel>);

    expect(screen.getByRole("button", { name: "Schließen" })).toHaveFocus();
    document.body.removeChild(trigger);
  });

  it("traps Tab so focus cycles within the panel instead of escaping to the page", async () => {
    const user = userEvent.setup();
    render(<Harness open />);

    const closeButton = screen.getByRole("button", { name: "Schließen" });
    const first = screen.getByRole("button", { name: "Erstes Feld" });
    const last = screen.getByRole("button", { name: "Letztes Feld" });

    expect(closeButton).toHaveFocus();
    await user.tab();
    expect(first).toHaveFocus();
    await user.tab();
    expect(last).toHaveFocus();

    // Tabbing forward from the last focusable element wraps back to the
    // first instead of escaping to the "Trigger" button behind the panel.
    await user.tab();
    expect(closeButton).toHaveFocus();

    // Shift+Tab from the first element wraps backward to the last.
    await user.tab({ shift: true });
    expect(last).toHaveFocus();
  });

  it("restores focus to the trigger element once the panel unmounts", () => {
    const onClose = vi.fn();
    const trigger = document.createElement("button");
    trigger.textContent = "Trigger";
    document.body.appendChild(trigger);
    trigger.focus();
    expect(trigger).toHaveFocus();

    const { unmount } = render(
      <EditorPanel title="Test-Panel" onClose={onClose}>
        <button type="button">Feld</button>
      </EditorPanel>
    );
    expect(trigger).not.toHaveFocus();

    unmount();
    expect(trigger).toHaveFocus();
    document.body.removeChild(trigger);
  });
});
