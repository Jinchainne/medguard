# Changelog

All notable MedGuard milestones are documented here. Each release is intentionally scoped so it can be reviewed as distinct progress in the GenLayer Builder Program.

## [2.1.0] - 2026-08-28

### Clinical Consensus Security Hardening

- Reserved independent evidence budgets for user references and authoritative clinical sources.
- Limited user-controlled evidence to four pages at 1,200 characters each.
- Guaranteed every category-specific clinical source up to 3,000 characters of prompt capacity.
- Required authoritative evidence before any of the seven AI workflows can issue a clinical verdict.
- Added a prompt-safety canary to all seven LLM response schemas and rejected mismatches before consensus normalization.
- Added five behavioral security tests covering evidence crowd-out, authoritative-source failure, provenance labels, canary rejection, and complete workflow enforcement.
- Replaced unsupported public `float` calldata with integer clinical units and cost cents so StudioNet can generate a usable contract schema.
- Added GitHub CI for the contract policy suite, production frontend build, and high-severity dependency audit.
- Made the existing contract invariant suite encoding-safe on Windows.

## [2.0.0] - 2026-08-22

- Shipped ten clinical workflows backed by GenLayer nondeterministic web access and LLM consensus.
- Added the React application, StudioNet wallet workflow, patient and drug datasets, alerts, history, and deployment documentation.
