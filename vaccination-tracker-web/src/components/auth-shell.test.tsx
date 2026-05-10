import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AuthShell } from "@/components/auth-shell";
import * as api from "@/lib/api";

function authPayload(overrides?: Partial<api.Profile>): api.Profile[] {
  return [{ id: 1, name: "Bandana Pandey", date_of_birth: null, gender: null, relationship_kind: "self", medical_notes: null, schedule_region: "IN", ...overrides }];
}

function recordPayload(overrides?: Partial<api.VaccinationRecord>): api.VaccinationRecord[] {
  return [{ id: 1, profile_id: 1, vaccine_name: "MMR", date_administered: "2024-01-04", dose_number: 1, provider: "City Hospital", notes: "First dose", proof_attached: false, ...overrides }];
}

function schedulePayload(overrides?: Partial<api.ProfileSchedule>): api.ProfileSchedule {
  return {
    profile_id: 1,
    schedule_region: "IN",
    generated_at: "2026-05-07T09:00:00Z",
    missing_date_of_birth: false,
    summary: { completed: 1, upcoming: 2, overdue: 1 },
    items: [
      { schedule_key: "hep-b-birth", vaccine_name: "Hepatitis B", dose_label: "Birth dose", due_date: "2025-01-01", recommended_age_window: "At birth", status: "overdue", matched_record_id: null, matched_record_date: null },
      { schedule_key: "mmr-1", vaccine_name: "MMR", dose_label: "Dose 1", due_date: "2025-10-01", recommended_age_window: "9 months", status: "completed", matched_record_id: 1, matched_record_date: "2025-10-01" },
    ],
    ...overrides,
  };
}

function dashboardPayload(): api.DashboardResponse {
  return {
    generated_at: "2026-05-08T09:00:00Z",
    family_summary: { total_profiles: 2, completed: 1, upcoming: 3, overdue: 2 },
    profiles: [
      { id: 1, name: "Bandana Pandey", relationship_kind: "self", schedule_region: "IN", date_of_birth: null, has_date_of_birth: false, summary: { completed: 0, upcoming: 0, overdue: 0 }, next_items: [] },
      { id: 2, name: "Aarav Pandey", relationship_kind: "child", schedule_region: "US", date_of_birth: "2022-08-10", has_date_of_birth: true, summary: { completed: 1, upcoming: 3, overdue: 1 }, next_items: [{ schedule_key: "dtap-1", vaccine_name: "DTaP", dose_label: "Dose 1", due_date: "2022-10-10", recommended_age_window: "2 months", status: "overdue", matched_record_id: null, matched_record_date: null }] },
    ],
    recent_activity: [{ id: 11, profile_id: 2, profile_name: "Aarav Pandey", vaccine_name: "Polio", date_administered: "2025-01-12", dose_number: 1, provider: "Metro Clinic", proof_attached: true }],
    attention_items: [{ profile_id: 2, profile_name: "Aarav Pandey", relationship_kind: "child", schedule_region: "US", schedule_key: "dtap-1", vaccine_name: "DTaP", dose_label: "Dose 1", due_date: "2022-10-10", recommended_age_window: "2 months", status: "overdue", matched_record_id: null, matched_record_date: null }],
  };
}

function calendarPayload(month = "2026-05"): api.CalendarResponse {
  return {
    month,
    generated_at: "2026-05-08T09:00:00Z",
    days: [
      ...Array.from({ length: 11 }, (_, index) => ({ date: `2026-05-${String(index + 1).padStart(2, "0")}`, items: [] })),
      { date: "2026-05-12", items: [{ profile_id: 2, profile_name: "Aarav Pandey", relationship_kind: "child", schedule_region: "US", schedule_key: "dtap-1", vaccine_name: "DTaP", dose_label: "Dose 1", due_date: "2026-05-12", recommended_age_window: "2 months", status: "overdue", matched_record_id: null, matched_record_date: null }] },
      ...Array.from({ length: 19 }, (_, index) => ({ date: `2026-05-${String(index + 13).padStart(2, "0")}`, items: [] })),
    ],
  };
}

function reminderPreferencePayload(overrides?: Partial<api.ReminderPreference>): api.ReminderPreference {
  return {
    email_enabled: true,
    sms_enabled: false,
    lead_days: 7,
    overdue_enabled: true,
    phone_number: null,
    ...overrides,
  };
}

function reminderDeliveryPayload(overrides?: Partial<api.ReminderDelivery>): api.ReminderDelivery[] {
  return [{ id: 31, profile_id: 2, profile_name: "Aarav Pandey", channel: "email", status: "sent", kind: "overdue", vaccine_name: "DTaP", due_date: "2026-05-12", sent_at: "2026-05-08T09:00:00Z", error_message: null, ...overrides }];
}

