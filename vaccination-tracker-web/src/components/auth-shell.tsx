"use client";

import { type FormEvent, useEffect, useState, useTransition } from "react";
import { fetchCurrentUser, login, logout, signUp, type AuthMetadata, type CurrentUser } from "@/lib/api";

const storageKey = "vaccination-tracker-auth-token";

type AuthMode = "login" | "signup";

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

export function AuthShell() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [authMetadata, setAuthMetadata] = useState<AuthMetadata | null>(null);
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

          setToken(savedToken);
          setCurrentUser(response.user);
          setAuthMetadata(response.auth);
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

  function persistSession(nextToken: string, user: CurrentUser, auth: AuthMetadata) {
    window.localStorage.setItem(storageKey, nextToken);
    setToken(nextToken);
    setCurrentUser(user);
    setAuthMetadata(auth);
    setError(null);
  }

  function handleLogout() {
    startTransition(async () => {
      if (token) {
        try {
          await logout(token);
        } catch {
          // The API is stateless here; local cleanup is still enough.
        }
      }

      window.localStorage.removeItem(storageKey);
      setToken(null);
      setCurrentUser(null);
      setAuthMetadata(null);
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
        persistSession(response.token, response.user, response.auth);
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
        persistSession(response.token, response.user, response.auth);
      } catch (authError) {
        setError(authError instanceof Error ? authError.message : "Unable to create your account.");
      }
    });
  }

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
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          <section className="rounded-[2rem] border border-cyan-100 bg-white/90 p-6 shadow-[0_24px_80px_rgba(8,145,178,0.12)] sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-3">
                <span className="inline-flex rounded-full bg-cyan-100 px-3 py-1 text-sm font-semibold text-cyan-800">
                  Signed in
                </span>
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                    Welcome, {currentUser.name}
                  </h1>
                  <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                    Your authentication foundation is ready. Family profiles, vaccine records,
                    and dashboard workflows are the next milestone.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoCard label="Account email" value={currentUser.email} />
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

          <section className="grid gap-4 md:grid-cols-3">
            <MilestoneCard
              title="Profiles next"
              description="The next milestone will add self, child, and dependent profile management."
            />
            <MilestoneCard
              title="API-ready auth"
              description="The backend now supports stateless bearer authentication and an OAuth-ready identity model."
            />
            <MilestoneCard
              title="Responsive shell"
              description="This mobile-first shell will become the frame for upcoming dashboard and records screens."
            />
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: "text" | "email" | "password";
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
        required
      />
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

function MilestoneCard({ title, description }: { title: string; description: string }) {
  return (
    <article className="rounded-[1.5rem] border border-cyan-100 bg-white p-6 shadow-[0_18px_45px_rgba(8,145,178,0.08)]">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
    </article>
  );
}
