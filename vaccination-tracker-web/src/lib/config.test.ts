import { describe, expect, it } from "vitest";

import { getApiBaseUrl, resolveApiUrl } from "@/lib/config";

describe("config helpers", () => {
  it("trims trailing slashes from the configured API base URL", () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.com/";

    expect(getApiBaseUrl()).toBe("https://api.example.com");
  });

  it("resolves relative API paths against the configured API base URL", () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.com/";

    expect(resolveApiUrl("/rails/active_storage/blobs/example")).toBe("https://api.example.com/rails/active_storage/blobs/example");
  });

  it("leaves absolute URLs untouched", () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.com/";

    expect(resolveApiUrl("https://cdn.example.com/proof.pdf")).toBe("https://cdn.example.com/proof.pdf");
  });
});