describe("AuthShell", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchVaccinationRecords").mockResolvedValue([]);
    vi.spyOn(api, "fetchProfileSchedule").mockResolvedValue(schedulePayload({ missing_date_of_birth: true, items: [], summary: { completed: 0, upcoming: 0, overdue: 0 } }));
    vi.spyOn(api, "fetchDashboard").mockResolvedValue(dashboardPayload());
    vi.spyOn(api, "fetchCalendar").mockResolvedValue(calendarPayload());
    vi.spyOn(api, "fetchReminderPreference").mockResolvedValue(reminderPreferencePayload());
    vi.spyOn(api, "fetchReminderDeliveries").mockResolvedValue(reminderDeliveryPayload());
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

  it("hydrates a saved session and shows the dashboard first", async () => {
    window.localStorage.setItem("vaccination-tracker-auth-token", "saved-token");
    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue({ user: { id: 1, name: "Bandana Pandey", email: "bandana@example.com", phone_number: null }, auth: { available_methods: ["password"], oauth_ready: true }, profiles: authPayload() });
    render(<AuthShell />);
    await waitFor(() => expect(screen.getByText(/family overview/i)).toBeInTheDocument());
    expect(screen.getByText(/monthly calendar/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /reminder settings/i })).toBeInTheDocument();
  });

  it("renders authenticated dashboard after successful login", async () => {
    vi.spyOn(api, "login").mockResolvedValue({ token: "new-token", user: { id: 2, name: "Priya Shah", email: "priya@example.com", phone_number: null }, auth: { available_methods: ["password"], oauth_ready: true }, profiles: authPayload({ name: "Priya Shah" }) });
    render(<AuthShell />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "priya@example.com" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "password123" } });
    fireEvent.click(screen.getAllByRole("button", { name: /log in/i })[1]);
    await waitFor(() => expect(screen.getByText(/welcome, priya shah/i)).toBeInTheDocument());
    expect(screen.getByText(/family overview/i)).toBeInTheDocument();
  });

  it("renders family rollups, recent activity, attention items, calendar data, and reminder history", async () => {
    window.localStorage.setItem("vaccination-tracker-auth-token", "saved-token");
    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue({ user: { id: 1, name: "Bandana Pandey", email: "bandana@example.com", phone_number: null }, auth: { available_methods: ["password"], oauth_ready: true }, profiles: [{ ...authPayload()[0], id: 1 }, { id: 2, name: "Aarav Pandey", date_of_birth: "2022-08-10", gender: "male", relationship_kind: "child", medical_notes: null, schedule_region: "US" }] });
    vi.spyOn(api, "fetchVaccinationRecords").mockResolvedValue(recordPayload());
    vi.spyOn(api, "fetchProfileSchedule").mockResolvedValue(schedulePayload());

    render(<AuthShell />);

    await waitFor(() => expect(screen.getByText(/needs attention/i)).toBeInTheDocument());
    await waitFor(() => expect(screen.getAllByRole("button", { name: /aarav pandey/i }).length).toBeGreaterThan(0));
    expect(screen.getByText(/polio/i)).toBeInTheDocument();
    expect(screen.getAllByText(/dtap/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/selected day/i)).toBeInTheDocument();
    expect(screen.getByText(/reminder history/i)).toBeInTheDocument();
  });

  it("navigates calendar months by reloading calendar data", async () => {
    window.localStorage.setItem("vaccination-tracker-auth-token", "saved-token");
    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue({ user: { id: 1, name: "Bandana Pandey", email: "bandana@example.com", phone_number: null }, auth: { available_methods: ["password"], oauth_ready: true }, profiles: authPayload({ date_of_birth: "1990-01-01" }) });
    render(<AuthShell />);
    await waitFor(() => expect(screen.getByText(/monthly calendar/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    await waitFor(() => expect(api.fetchCalendar).toHaveBeenCalledTimes(2));
  });

  it("keeps profile switching and vaccination record CRUD working inside the new layout", async () => {
    window.localStorage.setItem("vaccination-tracker-auth-token", "saved-token");
    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue({ user: { id: 1, name: "Bandana Pandey", email: "bandana@example.com", phone_number: null }, auth: { available_methods: ["password"], oauth_ready: true }, profiles: [{ ...authPayload()[0], date_of_birth: "1990-01-01" }, { id: 2, name: "Aarav Pandey", date_of_birth: "2022-08-10", gender: "male", relationship_kind: "child", medical_notes: null, schedule_region: "US" }] });
    vi.spyOn(api, "fetchVaccinationRecords").mockImplementation(async (profileId) => profileId === 1 ? recordPayload() : recordPayload({ id: 2, profile_id: 2, vaccine_name: "Polio", proof_attached: true, proof_filename: "proof.pdf", proof_content_type: "application/pdf", proof_url: "/rails/active_storage/blobs/proof" }));
    vi.spyOn(api, "fetchProfileSchedule").mockImplementation(async (profileId) => profileId === 1 ? schedulePayload({ profile_id: 1 }) : schedulePayload({ profile_id: 2, schedule_region: "US", items: [{ schedule_key: "dtap-1", vaccine_name: "DTaP", dose_label: "Dose 1", due_date: "2022-10-10", recommended_age_window: "2 months", status: "overdue", matched_record_id: null, matched_record_date: null }] }));
    vi.spyOn(api, "createVaccinationRecord").mockResolvedValue({ id: 3, profile_id: 1, vaccine_name: "Flu Shot", date_administered: "2025-01-12", dose_number: null, provider: "Metro Clinic", notes: "Annual dose", proof_attached: true, proof_filename: "flu-proof.pdf", proof_content_type: "application/pdf", proof_url: "/rails/active_storage/blobs/flu-proof" });
    vi.spyOn(api, "updateVaccinationRecord").mockResolvedValue({ id: 3, profile_id: 1, vaccine_name: "Flu Shot Updated", date_administered: "2025-01-12", dose_number: null, provider: "Metro Clinic", notes: "Updated record", proof_attached: false });
    const deleteRecordMock = vi.spyOn(api, "deleteVaccinationRecord").mockResolvedValue(undefined);

    render(<AuthShell />);
    await waitFor(() => expect(screen.getAllByText(/mmr/i).length).toBeGreaterThan(0));

    fireEvent.change(screen.getByLabelText(/vaccine name/i), { target: { value: "Flu Shot" } });
    fireEvent.change(screen.getByLabelText(/date administered/i), { target: { value: "2025-01-12" } });
    fireEvent.change(screen.getByLabelText(/provider/i), { target: { value: "Metro Clinic" } });
    fireEvent.change(screen.getByLabelText(/vaccination notes/i), { target: { value: "Annual dose" } });
    fireEvent.change(screen.getByLabelText(/proof document/i), { target: { files: [new File(["proof"], "flu-proof.pdf", { type: "application/pdf" })] } });
    fireEvent.click(screen.getByRole("button", { name: /add vaccination record/i }));

    await waitFor(() => expect(screen.getAllByText(/flu shot/i).length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByRole("button", { name: /edit record/i })[0]);
    fireEvent.change(screen.getByLabelText(/vaccine name/i), { target: { value: "Flu Shot Updated" } });
    fireEvent.click(screen.getByLabelText(/remove existing proof/i));
    fireEvent.click(screen.getByRole("button", { name: /save vaccination record/i }));
    await waitFor(() => expect(screen.getAllByText(/flu shot updated/i).length).toBeGreaterThan(0));

    fireEvent.click(screen.getAllByRole("button", { name: /aarav pandey/i })[0]);
    await waitFor(() => expect(screen.getAllByText(/polio/i).length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole("button", { name: /delete record/i }));
    await waitFor(() => expect(deleteRecordMock).toHaveBeenCalledWith(2, 2, "saved-token"));
  });

  it("renders certificate actions for the active profile and downloads the certificate", async () => {
    window.localStorage.setItem("vaccination-tracker-auth-token", "saved-token");
    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue({ user: { id: 1, name: "Bandana Pandey", email: "bandana@example.com", phone_number: null }, auth: { available_methods: ["password"], oauth_ready: true }, profiles: authPayload({ date_of_birth: "1990-01-01" }) });
    const downloadProfileCertificateMock = vi.spyOn(api, "downloadProfileCertificate").mockResolvedValue("vaccination-certificate-bandana-pandey.pdf");

    render(<AuthShell />);
    await waitFor(() => expect(screen.getByRole("heading", { name: /vaccination certificate/i })).toBeInTheDocument());

    await waitFor(() => expect(screen.getByRole("button", { name: /download pdf/i })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: /download pdf/i }));

    await waitFor(() => expect(downloadProfileCertificateMock).toHaveBeenCalledWith(1, "saved-token", "download"));
  });

  it("updates certificate actions when the active profile changes", async () => {
    window.localStorage.setItem("vaccination-tracker-auth-token", "saved-token");
    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue({ user: { id: 1, name: "Bandana Pandey", email: "bandana@example.com", phone_number: null }, auth: { available_methods: ["password"], oauth_ready: true }, profiles: [{ ...authPayload()[0], date_of_birth: "1990-01-01" }, { id: 2, name: "Aarav Pandey", date_of_birth: "2022-08-10", gender: "male", relationship_kind: "child", medical_notes: null, schedule_region: "US" }] });
    const downloadProfileCertificateMock = vi.spyOn(api, "downloadProfileCertificate").mockResolvedValue("vaccination-certificate-aarav-pandey.pdf");

    render(<AuthShell />);
    await waitFor(() => expect(screen.getByRole("heading", { name: /vaccination certificate/i })).toBeInTheDocument());

    await waitFor(() => expect(screen.getAllByRole("button", { name: /aarav pandey/i }).length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByRole("button", { name: /aarav pandey/i })[0]);
    await waitFor(() => expect(screen.getByRole("button", { name: /open in new tab/i })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: /open in new tab/i }));

    await waitFor(() => expect(downloadProfileCertificateMock).toHaveBeenCalledWith(2, "saved-token", "open"));
  });

  it("saves reminder settings and updates the phone number", async () => {
    window.localStorage.setItem("vaccination-tracker-auth-token", "saved-token");
    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue({ user: { id: 1, name: "Bandana Pandey", email: "bandana@example.com", phone_number: null }, auth: { available_methods: ["password"], oauth_ready: true }, profiles: authPayload({ date_of_birth: "1990-01-01" }) });
    const updateReminderPreferenceMock = vi.spyOn(api, "updateReminderPreference").mockResolvedValue(reminderPreferencePayload({ sms_enabled: true, phone_number: "+15555550111", lead_days: 3 }));

    render(<AuthShell />);
    await waitFor(() => expect(screen.getByRole("heading", { name: /reminder settings/i })).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/mobile phone for sms/i), { target: { value: "+15555550111" } });
    fireEvent.click(screen.getByLabelText(/sms reminders/i));
    fireEvent.change(screen.getByLabelText(/lead time \(days\)/i), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: /save reminder settings/i }));

    await waitFor(() => expect(updateReminderPreferenceMock).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText(/reminder settings saved/i)).toBeInTheDocument());
    expect(screen.getByText("+15555550111")).toBeInTheDocument();
  });

  it("requires a phone number before enabling sms reminders", async () => {
    window.localStorage.setItem("vaccination-tracker-auth-token", "saved-token");
    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue({ user: { id: 1, name: "Bandana Pandey", email: "bandana@example.com", phone_number: null }, auth: { available_methods: ["password"], oauth_ready: true }, profiles: authPayload({ date_of_birth: "1990-01-01" }) });
    const updateReminderPreferenceMock = vi.spyOn(api, "updateReminderPreference");

    render(<AuthShell />);
    await waitFor(() => expect(screen.getByRole("heading", { name: /reminder settings/i })).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText(/sms reminders/i));
    fireEvent.click(screen.getByRole("button", { name: /save reminder settings/i }));

    await waitFor(() => expect(screen.getByText(/add a phone number to enable sms reminders/i)).toBeInTheDocument());
    expect(updateReminderPreferenceMock).not.toHaveBeenCalled();
  });

  it("runs reminders now and refreshes reminder history", async () => {
    window.localStorage.setItem("vaccination-tracker-auth-token", "saved-token");
    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue({ user: { id: 1, name: "Bandana Pandey", email: "bandana@example.com", phone_number: "+15555550111" }, auth: { available_methods: ["password"], oauth_ready: true }, profiles: authPayload({ date_of_birth: "1990-01-01" }) });
    vi.spyOn(api, "fetchReminderPreference").mockResolvedValue(reminderPreferencePayload({ phone_number: "+15555550111", sms_enabled: true }));
    const fetchReminderDeliveriesMock = vi.spyOn(api, "fetchReminderDeliveries")
      .mockResolvedValueOnce(reminderDeliveryPayload())
      .mockResolvedValueOnce(reminderDeliveryPayload({ id: 32, channel: "sms", vaccine_name: "MMR" }));
    const runRemindersNowMock = vi.spyOn(api, "runRemindersNow").mockResolvedValue({ generated_at: "2026-05-09T09:00:00Z", attempted: 2, sent: 2, failed: 0, skipped: 1, candidates: 1 });

    render(<AuthShell />);
    await waitFor(() => expect(screen.getByRole("heading", { name: /reminder settings/i })).toBeInTheDocument());

    await waitFor(() => expect(screen.getByRole("button", { name: /run reminders now/i })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: /run reminders now/i }));

    await waitFor(() => expect(runRemindersNowMock).toHaveBeenCalledWith("saved-token"));
    await waitFor(() => expect(fetchReminderDeliveriesMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByText(/2 sent, 0 failed, 1 skipped/i)).toBeInTheDocument());
    expect(screen.getByText(/MMR/i)).toBeInTheDocument();
  });
});
