# Security Policy

[简体中文](SECURITY.zh-CN.md) | English

## Reporting a vulnerability

Please do not report security vulnerabilities through public GitHub issues.

Report vulnerabilities privately through [GitHub Security Advisories](https://github.com/Zachery-Liu/Facade/security/advisories) by selecting **Report a vulnerability**.

Please do not disclose vulnerability details publicly until the issue has been reviewed and, when appropriate, a fix or mitigation is available.

When reporting a vulnerability, please include:

- a description of the issue;
- affected versions or commits;
- reproduction steps or a proof of concept when appropriate;
- the potential impact;
- any suggested mitigation, if known.

Please avoid including real credentials, access tokens, private repository contents, or other sensitive user data unless they are strictly necessary to understand the report.

## Supported versions

Facade is currently under active pre-release development.

Until a stable release policy is established, security fixes are generally applied to the latest development version. Older development snapshots should not be assumed to receive security updates.

## Scope

Security reports may include issues involving the Facade CLI, GitHub Action, generated output, dependency handling, release metadata processing, or other repository-owned components.

Facade does not proxy release downloads, automatically install software, or make artifact trust decisions on behalf of users. Reports about vulnerabilities in third-party software distributed through a project's GitHub Releases should normally be directed to that software's maintainers.
