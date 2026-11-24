import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import { clearAllDrafts, useFormDraft } from "./useFormDraft";

type Values = { title: string };

function Form({ initial = "" }: { initial?: string }) {
  const [values, setValues] = useState<Values>({ title: initial });
  const { clear, restored } = useFormDraft("test-form", values, setValues);
  return (
    <div>
      <label>
        Title
        <input
          value={values.title}
          onChange={(e) => setValues({ title: e.target.value })}
        />
      </label>
      <button type="button" onClick={() => clear()}>
        Clear draft
      </button>
      <button
        type="button"
        onClick={() => {
          // What a page does after a save: reset the form from the row the
          // server returned (trimmed), then clear the draft with that row.
          const saved = { title: values.title.trim() };
          setValues(saved);
          clear(saved);
        }}
      >
        Save
      </button>
      {restored ? <p>Restored draft</p> : null}
    </div>
  );
}

beforeEach(() => sessionStorage.clear());

describe("useFormDraft", () => {
  it("restores saved values after a remount", async () => {
    const first = render(<Form />);
    await userEvent.type(screen.getByLabelText("Title"), "Hello");
    first.unmount();

    render(<Form />);
    expect(screen.getByLabelText("Title")).toHaveValue("Hello");
    expect(screen.getByText("Restored draft")).toBeInTheDocument();
  });

  it("does not save anything while the form is unchanged", () => {
    render(<Form initial="Original" />);
    expect(sessionStorage.length).toBe(0);
  });

  it("removes the draft when the values return to the original", async () => {
    render(<Form />);
    const input = screen.getByLabelText("Title");
    await userEvent.type(input, "a");
    expect(sessionStorage.length).toBe(1);
    await userEvent.clear(input);
    expect(sessionStorage.length).toBe(0);
  });

  it("is cleared after clear(), so a remount starts fresh", async () => {
    const first = render(<Form />);
    await userEvent.type(screen.getByLabelText("Title"), "Hello");
    await userEvent.click(screen.getByRole("button", { name: "Clear draft" }));
    first.unmount();
    expect(sessionStorage.length).toBe(0);

    render(<Form />);
    expect(screen.getByLabelText("Title")).toHaveValue("");
    expect(screen.queryByText("Restored draft")).not.toBeInTheDocument();
  });

  it("re-baselines to the saved values, so trimmed saved data is not stored as a draft", async () => {
    render(<Form />);
    await userEvent.type(screen.getByLabelText("Title"), " Hello ");
    expect(sessionStorage.length).toBe(1);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByLabelText("Title")).toHaveValue("Hello");
    expect(sessionStorage.length).toBe(0);
    // A later edit starts a new draft.
    await userEvent.type(screen.getByLabelText("Title"), "!");
    expect(sessionStorage.length).toBe(1);
  });

  it("resets restored to false after clear", async () => {
    sessionStorage.setItem(
      "mondelos-admin-draft:test-form",
      JSON.stringify({ title: " Draft " }),
    );
    render(<Form />);
    expect(screen.getByText("Restored draft")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.queryByText("Restored draft")).not.toBeInTheDocument();
    expect(sessionStorage.length).toBe(0);
  });

  it("ignores a corrupt draft", () => {
    sessionStorage.setItem("mondelos-admin-draft:test-form", "{not json");
    render(<Form />);
    expect(screen.getByLabelText("Title")).toHaveValue("");
  });

  it("keeps working when sessionStorage throws (private mode)", async () => {
    const getItem = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new DOMException("denied", "SecurityError");
      });
    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new DOMException("denied", "SecurityError");
      });
    const removeItem = vi
      .spyOn(Storage.prototype, "removeItem")
      .mockImplementation(() => {
        throw new DOMException("denied", "SecurityError");
      });
    try {
      render(<Form />);
      await userEvent.type(screen.getByLabelText("Title"), "ok");
      expect(screen.getByLabelText("Title")).toHaveValue("ok");
      await userEvent.click(
        screen.getByRole("button", { name: "Clear draft" }),
      );
      expect(screen.getByLabelText("Title")).toHaveValue("ok");
    } finally {
      getItem.mockRestore();
      setItem.mockRestore();
      removeItem.mockRestore();
    }
  });
});

describe("clearAllDrafts", () => {
  afterEach(() => sessionStorage.clear());

  it("removes only keys with the draft prefix", () => {
    sessionStorage.setItem("mondelos-admin-draft:a", "1");
    sessionStorage.setItem("mondelos-admin-draft:b:2", "2");
    sessionStorage.setItem("other", "3");
    clearAllDrafts();
    expect(sessionStorage.length).toBe(1);
    expect(sessionStorage.getItem("other")).toBe("3");
  });

  it("does not throw when storage is unavailable", () => {
    const spy = vi.spyOn(Storage.prototype, "key").mockImplementation(() => {
      throw new Error("blocked");
    });
    sessionStorage.setItem("mondelos-admin-draft:a", "1");
    expect(() => clearAllDrafts()).not.toThrow();
    spy.mockRestore();
  });
});
