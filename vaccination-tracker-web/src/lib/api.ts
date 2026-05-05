import { getApiBaseUrl } from "@/lib/config";

export type Profile = {
  id: number;
  name: string;
  date_of_birth: string | null;
  gender: string | null;
  relationship_kind: "self" | "child" | "dependent";
  medical_notes: string | null;
  schedule_region: string;
};

export type CurrentUser = {
  id: number;
  name: string;
  email: string;
};

export type AuthMetadata = {
  available_methods: string[];
  oauth_ready: boolean;
};

export type AuthResponse = {
  token: string;
  user: CurrentUser;
  auth: AuthMetadata;
  profiles: Profile[];
};

export type CurrentUserResponse = {
  user: CurrentUser;
  auth: AuthMetadata;
  profiles: Profile[];
};

export type ProfileInput = {
  name: string;
  date_of_birth: string;
  gender: string;
  relationship_kind: "self" | "child" | "dependent";
  medical_notes: string;
  schedule_region: string;
};

function authHeaders(token?: string): Record<string, string> {
  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
}

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message =
      typeof body?.error === "string"
        ? body.error
        : Array.isArray(body?.errors)
          ? body.errors.join(", ")
          : "Request failed.";

    throw new Error(message);
  }

  if (response.status === 204 || response.status === 205) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function signUp(input: {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}) {
  const apiBaseUrl = getApiBaseUrl();

  return fetch(`${apiBaseUrl}/api/v1/auth/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user: input,
    }),
  }).then((response) => parseJson<AuthResponse>(response));
}

export async function login(input: { email: string; password: string }) {
  const apiBaseUrl = getApiBaseUrl();

  return fetch(`${apiBaseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session: input,
    }),
  }).then((response) => parseJson<AuthResponse>(response));
}

export async function fetchCurrentUser(token: string) {
  const apiBaseUrl = getApiBaseUrl();

  return fetch(`${apiBaseUrl}/api/v1/auth/me`, {
    cache: "no-store",
    headers: authHeaders(token),
  }).then((response) => parseJson<CurrentUserResponse>(response));
}

export async function logout(token: string) {
  const apiBaseUrl = getApiBaseUrl();

  return fetch(`${apiBaseUrl}/api/v1/auth/logout`, {
    method: "DELETE",
    headers: authHeaders(token),
  }).then((response) => parseJson<{ message: string }>(response));
}

export async function fetchProfiles(token: string) {
  const apiBaseUrl = getApiBaseUrl();

  return fetch(`${apiBaseUrl}/api/v1/profiles`, {
    cache: "no-store",
    headers: authHeaders(token),
  }).then((response) => parseJson<Profile[]>(response));
}

export async function createProfile(input: ProfileInput, token: string) {
  const apiBaseUrl = getApiBaseUrl();

  return fetch(`${apiBaseUrl}/api/v1/profiles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify({
      profile: input,
    }),
  }).then((response) => parseJson<Profile>(response));
}

export async function updateProfile(id: number, input: ProfileInput, token: string) {
  const apiBaseUrl = getApiBaseUrl();

  return fetch(`${apiBaseUrl}/api/v1/profiles/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify({
      profile: input,
    }),
  }).then((response) => parseJson<Profile>(response));
}

export async function deleteProfile(id: number, token: string) {
  const apiBaseUrl = getApiBaseUrl();

  return fetch(`${apiBaseUrl}/api/v1/profiles/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  }).then((response) => parseJson<void>(response));
}
