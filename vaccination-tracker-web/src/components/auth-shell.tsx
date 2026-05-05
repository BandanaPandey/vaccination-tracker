"use client";

import { type FormEvent, useEffect, useState, useTransition } from "react";
import {
  createProfile,
  deleteProfile,
  fetchCurrentUser,
  login,
  logout,
  signUp,
  updateProfile,
  type AuthMetadata,
  type CurrentUser,
  type Profile,
  type ProfileInput,
} from "@/lib/api";

const storageKey = "vaccination-tracker-auth-token";

type AuthMode = "login" | "signup";
type ProfileFormMode = "create" | "edit";

const emptyLoginForm = {
  email: "",
  password: "",
};

const emptySignUpForm = {
  name: "",
  email: "",
  password: "",
  password_confirmation: "",
};

const emptyProfileForm: ProfileInput = {
  name: "",
  date_of_birth: "",
  gender: "",
  relationship_kind: "child",
  medical_notes: "",
  schedule_region: "IN",
};

export function AuthShell() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [authMetadata, setAuthMetadata] = useState<AuthMetadata | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<number | null>(null);
  const [profileMode, setProfileMode] = useState<ProfileFormMode>("create");
  const [profileForm, setProfileForm] = useState<ProfileInput>(emptyProfileForm);
  const [editingProfileId, setEditingProfileId] = useState<number | null>(null);
  const [loginForm, setLoginForm] = useState(emptyLoginForm);
  const [signUpForm, setSignUpForm] = useState(emptySignUpForm);
  const [error, setError] = useState<string | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      const savedToken = window.localStorage.getItem(storageKey);

      if (!savedToken) {
        if (isMounted) {
          setLoadingSession(false);
        }
        return;
      }

      startTransition(async () => {
        try {
          const response = await fetchCurrentUser(savedToken);

          if (!isMounted) {
            return;
          }

          applySession(savedToken, response.user, response.auth, response.profiles);
        } catch {
          window.localStorage.removeItem(storageKey);
        } finally {
          if (isMounted) {
            setLoadingSession(false);
          }
        }
      });
    }

    void restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  function applySession(nextToken: string, user: CurrentUser, auth: AuthMetadata, nextProfiles: Profile[]) {
    const orderedProfiles = nextProfiles;
    const nextActiveProfileId = orderedProfiles[0]?.id ?? null;

    window.localStorage.setItem(storageKey, nextToken);
    setToken(nextToken);
    setCurrentUser(user);
    setAuthMetadata(auth);
    setProfiles(orderedProfiles);
    setActiveProfileId(nextActiveProfileId);
    setProfileForm(emptyProfileForm);
    setProfileMode("create");
    setEditingProfileId(null);
    setError(null);
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
      setActiveProfileId(null);
      setProfileMode("create");
      setEditingProfileId(null);
      setProfileForm(emptyProfileForm);
      setLoginForm(emptyLoginForm);
      setSignUpForm(emptySignUpForm);
      setError(null);
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
    if (!token) {
      return;
    }

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

        setProfileMode("create");
        setEditingProfileId(null);
        setProfileForm(emptyProfileForm);
      } catch (profileError) {
        setError(profileError instanceof Error ? profileError.message : "Unable to save the profile.");
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

  function handleDeleteProfile(profileId: number) {
    if (!token) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteProfile(profileId, token);
        setProfiles((current) => {
          const nextProfiles = current.filter((profile) => profile.id != profileId);
          const nextActiveProfileId = nextProfiles[0]?.id ?? null;
          setActiveProfileId((currentActive) => (currentActive === profileId ? nextActiveProfileId : currentActive));
          return nextProfiles;
        });

        if (editingProfileId === profileId) {
          setProfileMode("create");
          setEditingProfileId(null);
          setProfileForm(emptyProfileForm);
        }
      } catch (profileError) {
        setError(profileError instanceof Error ? profileError.message : "Unable to delete the profile.");
      }
    });
  }

  function handleActiveProfileChange(profileId: number) {
    setActiveProfileId(profileId);
    const profile = profiles.find((item) => item.id === profileId);
    if (profile && profileMode === "edit") {
      handleEditProfile(profile);
    }
  }

  function resetProfileComposer() {
    setProfileMode("create");
    setEditingProfileId(null);
    setProfileForm(emptyProfileForm);
    setError(null);
  }

  const activeProfile = profiles.find((profile) => profile.id === activeProfileId) ?? profiles[0] ?? null;

  if (loadingSession) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#dbeafe,_#f8fafc_45%,_#ffffff_75%)] px-5 py-10">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-sky-100 bg-white/90 p-8 shadow-[0_24px_80px_rgba(14,116,144,0.12)]">
          <p className="text-sm font-semibold tracking-[0.18em] text-sky-700 uppercase">
            Vaccination Tracker
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
            Restoring your vaccination workspace...
          </h1>
        </div>
      </main>
    );
  }

  if (token && currentUser) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#cffafe,_#f8fafc_45%,_#ffffff_75%)] px-5 py-8 text-slate-900 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <section className="rounded-[2rem] border border-cyan-100 bg-white/90 p-6 shadow-[0_24px_80px_rgba(8,145,178,0.12)] sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-3">
                <span className="inline-flex rounded-full bg-cyan-100 px-3 py-1 text-sm font-semibold text-cyan-800">
                  Family profiles
                </span>
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                    Welcome, {currentUser.name}
                  </h1>
                  <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                    Manage your self, child, and dependent vaccination profiles here. Each profile carries its own schedule region for future India and US schedule support.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <InfoCard label="Account email" value={currentUser.email} />
                  <InfoCard label="Profiles tracked" value={String(profiles.length)} />
                  <InfoCard
                    label="OAuth readiness"
                    value={authMetadata?.oauth_ready ? "Provider model ready" : "Password only"}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                disabled={isPending}
                className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isPending ? "Logging out..." : "Log out"}
              </button>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-6">
              <section className="rounded-[2rem] border border-cyan-100 bg-white/90 p-6 shadow-[0_18px_50px_rgba(8,145,178,0.1)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-950">Family members</h2>
                    <p className="mt-1 text-sm text-slate-600">Switch between profiles or add a new one.</p>
                  </div>
                  <button
                    type="button"
                    onClick={resetProfileComposer}
                    className="rounded-full border border-cyan-200 px-4 py-2 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-50"
                  >
                    New profile
                  </button>
                </div>

                <div className="mt-5 grid gap-3">
                  {profiles.length > 0 ? (
                    profiles.map((profile) => (
                      <button
                        key={profile.id}
                        type="button"
                        onClick={() => handleActiveProfileChange(profile.id)}
                        className={`rounded-[1.4rem] border px-4 py-4 text-left transition ${
                          activeProfile?.id === profile.id
                            ? "border-cyan-300 bg-cyan-50 shadow-[0_10px_30px_rgba(8,145,178,0.08)]"
                            : "border-slate-200 bg-white hover:border-cyan-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-base font-semibold text-slate-950">{profile.name}</p>
                            <p className="mt-1 text-sm capitalize text-slate-600">{profile.relationship_kind}</p>
                          </div>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold tracking-[0.14em] text-slate-600 uppercase">
                            {profile.schedule_region}
                          </span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-[1.4rem] border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                      No profiles yet. Create one to start building your family vaccination records.
                    </div>
                  )}
                </div>
              </section>

              {activeProfile ? (
                <section className="rounded-[2rem] border border-cyan-100 bg-white/90 p-6 shadow-[0_18px_50px_rgba(8,145,178,0.1)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-950">Selected profile</h2>
                      <p className="mt-1 text-sm text-slate-600">Review details before adding vaccination records in the next milestone.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleEditProfile(activeProfile)}
                      className="rounded-full border border-cyan-200 px-4 py-2 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-50"
                    >
                      Edit profile
                    </button>
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
            </div>

            <section className="rounded-[2rem] bg-slate-950 p-6 text-slate-50 shadow-[0_24px_80px_rgba(15,23,42,0.28)] sm:p-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-white">
                    {profileMode === "edit" ? "Edit profile" : "Create family profile"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-300">
                    Add self, child, or dependent details now. Vaccination schedules will attach to each profile later.
                  </p>
                </div>
                {profileMode === "edit" ? (
                  <button
                    type="button"
                    onClick={resetProfileComposer}
                    className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
                  >
                    Cancel edit
                  </button>
                ) : null}
              </div>

              <form className="mt-8 grid gap-4" onSubmit={handleProfileSubmit}>
                <AuthField
                  label="Full name"
                  value={profileForm.name}
                  onChange={(value) => setProfileForm((current) => ({ ...current, name: value }))}
                  placeholder="Aarav Pandey"
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectField
                    label="Relationship"
                    value={profileForm.relationship_kind}
                    onChange={(value) =>
                      setProfileForm((current) => ({
                        ...current,
                        relationship_kind: value as ProfileInput["relationship_kind"],
                      }))
                    }
                    options={[
                      { label: "Self", value: "self" },
                      { label: "Child", value: "child" },
                      { label: "Dependent", value: "dependent" },
                    ]}
                  />
                  <SelectField
                    label="Schedule region"
                    value={profileForm.schedule_region}
                    onChange={(value) => setProfileForm((current) => ({ ...current, schedule_region: value }))}
                    options={[
                      { label: "India", value: "IN" },
                      { label: "United States", value: "US" },
                    ]}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <AuthField
                    label="Date of birth"
                    type="date"
                    value={profileForm.date_of_birth}
                    onChange={(value) => setProfileForm((current) => ({ ...current, date_of_birth: value }))}
                    placeholder=""
                    required={false}
                  />
                  <AuthField
                    label="Gender"
                    value={profileForm.gender}
                    onChange={(value) => setProfileForm((current) => ({ ...current, gender: value }))}
                    placeholder="Optional"
                    required={false}
                  />
                </div>

                <TextAreaField
                  label="Medical notes"
                  value={profileForm.medical_notes}
                  onChange={(value) => setProfileForm((current) => ({ ...current, medical_notes: value }))}
                  placeholder="Allergies, notes from clinician, or other context"
                />

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-full bg-cyan-100 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isPending
                      ? profileMode === "edit"
                        ? "Saving profile..."
                        : "Creating profile..."
                      : profileMode === "edit"
                        ? "Save profile"
                        : "Create profile"}
                  </button>

                  {profileMode === "edit" && editingProfileId ? (
                    <button
                      type="button"
                      onClick={() => handleDeleteProfile(editingProfileId)}
                      disabled={isPending}
                      className="rounded-full border border-rose-300 px-5 py-3 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      Delete profile
                    </button>
                  ) : null}
                </div>
              </form>

              {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
            </section>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#dbeafe,_#eff6ff_45%,_#ffffff_75%)] px-5 py-8 text-slate-900 sm:px-8 lg:px-10">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[2rem] border border-sky-100 bg-white/90 p-6 shadow-[0_24px_80px_rgba(14,116,144,0.12)] sm:p-8">
          <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-sky-800">
            Secure family vaccination records
          </span>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Sign in to start tracking vaccinations with an API-first health record workspace.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            This milestone adds email/password authentication now, while keeping the backend
            identity model ready for future OAuth providers.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <InfoCard label="Available now" value="Email and password login" />
            <InfoCard label="Designed next" value="Google and other OAuth providers" />
            <InfoCard label="Frontend" value="Responsive Next.js client" />
            <InfoCard label="Backend" value="Stateless Rails API auth" />
          </div>
        </section>

        <section className="rounded-[2rem] bg-slate-950 p-6 text-slate-50 shadow-[0_24px_80px_rgba(15,23,42,0.28)] sm:p-8">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                mode === "login"
                  ? "bg-cyan-100 text-slate-950"
                  : "border border-white/15 text-slate-100 hover:bg-white/10"
              }`}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                mode === "signup"
                  ? "bg-cyan-100 text-slate-950"
                  : "border border-white/15 text-slate-100 hover:bg-white/10"
              }`}
            >
              Create account
            </button>
          </div>

          {mode === "login" ? (
            <form className="mt-8 grid gap-4" onSubmit={handleLogin}>
              <AuthField
                label="Email"
                type="email"
                value={loginForm.email}
                onChange={(value) => setLoginForm((current) => ({ ...current, email: value }))}
                placeholder="you@example.com"
              />
              <AuthField
                label="Password"
                type="password"
                value={loginForm.password}
                onChange={(value) => setLoginForm((current) => ({ ...current, password: value }))}
                placeholder="At least 8 characters"
              />
              <button
                type="submit"
                disabled={isPending}
                className="mt-2 rounded-full bg-cyan-100 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isPending ? "Logging in..." : "Log in"}
              </button>
            </form>
          ) : (
            <form className="mt-8 grid gap-4" onSubmit={handleSignup}>
              <AuthField
                label="Name"
                value={signUpForm.name}
                onChange={(value) => setSignUpForm((current) => ({ ...current, name: value }))}
                placeholder="Bandana Pandey"
              />
              <AuthField
                label="Email"
                type="email"
                value={signUpForm.email}
                onChange={(value) => setSignUpForm((current) => ({ ...current, email: value }))}
                placeholder="you@example.com"
              />
              <AuthField
                label="Password"
                type="password"
                value={signUpForm.password}
                onChange={(value) => setSignUpForm((current) => ({ ...current, password: value }))}
                placeholder="At least 8 characters"
              />
              <AuthField
                label="Confirm password"
                type="password"
                value={signUpForm.password_confirmation}
                onChange={(value) =>
                  setSignUpForm((current) => ({ ...current, password_confirmation: value }))
                }
                placeholder="Repeat your password"
              />
              <button
                type="submit"
                disabled={isPending}
                className="mt-2 rounded-full bg-cyan-100 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isPending ? "Creating account..." : "Create account"}
              </button>
            </form>
          )}

          {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
        </section>
      </div>
    </main>
  );
}

function AuthField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: "text" | "email" | "password" | "date";
  required?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="text-slate-200">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="rounded-[1.1rem] border border-white/15 bg-white/8 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-cyan-100 focus:bg-white/12"
        required={required}
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="text-slate-200">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={4}
        className="rounded-[1.1rem] border border-white/15 bg-white/8 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-cyan-100 focus:bg-white/12"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="text-slate-200">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-[1.1rem] border border-white/15 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
