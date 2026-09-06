# GitHub quality-gate references

- GitHub rulesets can require pull requests and named status checks; once configured, all required checks must pass before merge. Source: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets
- CodeQL supports JavaScript/TypeScript and GitHub Actions workflows. Source: https://docs.github.com/en/code-security/concepts/code-scanning/codeql/codeql-code-scanning
- Dependency Review is available for public repositories. Its action can fail a pull request when newly introduced vulnerable dependencies are found. Source: https://docs.github.com/en/code-security/concepts/supply-chain-security/dependency-review

Decision: use independent GitHub Actions jobs for stable, separately required status checks; leave the GitHub ruleset as a final external configuration step after the workflow first runs.
