import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, createRoutesStub } from "react-router";

import { useUnsavedChanges } from "./useUnsavedChanges";

function Editor({ dirty }: { dirty: boolean }) {
  const { leaveDialog } = useUnsavedChanges(dirty);
  return (
    <div>
      <h1>Editor page</h1>
      <Link to="/other">Go elsewhere</Link>
      {leaveDialog}
    </div>
  );
}

function renderEditor(dirty: boolean) {
  const Stub = createRoutesStub([
    { path: "/", Component: () => <Editor dirty={dirty} /> },
    { path: "/other", Component: () => <h1>Other page</h1> },
  ]);
  return render(<Stub initialEntries={["/"]} />);
}

describe("useUnsavedChanges", () => {
  it("lets navigation through when nothing changed", async () => {
    renderEditor(false);
    await userEvent.click(screen.getByRole("link", { name: "Go elsewhere" }));
    expect(
      await screen.findByRole("heading", { name: "Other page" }),
    ).toBeInTheDocument();
  });

  it("asks before leaving a dirty form, and Cancel stays on the page", async () => {
    renderEditor(true);
    await userEvent.click(screen.getByRole("link", { name: "Go elsewhere" }));
    const dialog = await screen.findByRole("dialog", {
      name: "Leave without saving?",
    });
    expect(dialog).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Stay" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Editor page" }),
    ).toBeInTheDocument();
  });

  it("navigates when the leave is confirmed", async () => {
    renderEditor(true);
    await userEvent.click(screen.getByRole("link", { name: "Go elsewhere" }));
    await screen.findByRole("dialog", { name: "Leave without saving?" });
    await userEvent.click(
      screen.getByRole("button", { name: "Leave without saving" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Other page" }),
    ).toBeInTheDocument();
  });

  it("warns before the tab closes only while dirty", () => {
    const { unmount } = renderEditor(true);
    const dirtyEvent = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(dirtyEvent);
    expect(dirtyEvent.defaultPrevented).toBe(true);
    unmount();
    const afterEvent = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(afterEvent);
    expect(afterEvent.defaultPrevented).toBe(false);
  });

  it("does not warn on tab close when clean", () => {
    renderEditor(false);
    const event = new Event("beforeunload", { cancelable: true });
    fireEvent(window, event);
    expect(event.defaultPrevented).toBe(false);
  });
});
