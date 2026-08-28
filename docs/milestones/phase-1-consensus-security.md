# Milestone 1: Clinical Consensus Security Hardening

**Release:** 2.1.0  
**Date:** 2026-08-28  
**Baseline:** [`5f5506e`](https://github.com/Jinchainne/medguard/commit/5f5506e)

## Problem

The original fetch policy accepted up to ten user URLs and gave every page the same 4,000-character allowance. A set of long, user-controlled pages could therefore dominate the LLM context, while a successful arbitrary page was enough to mark the request as evidence-backed. Prompts told the model to ignore embedded instructions, but did not verify that the instruction boundary survived inference.

## Before And After

| Control | Before | After |
|:--|:--|:--|
| User-controlled URLs | Up to 10 | Up to 4 |
| User evidence budget | 4,000 chars/source | 1,200 chars/source |
| Reserved clinical budget | None | 3,000 chars/authoritative source |
| Evidence quorum | Any fetched page | At least one authoritative clinical page |
| Source provenance in prompt | Generic `SOURCE` | `USER SOURCE` / `AUTHORITATIVE SOURCE` |
| Prompt injection integrity | Instruction only | Exact response canary enforced |
| Behavioral security tests | 0 | 5 |
| Public schema | Rejected `float` calldata | Fully generated with integer units |

## GenLayer Workflow

1. The contract accepts optional HTTPS references from the caller.
2. User references are deduplicated and capped independently.
3. Every query-specific clinical database receives its own reserved budget.
4. A verdict is unavailable unless authoritative evidence is actually fetched.
5. The leader performs web retrieval and LLM analysis inside GenLayer nondeterministic execution.
6. The response must preserve `MEDGUARD_CLINICAL_EVIDENCE_ONLY_V1` before normalization.
7. Validators independently repeat the same protected workflow and compare the decision-bearing fields.

## Verification

Run:

```bash
python -m pytest -q
cd frontend && npm ci && npm run build
```

The behavioral suite proves that ten proposer pages cannot crowd three reserved clinical sources out of the prompt, user evidence alone cannot unlock a verdict, provenance remains visible, a modified canary is rejected, and all seven AI workflows enforce the control.

## Deployment Proof

- Contract: [`0x99Bec3Db10D95c3561b72Ae9577EccBF5adE334b`](https://explorer-studio.genlayer.com/address/0x99Bec3Db10D95c3561b72Ae9577EccBF5adE334b)
- Deployment transaction: [`0x5dacc9...d55cb`](https://explorer-studio.genlayer.com/tx/0x5dacc940881c0f8c654f505f0a467d2a82bd454f7e2b7a6d80acf9036aad55cb)
- Consensus result: `MAJORITY_AGREE`
- On-chain version: `medguard/2.1.0`
- Schema: verified through StudioNet `gen_getContractSchema`

## Scope Boundary

This milestone contains only consensus evidence and prompt-integrity hardening. Appeals, reputation, external protocol integrations, localization, and traction campaigns are deliberately reserved for later milestones.
