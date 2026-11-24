import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, createRoutesStub, useLocation } from "react-router";

import {
  hasUnsavedChanges,
  useUnsavedChanges,
  withUnsavedGuardSuspended,
} from "./useUnsavedChanges";

function SearchEcho() {
  const { search } = useLocation();
  return <p>search:{search}</p>;
}

function Editor({ dirty }: { dirty: boolean }) {
  const { leaveDialog } = useUnsavedChanges(dirty);
  return (
    <div>
      <h1>Editor page</h1>
      <Link to="/other">Go elsewhere</Link>
      <Link to="/?tab=2">Same page, other tab</Link>
      <SearchEcho />
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

  it("does not ask when only the search params change on the same page", async () => {
    renderEditor(true);
    await userEvent.click(
      screen.getByRole("link", { name: "Same page, other tab" }),
    );
    expect(await screen.findByText("search:?tab=2")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("tells the owner the changes are kept as a draft on this device", async () => {
    renderEditor(true);
    await userEvent.click(screen.getByRole("link", { name: "Go elsewhere" }));
    const dialog = await screen.findByRole("dialog", {
      name: "Leave without saving?",
    });
    expect(dialog).toHaveAccessibleDescription(
      "Your changes are kept as a draft on this device.",
    );
  });

  it("reports unsaved changes while dirty, and not when clean", () => {
    const dirty = renderEditor(true);
    expect(hasUnsavedChanges()).toBe(true);
    dirty.unmount();
    expect(hasUnsavedChanges()).toBe(false);
    renderEditor(false);
    expect(hasUnsavedChanges()).toBe(false);
  });

  it("lets a navigation through while the guard is suspended", async () => {
    renderEditor(true);
    await withUnsavedGuardSuspended(async () => {
      await userEvent.click(screen.getByRole("link", { name: "Go elsewhere" }));
      expect(
        await screen.findByRole("heading", { name: "Other page" }),
      ).toBeInTheDocument();
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
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
