import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";

import { useUnsavedChanges } from "~/admin/hooks/useUnsavedChanges";
import { signOut, subscribeToSignOut } from "~/services/auth";

import { Toast, dismissAllToasts, useToast } from "../components/Toast";
import { AdminLayout } from "./AdminLayout";

vi.mock("~/services/auth", () => ({
  signOut: vi.fn(),
  subscribeToSignOut: vi.fn(),
}));

function DirtyPage() {
  const { leaveDialog } = useUnsavedChanges(true);
  const toast = useToast();
  return (
    <div>
      <h1>Dirty form</h1>
      <button type="button" onClick={() => toast.success("Saved earlier.")}>
        Raise toast
      </button>
      {leaveDialog}
    </div>
  );
}

function renderLayout() {
  const Stub = createRoutesStub([
    {
      path: "/admin",
      Component: () => <AdminLayout email="owner@mondelos.test" />,
      children: [{ index: true, Component: DirtyPage }],
    },
    { path: "/admin/login", Component: () => <h1>Login page</h1> },
  ]);
  return render(<Stub initialEntries={["/admin"]} />);
}

beforeEach(() => {
  vi.mocked(signOut).mockResolvedValue(undefined);
  vi.mocked(subscribeToSignOut).mockReturnValue(() => {});
});

afterEach(() => {
  vi.mocked(signOut).mockReset();
  dismissAllToasts();
});

describe("AdminLayout sign-out with unsaved changes", () => {
  it("asks first and does not sign out until confirmed", async () => {
    renderLayout();
    const aside = screen.getAllByRole("button", { name: "Sign out" })[0];
    await userEvent.click(aside);
    const dialog = await screen.findByRole("dialog", {
      name: "Sign out without saving?",
    });
    expect(signOut).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole("button", { name: "Stay" }));
    expect(signOut).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { name: "Dirty form" }),
    ).toBeInTheDocument();
  });

  it("signs out and goes to login once confirmed, without a second prompt", async () => {
    renderLayout();
    await userEvent.click(
      screen.getAllByRole("button", { name: "Sign out" })[0],
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Sign out without saving?",
    });
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Sign out" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Login page" }),
    ).toBeInTheDocument();
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("dismisses any toasts when signing out", async () => {
    renderLayout();
    await userEvent.click(screen.getByRole("button", { name: "Raise toast" }));
    expect(screen.getByText("Saved earlier.")).toBeInTheDocument();
    await userEvent.click(
      screen.getAllByRole("button", { name: "Sign out" })[0],
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Sign out without saving?",
    });
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Sign out" }),
    );
    await screen.findByRole("heading", { name: "Login page" });
    // The layout is gone; a fresh Toast must not show the old message.
    render(<Toast />);
    expect(screen.queryByText("Saved earlier.")).not.toBeInTheDocument();
  });

  it("closes the phone menu before signing out", async () => {
    renderLayout();
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const menu = screen.getByRole("dialog", { name: "Admin menu" });
    await userEvent.click(
      within(menu).getByRole("button", { name: "Sign out" }),
    );
    expect(
      screen.queryByRole("dialog", { name: "Admin menu" }),
    ).not.toBeInTheDocument();
    expect(
      await screen.findByRole("dialog", { name: "Sign out without saving?" }),
    ).toBeInTheDocument();
  });
});

describe("AdminLayout sign-out dialog wording and failure", () => {
  it("says the unsaved changes will be discarded, not kept", async () => {
    renderLayout();
    await userEvent.click(
      screen.getAllByRole("button", { name: "Sign out" })[0],
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Sign out without saving?",
    });
    expect(
      within(dialog).getByText("Your unsaved changes will be discarded."),
    ).toBeInTheDocument();
    expect(within(dialog).queryByText(/draft/i)).not.toBeInTheDocument();
  });

  it("logs and shows a friendly toast when signing out fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(signOut).mockRejectedValue(new Error("boom"));
    renderLayout();
    await userEvent.click(
      screen.getAllByRole("button", { name: "Sign out" })[0],
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Sign out without saving?",
    });
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Sign out" }),
    );
    expect(
      await screen.findByText(/couldn.t sign you out/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("boom")).not.toBeInTheDocument();
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});

describe("AdminLayout sign-out and saved drafts", () => {
  const DRAFT = "mondelos-admin-draft:attraction:1";
  const OTHER = "unrelated-key";

  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem(DRAFT, '{"name":"x"}');
    sessionStorage.setItem("mondelos-admin-draft:faq:2", '{"q":"y"}');
    sessionStorage.setItem(OTHER, "keep");
  });

  afterEach(() => sessionStorage.clear());

  it("removes every saved draft (and only drafts) on a confirmed sign-out", async () => {
    renderLayout();
    await userEvent.click(
      screen.getAllByRole("button", { name: "Sign out" })[0],
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Sign out without saving?",
    });
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Sign out" }),
    );
    await screen.findByRole("heading", { name: "Login page" });
    expect(sessionStorage.getItem(DRAFT)).toBeNull();
    expect(sessionStorage.getItem("mondelos-admin-draft:faq:2")).toBeNull();
    expect(sessionStorage.getItem(OTHER)).toBe("keep");
  });

  it("keeps the drafts when the owner stays", async () => {
    renderLayout();
    await userEvent.click(
      screen.getAllByRole("button", { name: "Sign out" })[0],
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Sign out without saving?",
    });
    await userEvent.click(within(dialog).getByRole("button", { name: "Stay" }));
    expect(sessionStorage.getItem(DRAFT)).not.toBeNull();
  });
});
