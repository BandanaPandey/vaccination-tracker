const fallbackApiBaseUrl = "http://localhost:3001";

export function getApiBaseUrl() {
  const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (configuredApiBaseUrl) return configuredApiBaseUrl.replace(/\/+$/, "");
  if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") return fallbackApiBaseUrl;

  throw new Error("NEXT_PUBLIC_API_BASE_URL is required outside development and test environments.");
}

export function resolveApiUrl(pathOrUrl: string) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${getApiBaseUrl()}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}
