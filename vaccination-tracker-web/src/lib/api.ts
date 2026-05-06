import { getApiBaseUrl } from "@/lib/config";

export type ProofMetadata = {
  proof_attached: boolean;
  proof_filename?: string;
  proof_content_type?: string;
  proof_url?: string;
};

export type VaccinationRecord = ProofMetadata & {
  id: number;
  profile_id: number;
  vaccine_name: string;
  date_administered: string;
  dose_number: number | null;
  provider: string | null;
  notes: string | null;
};

export type VaccinationRecordInput = {
  vaccine_name: string;
  date_administered: string;
  dose_number: string;
  provider: string;
  notes: string;
  proof?: File | null;
  remove_proof?: boolean;
};

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

function appendIfPresent(formData: FormData, key: string, value: string | File | null | undefined) {
  if (value === undefined || value === null || value === "") {
    return;
  }

  formData.append(key, value);
}

function buildVaccinationRecordFormData(input: VaccinationRecordInput) {
  const formData = new FormData();
  appendIfPresent(formData, "vaccination_record[vaccine_name]", input.vaccine_name);
  appendIfPresent(formData, "vaccination_record[date_administered]", input.date_administered);
  appendIfPresent(formData, "vaccination_record[dose_number]", input.dose_number);
  appendIfPresent(formData, "vaccination_record[provider]", input.provider);
  appendIfPresent(formData, "vaccination_record[notes]", input.notes);
  appendIfPresent(formData, "vaccination_record[proof]", input.proof);

  if (input.remove_proof) {
    formData.append("vaccination_record[remove_proof]", "true");
  }

  return formData;
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

export async function fetchVaccinationRecords(profileId: number, token: string) {
  const apiBaseUrl = getApiBaseUrl();

  return fetch(`${apiBaseUrl}/api/v1/profiles/${profileId}/vaccination_records`, {
    cache: "no-store",
    headers: authHeaders(token),
  }).then((response) => parseJson<VaccinationRecord[]>(response));
}

export async function createVaccinationRecord(profileId: number, input: VaccinationRecordInput, token: string) {
  const apiBaseUrl = getApiBaseUrl();

  return fetch(`${apiBaseUrl}/api/v1/profiles/${profileId}/vaccination_records`, {
    method: "POST",
    headers: authHeaders(token),
    body: buildVaccinationRecordFormData(input),
  }).then((response) => parseJson<VaccinationRecord>(response));
}

export async function updateVaccinationRecord(
  profileId: number,
  recordId: number,
  input: VaccinationRecordInput,
  token: string,
) {
  const apiBaseUrl = getApiBaseUrl();

  return fetch(`${apiBaseUrl}/api/v1/profiles/${profileId}/vaccination_records/${recordId}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: buildVaccinationRecordFormData(input),
  }).then((response) => parseJson<VaccinationRecord>(response));
}

export async function deleteVaccinationRecord(profileId: number, recordId: number, token: string) {
  const apiBaseUrl = getApiBaseUrl();

  return fetch(`${apiBaseUrl}/api/v1/profiles/${profileId}/vaccination_records/${recordId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  }).then((response) => parseJson<void>(response));
}
