"use client";

import { type ChangeEvent, type FormEvent, useEffect, useState, useTransition } from "react";
import {
  createProfile,
  createVaccinationRecord,
  deleteProfile,
  deleteVaccinationRecord,
  fetchCurrentUser,
  fetchVaccinationRecords,
  login,
  logout,
  signUp,
  updateProfile,
  updateVaccinationRecord,
  type AuthMetadata,
  type CurrentUser,
  type Profile,
  type ProfileInput,
  type VaccinationRecord,
  type VaccinationRecordInput,
} from "@/lib/api";

const storageKey = "vaccination-tracker-auth-token";

type AuthMode = "login" | "signup";
type ProfileFormMode = "create" | "edit";
type RecordFormMode = "create" | "edit";

const emptyLoginForm = { email: "", password: "" };
const emptySignUpForm = { name: "", email: "", password: "", password_confirmation: "" };
const emptyProfileForm: ProfileInput = {
  name: "",
  date_of_birth: "",
  gender: "",
  relationship_kind: "child",
  medical_notes: "",
  schedule_region: "IN",
};
const emptyRecordForm: VaccinationRecordInput = {
  vaccine_name: "",
  date_administered: "",
  dose_number: "",
  provider: "",
  notes: "",
  proof: null,
  remove_proof: false,
};

