import { getApiBaseUrl } from "@/lib/config";

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
};

export type CurrentUserResponse = {
  user: CurrentUser;
  auth: AuthMetadata;
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
