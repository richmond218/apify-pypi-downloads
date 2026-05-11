import type { PypiRawInfo, PypistatsRecent, PypistatsOverall } from "../src/pypi-client.js";

export const PYPI_REQUESTS: PypiRawInfo = {
  info: {
    name: "requests",
    version: "2.31.0",
    summary: "Python HTTP for Humans.",
    description: "Requests is a simple, yet elegant, HTTP library.",
    description_content_type: "text/markdown",
    author: "Kenneth Reitz",
    author_email: "me@kennethreitz.org",
    license: "Apache 2.0",
    home_page: "https://requests.readthedocs.io",
    project_urls: { Documentation: "https://requests.readthedocs.io", Source: "https://github.com/psf/requests" },
    keywords: "http, requests, python",
    classifiers: ["Programming Language :: Python :: 3", "License :: OSI Approved :: Apache Software License"],
    requires_python: ">=3.7",
    requires_dist: ["charset-normalizer (<4,>=2)", "idna (<4,>=2.5)"],
    yanked: false,
    package_url: "https://pypi.org/project/requests/",
  },
  releases: {
    "2.31.0": [{ upload_time_iso_8601: "2023-05-22T15:12:31.000Z", yanked: false }],
    "2.30.0": [{ upload_time_iso_8601: "2023-05-03T15:12:31.000Z", yanked: false }],
    "2.29.0": [{ upload_time_iso_8601: "2023-04-26T15:12:31.000Z", yanked: false }],
  },
};

export const PYPISTATS_RECENT: PypistatsRecent = {
  data: { last_day: 5000000, last_week: 35000000, last_month: 150000000 },
  package: "requests",
  type: "recent_downloads",
};

export const PYPISTATS_OVERALL: PypistatsOverall = {
  data: [
    { category: "with_mirrors", downloads: 5_000_000_000 },
    { category: "without_mirrors", downloads: 4_500_000_000 },
  ],
  package: "requests",
  type: "overall_downloads",
};

export const PYPISTATS_TOP_30D = {
  rows: [
    { project: "boto3", download_count: 1_000_000_000 },
    { project: "urllib3", download_count: 900_000_000 },
    { project: "requests", download_count: 800_000_000 },
  ],
};

export const PYPI_SEARCH_HTML = `
<html><body>
<ul class="unstyled">
  <li>
    <a class="package-snippet" href="/project/requests/">
      <h3 class="package-snippet__title">
        <span class="package-snippet__name">requests</span>
        <span class="package-snippet__version">2.31.0</span>
      </h3>
      <p class="package-snippet__description">Python HTTP for Humans.</p>
    </a>
  </li>
  <li>
    <a class="package-snippet" href="/project/httpx/">
      <h3 class="package-snippet__title">
        <span class="package-snippet__name">httpx</span>
        <span class="package-snippet__version">0.27.0</span>
      </h3>
      <p class="package-snippet__description">The next generation HTTP client.</p>
    </a>
  </li>
</ul>
</body></html>
`;
