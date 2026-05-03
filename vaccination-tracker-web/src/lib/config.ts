const fallbackApiBaseUrl = "http://localhost:3001";

export function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL || fallbackApiBaseUrl;
}
