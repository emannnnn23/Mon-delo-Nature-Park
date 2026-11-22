import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";

import { signIn } from "~/services/auth";
import { LoginPage } from "./LoginPage";

vi.mock("~/services/auth", () => ({ signIn: vi.fn() }));

function renderAt(path: string, configured = true) {
  const Stub = createRoutesStub([
    {
      path: "/admin/login",
      Component: () => <LoginPage configured={configured} />,
    },
    { path: "/admin", Component: () => <p>Dashboard page</p> },
    { path: "/admin/attractions", Component: () => <p>Attractions page</p> },
  ]);
  return render(<Stub initialEntries={[path]} />);
}

async function submit(email = "owner@mondelos.test", password = "secret-pw") {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email"), email);
  await user.type(screen.getByLabelText("Password"), password);
  await user.click(screen.getByRole("button", { name: "Sign in" }));
}

afterEach(() => {
  vi.mocked(signIn).mockReset();
});

describe("LoginPage", () => {
  it("shows the logo, one h1, labelled fields and no sign-up", async () => {
    renderAt("/admin/login");
    expect(
      await screen.findByRole("heading", { level: 1, name: "Sign in" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("img", { name: "Mondelos Nature Park" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "type",
      "password",
    );
    expect(screen.queryByText(/sign up/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/register|create account/i),
    ).not.toBeInTheDocument();
  });

  it("says the user was signed out for ?reason=expired", async () => {
    renderAt("/admin/login?reason=expired");
    expect(
      await screen.findByText(
        "You\u2019ve been signed out. Please sign in again.",
      ),
    ).toBeInTheDocument();
  });

  it("explains a not-admin sign-out for ?reason=not-admin", async () => {
    renderAt("/admin/login?reason=not-admin");
    expect(
      await screen.findByText(/doesn.t have access to the admin/i),
    ).toBeInTheDocument();
  });

  it("ignores an unknown reason", async () => {
    renderAt("/admin/login?reason=<script>");
    await screen.findByRole("heading", { level: 1 });
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("keeps one live region for notices, present even when empty", async () => {
    renderAt("/admin/login");
    const status = await screen.findByRole("status");
    expect(status).toBeEmptyDOMElement();
    expect(screen.getByRole("alert")).toBeEmptyDOMElement();
  });

  it("says the admin is not configured, and offers no form", async () => {
    renderAt("/admin/login", false);
    expect(
      await screen.findByText("The admin isn't configured on this site yet."),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
    expect(signIn).not.toHaveBeenCalled();
  });

  it("goes to /admin after a successful sign-in", async () => {
    vi.mocked(signIn).mockResolvedValue({ ok: true });
    renderAt("/admin/login");
    await submit();
    expect(await screen.findByText("Dashboard page")).toBeInTheDocument();
    expect(signIn).toHaveBeenCalledWith("owner@mondelos.test", "secret-pw");
  });

  it("goes to a safe ?next after sign-in", async () => {
    vi.mocked(signIn).mockResolvedValue({ ok: true });
    renderAt("/admin/login?next=%2Fadmin%2Fattractions");
    await submit();
    expect(await screen.findByText("Attractions page")).toBeInTheDocument();
  });

  it.each([
    "https%3A%2F%2Fevil.com",
    "%2F%2Fevil.com",
    "%2Fadmin%2F..%2F..%2Fx",
  ])("ignores the unsafe next=%s", async (next) => {
    vi.mocked(signIn).mockResolvedValue({ ok: true });
    renderAt(`/admin/login?next=${next}`);
    await submit();
    expect(await screen.findByText("Dashboard page")).toBeInTheDocument();
  });

  it("shows a failed sign-in as an alert tied to the form", async () => {
    vi.mocked(signIn).mockResolvedValue({
      ok: false,
      message: "Incorrect email or password.",
      invalidCredentials: true,
    });
    renderAt("/admin/login");
    await submit();
    const alert = await screen.findByRole("alert");
    await waitFor(() =>
      expect(alert).toHaveTextContent("Incorrect email or password."),
    );
    expect(screen.getByLabelText("Email")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    const password = screen.getByLabelText("Password");
    expect(password).toHaveAttribute("aria-invalid", "true");
    expect(password).toHaveAccessibleDescription(
      "Incorrect email or password.",
    );
    expect(screen.queryByText("Dashboard page")).not.toBeInTheDocument();
  });

  it("moves focus to the error after a failed sign-in, every time", async () => {
    vi.mocked(signIn).mockResolvedValue({ ok: false, message: "Nope." });
    renderAt("/admin/login");
    await submit();
    const alert = await screen.findByRole("alert");
    await waitFor(() => expect(alert).toHaveFocus());
    // Not a credentials error: the fields are not marked invalid.
    expect(screen.getByLabelText("Email")).not.toHaveAttribute("aria-invalid");
    const user = userEvent.setup();
    await user.click(screen.getByLabelText("Email"));
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(alert).toHaveFocus());
  });

  it("disables the button while signing in", async () => {
    let finish: (v: { ok: true }) => void = () => {};
    vi.mocked(signIn).mockReturnValue(new Promise((r) => (finish = r)));
    renderAt("/admin/login");
    await submit();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /signing in/i }),
      ).toBeDisabled(),
    );
    finish({ ok: true });
    expect(await screen.findByText("Dashboard page")).toBeInTheDocument();
  });
});
