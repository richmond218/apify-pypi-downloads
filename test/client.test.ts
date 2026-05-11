import { describe, it, expect, vi } from "vitest";
import { PypiClient, PypiApiError, parseSearchHtml, transformPackage } from "../src/pypi-client.js";
import {
  PYPI_REQUESTS,
  PYPISTATS_RECENT,
  PYPISTATS_OVERALL,
  PYPISTATS_TOP_30D,
  PYPI_SEARCH_HTML,
} from "./fixtures.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), { status });
}
function htmlResponse(body: string): Response {
  return new Response(body, { status: 200, headers: { "Content-Type": "text/html" } });
}

describe("PypiClient.getPackage", () => {
  it("hits /pypi/<name>/json", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(PYPI_REQUESTS)) as unknown as typeof fetch;
    const client = new PypiClient({ fetchImpl });
    const raw = await client.getPackage("requests");
    expect(raw?.info.name).toBe("requests");
    const url = String((fetchImpl as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]![0]);
    expect(url).toContain("/pypi/requests/json");
  });

  it("returns null on 404", async () => {
    const fetchImpl = (async () => new Response("", { status: 404 })) as unknown as typeof fetch;
    const client = new PypiClient({ fetchImpl, maxRetries: 0 });
    expect(await client.getPackage("nopackage12345")).toBeNull();
  });
});

describe("PypiClient pypistats endpoints", () => {
  it("recent downloads", async () => {
    const fetchImpl = (async () => jsonResponse(PYPISTATS_RECENT)) as unknown as typeof fetch;
    const client = new PypiClient({ fetchImpl });
    const body = await client.getRecentDownloads("requests");
    expect(body?.data.last_month).toBe(150000000);
  });

  it("overall with mirrors flag", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(PYPISTATS_OVERALL)) as unknown as typeof fetch;
    const client = new PypiClient({ fetchImpl });
    await client.getOverallDownloads("requests", true);
    const url = String((fetchImpl as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]![0]);
    expect(url).toContain("mirrors=true");
  });

  it("top packages 30d", async () => {
    const fetchImpl = (async () => jsonResponse(PYPISTATS_TOP_30D)) as unknown as typeof fetch;
    const client = new PypiClient({ fetchImpl });
    const rows = await client.getTopPackages("30d");
    expect(rows).toHaveLength(3);
    expect(rows[0]?.project).toBe("boto3");
  });
});

describe("PypiClient.searchPackagesHtml", () => {
  it("returns the HTML page", async () => {
    const fetchImpl = (async () => htmlResponse(PYPI_SEARCH_HTML)) as unknown as typeof fetch;
    const client = new PypiClient({ fetchImpl });
    const html = await client.searchPackagesHtml("http");
    expect(html).toContain("requests");
  });
});

describe("PypiClient error handling", () => {
  it("retries 429", async () => {
    let call = 0;
    const fetchImpl = (async () => {
      call++;
      if (call === 1) return new Response("rate limit", { status: 429 });
      return jsonResponse(PYPI_REQUESTS);
    }) as unknown as typeof fetch;
    const client = new PypiClient({ fetchImpl, maxRetries: 2 });
    const raw = await client.getPackage("requests");
    expect(raw?.info.name).toBe("requests");
    expect(call).toBe(2);
  });

  it("throws PypiApiError on persistent 503", async () => {
    const fetchImpl = (async () => new Response("", { status: 503 })) as unknown as typeof fetch;
    const client = new PypiClient({ fetchImpl, maxRetries: 1 });
    await expect(client.getPackage("x")).rejects.toBeInstanceOf(PypiApiError);
  });
});

describe("parseSearchHtml", () => {
  it("extracts name/version/description from snippets", () => {
    const results = parseSearchHtml(PYPI_SEARCH_HTML, 25);
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      name: "requests",
      version: "2.31.0",
      description: "Python HTTP for Humans.",
      pypi_url: "https://pypi.org/project/requests/",
    });
  });

  it("respects limit", () => {
    expect(parseSearchHtml(PYPI_SEARCH_HTML, 1)).toHaveLength(1);
  });
});

describe("transformPackage", () => {
  it("flattens info fields and splits keywords", () => {
    const out = transformPackage(PYPI_REQUESTS, { includeReleases: false, recentReleasesLimit: 10 });
    expect(out.name).toBe("requests");
    expect(out.keywords).toEqual(["http", "requests", "python"]);
    expect(out.releases).toBeUndefined();
  });

  it("includes releases sorted by date desc when requested", () => {
    const out = transformPackage(PYPI_REQUESTS, { includeReleases: true, recentReleasesLimit: 2 });
    expect(out.releases).toHaveLength(2);
    expect(out.releases?.[0]?.version).toBe("2.31.0");
  });
});
