import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { MemoryRouter } from "react-router";

import { ConfirmDialog } from "./ConfirmDialog";
import { CrudList, type CrudItem } from "./CrudList";
import { FormField } from "./FormField";
import { PublishToggle } from "./PublishToggle";
import { ReorderButtons } from "./ReorderButtons";
import { SampleBadge } from "./SampleBadge";
import { Toast, dismissAllToasts, useToast } from "./Toast";

describe("FormField", () => {
  it("labels the control and wires describedby/invalid when there is an error", () => {
    render(
      <FormField
        label="Name"
        name="name"
        hint="As shown on the site."
        error="Name is required."
      >
        <input />
      </FormField>,
    );
    const input = screen.getByLabelText("Name");
    expect(input).toHaveAttribute("name", "name");
    expect(input).toHaveAttribute("aria-invalid", "true");
    const describedBy = input.getAttribute("aria-describedby") ?? "";
    const text = describedBy
      .split(" ")
      .map((id) => document.getElementById(id)?.textContent)
      .join(" ");
    expect(text).toContain("As shown on the site.");
    expect(text).toContain("Name is required.");
    expect(screen.getByRole("alert")).toHaveTextContent("Name is required.");
  });

  it("has no invalid state or alert without an error", () => {
    render(
      <FormField label="Name" name="name">
        <input />
      </FormField>,
    );
    const input = screen.getByLabelText("Name");
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAttribute("aria-describedby");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("merges an existing aria-describedby and keeps the child's own id", () => {
    render(
      <FormField label="Name" name="name" error="Bad name.">
        <input id="mine" aria-describedby="extra" />
      </FormField>,
    );
    const input = screen.getByLabelText("Name");
    expect(input).toHaveAttribute("id", "mine");
    const ids = (input.getAttribute("aria-describedby") ?? "").split(" ");
    expect(ids).toContain("extra");
    expect(ids.length).toBe(2);
    expect(
      document.getElementById(ids.find((i) => i !== "extra") ?? "")
        ?.textContent,
    ).toBe("Bad name.");
  });

  it("supports a render function for custom controls", () => {
    render(
      <FormField label="Notes" name="notes">
        {(a11y) => <textarea {...a11y} />}
      </FormField>,
    );
    expect(screen.getByLabelText("Notes").tagName).toBe("TEXTAREA");
  });
});

describe("PublishToggle", () => {
  it("is a labelled switch that reports the new value", async () => {
    const onChange = vi.fn();
    render(<PublishToggle checked={false} onChange={onChange} />);
    const toggle = screen.getByRole("switch", { name: "Publish on website" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    await userEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("includes the visible state words in the accessible name when compact", () => {
    render(
      <PublishToggle
        compact
        label="Publish Tour on website"
        checked={false}
        onChange={() => {}}
      />,
    );
    expect(
      screen.getByRole("switch", { name: /Publish Tour on website.*Hidden/ }),
    ).toBeInTheDocument();
  });

  it("reflects the checked state", () => {
    render(<PublishToggle checked onChange={() => {}} />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });
});

describe("SampleBadge", () => {
  it("shows the badge and confirms on click", async () => {
    const onConfirm = vi.fn();
    render(<SampleBadge onConfirm={onConfirm} />);
    expect(screen.getByText("Sample")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Mark as confirmed" }),
    );
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe("ReorderButtons", () => {
  it("names the buttons after the item and respects disabled state", async () => {
    const onUp = vi.fn();
    const onDown = vi.fn();
    render(
      <ReorderButtons
        label="Beautiful Gardens"
        onUp={onUp}
        onDown={onDown}
        disableUp
      />,
    );
    const up = screen.getByRole("button", {
      name: "Move Beautiful Gardens up",
    });
    // aria-disabled, not disabled: the button stays focusable so keyboard
    // focus is not dropped when the item reaches an end of the list.
    expect(up).toHaveAttribute("aria-disabled", "true");
    expect(up).not.toBeDisabled();
    await userEvent.click(up);
    expect(onUp).not.toHaveBeenCalled();
    await userEvent.click(
      screen.getByRole("button", { name: "Move Beautiful Gardens down" }),
    );
    expect(onDown).toHaveBeenCalledTimes(1);
  });

  it("keeps a pressed button focused when it becomes unavailable", async () => {
    function Harness() {
      const [atTop, setAtTop] = useState(false);
      return (
        <ReorderButtons
          label="X"
          disableUp={atTop}
          onUp={() => setAtTop(true)}
          onDown={() => {}}
        />
      );
    }
    render(<Harness />);
    const up = screen.getByRole("button", { name: "Move X up" });
    up.focus();
    await userEvent.keyboard("{Enter}");
    expect(up).toHaveAttribute("aria-disabled", "true");
    expect(up).toHaveFocus();
  });

  it("falls back to plain names without a label", () => {
    render(<ReorderButtons onUp={() => {}} onDown={() => {}} />);
    expect(screen.getByRole("button", { name: "Move up" })).not.toHaveAttribute(
      "aria-disabled",
    );
    expect(
      screen.getByRole("button", { name: "Move down" }),
    ).not.toHaveAttribute("aria-disabled");
  });
});

describe("ConfirmDialog", () => {
  function Harness({
    onConfirm = () => {},
    onCancel = () => {},
  }: {
    onConfirm?: () => void;
    onCancel?: () => void;
  }) {
    const [open, setOpen] = useState(false);
    return (
      <div>
        <button type="button" onClick={() => setOpen(true)}>
          Open it
        </button>
        <ConfirmDialog
          open={open}
          title="Delete this?"
          body="This cannot be undone."
          confirmLabel="Delete"
          destructive
          onConfirm={() => {
            onConfirm();
            setOpen(false);
          }}
          onCancel={() => {
            onCancel();
            setOpen(false);
          }}
        />
      </div>
    );
  }

  it("renders nothing while closed", () => {
    render(<Harness />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("is a labelled modal dialog with a description", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Open it" }));
    const dialog = screen.getByRole("dialog", { name: "Delete this?" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleDescription("This cannot be undone.");
  });

  it("focuses Cancel first (the safe choice) and traps Tab", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Open it" }));
    const dialog = screen.getByRole("dialog");
    const cancel = within(dialog).getByRole("button", { name: "Cancel" });
    const confirm = within(dialog).getByRole("button", { name: "Delete" });
    expect(cancel).toHaveFocus();
    await userEvent.tab();
    expect(confirm).toHaveFocus();
    await userEvent.tab();
    expect(cancel).toHaveFocus();
  });

  it("Escape cancels and focus returns to the opener", async () => {
    const onCancel = vi.fn();
    render(<Harness onCancel={onCancel} />);
    const opener = screen.getByRole("button", { name: "Open it" });
    await userEvent.click(opener);
    await userEvent.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("ignores Escape and the backdrop while busy, and keeps focus on the dialog", async () => {
    const onCancel = vi.fn();
    function Busy({ busy }: { busy: boolean }) {
      return (
        <ConfirmDialog
          open
          busy={busy}
          title="Deleting"
          body="Please wait."
          confirmLabel="Delete"
          onConfirm={() => {}}
          onCancel={onCancel}
        />
      );
    }
    const { rerender, container } = render(<Busy busy={false} />);
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    rerender(<Busy busy />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    await userEvent.tab();
    expect(dialog).toHaveFocus();
    const backdrop = container.querySelector("[aria-hidden='true']");
    await userEvent.click(backdrop as Element);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("confirms with the confirm button", async () => {
    const onConfirm = vi.fn();
    render(<Harness onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole("button", { name: "Open it" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe("Toast", () => {
  function Trigger() {
    const toast = useToast();
    return (
      <div>
        <button type="button" onClick={() => toast.success("Saved.")}>
          ok
        </button>
        <button type="button" onClick={() => toast.error("Could not save.")}>
          bad
        </button>
      </div>
    );
  }

  afterEach(() => {
    act(() => dismissAllToasts());
    vi.useRealTimers();
  });

  it("announces success politely and errors assertively", async () => {
    render(
      <>
        <Trigger />
        <Toast />
      </>,
    );
    await userEvent.click(screen.getByRole("button", { name: "ok" }));
    await userEvent.click(screen.getByRole("button", { name: "bad" }));
    expect(screen.getByRole("status")).toHaveTextContent("Saved.");
    expect(screen.getByRole("alert")).toHaveTextContent("Could not save.");
  });

  it("dismisses on request", async () => {
    render(
      <>
        <Trigger />
        <Toast />
      </>,
    );
    await userEvent.click(screen.getByRole("button", { name: "bad" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Dismiss message" }),
    );
    expect(screen.queryByText("Could not save.")).not.toBeInTheDocument();
  });

  it("auto-dismisses success after a few seconds but keeps errors", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(
      <>
        <Trigger />
        <Toast />
      </>,
    );
    await userEvent.click(screen.getByRole("button", { name: "ok" }));
    await userEvent.click(screen.getByRole("button", { name: "bad" }));
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(screen.queryByText("Saved.")).not.toBeInTheDocument();
    expect(screen.getByText("Could not save.")).toBeInTheDocument();
  });

  it("announces a warning politely and keeps it until dismissed", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    function Warn() {
      const toast = useToast();
      return (
        <button type="button" onClick={() => toast.warning("Check storage.")}>
          warn
        </button>
      );
    }
    render(
      <>
        <Warn />
        <Toast />
      </>,
    );
    await userEvent.click(screen.getByRole("button", { name: "warn" }));
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(screen.getByRole("status")).toHaveTextContent("Check storage.");
    expect(screen.getByRole("alert")).not.toHaveTextContent("Check storage.");
  });
});

describe("CrudList", () => {
  type Item = CrudItem & { name: string };
  const items: Item[] = [
    { id: "1", name: "Beautiful Gardens", is_published: true },
    { id: "2", name: "Hilltop View", is_published: false },
  ];
  const render1 = (item: Item) => ({
    label: item.name,
    title: item.name,
    detail: "Summary",
    editTo: `/admin/attractions/${item.id}`,
  });

  function renderList(
    extra: Partial<Parameters<typeof CrudList<Item>>[0]> = {},
  ) {
    const handlers = {
      onReorder: vi.fn(),
      onDelete: vi.fn(),
      onTogglePublish: vi.fn(),
    };
    render(
      <MemoryRouter>
        <CrudList
          items={items}
          render={render1}
          emptyText="Nothing here yet."
          {...handlers}
          {...extra}
        />
      </MemoryRouter>,
    );
    return handlers;
  }

  it("shows the empty text for an empty list", () => {
    render(
      <MemoryRouter>
        <CrudList<Item>
          items={[]}
          render={render1}
          emptyText="Nothing here yet."
        />
      </MemoryRouter>,
    );
    expect(screen.getByText("Nothing here yet.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("lists items with edit links named for screen readers", () => {
    renderList();
    expect(
      screen.getByRole("link", { name: "Edit Beautiful Gardens" }),
    ).toHaveAttribute("href", "/admin/attractions/1");
    expect(screen.getByText("Hilltop View")).toBeInTheDocument();
  });

  it("disables Move up on the first item and Move down on the last", () => {
    renderList();
    expect(
      screen.getByRole("button", { name: "Move Beautiful Gardens up" }),
    ).toHaveAttribute("aria-disabled", "true");
    expect(
      screen.getByRole("button", { name: "Move Hilltop View down" }),
    ).toHaveAttribute("aria-disabled", "true");
    expect(
      screen.getByRole("button", { name: "Move Beautiful Gardens down" }),
    ).not.toHaveAttribute("aria-disabled");
  });

  it("does not report a reorder from an unavailable button", async () => {
    const { onReorder } = renderList();
    await userEvent.click(
      screen.getByRole("button", { name: "Move Beautiful Gardens up" }),
    );
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("keeps every Move button focusable while busy", async () => {
    const { onReorder } = renderList({ busy: true });
    const down = screen.getByRole("button", {
      name: "Move Beautiful Gardens down",
    });
    expect(down).toHaveAttribute("aria-disabled", "true");
    expect(down).not.toBeDisabled();
    await userEvent.click(down);
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("keeps focus on the Move control after an item moves to the top", async () => {
    function Stateful() {
      const [list, setList] = useState(items);
      return (
        <MemoryRouter>
          <CrudList
            items={list}
            render={render1}
            emptyText="none"
            onReorder={(item, dir) =>
              setList((cur) => {
                const i = cur.findIndex((x) => x.id === item.id);
                const j = dir === "up" ? i - 1 : i + 1;
                const next = [...cur];
                [next[i], next[j]] = [next[j], next[i]];
                return next;
              })
            }
          />
        </MemoryRouter>
      );
    }
    render(<Stateful />);
    const up = screen.getByRole("button", { name: "Move Hilltop View up" });
    up.focus();
    await userEvent.keyboard("{Enter}");
    const after = screen.getByRole("button", { name: "Move Hilltop View up" });
    expect(after).toHaveAttribute("aria-disabled", "true");
    expect(after).toHaveFocus();
  });

  it("moves focus to a neighbouring row after a confirmed delete", async () => {
    function Stateful() {
      const [list, setList] = useState(items);
      return (
        <MemoryRouter>
          <CrudList
            items={list}
            render={render1}
            emptyText="none"
            onDelete={(item) =>
              setList((cur) => cur.filter((x) => x.id !== item.id))
            }
          />
        </MemoryRouter>
      );
    }
    render(<Stateful />);
    await userEvent.click(
      screen.getByRole("button", { name: "Delete Hilltop View" }),
    );
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Delete",
      }),
    );
    const row = screen.getByText("Beautiful Gardens").closest("tr");
    expect(row).not.toBeNull();
    expect(row?.contains(document.activeElement)).toBe(true);
  });

  it("moves focus to the empty message after deleting the last item", async () => {
    function Stateful() {
      const [list, setList] = useState([items[0]]);
      return (
        <MemoryRouter>
          <CrudList
            items={list}
            render={render1}
            emptyText="Nothing here yet."
            onDelete={() => setList([])}
          />
        </MemoryRouter>
      );
    }
    render(<Stateful />);
    await userEvent.click(
      screen.getByRole("button", { name: "Delete Beautiful Gardens" }),
    );
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Delete",
      }),
    );
    expect(screen.getByText("Nothing here yet.")).toHaveFocus();
  });

  it("makes the item cell a row header", () => {
    renderList();
    expect(
      screen.getByRole("rowheader", { name: /Beautiful Gardens/ }),
    ).toBeInTheDocument();
  });

  it("reports reorder with the item and direction", async () => {
    const { onReorder } = renderList();
    await userEvent.click(
      screen.getByRole("button", { name: "Move Hilltop View up" }),
    );
    expect(onReorder).toHaveBeenCalledWith(items[1], "up");
  });

  it("toggles publishing per item", async () => {
    const { onTogglePublish } = renderList();
    await userEvent.click(
      screen.getByRole("switch", { name: /Publish Hilltop View on website/ }),
    );
    expect(onTogglePublish).toHaveBeenCalledWith(items[1], true);
  });

  it("asks for confirmation before deleting", async () => {
    const { onDelete } = renderList();
    await userEvent.click(
      screen.getByRole("button", { name: "Delete Hilltop View" }),
    );
    expect(onDelete).not.toHaveBeenCalled();
    const dialog = screen.getByRole("dialog", {
      name: "Delete “Hilltop View”?",
    });
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Delete" }),
    );
    expect(onDelete).toHaveBeenCalledWith(items[1]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not delete when the confirmation is cancelled", async () => {
    const { onDelete } = renderList();
    await userEvent.click(
      screen.getByRole("button", { name: "Delete Hilltop View" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("omits controls whose handler is not given", () => {
    renderList({
      onReorder: undefined,
      onDelete: undefined,
      onTogglePublish: undefined,
    });
    expect(screen.queryByRole("button", { name: /Move/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Delete/ })).toBeNull();
    expect(screen.queryByRole("switch")).toBeNull();
  });
});
