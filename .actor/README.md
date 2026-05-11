# Apify PyPI Downloads Tool Server (MCP-style)

An Apify Actor that exposes PyPI metadata + download statistics as a small set of tools an LLM agent can call — one Actor run = one tool call. Backed by `pypi.org/pypi/<pkg>/json` and `pypistats.org/api/*`. No auth required.

## Tools

| Tool | Purpose |
|---|---|
| `package_details` | Package metadata (with optional recent-releases list) |
| `download_stats` | Recent (day/week/month) or overall download counts |
| `top_packages` | Top 30-day or 365-day most-downloaded packages |
| `search_packages` | PyPI search by query |

## Input

```json
{
  "tool": "download_stats",
  "args": { "name": "requests", "range": "recent", "period": "month" }
}
```

## Example: package_details with releases

```json
{
  "tool": "package_details",
  "args": { "name": "requests", "include_releases": true, "recent_releases_limit": 5 }
}
```

Output:

```json
{
  "name": "requests",
  "version": "2.31.0",
  "summary": "Python HTTP for Humans.",
  "author": "Kenneth Reitz",
  "license": "Apache 2.0",
  "homepage": "https://requests.readthedocs.io",
  "project_urls": { "Source": "https://github.com/psf/requests" },
  "keywords": ["http", "requests", "python"],
  "requires_python": ">=3.7",
  "pypi_url": "https://pypi.org/project/requests/",
  "releases": [
    { "version": "2.31.0", "released_at": "2023-05-22T15:12:31.000Z", "yanked": false }
  ]
}
```

## Example: top_packages

```json
{ "tool": "top_packages", "args": { "window": "30d", "limit": 30 } }
```

```json
{
  "window": "30d",
  "returned": 30,
  "packages": [
    { "rank": 1, "name": "boto3", "downloads": 1000000000 },
    ...
  ]
}
```

## Run locally

```
npm install
npm run build
apify run --input-file=./examples/requests.json
```

## Tests

```
npm test
```

20 tests across `test/client.test.ts` (PyPI JSON + pypistats + search HTML parser + retry) and `test/tools.test.ts` (the four tools end-to-end with a mocked fetch).

## Architecture

```
src/
  main.ts             Apify entry — reads input, dispatches to runTool
  tools/index.ts      Single dispatcher; one async runner per tool
  pypi-client.ts      PyPI + pypistats clients; retry + search HTML parser
  types.ts            Zod schemas for input + outputs
test/
  fixtures.ts         Realistic PyPI + pypistats fixtures
  client.test.ts      12 tests on the HTTP/parsing layer
  tools.test.ts       8 tests on the dispatcher
```

## License

MIT
