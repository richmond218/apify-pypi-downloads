import { describe, it, expect } from "vitest";
import { PypiClient } from "../src/pypi-client.js";
import { runTool } from "../src/tools/index.js";
import {
  PYPI_REQUESTS,
  PYPISTATS_RECENT,
  PYPISTATS_OVERALL,
  PYPISTATS_TOP_30D,
  PYPI_SEARCH_HTML,
} from "./fixtures.js";

function makeMockClient(): PypiClient {
  const fetchImpl = (async (input: string | URL) => {
    const url = String(input);
    if (url.includes("/pypi/requests/json")) {
      return new Response(JSON.stringify(PYPI_REQUESTS));
    }
    if (url.includes("/pypi/nope/json")) {
      return new Response("", { status: 404 });
    }
    if (url.includes("pypistats.org/api/packages/requests/recent")) {
      return new Response(JSON.stringify(PYPISTATS_RECENT));
    }
    if (url.includes("pypistats.org/api/packages/requests/overall")) {
      return new Response(JSON.stringify(PYPISTATS_OVERALL));
    }
    if (url.includes("pypistats.org/api/top/30d")) {
      return new Response(JSON.stringify(PYPISTATS_TOP_30D));
    }
    if (url.includes("pypi.org/search")) {
      return new Response(PYPI_SEARCH_HTML, { status: 200, headers: { "Content-Type": "text/html" } });
    }
    return new Response("", { status: 404 });
  }) as unknown as typeof fetch;
  return new PypiClient({ fetchImpl, maxRetries: 0 });
}

describe("runTool('package_details')", () => {
  it("returns package info", async () => {
    const result = (await runTool("package_details", { name: "requests" }, makeMockClient())) as {
      name: string;
      version?: string;
      keywords?: string[];
    };
    expect(result.name).toBe("requests");
    expect(result.version).toBe("2.31.0");
    expect(result.keywords).toContain("http");
  });

  it("includes releases when requested", async () => {
    const result = (await runTool(
      "package_details",
      { name: "requests", include_releases: true, recent_releases_limit: 2 },
      makeMockClient(),
    )) as { releases?: Array<{ version: string }> };
    expect(result.releases?.length).toBe(2);
  });

  it("returns not_found when package missing", async () => {
    const result = (await runTool("package_details", { name: "nope" }, makeMockClient())) as { not_found: boolean };
    expect(result.not_found).toBe(true);
  });
});

describe("runTool('download_stats')", () => {
  it("returns recent last_month downloads by default", async () => {
    const result = (await runTool("download_stats", { name: "requests" }, makeMockClient())) as {
      downloads: number;
      period: string;
    };
    expect(result.period).toBe("month");
    expect(result.downloads).toBe(150000000);
  });

  it("returns recent last_day when period=day", async () => {
    const result = (await runTool(
      "download_stats",
      { name: "requests", range: "recent", period: "day" },
      makeMockClient(),
    )) as { downloads: number };
    expect(result.downloads).toBe(5000000);
  });

  it("returns overall breakdown when range=overall", async () => {
    const result = (await runTool(
      "download_stats",
      { name: "requests", range: "overall", with_mirrors: false },
      makeMockClient(),
    )) as { total_downloads: number; breakdown: Array<{ category: string; downloads: number }> };
    expect(result.total_downloads).toBe(9_500_000_000);
    expect(result.breakdown).toHaveLength(2);
  });
});

describe("runTool('top_packages')", () => {
  it("returns ranked top packages for 30d", async () => {
    const result = (await runTool("top_packages", { window: "30d", limit: 2 }, makeMockClient())) as {
      packages: Array<{ rank: number; name: string; downloads: number }>;
    };
    expect(result.packages).toHaveLength(2);
    expect(result.packages[0]?.rank).toBe(1);
    expect(result.packages[0]?.name).toBe("boto3");
  });
});

describe("runTool('search_packages')", () => {
  it("returns parsed search results", async () => {
    const result = (await runTool("search_packages", { query: "http", limit: 10 }, makeMockClient())) as {
      packages: Array<{ name: string }>;
    };
    expect(result.packages.length).toBe(2);
    expect(result.packages[0]?.name).toBe("requests");
  });
});
