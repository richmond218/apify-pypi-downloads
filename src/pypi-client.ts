import type { PackageInfoOutput } from "./types.js";

const PYPI_BASE = "https://pypi.org";
const PYPISTATS_BASE = "https://pypistats.org/api";
const PYPI_SEARCH_BASE = "https://pypi.org/search";
const DEFAULT_UA = "apify-pypi-downloads/0.1";

export interface PypiClientOptions {
  fetchImpl?: typeof fetch;
  userAgent?: string;
  maxRetries?: number;
}

export class PypiApiError extends Error {
  override name = "PypiApiError";
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
  }
}

export interface PypiRawInfo {
  info: {
    name: string;
    version?: string;
    summary?: string;
    description?: string;
    description_content_type?: string;
    author?: string;
    author_email?: string;
    maintainer?: string;
    license?: string;
    home_page?: string;
    project_urls?: Record<string, string> | null;
    keywords?: string;
    classifiers?: string[];
    requires_python?: string;
    requires_dist?: string[] | null;
    yanked?: boolean;
    yanked_reason?: string;
    package_url?: string;
  };
  releases?: Record<string, Array<{ upload_time_iso_8601?: string; yanked?: boolean }>>;
}

export interface PypistatsRecent {
  data: { last_day: number; last_week: number; last_month: number };
  package: string;
  type: string;
}

export interface PypistatsOverall {
  data: Array<{ category: string; downloads: number }>;
  package: string;
  type: string;
}

export class PypiClient {
  private readonly fetchImpl: typeof fetch;
  private readonly userAgent: string;
  private readonly maxRetries: number;

  constructor(opts: PypiClientOptions = {}) {
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch;
    this.userAgent = opts.userAgent ?? DEFAULT_UA;
    this.maxRetries = opts.maxRetries ?? 3;
  }

  async getPackage(name: string): Promise<PypiRawInfo | null> {
    return this.getJson<PypiRawInfo>(`${PYPI_BASE}/pypi/${encodeURIComponent(name)}/json`);
  }

  async getRecentDownloads(name: string): Promise<PypistatsRecent | null> {
    return this.getJson<PypistatsRecent>(`${PYPISTATS_BASE}/packages/${encodeURIComponent(name)}/recent`);
  }

  async getOverallDownloads(name: string, withMirrors: boolean): Promise<PypistatsOverall | null> {
    const params = new URLSearchParams();
    params.set("mirrors", withMirrors ? "true" : "false");
    return this.getJson<PypistatsOverall>(`${PYPISTATS_BASE}/packages/${encodeURIComponent(name)}/overall?${params}`);
  }

  async getTopPackages(window: "30d" | "365d"): Promise<Array<{ project: string; download_count: number }>> {
    const body = await this.getJson<{ rows: Array<{ project: string; download_count: number }> }>(
      `${PYPISTATS_BASE}/top/${window}`,
    );
    return body?.rows ?? [];
  }

  async searchPackagesHtml(query: string): Promise<string> {
    const params = new URLSearchParams();
    params.set("q", query);
    return this.getText(`${PYPI_SEARCH_BASE}/?${params}`);
  }

  private buildHeaders(jsonAccept: boolean): Record<string, string> {
    return {
      "User-Agent": this.userAgent,
      Accept: jsonAccept ? "application/json" : "text/html,application/xhtml+xml",
    };
  }

  private async getJson<T>(url: string): Promise<T | null> {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const res = await this.fetchImpl(url, { headers: this.buildHeaders(true) });
        if (res.status === 429 || res.status >= 500) {
          if (attempt < this.maxRetries) {
            await sleep(backoff(attempt));
            continue;
          }
          throw new PypiApiError(`PyPI ${url} -> ${res.status}`, res.status);
        }
        if (res.status === 404) return null;
        if (!res.ok) throw new PypiApiError(`PyPI ${url} -> ${res.status}`, res.status);
        const text = await res.text();
        if (!text) return null;
        return JSON.parse(text) as T;
      } catch (err) {
        lastError = err as Error;
        if (err instanceof PypiApiError && err.status !== undefined && err.status < 500 && err.status !== 429) {
          throw err;
        }
        if (attempt >= this.maxRetries) throw lastError;
        await sleep(backoff(attempt));
      }
    }
    throw lastError ?? new Error("Unreachable retry loop");
  }

  private async getText(url: string): Promise<string> {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const res = await this.fetchImpl(url, { headers: this.buildHeaders(false) });
        if (res.status === 429 || res.status >= 500) {
          if (attempt < this.maxRetries) {
            await sleep(backoff(attempt));
            continue;
          }
          throw new PypiApiError(`PyPI ${url} -> ${res.status}`, res.status);
        }
        if (!res.ok) throw new PypiApiError(`PyPI ${url} -> ${res.status}`, res.status);
        return await res.text();
      } catch (err) {
        lastError = err as Error;
        if (err instanceof PypiApiError && err.status !== undefined && err.status < 500 && err.status !== 429) {
          throw err;
        }
        if (attempt >= this.maxRetries) throw lastError;
        await sleep(backoff(attempt));
      }
    }
    throw lastError ?? new Error("Unreachable retry loop");
  }
}

