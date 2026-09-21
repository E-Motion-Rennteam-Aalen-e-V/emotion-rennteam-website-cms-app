import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import UserManager from "@/components/admin/UserManager";

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body } as Response;
}

describe("UserManager", () => {
  beforeEach(() => {
    vi.stubGlobal("confirm", vi.fn(() => true));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the 8-char hint and no role picker in legacy (non-remote) mode", () => {
    render(<UserManager adminUsername="admin" initialUsers={[]} remote={false} canAssignPrivilegedRoles={true} />);
    expect(screen.getByPlaceholderText("mind. 8 Zeichen")).toBeInTheDocument();
    expect(screen.queryByText("Rollen")).not.toBeInTheDocument();
  });

  it("shows the strict 11-char/3-class hint and the role picker in remote mode", () => {
    render(<UserManager adminUsername="admin" initialUsers={[]} remote={true} canAssignPrivilegedRoles={true} />);
    expect(screen.getByPlaceholderText(/mind\. 11 Zeichen/)).toBeInTheDocument();
    expect(screen.getByText("Rollen")).toBeInTheDocument();
    expect(screen.getByLabelText("Sponsoring-Management")).toBeInTheDocument();
  });

  it("rejects a temporary password shorter than the mode's real minimum before ever calling the API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<UserManager adminUsername="admin" initialUsers={[]} remote={true} canAssignPrivilegedRoles={true} />);
    await user.type(screen.getByLabelText("Benutzername"), "bob");
    await user.type(screen.getByLabelText("Temporäres Passwort"), "short1!A");
    await user.click(screen.getByRole("button", { name: "Benutzer anlegen" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/mind\. 11 Zeichen/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("submits the selected roles when creating a remote user", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true, users: [] }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<UserManager adminUsername="admin" initialUsers={[]} remote={true} canAssignPrivilegedRoles={true} />);
    await user.type(screen.getByLabelText("Benutzername"), "bob");
    await user.type(screen.getByLabelText("Temporäres Passwort"), "Correct-Horse-9!");
    // "Admin" is pre-selected by default; also select Sponsoring-Management.
    await user.click(screen.getByLabelText("Sponsoring-Management"));
    await user.click(screen.getByRole("button", { name: "Benutzer anlegen" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [, createCall] = fetchMock.mock.calls[0];
    const sentBody = JSON.parse(createCall.body as string);
    expect(sentBody).toEqual({
      username: "bob",
      temporaryPassword: "Correct-Horse-9!",
      roles: ["Admin", "Sponsoring-Management"],
    });
  });

  it("surfaces the server's self-lockout error when 'Sperren' is clicked on your own row", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: "Der eigene Zugang kann nicht gesperrt werden." }, false));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(
      <UserManager
        adminUsername="admin"
        initialUsers={[{ username: "alice", mustChangePassword: false, roles: ["Admin"], disabled: false }]}
        remote={true}
        canAssignPrivilegedRoles={true}
      />
    );

    await user.click(screen.getByRole("button", { name: "Sperren" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Der eigene Zugang kann nicht gesperrt werden.")
    );
  });
});
