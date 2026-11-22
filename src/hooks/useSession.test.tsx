import { act, render, screen } from "@testing-library/react";
import { Outlet, createRoutesStub } from "react-router";

import { useUnsavedChanges } from "~/admin/hooks/useUnsavedChanges";
import { subscribeToSignOut } from "~/services/auth";

import { useSession } from "./useSession";

vi.mock("~/services/auth", () => ({
  subscribeToSignOut: vi.fn(),
}));

const DRAFT_KEY = "mondelos-admin-draft:attraction:1";

function Shell() {
  useSession();
  return <Outlet />;
}

function DirtyPage() {
  const { leaveDialog } = useUnsavedChanges(true);
  return (
    <div>
      <h1>Dirty form</h1>
      {leaveDialog}
    </div>
  );
}

let expire: () => void = () => {};

function renderShell() {
  const Stub = createRoutesStub([
    {
      path: "/admin",
      Component: Shell,
      children: [{ index: true, Component: DirtyPage }],
    },
    { path: "/admin/login", Component: () => <h1>Login page</h1> },
  ]);
  return render(<Stub initialEntries={["/admin"]} />);
}

beforeEach(() => {
  sessionStorage.clear();
  vi.mocked(subscribeToSignOut).mockImplementation((onSignedOut) => {
    expire = onSignedOut;
    return () => {};
  });
});

describe("useSession", () => {
  it("goes to the login page on expiry even while a form is dirty, keeping its draft", async () => {
    sessionStorage.setItem(DRAFT_KEY, '{"name":"Half typed"}');
    renderShell();
    expect(
      await screen.findByRole("heading", { name: "Dirty form" }),
    ).toBeInTheDocument();

    await act(async () => {
      expire();
    });

    expect(
      await screen.findByRole("heading", { name: "Login page" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(sessionStorage.getItem(DRAFT_KEY)).toBe('{"name":"Half typed"}');
  });
});