export function transformPackage(raw: PypiRawInfo, opts: { includeReleases: boolean; recentReleasesLimit: number }): PackageInfoOutput {
  const info = raw.info;
  const out: PackageInfoOutput = {
    name: info.name,
    pypi_url: info.package_url ?? `${PYPI_BASE}/project/${encodeURIComponent(info.name)}/`,
  };
  if (info.version) out.version = info.version;
  if (info.summary) out.summary = info.summary;
  if (info.description) out.description = info.description;
  if (info.description_content_type) out.description_content_type = info.description_content_type;
  if (info.author) out.author = info.author;
  if (info.author_email) out.author_email = info.author_email;
  if (info.maintainer) out.maintainer = info.maintainer;
  if (info.license) out.license = info.license;
  if (info.home_page) out.homepage = info.home_page;
  if (info.project_urls) out.project_urls = info.project_urls;
  if (info.keywords) {
    out.keywords = info.keywords
      .split(/[\s,]+/)
      .map((k) => k.trim())
      .filter((k) => k.length > 0);
  }
  if (info.classifiers?.length) out.classifiers = info.classifiers;
  if (info.requires_python) out.requires_python = info.requires_python;
  if (info.requires_dist?.length) out.requires_dist = info.requires_dist;
  if (info.yanked !== undefined) out.yanked = info.yanked;
  if (info.yanked_reason) out.yanked_reason = info.yanked_reason;

  if (opts.includeReleases && raw.releases) {
    const entries = Object.entries(raw.releases)
      .map(([version, files]): { version: string; released_at?: string; yanked?: boolean } => {
        const first = files?.[0];
        const e: { version: string; released_at?: string; yanked?: boolean } = { version };
        if (first?.upload_time_iso_8601) e.released_at = first.upload_time_iso_8601;
        if (first?.yanked !== undefined) e.yanked = first.yanked;
        return e;
      })
      .filter((e) => e.released_at)
      .sort((a, b) => (b.released_at ?? "").localeCompare(a.released_at ?? ""))
      .slice(0, opts.recentReleasesLimit);
    if (entries.length > 0) out.releases = entries;
  }
  return out;
}

export function parseSearchHtml(html: string, limit: number): Array<{ name: string; version?: string; description?: string; pypi_url: string }> {
  const out: Array<{ name: string; version?: string; description?: string; pypi_url: string }> = [];
  const snippetRegex = /<a class="package-snippet" href="([^"]+)">([\s\S]*?)<\/a>/g;
  for (const match of html.matchAll(snippetRegex)) {
    if (out.length >= limit) break;
    const href = match[1] ?? "";
    const body = match[2] ?? "";
    const nameMatch = body.match(/<span class="package-snippet__name">([^<]+)<\/span>/);
    const versionMatch = body.match(/<span class="package-snippet__version">([^<]+)<\/span>/);
    const descMatch = body.match(/<p class="package-snippet__description">([\s\S]*?)<\/p>/);
    if (!nameMatch) continue;
    const name = (nameMatch[1] ?? "").trim();
    if (!name) continue;
    const entry: { name: string; version?: string; description?: string; pypi_url: string } = {
      name,
      pypi_url: href.startsWith("http") ? href : `${PYPI_BASE}${href}`,
    };
    if (versionMatch?.[1]) entry.version = versionMatch[1].trim();
    if (descMatch?.[1]) {
      const desc = descMatch[1].replace(/<[^>]+>/g, "").trim();
      if (desc) entry.description = desc;
    }
    out.push(entry);
  }
  return out;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoff(attempt: number): number {
  return Math.min(8000, 500 * 2 ** attempt) + Math.floor(Math.random() * 250);
}
