# Security Notes

## Current Advisory Status

As of February 14, 2026, `npm audit --omit=dev` reports remaining high-severity advisories in transitive dependencies under `sqlite3`:

- package: `tar` (via `sqlite3` install/build chain)
- scope: transitive dependency, not directly imported by application business logic
- suggested npm fix: `npm audit fix --force` (not accepted because it attempts unsafe package regression/downgrade paths)

## Risk Assessment

- The vulnerable package path is tied to dependency/tooling internals for `sqlite3`.
- PropAI does not process untrusted tar archives in runtime application flows.
- Residual risk is considered lower for current runtime behavior, but still tracked.

## Current Mitigations

- Pinned `sqlite3` to `^5.1.7` (avoid older vulnerable chains).
- Avoided `npm audit fix --force` to prevent breaking dependency regressions.
- Kept dependency tree stable and verified app/test behavior after updates.

## Planned Remediation

- Monitor upstream `sqlite3` dependency updates for patched transitive chain.
- Evaluate migration to `better-sqlite3` (or equivalent) to remove this vulnerability class entirely.
- Re-run:
  - `npm audit --omit=dev`
  - `npm audit`
  during each release cycle.

## Security Reporting

If you discover a new security issue in PropAI-Claw:

1. Do not open a public issue with exploit details.
2. Contact the maintainer privately with:
   - affected version/commit
   - reproduction steps
   - impact assessment
3. Wait for fix coordination before public disclosure.
