"use client";

import { type ChangeEvent, type FormEvent, useEffect, useState, useTransition } from "react";
import {
  createProfile,
  createVaccinationRecord,
  deleteProfile,
  deleteVaccinationRecord,
  fetchCalendar,
  fetchCurrentUser,
  fetchDashboard,
  fetchProfileSchedule,
  fetchVaccinationRecords,
  login,
  logout,
  signUp,
  updateProfile,
  updateVaccinationRecord,
  type AuthMetadata,
  type CalendarDay,
  type CalendarResponse,
  type CurrentUser,
  type DashboardResponse,
  type Profile,
  type ProfileInput,
  type ProfileSchedule,
  type ScheduleStatus,
  type VaccinationRecord,
  type VaccinationRecordInput,
} from "@/lib/api";

const storageKey = "vaccination-tracker-auth-token";

type AuthMode = "login" | "signup";
type ProfileFormMode = "create" | "edit";
type RecordFormMode = "create" | "edit";

const emptyLoginForm = { email: "", password: "" };
const emptySignUpForm = { name: "", email: "", password: "", password_confirmation: "" };
const emptyProfileForm: ProfileInput = { name: "", date_of_birth: "", gender: "", relationship_kind: "child", medical_notes: "", schedule_region: "IN" };
const emptyRecordForm: VaccinationRecordInput = { vaccine_name: "", date_administered: "", dose_number: "", provider: "", notes: "", proof: null, remove_proof: false };

