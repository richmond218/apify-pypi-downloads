import { z } from "zod";

export const ToolNameSchema = z.enum([
  "package_details",
  "download_stats",
  "top_packages",
  "search_packages",
]);
export type ToolName = z.infer<typeof ToolNameSchema>;

export const InputSchema = z
  .object({
    tool: ToolNameSchema,
    args: z.record(z.unknown()).default({}),
  })
  .strict();
export type Input = z.infer<typeof InputSchema>;

const PackageName = z.string().min(1).max(214).regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/);

export const PackageDetailsArgsSchema = z.object({
  name: PackageName,
  include_releases: z.boolean().default(false),
  recent_releases_limit: z.number().int().min(1).max(50).default(10),
});
export type PackageDetailsArgs = z.infer<typeof PackageDetailsArgsSchema>;

export const DownloadStatsArgsSchema = z.object({
  name: PackageName,
  range: z.enum(["recent", "overall"]).default("recent"),
  /** For range=recent. "day" → last day, "week" → last 7d, "month" → last 30d. */
  period: z.enum(["day", "week", "month"]).default("month"),
  /** For range=overall. true = include mirrors; false = without mirrors. */
  with_mirrors: z.boolean().default(false),
});
export type DownloadStatsArgs = z.infer<typeof DownloadStatsArgsSchema>;

export const TopPackagesArgsSchema = z.object({
  /** Pre-baked top-30/top-365 lists from pypistats. */
  window: z.enum(["30d", "365d"]).default("30d"),
  limit: z.number().int().min(1).max(100).default(30),
});
export type TopPackagesArgs = z.infer<typeof TopPackagesArgsSchema>;

export const SearchPackagesArgsSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().min(1).max(50).default(20),
});
export type SearchPackagesArgs = z.infer<typeof SearchPackagesArgsSchema>;

// ---------- Public outputs ----------

export const PackageInfoOutputSchema = z.object({
  name: z.string(),
  version: z.string().optional(),
  summary: z.string().optional(),
  description: z.string().optional(),
  description_content_type: z.string().optional(),
  author: z.string().optional(),
  author_email: z.string().optional(),
  maintainer: z.string().optional(),
  license: z.string().optional(),
  homepage: z.string().optional(),
  project_urls: z.record(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  classifiers: z.array(z.string()).optional(),
  requires_python: z.string().optional(),
  requires_dist: z.array(z.string()).optional(),
  yanked: z.boolean().optional(),
  yanked_reason: z.string().optional(),
  pypi_url: z.string(),
  releases: z.array(z.object({
    version: z.string(),
    released_at: z.string().optional(),
    yanked: z.boolean().optional(),
  })).optional(),
});
export type PackageInfoOutput = z.infer<typeof PackageInfoOutputSchema>;

export const DownloadStatsOutputSchema = z.object({
  name: z.string(),
  range: z.enum(["recent", "overall"]),
  data: z.record(z.union([z.number(), z.string()])),
});
export type DownloadStatsOutput = z.infer<typeof DownloadStatsOutputSchema>;
