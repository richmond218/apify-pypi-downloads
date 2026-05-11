import {
  DownloadStatsArgsSchema,
  PackageDetailsArgsSchema,
  SearchPackagesArgsSchema,
  TopPackagesArgsSchema,
  type ToolName,
} from "../types.js";
import { PypiClient, parseSearchHtml, transformPackage } from "../pypi-client.js";

export async function runTool(tool: ToolName, args: unknown, client: PypiClient): Promise<unknown> {
  switch (tool) {
    case "package_details":
      return runPackageDetails(args, client);
    case "download_stats":
      return runDownloadStats(args, client);
    case "top_packages":
      return runTopPackages(args, client);
    case "search_packages":
      return runSearchPackages(args, client);
  }
}

async function runPackageDetails(rawArgs: unknown, client: PypiClient) {
  const args = PackageDetailsArgsSchema.parse(rawArgs);
  const raw = await client.getPackage(args.name);
  if (!raw) return { name: args.name, not_found: true };
  return transformPackage(raw, {
    includeReleases: args.include_releases,
    recentReleasesLimit: args.recent_releases_limit,
  });
}

async function runDownloadStats(rawArgs: unknown, client: PypiClient) {
  const args = DownloadStatsArgsSchema.parse(rawArgs);
  if (args.range === "recent") {
    const body = await client.getRecentDownloads(args.name);
    if (!body) return { name: args.name, not_found: true };
    if (args.period === "day") return { name: args.name, range: "recent", period: "day", downloads: body.data.last_day };
    if (args.period === "week") return { name: args.name, range: "recent", period: "week", downloads: body.data.last_week };
    return { name: args.name, range: "recent", period: "month", downloads: body.data.last_month };
  }
  const body = await client.getOverallDownloads(args.name, args.with_mirrors);
  if (!body) return { name: args.name, not_found: true };
  const total = body.data.reduce((sum, row) => sum + row.downloads, 0);
  return {
    name: args.name,
    range: "overall" as const,
    with_mirrors: args.with_mirrors,
    total_downloads: total,
    breakdown: body.data,
  };
}

async function runTopPackages(rawArgs: unknown, client: PypiClient) {
  const args = TopPackagesArgsSchema.parse(rawArgs);
  const rows = await client.getTopPackages(args.window);
  const sliced = rows.slice(0, args.limit);
  return {
    window: args.window,
    returned: sliced.length,
    packages: sliced.map((r, i) => ({ rank: i + 1, name: r.project, downloads: r.download_count })),
  };
}

async function runSearchPackages(rawArgs: unknown, client: PypiClient) {
  const args = SearchPackagesArgsSchema.parse(rawArgs);
  const html = await client.searchPackagesHtml(args.query);
  const results = parseSearchHtml(html, args.limit);
  return {
    query: args.query,
    returned: results.length,
    packages: results,
  };
}