export function AuthShell() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [authMetadata, setAuthMetadata] = useState<AuthMetadata | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [calendar, setCalendar] = useState<CalendarResponse | null>(null);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(getCurrentMonthKey());
  const [recordsByProfile, setRecordsByProfile] = useState<Record<number, VaccinationRecord[]>>({});
  const [schedulesByProfile, setSchedulesByProfile] = useState<Record<number, ProfileSchedule>>({});
  const [activeProfileId, setActiveProfileId] = useState<number | null>(null);
  const [profileMode, setProfileMode] = useState<ProfileFormMode>("create");
  const [recordMode, setRecordMode] = useState<RecordFormMode>("create");
  const [profileForm, setProfileForm] = useState<ProfileInput>(emptyProfileForm);
  const [recordForm, setRecordForm] = useState<VaccinationRecordInput>(emptyRecordForm);
  const [editingProfileId, setEditingProfileId] = useState<number | null>(null);
  const [editingRecordId, setEditingRecordId] = useState<number | null>(null);
  const [loginForm, setLoginForm] = useState(emptyLoginForm);
  const [signUpForm, setSignUpForm] = useState(emptySignUpForm);
  const [error, setError] = useState<string | null>(null);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [isPending, startTransition] = useTransition();

  const activeProfile = profiles.find((profile) => profile.id === activeProfileId) ?? profiles[0] ?? null;
  const activeRecords = activeProfile ? recordsByProfile[activeProfile.id] ?? [] : [];
  const activeSchedule = activeProfile ? schedulesByProfile[activeProfile.id] ?? null : null;
  const selectedCalendarDay = calendar?.days.find((day) => day.date === selectedCalendarDate) ?? null;

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      const savedToken = window.localStorage.getItem(storageKey);
      if (!savedToken) {
        if (isMounted) setLoadingSession(false);
        return;
      }

      startTransition(async () => {
        try {
          const response = await fetchCurrentUser(savedToken);
          if (!isMounted) return;
          applySession(savedToken, response.user, response.auth, response.profiles);
        } catch {
          window.localStorage.removeItem(storageKey);
        } finally {
          if (isMounted) setLoadingSession(false);
        }
      });
    }

    void restoreSession();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (!token || !activeProfileId) return;
    let isMounted = true;

    async function loadRecords() {
      setLoadingRecords(true);
      setRecordsError(null);
      try {
        const records = await fetchVaccinationRecords(activeProfileId, token);
        if (!isMounted) return;
        setRecordsByProfile((current) => ({ ...current, [activeProfileId]: records }));
      } catch (loadError) {
        if (!isMounted) return;
        setRecordsError(loadError instanceof Error ? loadError.message : "Unable to load vaccination records.");
      } finally {
        if (isMounted) setLoadingRecords(false);
      }
    }

    void loadRecords();
    return () => { isMounted = false; };
  }, [token, activeProfileId]);

  useEffect(() => {
    if (!token || !activeProfileId) return;
    let isMounted = true;

    async function loadSchedule() {
      setLoadingSchedule(true);
      setScheduleError(null);
      try {
        const schedule = await fetchProfileSchedule(activeProfileId, token);
        if (!isMounted) return;
        setSchedulesByProfile((current) => ({ ...current, [activeProfileId]: schedule }));
      } catch (loadError) {
        if (!isMounted) return;
        setScheduleError(loadError instanceof Error ? loadError.message : "Unable to load the vaccination schedule.");
      } finally {
        if (isMounted) setLoadingSchedule(false);
      }
    }

    void loadSchedule();
    return () => { isMounted = false; };
  }, [token, activeProfileId]);

  useEffect(() => {
    if (!token) return;
    let isMounted = true;

    async function loadDashboard() {
      setLoadingDashboard(true);
      setDashboardError(null);
      try {
        const response = await fetchDashboard(token);
        if (!isMounted) return;
        setDashboard(response);
      } catch (loadError) {
        if (!isMounted) return;
        setDashboardError(loadError instanceof Error ? loadError.message : "Unable to load the dashboard.");
      } finally {
        if (isMounted) setLoadingDashboard(false);
      }
    }

    void loadDashboard();
    return () => { isMounted = false; };
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let isMounted = true;

    async function loadCalendar() {
      setLoadingCalendar(true);
      setCalendarError(null);
      try {
        const response = await fetchCalendar(calendarMonth, token);
        if (!isMounted) return;
        setCalendar(response);
        setSelectedCalendarDate((current) => current && response.days.some((day) => day.date === current) ? current : response.days.find((day) => day.items.length > 0)?.date ?? response.days[0]?.date ?? null);
      } catch (loadError) {
        if (!isMounted) return;
        setCalendarError(loadError instanceof Error ? loadError.message : "Unable to load the calendar.");
      } finally {
        if (isMounted) setLoadingCalendar(false);
      }
    }

    void loadCalendar();
    return () => { isMounted = false; };
  }, [token, calendarMonth]);

  function applySession(nextToken: string, user: CurrentUser, auth: AuthMetadata, nextProfiles: Profile[]) {
    const nextActiveProfileId = nextProfiles[0]?.id ?? null;
    window.localStorage.setItem(storageKey, nextToken);
    setToken(nextToken);
    setCurrentUser(user);
    setAuthMetadata(auth);
    setProfiles(nextProfiles);
    setActiveProfileId(nextActiveProfileId);
    setProfileForm(emptyProfileForm);
    setRecordForm(emptyRecordForm);
    setProfileMode("create");
    setRecordMode("create");
    setEditingProfileId(null);
    setEditingRecordId(null);
    setRecordsByProfile({});
    setSchedulesByProfile({});
    setDashboard(null);
    setCalendar(null);
    setCalendarMonth(getCurrentMonthKey());
    setSelectedCalendarDate(null);
    setError(null);
    setRecordsError(null);
    setScheduleError(null);
    setDashboardError(null);
    setCalendarError(null);
  }

  async function refreshDashboardAndCalendar(nextMonth?: string) {
    if (!token) return;
    const targetMonth = nextMonth ?? calendarMonth;
    setLoadingDashboard(true);
    setLoadingCalendar(true);
    setDashboardError(null);
    setCalendarError(null);
    try {
      const [dashboardResponse, calendarResponse] = await Promise.all([fetchDashboard(token), fetchCalendar(targetMonth, token)]);
      setDashboard(dashboardResponse);
      setCalendar(calendarResponse);
      setSelectedCalendarDate((current) => current && calendarResponse.days.some((day) => day.date === current) ? current : calendarResponse.days.find((day) => day.items.length > 0)?.date ?? calendarResponse.days[0]?.date ?? null);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Unable to refresh dashboard data.";
      setDashboardError(message);
      setCalendarError(message);
    } finally {
      setLoadingDashboard(false);
      setLoadingCalendar(false);
    }
  }

  function handleLogout() {
    startTransition(async () => {
      if (token) {
        try { await logout(token); } catch {}
      }
      window.localStorage.removeItem(storageKey);
      setToken(null); setCurrentUser(null); setAuthMetadata(null); setProfiles([]); setRecordsByProfile({}); setSchedulesByProfile({});
      setDashboard(null); setCalendar(null); setSelectedCalendarDate(null); setActiveProfileId(null); setProfileMode("create"); setRecordMode("create");
      setEditingProfileId(null); setEditingRecordId(null); setProfileForm(emptyProfileForm); setRecordForm(emptyRecordForm); setLoginForm(emptyLoginForm); setSignUpForm(emptySignUpForm);
      setError(null); setRecordsError(null); setScheduleError(null); setDashboardError(null); setCalendarError(null);
    });
  }

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const response = await login(loginForm);
        applySession(response.token, response.user, response.auth, response.profiles);
      } catch (authError) {
        setError(authError instanceof Error ? authError.message : "Unable to log in right now.");
      }
    });
  }

  function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const response = await signUp(signUpForm);
        applySession(response.token, response.user, response.auth, response.profiles);
      } catch (authError) {
        setError(authError instanceof Error ? authError.message : "Unable to create your account.");
      }
    });
  }

  function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setError(null);
    startTransition(async () => {
      try {
        if (profileMode === "edit" && editingProfileId) {
          const updated = await updateProfile(editingProfileId, profileForm, token);
          setProfiles((current) => current.map((profile) => (profile.id === updated.id ? updated : profile)));
          setActiveProfileId(updated.id);
          setSchedulesByProfile((current) => { const next = { ...current }; delete next[updated.id]; return next; });
        } else {
          const created = await createProfile(profileForm, token);
          setProfiles((current) => [...current, created]);
          setActiveProfileId(created.id);
        }
        await refreshDashboardAndCalendar();
        resetProfileComposer();
      } catch (profileError) {
        setError(profileError instanceof Error ? profileError.message : "Unable to save the profile.");
      }
    });
  }

  function handleRecordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !activeProfile) return;
    setRecordsError(null);
    startTransition(async () => {
      try {
        if (recordMode === "edit" && editingRecordId) {
          const updated = await updateVaccinationRecord(activeProfile.id, editingRecordId, recordForm, token);
          setRecordsByProfile((current) => ({ ...current, [activeProfile.id]: (current[activeProfile.id] ?? []).map((record) => record.id === updated.id ? updated : record) }));
        } else {
          const created = await createVaccinationRecord(activeProfile.id, recordForm, token);
          setRecordsByProfile((current) => ({ ...current, [activeProfile.id]: [created, ...(current[activeProfile.id] ?? [])] }));
        }
        setSchedulesByProfile((current) => { const next = { ...current }; delete next[activeProfile.id]; return next; });
        await refreshDashboardAndCalendar();
        resetRecordComposer();
      } catch (recordError) {
        setRecordsError(recordError instanceof Error ? recordError.message : "Unable to save the vaccination record.");
      }
    });
  }

  function handleEditProfile(profile: Profile) {
    setProfileMode("edit");
    setEditingProfileId(profile.id);
    setActiveProfileId(profile.id);
    setProfileForm({ name: profile.name, date_of_birth: profile.date_of_birth ?? "", gender: profile.gender ?? "", relationship_kind: profile.relationship_kind, medical_notes: profile.medical_notes ?? "", schedule_region: profile.schedule_region });
    setError(null);
  }

  function handleEditRecord(record: VaccinationRecord) {
    setRecordMode("edit");
    setEditingRecordId(record.id);
    setRecordForm({ vaccine_name: record.vaccine_name, date_administered: record.date_administered, dose_number: record.dose_number ? String(record.dose_number) : "", provider: record.provider ?? "", notes: record.notes ?? "", proof: null, remove_proof: false });
    setRecordsError(null);
  }

  function handleDeleteProfile(profileId: number) {
    if (!token) return;
    startTransition(async () => {
      try {
        await deleteProfile(profileId, token);
        const nextProfiles = profiles.filter((profile) => profile.id !== profileId);
        setProfiles(nextProfiles);
        setActiveProfileId((currentActive) => currentActive === profileId ? nextProfiles[0]?.id ?? null : currentActive);
        setRecordsByProfile((current) => { const next = { ...current }; delete next[profileId]; return next; });
        setSchedulesByProfile((current) => { const next = { ...current }; delete next[profileId]; return next; });
        await refreshDashboardAndCalendar();
        if (editingProfileId === profileId) resetProfileComposer();
      } catch (profileError) {
        setError(profileError instanceof Error ? profileError.message : "Unable to delete the profile.");
      }
    });
  }

  function handleDeleteRecord(recordId: number) {
    if (!token || !activeProfile) return;
    startTransition(async () => {
      try {
        await deleteVaccinationRecord(activeProfile.id, recordId, token);
        setRecordsByProfile((current) => ({ ...current, [activeProfile.id]: (current[activeProfile.id] ?? []).filter((record) => record.id !== recordId) }));
        setSchedulesByProfile((current) => { const next = { ...current }; delete next[activeProfile.id]; return next; });
        await refreshDashboardAndCalendar();
        if (editingRecordId === recordId) resetRecordComposer();
      } catch (recordError) {
        setRecordsError(recordError instanceof Error ? recordError.message : "Unable to delete the vaccination record.");
      }
    });
  }

  function handleActiveProfileChange(profileId: number) {
    setActiveProfileId(profileId);
    const profile = profiles.find((item) => item.id === profileId);
    if (profile && profileMode === "edit") handleEditProfile(profile);
    resetRecordComposer();
  }

  function handleCalendarMonthChange(direction: -1 | 1) {
    const nextMonth = shiftMonth(calendarMonth, direction);
    setCalendarMonth(nextMonth);
  }

  function resetProfileComposer() { setProfileMode("create"); setEditingProfileId(null); setProfileForm(emptyProfileForm); setError(null); }
  function resetRecordComposer() { setRecordMode("create"); setEditingRecordId(null); setRecordForm(emptyRecordForm); setRecordsError(null); }
  function handleProofChange(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0] ?? null; setRecordForm((current) => ({ ...current, proof: file, remove_proof: false })); }

  const schedulePreviewItems = getSchedulePreviewItems(activeSchedule);
  const dashboardProfiles = dashboard?.profiles ?? [];
  const attentionItems = dashboard?.attention_items ?? [];
  const recentActivity = dashboard?.recent_activity ?? [];
  const calendarDays = calendar?.days ?? [];

  if (loadingSession) {
    return <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#dbeafe,_#f8fafc_45%,_#ffffff_75%)] px-5 py-10"><div className="mx-auto max-w-3xl rounded-[2rem] border border-sky-100 bg-white/90 p-8 shadow-[0_24px_80px_rgba(14,116,144,0.12)]"><p className="text-sm font-semibold tracking-[0.18em] text-sky-700 uppercase">Vaccination Tracker</p><h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">Restoring your vaccination workspace...</h1></div></main>;
  }

  if (token && currentUser) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#cffafe,_#f8fafc_45%,_#ffffff_75%)] px-5 py-8 text-slate-900 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6">
          <section className="rounded-[2rem] border border-cyan-100 bg-white/90 p-6 shadow-[0_24px_80px_rgba(8,145,178,0.12)] sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-3">
                <span className="inline-flex rounded-full bg-cyan-100 px-3 py-1 text-sm font-semibold text-cyan-800">Family vaccination dashboard</span>
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Welcome, {currentUser.name}</h1>
                  <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">Track your whole household’s vaccine progress, review urgent schedule items, and manage individual proof-backed records from one responsive workspace.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-4">
                  <InfoCard label="Account email" value={currentUser.email} />
                  <InfoCard label="Profiles tracked" value={String(dashboard?.family_summary.total_profiles ?? profiles.length)} />
                  <InfoCard label="Overdue doses" value={String(dashboard?.family_summary.overdue ?? 0)} tone="rose" />
                  <InfoCard label="OAuth readiness" value={authMetadata?.oauth_ready ? "Provider model ready" : "Password only"} />
                </div>
              </div>
              <button type="button" onClick={handleLogout} disabled={isPending} className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70">{isPending ? "Logging out..." : "Log out"}</button>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
            <div className="space-y-6">
              <section className="rounded-[2rem] border border-cyan-100 bg-white/90 p-6 shadow-[0_18px_50px_rgba(8,145,178,0.1)] sm:p-8">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-semibold text-slate-950">Family overview</h2>
                    <p className="mt-1 text-sm text-slate-600">Account-wide schedule totals derived from every family member profile.</p>
                  </div>
                  {loadingDashboard ? <span className="text-sm font-medium text-slate-500">Refreshing...</span> : null}
                </div>
                {dashboardError ? <p className="mt-4 text-sm text-rose-500">{dashboardError}</p> : null}
                <div className="mt-5 grid gap-3 sm:grid-cols-4">
                  <SummaryCard label="Profiles" count={dashboard?.family_summary.total_profiles ?? profiles.length} tone="slate" />
                  <SummaryCard label="Completed" count={dashboard?.family_summary.completed ?? 0} tone="emerald" />
                  <SummaryCard label="Upcoming" count={dashboard?.family_summary.upcoming ?? 0} tone="sky" />
                  <SummaryCard label="Overdue" count={dashboard?.family_summary.overdue ?? 0} tone="rose" />
                </div>
              </section>

              <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                <section className="rounded-[2rem] border border-cyan-100 bg-white/90 p-6 shadow-[0_18px_50px_rgba(8,145,178,0.1)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-950">Needs attention</h2>
                      <p className="mt-1 text-sm text-slate-600">Overdue items are prioritized before upcoming doses.</p>
                    </div>
                  </div>
                  <div className="mt-5 space-y-3">
                    {attentionItems.length > 0 ? attentionItems.map((item) => (
                      <article key={`${item.profile_id}-${item.schedule_key}`} className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-950">{item.profile_name} · {item.vaccine_name}</p>
                            <p className="mt-1 text-sm text-slate-600">{item.dose_label} due on {item.due_date}</p>
                            <p className="mt-1 text-sm text-slate-500">{item.relationship_kind} · {item.schedule_region}</p>
                          </div>
                          <StatusPill status={item.status} />
                        </div>
                      </article>
                    )) : <EmptyState text="No urgent family schedule items right now." />}
                  </div>
                </section>

                <section className="rounded-[2rem] border border-cyan-100 bg-white/90 p-6 shadow-[0_18px_50px_rgba(8,145,178,0.1)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-950">Recent activity</h2>
                      <p className="mt-1 text-sm text-slate-600">Latest recorded vaccinations across the family.</p>
                    </div>
                  </div>
                  <div className="mt-5 space-y-3">
                    {recentActivity.length > 0 ? recentActivity.map((item) => (
                      <article key={item.id} className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
                        <p className="text-sm font-semibold text-slate-950">{item.profile_name} · {item.vaccine_name}</p>
                        <p className="mt-1 text-sm text-slate-600">Recorded on {item.date_administered}{item.dose_number ? ` · Dose ${item.dose_number}` : ""}</p>
                        <p className="mt-1 text-sm text-slate-500">{item.provider || "Provider not recorded"}{item.proof_attached ? " · Proof attached" : ""}</p>
                      </article>
                    )) : <EmptyState text="No vaccination records captured yet." />}
                  </div>
                </section>
              </section>

              <section className="rounded-[2rem] border border-cyan-100 bg-white/90 p-6 shadow-[0_18px_50px_rgba(8,145,178,0.1)] sm:p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-slate-950">Family members</h2>
                    <p className="mt-1 text-sm text-slate-600">Rollup view for every profile, with quick selection into the detail workspace below.</p>
                  </div>
                  <button type="button" onClick={resetProfileComposer} className="rounded-full border border-cyan-200 px-4 py-2 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-50">New profile</button>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {dashboardProfiles.length > 0 ? dashboardProfiles.map((profile) => (
                    <button key={profile.id} type="button" onClick={() => handleActiveProfileChange(profile.id)} className={`rounded-[1.4rem] border p-5 text-left transition ${activeProfile?.id === profile.id ? "border-cyan-300 bg-cyan-50 shadow-[0_10px_30px_rgba(8,145,178,0.08)]" : "border-slate-200 bg-slate-50 hover:border-cyan-200 hover:bg-white"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-slate-950">{profile.name}</p>
                          <p className="mt-1 text-sm capitalize text-slate-600">{profile.relationship_kind}</p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold tracking-[0.14em] text-slate-600 uppercase">{profile.schedule_region}</span>
                      </div>
                      <div className="mt-4 grid gap-2 sm:grid-cols-3">
                        <MiniMetric label="Done" value={profile.summary.completed} tone="emerald" />
                        <MiniMetric label="Soon" value={profile.summary.upcoming} tone="sky" />
                        <MiniMetric label="Late" value={profile.summary.overdue} tone="rose" />
                      </div>
                      <div className="mt-4 space-y-2">
                        {profile.has_date_of_birth ? profile.next_items.length > 0 ? profile.next_items.map((item) => <p key={item.schedule_key} className="text-sm text-slate-600">{item.vaccine_name} · {item.dose_label} · {item.due_date}</p>) : <p className="text-sm text-slate-500">No pending schedule items.</p> : <p className="text-sm text-amber-700">Add DOB to generate schedule items.</p>}
                      </div>
                    </button>
                  )) : <EmptyState text="No family profiles yet. Create one to get started." />}
                </div>
              </section>

              <section className="rounded-[2rem] border border-cyan-100 bg-white/90 p-6 shadow-[0_18px_50px_rgba(8,145,178,0.1)] sm:p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-slate-950">Monthly calendar</h2>
                    <p className="mt-1 text-sm text-slate-600">Inline calendar of derived scheduled doses for the selected month.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => handleCalendarMonthChange(-1)} className="rounded-full border border-cyan-200 px-4 py-2 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-50">Previous</button>
                    <span className="text-sm font-semibold text-slate-700">{formatMonthLabel(calendarMonth)}</span>
                    <button type="button" onClick={() => handleCalendarMonthChange(1)} className="rounded-full border border-cyan-200 px-4 py-2 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-50">Next</button>
                  </div>
                </div>
                {calendarError ? <p className="mt-4 text-sm text-rose-500">{calendarError}</p> : null}
                <div className="mt-5 overflow-x-auto">
                  <div className="grid min-w-[720px] grid-cols-7 gap-3">
                    {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((weekday) => <p key={weekday} className="px-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{weekday}</p>)}
                    {buildCalendarCells(calendarDays).map((cell) => cell ? (
                      <button key={cell.date} type="button" onClick={() => setSelectedCalendarDate(cell.date)} className={`min-h-[120px] rounded-[1.2rem] border p-3 text-left transition ${selectedCalendarDate === cell.date ? 'border-cyan-300 bg-cyan-50 shadow-[0_10px_24px_rgba(8,145,178,0.1)]' : 'border-slate-200 bg-slate-50 hover:border-cyan-200 hover:bg-white'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-slate-950">{cell.date.slice(-2)}</span>
                          {cell.items.length > 0 ? <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-600">{cell.items.length}</span> : null}
                        </div>
                        <div className="mt-3 space-y-2">
                          {cell.items.slice(0, 2).map((item) => <p key={`${cell.date}-${item.profile_id}-${item.schedule_key}`} className={`rounded-full px-2 py-1 text-xs font-semibold ${pillClass(item.status)}`}>{item.profile_name}: {item.vaccine_name}</p>)}
                          {cell.items.length > 2 ? <p className="text-xs text-slate-500">+{cell.items.length - 2} more</p> : null}
                        </div>
                      </button>
                    ) : <div key={`blank-${Math.random()}`} className="min-h-[120px] rounded-[1.2rem] border border-transparent" />)}
                  </div>
                </div>
                <div className="mt-5 rounded-[1.4rem] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-slate-950">Selected day</h3>
                    {loadingCalendar ? <span className="text-sm text-slate-500">Loading...</span> : null}
                  </div>
                  <div className="mt-4 space-y-3">
                    {selectedCalendarDay ? selectedCalendarDay.items.length > 0 ? selectedCalendarDay.items.map((item) => (
                      <article key={`${selectedCalendarDay.date}-${item.profile_id}-${item.schedule_key}`} className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-950">{item.profile_name} · {item.vaccine_name}</p>
                            <p className="mt-1 text-sm text-slate-600">{item.dose_label} · {item.recommended_age_window}</p>
                          </div>
                          <StatusPill status={item.status} />
                        </div>
                      </article>
                    )) : <EmptyState text={`No scheduled items on ${selectedCalendarDay.date}.`} /> : <EmptyState text="Select a day to inspect its scheduled items." />}
                  </div>
                </div>
              </section>
            </div>

            <div className="space-y-6">
              {activeProfile ? (
                <section className="rounded-[2rem] border border-cyan-100 bg-white/90 p-6 shadow-[0_18px_50px_rgba(8,145,178,0.1)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-950">Selected profile</h2>
                      <p className="mt-1 text-sm text-slate-600">Focused detail view for record management.</p>
                    </div>
                    <button type="button" onClick={() => handleEditProfile(activeProfile)} className="rounded-full border border-cyan-200 px-4 py-2 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-50">Edit profile</button>
                  </div>
                  <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                    <DetailCard label="Name" value={activeProfile.name} />
                    <DetailCard label="Relationship" value={capitalize(activeProfile.relationship_kind)} />
                    <DetailCard label="Date of birth" value={activeProfile.date_of_birth || "Not set"} />
                    <DetailCard label="Gender" value={activeProfile.gender || "Not set"} />
                    <DetailCard label="Schedule region" value={activeProfile.schedule_region} />
                    <DetailCard label="Medical notes" value={activeProfile.medical_notes || "No notes added"} />
                  </dl>
                </section>
              ) : null}

              <section className="rounded-[2rem] border border-cyan-100 bg-white/90 p-6 shadow-[0_18px_50px_rgba(8,145,178,0.1)] sm:p-8">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-950">Active profile schedule</h2>
                    <p className="mt-1 text-sm text-slate-600">Compact per-profile schedule details beside the family dashboard.</p>
                  </div>
                  {loadingSchedule ? <span className="text-sm font-medium text-slate-500">Loading...</span> : null}
                </div>
                {scheduleError ? <p className="mt-4 text-sm text-rose-500">{scheduleError}</p> : null}
                {activeProfile ? activeSchedule ? activeSchedule.missing_date_of_birth ? <div className="mt-5 rounded-[1.4rem] border border-dashed border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">Add a date of birth for {activeProfile.name} to generate the routine vaccination schedule preview.</div> : <><div className="mt-5 grid gap-3 sm:grid-cols-3"><ScheduleSummaryCard label="Completed" status="completed" count={activeSchedule.summary.completed} /><ScheduleSummaryCard label="Upcoming" status="upcoming" count={activeSchedule.summary.upcoming} /><ScheduleSummaryCard label="Overdue" status="overdue" count={activeSchedule.summary.overdue} /></div><div className="mt-5 space-y-3">{schedulePreviewItems.map((item) => <article key={item.schedule_key} className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4"><div className="flex flex-col gap-3"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-slate-950">{item.vaccine_name}</h3><StatusPill status={item.status} /></div><p className="text-sm text-slate-600">{item.dose_label} due on {item.due_date}</p></div></article>)}</div></> : <EmptyState text="Loading the active profile schedule." /> : <EmptyState text="Select a profile to see the routine vaccination schedule." />}
              </section>

              <section className="rounded-[2rem] bg-slate-950 p-6 text-slate-50 shadow-[0_24px_80px_rgba(15,23,42,0.28)] sm:p-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-white">{profileMode === "edit" ? "Edit profile" : "Create family profile"}</h2>
                    <p className="mt-1 text-sm text-slate-300">Keep self, child, and dependent details current while their vaccination history grows.</p>
                  </div>
                  {profileMode === "edit" ? <button type="button" onClick={resetProfileComposer} className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10">Cancel edit</button> : null}
                </div>
                <form className="mt-8 grid gap-4" onSubmit={handleProfileSubmit}>
                  <AuthField label="Full name" value={profileForm.name} onChange={(value) => setProfileForm((current) => ({ ...current, name: value }))} placeholder="Aarav Pandey" />
                  <div className="grid gap-4 sm:grid-cols-2"><SelectField label="Relationship" value={profileForm.relationship_kind} onChange={(value) => setProfileForm((current) => ({ ...current, relationship_kind: value as ProfileInput["relationship_kind"] }))} options={[{ label: "Self", value: "self" }, { label: "Child", value: "child" }, { label: "Dependent", value: "dependent" }]} /><SelectField label="Schedule region" value={profileForm.schedule_region} onChange={(value) => setProfileForm((current) => ({ ...current, schedule_region: value }))} options={[{ label: "India", value: "IN" }, { label: "United States", value: "US" }]} /></div>
                  <div className="grid gap-4 sm:grid-cols-2"><AuthField label="Date of birth" type="date" value={profileForm.date_of_birth} onChange={(value) => setProfileForm((current) => ({ ...current, date_of_birth: value }))} placeholder="" required={false} /><AuthField label="Gender" value={profileForm.gender} onChange={(value) => setProfileForm((current) => ({ ...current, gender: value }))} placeholder="Optional" required={false} /></div>
                  <TextAreaField label="Medical notes" value={profileForm.medical_notes} onChange={(value) => setProfileForm((current) => ({ ...current, medical_notes: value }))} placeholder="Allergies, notes from clinician, or other context" />
                  <div className="flex flex-col gap-3 sm:flex-row"><button type="submit" disabled={isPending} className="rounded-full bg-cyan-100 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-70">{isPending ? profileMode === "edit" ? "Saving profile..." : "Creating profile..." : profileMode === "edit" ? "Save profile" : "Create profile"}</button>{profileMode === "edit" && editingProfileId ? <button type="button" onClick={() => handleDeleteProfile(editingProfileId)} disabled={isPending} className="rounded-full border border-rose-300 px-5 py-3 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-70">Delete profile</button> : null}</div>
                </form>
                {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
              </section>

              <section className="rounded-[2rem] border border-cyan-100 bg-white/90 p-6 shadow-[0_18px_50px_rgba(8,145,178,0.1)] sm:p-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-2xl font-semibold text-slate-950">Vaccination history</h2><p className="mt-1 text-sm text-slate-600">{activeProfile ? `Manage records and proof files for ${activeProfile.name}.` : "Select a profile to manage vaccination records."}</p></div>{recordMode === "edit" ? <button type="button" onClick={resetRecordComposer} className="rounded-full border border-cyan-200 px-4 py-2 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-50">Cancel record edit</button> : null}</div>
                <form className="mt-8 grid gap-4" onSubmit={handleRecordSubmit}>
                  <div className="grid gap-4 sm:grid-cols-2"><AuthField label="Vaccine name" value={recordForm.vaccine_name} onChange={(value) => setRecordForm((current) => ({ ...current, vaccine_name: value }))} placeholder="MMR" /><AuthField label="Date administered" type="date" value={recordForm.date_administered} onChange={(value) => setRecordForm((current) => ({ ...current, date_administered: value }))} placeholder="" /></div>
                  <div className="grid gap-4 sm:grid-cols-2"><AuthField label="Dose number" type="number" value={recordForm.dose_number} onChange={(value) => setRecordForm((current) => ({ ...current, dose_number: value }))} placeholder="Optional" required={false} /><AuthField label="Provider" value={recordForm.provider} onChange={(value) => setRecordForm((current) => ({ ...current, provider: value }))} placeholder="Clinic or hospital" required={false} /></div>
                  <TextAreaField label="Vaccination notes" value={recordForm.notes} onChange={(value) => setRecordForm((current) => ({ ...current, notes: value }))} placeholder="Dose details, reactions, or follow-up notes" />
                  <FileField label="Proof document" onChange={handleProofChange} helperText={recordForm.proof ? `Selected file: ${recordForm.proof.name}` : "Attach an image or PDF certificate."} />
                  {recordMode === "edit" ? <CheckboxField label="Remove existing proof" checked={Boolean(recordForm.remove_proof)} onChange={(checked) => setRecordForm((current) => ({ ...current, remove_proof: checked, proof: checked ? null : current.proof }))} /> : null}
                  <div className="flex flex-col gap-3 sm:flex-row"><button type="submit" disabled={isPending || !activeProfile} className="rounded-full bg-sky-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-70">{isPending ? recordMode === "edit" ? "Saving record..." : "Creating record..." : recordMode === "edit" ? "Save vaccination record" : "Add vaccination record"}</button></div>
                </form>
                {recordsError ? <p className="mt-4 text-sm text-rose-500">{recordsError}</p> : null}
              </section>

              <section className="rounded-[2rem] border border-cyan-100 bg-white/90 p-6 shadow-[0_18px_50px_rgba(8,145,178,0.1)] sm:p-8">
                <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-semibold text-slate-950">Recorded doses</h2><p className="mt-1 text-sm text-slate-600">Latest vaccination entries for the active profile.</p></div>{loadingRecords ? <span className="text-sm font-medium text-slate-500">Loading...</span> : null}</div>
                <div className="mt-5 grid gap-4">{activeProfile ? activeRecords.length > 0 ? activeRecords.map((record) => <article key={record.id} className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="space-y-2"><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-semibold text-slate-950">{record.vaccine_name}</h3>{record.dose_number ? <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold tracking-[0.14em] text-slate-600 uppercase">Dose {record.dose_number}</span> : null}</div><p className="text-sm text-slate-600">Administered on {record.date_administered}</p><p className="text-sm text-slate-600">Provider: {record.provider || "Not recorded"}</p><p className="text-sm text-slate-600">Notes: {record.notes || "No notes added"}</p>{record.proof_attached ? <div className="rounded-[1rem] border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900"><p className="font-semibold">Proof attached</p><p>{record.proof_filename} ({record.proof_content_type})</p>{record.proof_url ? <a href={record.proof_url} className="mt-2 inline-flex text-sm font-semibold text-cyan-800 underline" target="_blank" rel="noreferrer">View proof</a> : null}</div> : <p className="text-sm text-slate-500">No proof attached</p>}</div><div className="flex flex-col gap-2 sm:items-end"><button type="button" onClick={() => handleEditRecord(record)} className="rounded-full border border-cyan-200 px-4 py-2 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-50">Edit record</button><button type="button" onClick={() => handleDeleteRecord(record.id)} className="rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50">Delete record</button></div></div></article>) : <EmptyState text="No vaccination records yet for this profile. Add the first record above." /> : <EmptyState text="Select a profile to see vaccination history." />}</div>
              </section>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#dbeafe,_#eff6ff_45%,_#ffffff_75%)] px-5 py-8 text-slate-900 sm:px-8 lg:px-10"><div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]"><section className="rounded-[2rem] border border-sky-100 bg-white/90 p-6 shadow-[0_24px_80px_rgba(14,116,144,0.12)] sm:p-8"><span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-sky-800">Secure family vaccination records</span><h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">Sign in to start tracking vaccinations with an API-first health record workspace.</h1><p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">This milestone adds email/password authentication now, while keeping the backend identity model ready for future OAuth providers.</p><div className="mt-8 grid gap-4 sm:grid-cols-2"><InfoCard label="Available now" value="Email and password login" /><InfoCard label="Designed next" value="Google and other OAuth providers" /><InfoCard label="Frontend" value="Responsive Next.js client" /><InfoCard label="Backend" value="Stateless Rails API auth" /></div></section><section className="rounded-[2rem] bg-slate-950 p-6 text-slate-50 shadow-[0_24px_80px_rgba(15,23,42,0.28)] sm:p-8"><div className="flex flex-wrap gap-3"><button type="button" onClick={() => setMode("login")} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${mode === "login" ? "bg-cyan-100 text-slate-950" : "border border-white/15 text-slate-100 hover:bg-white/10"}`}>Log in</button><button type="button" onClick={() => setMode("signup")} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${mode === "signup" ? "bg-cyan-100 text-slate-950" : "border border-white/15 text-slate-100 hover:bg-white/10"}`}>Create account</button></div>{mode === "login" ? <form className="mt-8 grid gap-4" onSubmit={handleLogin}><AuthField label="Email" type="email" value={loginForm.email} onChange={(value) => setLoginForm((current) => ({ ...current, email: value }))} placeholder="you@example.com" /><AuthField label="Password" type="password" value={loginForm.password} onChange={(value) => setLoginForm((current) => ({ ...current, password: value }))} placeholder="At least 8 characters" /><button type="submit" disabled={isPending} className="mt-2 rounded-full bg-cyan-100 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-70">{isPending ? "Logging in..." : "Log in"}</button></form> : <form className="mt-8 grid gap-4" onSubmit={handleSignup}><AuthField label="Name" value={signUpForm.name} onChange={(value) => setSignUpForm((current) => ({ ...current, name: value }))} placeholder="Bandana Pandey" /><AuthField label="Email" type="email" value={signUpForm.email} onChange={(value) => setSignUpForm((current) => ({ ...current, email: value }))} placeholder="you@example.com" /><AuthField label="Password" type="password" value={signUpForm.password} onChange={(value) => setSignUpForm((current) => ({ ...current, password: value }))} placeholder="At least 8 characters" /><AuthField label="Confirm password" type="password" value={signUpForm.password_confirmation} onChange={(value) => setSignUpForm((current) => ({ ...current, password_confirmation: value }))} placeholder="Repeat your password" /><button type="submit" disabled={isPending} className="mt-2 rounded-full bg-cyan-100 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-70">{isPending ? "Creating account..." : "Create account"}</button></form>}{error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}</section></div></main>;
}

function getCurrentMonthKey() { return new Date().toISOString().slice(0, 7); }
function shiftMonth(month: string, delta: number) { const [year, value] = month.split('-').map(Number); const date = new Date(year, value - 1 + delta, 1); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; }
function formatMonthLabel(month: string) { const [year, value] = month.split('-').map(Number); return new Date(year, value - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }); }
function getSchedulePreviewItems(schedule: ProfileSchedule | null) { if (!schedule) return []; return [...schedule.items].sort((left, right) => { const rank = statusRank(left.status) - statusRank(right.status); if (rank !== 0) return rank; return left.due_date.localeCompare(right.due_date); }).slice(0, 5); }
function statusRank(status: ScheduleStatus) { switch (status) { case 'overdue': return 0; case 'upcoming': return 1; default: return 2; } }
function buildCalendarCells(days: CalendarDay[]) { if (days.length === 0) return []; const firstDate = new Date(`${days[0].date}T00:00:00`); const blanks = Array.from({ length: firstDate.getDay() }, () => null); return [...blanks, ...days]; }
function pillClass(status: ScheduleStatus) { return status === 'completed' ? 'bg-emerald-100 text-emerald-800' : status === 'upcoming' ? 'bg-sky-100 text-sky-800' : 'bg-rose-100 text-rose-800'; }

function AuthField({ label, value, onChange, placeholder, type = "text", required = true }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: "text" | "email" | "password" | "date" | "number"; required?: boolean; }) { return <label className="grid gap-2 text-sm"><span className="text-slate-200">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="rounded-[1.1rem] border border-white/15 bg-white/8 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-cyan-100 focus:bg-white/12" required={required} /></label>; }
function TextAreaField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; }) { return <label className="grid gap-2 text-sm"><span className="text-slate-200">{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={4} className="rounded-[1.1rem] border border-white/15 bg-white/8 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-cyan-100 focus:bg-white/12" /></label>; }
function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ label: string; value: string }>; }) { return <label className="grid gap-2 text-sm"><span className="text-slate-200">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-[1.1rem] border border-white/15 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-100">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>; }
function FileField({ label, onChange, helperText }: { label: string; onChange: (event: ChangeEvent<HTMLInputElement>) => void; helperText: string; }) { return <label className="grid gap-2 text-sm"><span className="text-slate-200">{label}</span><input type="file" accept="image/*,application/pdf" onChange={onChange} className="rounded-[1.1rem] border border-white/15 bg-white/8 px-4 py-3 text-sm text-white outline-none transition file:mr-4 file:rounded-full file:border-0 file:bg-cyan-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-950 hover:file:bg-cyan-50" /><span className="text-xs text-slate-400">{helperText}</span></label>; }
function CheckboxField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void; }) { return <label className="flex items-center gap-3 text-sm text-slate-200"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-cyan-500 focus:ring-cyan-400" /><span>{label}</span></label>; }
function InfoCard({ label, value, tone = 'slate' }: { label: string; value: string; tone?: 'slate' | 'rose' }) { const palette = tone === 'rose' ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-slate-50'; return <div className={`rounded-[1.4rem] border p-4 ${palette}`}><p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">{label}</p><p className="mt-2 text-sm font-medium text-slate-900">{value}</p></div>; }
function DetailCard({ label, value }: { label: string; value: string }) { return <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">{label}</p><p className="mt-2 text-sm font-medium text-slate-900">{value}</p></div>; }
function ScheduleSummaryCard({ label, status, count }: { label: string; status: ScheduleStatus; count: number }) { const palette = status === 'completed' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : status === 'upcoming' ? 'border-sky-200 bg-sky-50 text-sky-900' : 'border-rose-200 bg-rose-50 text-rose-900'; return <div className={`rounded-[1.4rem] border p-4 ${palette}`}><p className="text-xs font-semibold tracking-[0.16em] uppercase">{label}</p><p className="mt-2 text-2xl font-semibold">{count}</p></div>; }
function SummaryCard({ label, count, tone }: { label: string; count: number; tone: 'slate' | 'emerald' | 'sky' | 'rose' }) { const palette = tone === 'emerald' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : tone === 'sky' ? 'border-sky-200 bg-sky-50 text-sky-900' : tone === 'rose' ? 'border-rose-200 bg-rose-50 text-rose-900' : 'border-slate-200 bg-slate-50 text-slate-900'; return <div className={`rounded-[1.4rem] border p-4 ${palette}`}><p className="text-xs font-semibold tracking-[0.16em] uppercase">{label}</p><p className="mt-2 text-3xl font-semibold">{count}</p></div>; }
function MiniMetric({ label, value, tone }: { label: string; value: number; tone: 'emerald' | 'sky' | 'rose' }) { const palette = tone === 'emerald' ? 'bg-emerald-100 text-emerald-800' : tone === 'sky' ? 'bg-sky-100 text-sky-800' : 'bg-rose-100 text-rose-800'; return <div className={`rounded-full px-3 py-2 text-center text-xs font-semibold ${palette}`}>{label}: {value}</div>; }
function StatusPill({ status }: { status: ScheduleStatus }) { return <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${pillClass(status)}`}>{status}</span>; }
function EmptyState({ text }: { text: string }) { return <div className="rounded-[1.4rem] border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">{text}</div>; }
function capitalize(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }
