import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AuthShell } from "@/components/auth-shell";
import * as api from "@/lib/api";

function authPayload(overrides?: Partial<api.Profile>): api.Profile[] {
  return [
    {
      id: 1,
      name: "Bandana Pandey",
      date_of_birth: null,
      gender: null,
      relationship_kind: "self",
      medical_notes: null,
      schedule_region: "IN",
      ...overrides,
    },
  ];
}

function recordPayload(overrides?: Partial<api.VaccinationRecord>): api.VaccinationRecord[] {
  return [
    {
      id: 1,
      profile_id: 1,
      vaccine_name: "MMR",
      date_administered: "2024-01-04",
      dose_number: 1,
      provider: "City Hospital",
      notes: "First dose",
      proof_attached: false,
      ...overrides,
    },
  ];
}

describe("AuthShell", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchVaccinationRecords").mockResolvedValue([]);
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

    await waitFor(() => expect(screen.getByText(/email or password is invalid/i)).toBeInTheDocument());
  });

  it("hydrates a saved session and shows the auto-created self profile", async () => {
    window.localStorage.setItem("vaccination-tracker-auth-token", "saved-token");
    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue({
      user: { id: 1, name: "Bandana Pandey", email: "bandana@example.com" },
      auth: { available_methods: ["password"], oauth_ready: true },
      profiles: authPayload(),
    });

    render(<AuthShell />);

    await waitFor(() => expect(screen.getByText(/welcome, bandana pandey/i)).toBeInTheDocument());
    expect(screen.getByText(/family members/i)).toBeInTheDocument();
    expect(screen.getByText(/selected profile/i)).toBeInTheDocument();
  });

  it("renders authenticated vaccination management after successful login", async () => {
    vi.spyOn(api, "login").mockResolvedValue({
      token: "new-token",
      user: { id: 2, name: "Priya Shah", email: "priya@example.com" },
      auth: { available_methods: ["password"], oauth_ready: true },
      profiles: authPayload({ name: "Priya Shah" }),
    });

    render(<AuthShell />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "priya@example.com" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "password123" } });
    fireEvent.click(screen.getAllByRole("button", { name: /log in/i })[1]);

    await waitFor(() => expect(screen.getByText(/welcome, priya shah/i)).toBeInTheDocument());
    expect(screen.getByRole("heading", { name: /vaccination history/i })).toBeInTheDocument();
  });

  it("adds, edits, deletes, and switches profiles", async () => {
    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue({
      user: { id: 1, name: "Bandana Pandey", email: "bandana@example.com" },
      auth: { available_methods: ["password"], oauth_ready: true },
      profiles: authPayload(),
    });
    vi.spyOn(api, "createProfile").mockResolvedValue({
      id: 2,
      name: "Aarav Pandey",
      date_of_birth: "2022-08-10",
      gender: "male",
      relationship_kind: "child",
      medical_notes: "Peanut allergy",
      schedule_region: "US",
    });
    vi.spyOn(api, "updateProfile").mockResolvedValue({
      id: 2,
      name: "Aarav P.",
      date_of_birth: "2022-08-10",
      gender: "male",
      relationship_kind: "child",
      medical_notes: "Updated notes",
      schedule_region: "US",
    });
    const deleteProfileMock = vi.spyOn(api, "deleteProfile").mockResolvedValue(undefined);

    window.localStorage.setItem("vaccination-tracker-auth-token", "saved-token");
    render(<AuthShell />);

    await waitFor(() => expect(screen.getByText(/welcome, bandana pandey/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Aarav Pandey" } });
    fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: "2022-08-10" } });
    fireEvent.change(screen.getByLabelText(/^gender$/i), { target: { value: "male" } });
    fireEvent.change(screen.getByLabelText(/medical notes/i), { target: { value: "Peanut allergy" } });
    fireEvent.change(screen.getByLabelText(/^relationship$/i), { target: { value: "child" } });
    fireEvent.change(screen.getByLabelText(/schedule region/i), { target: { value: "US" } });
    fireEvent.click(screen.getByRole("button", { name: /create profile/i }));

    await waitFor(() => expect(screen.getAllByText(/aarav pandey/i).length).toBeGreaterThan(0));

    fireEvent.click(screen.getAllByRole("button", { name: /aarav pandey/i })[0]);
    fireEvent.click(screen.getByRole("button", { name: /edit profile/i }));
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Aarav P." } });
    fireEvent.change(screen.getByLabelText(/medical notes/i), { target: { value: "Updated notes" } });
    fireEvent.click(screen.getByRole("button", { name: /save profile/i }));

    await waitFor(() => expect(screen.getAllByText(/aarav p\./i).length).toBeGreaterThan(0));

    fireEvent.click(screen.getAllByRole("button", { name: /bandana pandey/i })[0]);
    expect(screen.getAllByText(/relationship/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole("button", { name: /aarav p\./i })[0]);
    fireEvent.click(screen.getByRole("button", { name: /edit profile/i }));
    fireEvent.click(screen.getByRole("button", { name: /delete profile/i }));

    await waitFor(() => expect(deleteProfileMock).toHaveBeenCalledWith(2, "saved-token"));
  });

  it("loads, creates, edits, deletes, and switches vaccination records", async () => {
    window.localStorage.setItem("vaccination-tracker-auth-token", "saved-token");
    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue({
      user: { id: 1, name: "Bandana Pandey", email: "bandana@example.com" },
      auth: { available_methods: ["password"], oauth_ready: true },
      profiles: [
        ...authPayload(),
        {
          id: 2,
          name: "Aarav Pandey",
          date_of_birth: "2022-08-10",
          gender: "male",
          relationship_kind: "child",
          medical_notes: null,
          schedule_region: "US",
        },
      ],
    });
    vi.spyOn(api, "fetchVaccinationRecords").mockImplementation(async (profileId) => {
      if (profileId === 1) return recordPayload();
      return recordPayload({ id: 2, profile_id: 2, vaccine_name: "Polio", proof_attached: true, proof_filename: "proof.pdf", proof_content_type: "application/pdf", proof_url: "/rails/active_storage/blobs/proof" });
    });
    vi.spyOn(api, "createVaccinationRecord").mockResolvedValue({
      id: 3,
      profile_id: 1,
      vaccine_name: "Flu Shot",
      date_administered: "2025-01-12",
      dose_number: null,
      provider: "Metro Clinic",
      notes: "Annual dose",
      proof_attached: true,
      proof_filename: "flu-proof.pdf",
      proof_content_type: "application/pdf",
      proof_url: "/rails/active_storage/blobs/flu-proof",
    });
    vi.spyOn(api, "updateVaccinationRecord").mockResolvedValue({
      id: 3,
      profile_id: 1,
      vaccine_name: "Flu Shot Updated",
      date_administered: "2025-01-12",
      dose_number: null,
      provider: "Metro Clinic",
      notes: "Updated record",
      proof_attached: false,
    });
    vi.spyOn(api, "deleteVaccinationRecord").mockResolvedValue(undefined);

    render(<AuthShell />);

    await waitFor(() => expect(screen.getByText(/mmr/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/vaccine name/i), { target: { value: "Flu Shot" } });
    fireEvent.change(screen.getByLabelText(/date administered/i), { target: { value: "2025-01-12" } });
    fireEvent.change(screen.getByLabelText(/provider/i), { target: { value: "Metro Clinic" } });
    fireEvent.change(screen.getByLabelText(/vaccination notes/i), { target: { value: "Annual dose" } });
    const file = new File(["proof"], "flu-proof.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText(/proof document/i), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: /add vaccination record/i }));

    await waitFor(() => expect(screen.getAllByText(/flu shot/i).length).toBeGreaterThan(0));
    expect(screen.getAllByText(/proof attached/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole("button", { name: /edit record/i })[0]);
    fireEvent.change(screen.getByLabelText(/vaccine name/i), { target: { value: "Flu Shot Updated" } });
    fireEvent.change(screen.getByLabelText(/vaccination notes/i), { target: { value: "Updated record" } });
    fireEvent.click(screen.getByLabelText(/remove existing proof/i));
    fireEvent.click(screen.getByRole("button", { name: /save vaccination record/i }));

    await waitFor(() => expect(screen.getAllByText(/flu shot updated/i).length).toBeGreaterThan(0));
    expect(screen.getAllByText(/no proof attached/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole("button", { name: /aarav pandey/i })[0]);
    await waitFor(() => expect(screen.getByText(/polio/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /delete record/i }));
    await waitFor(() => expect(screen.queryByText(/polio/i)).not.toBeInTheDocument());
  });
});