export function AuthShell() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [authMetadata, setAuthMetadata] = useState<AuthMetadata | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [recordsByProfile, setRecordsByProfile] = useState<Record<number, VaccinationRecord[]>>({});
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
  const [loadingSession, setLoadingSession] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [isPending, startTransition] = useTransition();

  const activeProfile = profiles.find((profile) => profile.id === activeProfileId) ?? profiles[0] ?? null;
  const activeRecords = activeProfile ? recordsByProfile[activeProfile.id] ?? [] : [];

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
    return () => {
      isMounted = false;
    };
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

    return () => {
      isMounted = false;
    };
  }, [token, activeProfileId]);

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
    setError(null);
    setRecordsError(null);
  }

  function handleLogout() {
    startTransition(async () => {
      if (token) {
        try {
          await logout(token);
        } catch {
          // Stateless auth still allows client-side cleanup.
        }
      }

      window.localStorage.removeItem(storageKey);
      setToken(null);
      setCurrentUser(null);
      setAuthMetadata(null);
      setProfiles([]);
      setRecordsByProfile({});
      setActiveProfileId(null);
      setProfileMode("create");
      setRecordMode("create");
      setEditingProfileId(null);
      setEditingRecordId(null);
      setProfileForm(emptyProfileForm);
      setRecordForm(emptyRecordForm);
      setLoginForm(emptyLoginForm);
      setSignUpForm(emptySignUpForm);
      setError(null);
      setRecordsError(null);
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
        } else {
          const created = await createProfile(profileForm, token);
          setProfiles((current) => [...current, created]);
          setActiveProfileId(created.id);
        }
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
          setRecordsByProfile((current) => ({
            ...current,
            [activeProfile.id]: (current[activeProfile.id] ?? []).map((record) =>
              record.id === updated.id ? updated : record,
            ),
          }));
        } else {
          const created = await createVaccinationRecord(activeProfile.id, recordForm, token);
          setRecordsByProfile((current) => ({
            ...current,
            [activeProfile.id]: [created, ...(current[activeProfile.id] ?? [])],
          }));
        }
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
    setProfileForm({
      name: profile.name,
      date_of_birth: profile.date_of_birth ?? "",
      gender: profile.gender ?? "",
      relationship_kind: profile.relationship_kind,
      medical_notes: profile.medical_notes ?? "",
      schedule_region: profile.schedule_region,
    });
    setError(null);
  }

  function handleEditRecord(record: VaccinationRecord) {
    setRecordMode("edit");
    setEditingRecordId(record.id);
    setRecordForm({
      vaccine_name: record.vaccine_name,
      date_administered: record.date_administered,
      dose_number: record.dose_number ? String(record.dose_number) : "",
      provider: record.provider ?? "",
      notes: record.notes ?? "",
      proof: null,
      remove_proof: false,
    });
    setRecordsError(null);
  }

  function handleDeleteProfile(profileId: number) {
    if (!token) return;

    startTransition(async () => {
      try {
        await deleteProfile(profileId, token);
        const nextProfiles = profiles.filter((profile) => profile.id !== profileId);
        setProfiles(nextProfiles);
        setActiveProfileId((currentActive) => (currentActive === profileId ? nextProfiles[0]?.id ?? null : currentActive));

        setRecordsByProfile((current) => {
          const next = { ...current };
          delete next[profileId];
          return next;
        });

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
        setRecordsByProfile((current) => ({
          ...current,
          [activeProfile.id]: (current[activeProfile.id] ?? []).filter((record) => record.id !== recordId),
        }));

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

  function resetProfileComposer() {
    setProfileMode("create");
    setEditingProfileId(null);
    setProfileForm(emptyProfileForm);
    setError(null);
  }

  function resetRecordComposer() {
    setRecordMode("create");
    setEditingRecordId(null);
    setRecordForm(emptyRecordForm);
    setRecordsError(null);
  }

  function handleProofChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setRecordForm((current) => ({ ...current, proof: file, remove_proof: false }));
  }

  if (loadingSession) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#dbeafe,_#f8fafc_45%,_#ffffff_75%)] px-5 py-10">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-sky-100 bg-white/90 p-8 shadow-[0_24px_80px_rgba(14,116,144,0.12)]">
          <p className="text-sm font-semibold tracking-[0.18em] text-sky-700 uppercase">Vaccination Tracker</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">Restoring your vaccination workspace...</h1>
        </div>
      </main>
    );
  }

  if (token && currentUser) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#cffafe,_#f8fafc_45%,_#ffffff_75%)] px-5 py-8 text-slate-900 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6">
          <section className="rounded-[2rem] border border-cyan-100 bg-white/90 p-6 shadow-[0_24px_80px_rgba(8,145,178,0.12)] sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-3">
                <span className="inline-flex rounded-full bg-cyan-100 px-3 py-1 text-sm font-semibold text-cyan-800">Vaccination records</span>
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Welcome, {currentUser.name}</h1>
                  <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                    Manage family profiles and keep proof-backed vaccination history for the selected person in one responsive workspace.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-4">
                  <InfoCard label="Account email" value={currentUser.email} />
                  <InfoCard label="Profiles tracked" value={String(profiles.length)} />
                  <InfoCard label="Active profile" value={activeProfile?.name ?? "None selected"} />
                  <InfoCard label="OAuth readiness" value={authMetadata?.oauth_ready ? "Provider model ready" : "Password only"} />
                </div>
              </div>
              <button type="button" onClick={handleLogout} disabled={isPending} className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70">
                {isPending ? "Logging out..." : "Log out"}
              </button>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
            <div className="space-y-6">
              <section className="rounded-[2rem] border border-cyan-100 bg-white/90 p-6 shadow-[0_18px_50px_rgba(8,145,178,0.1)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-950">Family members</h2>
                    <p className="mt-1 text-sm text-slate-600">Switch profiles to review or update their vaccination history.</p>
                  </div>
                  <button type="button" onClick={resetProfileComposer} className="rounded-full border border-cyan-200 px-4 py-2 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-50">New profile</button>
                </div>
                <div className="mt-5 grid gap-3">
                  {profiles.length > 0 ? profiles.map((profile) => (
                    <button key={profile.id} type="button" onClick={() => handleActiveProfileChange(profile.id)} className={`rounded-[1.4rem] border px-4 py-4 text-left transition ${activeProfile?.id === profile.id ? "border-cyan-300 bg-cyan-50 shadow-[0_10px_30px_rgba(8,145,178,0.08)]" : "border-slate-200 bg-white hover:border-cyan-200 hover:bg-slate-50"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-slate-950">{profile.name}</p>
                          <p className="mt-1 text-sm capitalize text-slate-600">{profile.relationship_kind}</p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold tracking-[0.14em] text-slate-600 uppercase">{profile.schedule_region}</span>
                      </div>
                    </button>
                  )) : <div className="rounded-[1.4rem] border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">No profiles yet. Create one to start building vaccination records.</div>}
                </div>
              </section>

              {activeProfile ? (
                <section className="rounded-[2rem] border border-cyan-100 bg-white/90 p-6 shadow-[0_18px_50px_rgba(8,145,178,0.1)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-950">Selected profile</h2>
                      <p className="mt-1 text-sm text-slate-600">Review key details while managing this profile’s vaccination records.</p>
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
                  <div className="grid gap-4 sm:grid-cols-2">
                    <SelectField label="Relationship" value={profileForm.relationship_kind} onChange={(value) => setProfileForm((current) => ({ ...current, relationship_kind: value as ProfileInput["relationship_kind"] }))} options={[{ label: "Self", value: "self" }, { label: "Child", value: "child" }, { label: "Dependent", value: "dependent" }]} />
                    <SelectField label="Schedule region" value={profileForm.schedule_region} onChange={(value) => setProfileForm((current) => ({ ...current, schedule_region: value }))} options={[{ label: "India", value: "IN" }, { label: "United States", value: "US" }]} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <AuthField label="Date of birth" type="date" value={profileForm.date_of_birth} onChange={(value) => setProfileForm((current) => ({ ...current, date_of_birth: value }))} placeholder="" required={false} />
                    <AuthField label="Gender" value={profileForm.gender} onChange={(value) => setProfileForm((current) => ({ ...current, gender: value }))} placeholder="Optional" required={false} />
                  </div>
                  <TextAreaField label="Medical notes" value={profileForm.medical_notes} onChange={(value) => setProfileForm((current) => ({ ...current, medical_notes: value }))} placeholder="Allergies, notes from clinician, or other context" />
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button type="submit" disabled={isPending} className="rounded-full bg-cyan-100 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-70">{isPending ? profileMode === "edit" ? "Saving profile..." : "Creating profile..." : profileMode === "edit" ? "Save profile" : "Create profile"}</button>
                    {profileMode === "edit" && editingProfileId ? <button type="button" onClick={() => handleDeleteProfile(editingProfileId)} disabled={isPending} className="rounded-full border border-rose-300 px-5 py-3 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-70">Delete profile</button> : null}
                  </div>
                </form>
                {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
              </section>
            </div>

            <div className="space-y-6">
              <section className="rounded-[2rem] border border-cyan-100 bg-white/90 p-6 shadow-[0_18px_50px_rgba(8,145,178,0.1)] sm:p-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-slate-950">Vaccination history</h2>
                    <p className="mt-1 text-sm text-slate-600">{activeProfile ? `Manage records and proof files for ${activeProfile.name}.` : "Select a profile to manage vaccination records."}</p>
                  </div>
                  {recordMode === "edit" ? <button type="button" onClick={resetRecordComposer} className="rounded-full border border-cyan-200 px-4 py-2 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-50">Cancel record edit</button> : null}
                </div>

                <form className="mt-8 grid gap-4" onSubmit={handleRecordSubmit}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <AuthField label="Vaccine name" value={recordForm.vaccine_name} onChange={(value) => setRecordForm((current) => ({ ...current, vaccine_name: value }))} placeholder="MMR" />
                    <AuthField label="Date administered" type="date" value={recordForm.date_administered} onChange={(value) => setRecordForm((current) => ({ ...current, date_administered: value }))} placeholder="" />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <AuthField label="Dose number" type="number" value={recordForm.dose_number} onChange={(value) => setRecordForm((current) => ({ ...current, dose_number: value }))} placeholder="Optional" required={false} />
                    <AuthField label="Provider" value={recordForm.provider} onChange={(value) => setRecordForm((current) => ({ ...current, provider: value }))} placeholder="Clinic or hospital" required={false} />
                  </div>
                  <TextAreaField label="Vaccination notes" value={recordForm.notes} onChange={(value) => setRecordForm((current) => ({ ...current, notes: value }))} placeholder="Dose details, reactions, or follow-up notes" />
                  <FileField label="Proof document" onChange={handleProofChange} helperText={recordForm.proof ? `Selected file: ${recordForm.proof.name}` : "Attach an image or PDF certificate."} />
                  {recordMode === "edit" ? <CheckboxField label="Remove existing proof" checked={Boolean(recordForm.remove_proof)} onChange={(checked) => setRecordForm((current) => ({ ...current, remove_proof: checked, proof: checked ? null : current.proof }))} /> : null}
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button type="submit" disabled={isPending || !activeProfile} className="rounded-full bg-sky-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-70">{isPending ? recordMode === "edit" ? "Saving record..." : "Creating record..." : recordMode === "edit" ? "Save vaccination record" : "Add vaccination record"}</button>
                  </div>
                </form>
                {recordsError ? <p className="mt-4 text-sm text-rose-500">{recordsError}</p> : null}
              </section>

              <section className="rounded-[2rem] border border-cyan-100 bg-white/90 p-6 shadow-[0_18px_50px_rgba(8,145,178,0.1)] sm:p-8">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-950">Recorded doses</h2>
                    <p className="mt-1 text-sm text-slate-600">Latest vaccination entries for the active profile.</p>
                  </div>
                  {loadingRecords ? <span className="text-sm font-medium text-slate-500">Loading...</span> : null}
                </div>
                <div className="mt-5 grid gap-4">
                  {activeProfile ? activeRecords.length > 0 ? activeRecords.map((record) => (
                    <article key={record.id} className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold text-slate-950">{record.vaccine_name}</h3>
                            {record.dose_number ? <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold tracking-[0.14em] text-slate-600 uppercase">Dose {record.dose_number}</span> : null}
                          </div>
                          <p className="text-sm text-slate-600">Administered on {record.date_administered}</p>
                          <p className="text-sm text-slate-600">Provider: {record.provider || "Not recorded"}</p>
                          <p className="text-sm text-slate-600">Notes: {record.notes || "No notes added"}</p>
                          {record.proof_attached ? (
                            <div className="rounded-[1rem] border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
                              <p className="font-semibold">Proof attached</p>
                              <p>{record.proof_filename} ({record.proof_content_type})</p>
                              {record.proof_url ? <a href={record.proof_url} className="mt-2 inline-flex text-sm font-semibold text-cyan-800 underline" target="_blank" rel="noreferrer">View proof</a> : null}
                            </div>
                          ) : <p className="text-sm text-slate-500">No proof attached</p>}
                        </div>
                        <div className="flex flex-col gap-2 sm:items-end">
                          <button type="button" onClick={() => handleEditRecord(record)} className="rounded-full border border-cyan-200 px-4 py-2 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-50">Edit record</button>
                          <button type="button" onClick={() => handleDeleteRecord(record.id)} className="rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50">Delete record</button>
                        </div>
                      </div>
                    </article>
                  )) : <div className="rounded-[1.4rem] border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">No vaccination records yet for this profile. Add the first record above.</div> : <div className="rounded-[1.4rem] border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">Select a profile to see vaccination history.</div>}
                </div>
              </section>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#dbeafe,_#eff6ff_45%,_#ffffff_75%)] px-5 py-8 text-slate-900 sm:px-8 lg:px-10">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[2rem] border border-sky-100 bg-white/90 p-6 shadow-[0_24px_80px_rgba(14,116,144,0.12)] sm:p-8">
          <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-sky-800">Secure family vaccination records</span>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">Sign in to start tracking vaccinations with an API-first health record workspace.</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">This milestone adds email/password authentication now, while keeping the backend identity model ready for future OAuth providers.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <InfoCard label="Available now" value="Email and password login" />
            <InfoCard label="Designed next" value="Google and other OAuth providers" />
            <InfoCard label="Frontend" value="Responsive Next.js client" />
            <InfoCard label="Backend" value="Stateless Rails API auth" />
          </div>
        </section>

        <section className="rounded-[2rem] bg-slate-950 p-6 text-slate-50 shadow-[0_24px_80px_rgba(15,23,42,0.28)] sm:p-8">
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => setMode("login")} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${mode === "login" ? "bg-cyan-100 text-slate-950" : "border border-white/15 text-slate-100 hover:bg-white/10"}`}>Log in</button>
            <button type="button" onClick={() => setMode("signup")} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${mode === "signup" ? "bg-cyan-100 text-slate-950" : "border border-white/15 text-slate-100 hover:bg-white/10"}`}>Create account</button>
          </div>
          {mode === "login" ? (
            <form className="mt-8 grid gap-4" onSubmit={handleLogin}>
              <AuthField label="Email" type="email" value={loginForm.email} onChange={(value) => setLoginForm((current) => ({ ...current, email: value }))} placeholder="you@example.com" />
              <AuthField label="Password" type="password" value={loginForm.password} onChange={(value) => setLoginForm((current) => ({ ...current, password: value }))} placeholder="At least 8 characters" />
              <button type="submit" disabled={isPending} className="mt-2 rounded-full bg-cyan-100 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-70">{isPending ? "Logging in..." : "Log in"}</button>
            </form>
          ) : (
            <form className="mt-8 grid gap-4" onSubmit={handleSignup}>
              <AuthField label="Name" value={signUpForm.name} onChange={(value) => setSignUpForm((current) => ({ ...current, name: value }))} placeholder="Bandana Pandey" />
              <AuthField label="Email" type="email" value={signUpForm.email} onChange={(value) => setSignUpForm((current) => ({ ...current, email: value }))} placeholder="you@example.com" />
              <AuthField label="Password" type="password" value={signUpForm.password} onChange={(value) => setSignUpForm((current) => ({ ...current, password: value }))} placeholder="At least 8 characters" />
              <AuthField label="Confirm password" type="password" value={signUpForm.password_confirmation} onChange={(value) => setSignUpForm((current) => ({ ...current, password_confirmation: value }))} placeholder="Repeat your password" />
              <button type="submit" disabled={isPending} className="mt-2 rounded-full bg-cyan-100 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-70">{isPending ? "Creating account..." : "Create account"}</button>
            </form>
          )}
          {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
        </section>
      </div>
    </main>
  );
}

function AuthField({ label, value, onChange, placeholder, type = "text", required = true }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: "text" | "email" | "password" | "date" | "number"; required?: boolean; }) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="text-slate-200">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="rounded-[1.1rem] border border-white/15 bg-white/8 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-cyan-100 focus:bg-white/12" required={required} />
    </label>
  );
}

function TextAreaField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; }) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="text-slate-200">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={4} className="rounded-[1.1rem] border border-white/15 bg-white/8 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-cyan-100 focus:bg-white/12" />
    </label>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ label: string; value: string }>; }) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="text-slate-200">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-[1.1rem] border border-white/15 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-100">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function FileField({ label, onChange, helperText }: { label: string; onChange: (event: ChangeEvent<HTMLInputElement>) => void; helperText: string; }) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="text-slate-200">{label}</span>
      <input type="file" accept="image/*,application/pdf" onChange={onChange} className="rounded-[1.1rem] border border-white/15 bg-white/8 px-4 py-3 text-sm text-white outline-none transition file:mr-4 file:rounded-full file:border-0 file:bg-cyan-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-950 hover:file:bg-cyan-50" />
      <span className="text-xs text-slate-400">{helperText}</span>
    </label>
  );
}

function CheckboxField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void; }) {
  return (
    <label className="flex items-center gap-3 text-sm text-slate-200">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-cyan-500 focus:ring-cyan-400" />
      <span>{label}</span>
    </label>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">{label}</p><p className="mt-2 text-sm font-medium text-slate-900">{value}</p></div>;
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">{label}</p><p className="mt-2 text-sm font-medium text-slate-900">{value}</p></div>;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
