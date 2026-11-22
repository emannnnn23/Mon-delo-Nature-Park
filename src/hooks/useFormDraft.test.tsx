import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import { useFormDraft } from "./useFormDraft";

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
      <button type="button" onClick={clear}>
        Clear draft
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
