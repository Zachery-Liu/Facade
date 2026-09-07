# GitHub REST Release Source Research

Sources consulted on 2026-09-07:

- GitHub's [release REST API documentation](https://docs.github.com/en/rest/releases)
- GitHub's [release asset REST API documentation](https://docs.github.com/en/rest/releases/assets)

## Relevant API contract

- `GET /repos/{owner}/{repo}` supplies repository metadata.
- `GET /repos/{owner}/{repo}/releases/latest` supplies the latest published full release; GitHub excludes draft and prerelease releases.
- `GET /repos/{owner}/{repo}/releases/tags/{tag}` resolves an explicitly selected tag.
- `GET /repos/{owner}/{repo}/releases/{release_id}/assets` is paginated and accepts up to 100 items per page.
- Public resources can be read anonymously; private resources require a token with read access to repository contents.

## Implementation consequences

- Keep the source API read-only and retain only API response fields included in Facade's snapshot contract.
- Fetch every asset page, rather than relying on the release payload's embedded first page.
- Treat 401/403 as authentication failures, 404 from `latest` as no published release, and other 4xx/5xx/network failures as distinct stable errors.
- Retry only transient transport and server/rate-limit responses with bounded attempts; never emit authorization values into errors or logs.
