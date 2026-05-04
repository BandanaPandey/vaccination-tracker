import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AuthShell } from "@/components/auth-shell";
import * as api from "@/lib/api";

describe("AuthShell", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders login mode by default", () => {
    render(<AuthShell />);

    expect(screen.getAllByRole("button", { name: /log in/i })).toHaveLength(2);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
  });

  it("switches to signup mode", () => {
    render(<AuthShell />);

    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it("shows auth errors returned by login", async () => {
    vi.spyOn(api, "login").mockRejectedValue(new Error("Email or password is invalid"));

    render(<AuthShell />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "bad-password" } });
    fireEvent.click(screen.getAllByRole("button", { name: /log in/i })[1]);

    await waitFor(() => {
      expect(screen.getByText(/email or password is invalid/i)).toBeInTheDocument();
    });
  });

  it("hydrates a saved session from local storage", async () => {
    window.localStorage.setItem("vaccination-tracker-auth-token", "saved-token");

    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue({
      user: {
        id: 1,
        name: "Bandana Pandey",
        email: "bandana@example.com",
      },
      auth: {
        available_methods: ["password"],
        oauth_ready: true,
      },
    });

    render(<AuthShell />);

    await waitFor(() => {
      expect(screen.getByText(/welcome, bandana pandey/i)).toBeInTheDocument();
    });
  });

  it("renders authenticated placeholder after successful login", async () => {
    vi.spyOn(api, "login").mockResolvedValue({
      token: "new-token",
      user: {
        id: 2,
        name: "Priya Shah",
        email: "priya@example.com",
      },
      auth: {
        available_methods: ["password"],
        oauth_ready: true,
      },
    });

    render(<AuthShell />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "priya@example.com" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "password123" } });
    fireEvent.click(screen.getAllByRole("button", { name: /log in/i })[1]);

    await waitFor(() => {
      expect(screen.getByText(/welcome, priya shah/i)).toBeInTheDocument();
    });
  });
});
