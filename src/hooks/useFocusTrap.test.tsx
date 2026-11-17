import { fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { useFocusTrap } from "./useFocusTrap";

function Trap() {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, true, () => {});
  return (
    <div ref={ref}>
      <input aria-label="Name" />
      <input type="hidden" name="token" />
      <textarea aria-label="Message" />
      <button type="button">Send</button>
      <button type="button" disabled>
        Skipped
      </button>
    </div>
  );
}

const tab = (shiftKey = false) =>
  fireEvent.keyDown(document, { key: "Tab", shiftKey });

describe("useFocusTrap", () => {
  it("treats inputs and textareas as focusable, wrapping from first to last", () => {
    render(<Trap />);
    screen.getByLabelText("Name").focus();
    tab(true);
    expect(screen.getByRole("button", { name: "Send" })).toHaveFocus();
  });

  it("wraps from the last focusable back to the first input", () => {
    render(<Trap />);
    screen.getByRole("button", { name: "Send" }).focus();
    tab();
    expect(screen.getByLabelText("Name")).toHaveFocus();
  });
});
