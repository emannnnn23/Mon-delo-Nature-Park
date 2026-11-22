import { fireEvent, render, screen } from "@testing-library/react";
import { useRef, type ReactNode } from "react";
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

function MixedTrap({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, true, () => {});
  return (
    <div ref={ref}>
      <button type="button">First</button>
      <button type="button">Last</button>
      {/* After the last real control, so a wrongly accepted candidate would
          become the "last" item and break the wrap. */}
      {children}
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

  it("skips an input with tabindex=-1", () => {
    render(
      <MixedTrap>
        <input aria-label="Skip me" tabIndex={-1} />
      </MixedTrap>,
    );
    screen.getByRole("button", { name: "First" }).focus();
    tab(true);
    expect(screen.getByRole("button", { name: "Last" })).toHaveFocus();
    tab();
    expect(screen.getByRole("button", { name: "First" })).toHaveFocus();
  });

  it("skips an input inside a [hidden] ancestor", () => {
    render(
      <MixedTrap>
        <div hidden>
          <input aria-label="Hidden input" />
        </div>
      </MixedTrap>,
    );
    const last = screen.getByRole("button", { name: "Last" });
    last.focus();
    tab();
    expect(screen.getByRole("button", { name: "First" })).toHaveFocus();
    screen.getByRole("button", { name: "First" }).focus();
    tab(true);
    expect(last).toHaveFocus();
  });

  it("skips an input inside an [inert] ancestor", () => {
    render(
      <MixedTrap>
        <div inert>
          <button type="button">Inert button</button>
        </div>
      </MixedTrap>,
    );
    screen.getByRole("button", { name: "Last" }).focus();
    tab();
    expect(screen.getByRole("button", { name: "First" })).toHaveFocus();
  });

  it("skips an element hidden with display:none when there is no layout (jsdom)", () => {
    render(
      <MixedTrap>
        <div style={{ display: "none" }}>
          <input aria-label="Display none" />
        </div>
      </MixedTrap>,
    );
    screen.getByRole("button", { name: "Last" }).focus();
    tab();
    expect(screen.getByRole("button", { name: "First" })).toHaveFocus();
  });

  describe("with layout", () => {
    afterEach(() => vi.restoreAllMocks());

    it("skips an element that has no client rects, but keeps rendered ones", () => {
      // Pretend the browser has layout: everything is rendered except the
      // element labelled "No box".
      vi.spyOn(HTMLElement.prototype, "getClientRects").mockImplementation(
        function (this: HTMLElement) {
          return (this.getAttribute("aria-label") === "No box"
            ? []
            : [{}]) as unknown as DOMRectList;
        },
      );
      render(
        <MixedTrap>
          <input aria-label="No box" />
        </MixedTrap>,
      );
      screen.getByRole("button", { name: "Last" }).focus();
      tab();
      expect(screen.getByRole("button", { name: "First" })).toHaveFocus();
    });
  });
});
