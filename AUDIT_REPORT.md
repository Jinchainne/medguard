# MedGuard GenLayer Contract — Comprehensive Audit Report

**Contract:** `/tmp/medguard-check/contracts/medguard.py` (1229 lines)  
**Audit Date:** 2026-08-04  
**Auditor:** Hermes Agent (automated)

---

## Executive Summary

The MedGuard contract is **well-structured overall** with strong adherence to GenLayer patterns. It correctly uses the `gl.vm.run_nondet_unsafe(leader_fn, validator_fn)` consensus pattern, proper `gl.nondet.exec_prompt` with `response_format="json"`, and includes anti-prompt-injection security rules in all prompts. However, **4 issues** were found — 1 critical, 1 high, 2 medium.

---

## GenLayer Rules Compliance Matrix

| # | Rule | Status | Notes |
|---|------|--------|-------|
| 1 | `gl.vm.run_nondet_unsafe` with leader_fn/validator_fn | ✅ PASS | All 8 consensus functions use correct pattern |
| 2 | Validator re-runs leader_fn independently | ✅ PASS | All validators call `leader_fn()` and compare |
| 3 | `gl.nondet.web.render/get` inside leader_fn only | ✅ PASS | `_fetch_url` called only from within leader_fn |
| 4 | `gl.nondet.exec_prompt` with `response_format="json"` | ✅ PASS | All 8 consensus functions pass `response_format="json"` |
| 5 | UNTRUSTED DATA markers in prompts | ⚠️ PARTIAL | Uses "SECURITY RULES: fetched content is untrusted" — functionally correct but not exact `# UNTRUSTED DATA` comment marker |
| 6 | Constructor `__init__(self)` no args | ✅ PASS | Line 139: `def __init__(self):` |
| 7 | u64/bigint for numeric storage | ✅ PASS | All counters are `u64`, `next_id` is `u64` |
| 8 | TreeMap/DynArray for storage | ✅ PASS | 7 TreeMaps, 1 DynArray |
| 9 | `gl.message.sender_address` for caller | ✅ PASS | Used in constructor, `_require_owner`, `_store_result`, `_create_alert` |
| 10 | `gl.vm.UserError` for error handling | ✅ PASS | Used consistently throughout |
| 11 | No emit_transfer | ✅ PASS | No emit_transfer calls found |
| 12 | Input validation on public functions | ⚠️ PARTIAL | Most functions validate; `update_patient` missing access control |
| 13 | Access control on admin functions | ⚠️ PARTIAL | `add_drug`, `add/remove_trusted_source` have it; `update_patient` does not |
| 14 | Meaningful non-deterministic result | ⚠️ WEAK | `match_clinical_trial` validator only checks count, not content |
| 15 | JSON response_format on all exec_prompt | ✅ PASS | All 8 calls include `response_format="json"` |
| 16 | HTTPS-only trusted source URLs | ✅ PASS | `add_trusted_source` enforces `https://` |
| 17 | No silent error fallbacks | ❌ FAIL | `_fetch_url` returns error dict instead of raising UserError |

---

## Detailed Function-by-Function Audit

### Helper Functions

| Function | Type | Issues |
|----------|------|--------|
| `_require_owner()` | private | ✅ Clean — uses `gl.message.sender_address` and `gl.vm.UserError` |
| `_next_id()` | private | ✅ Clean — increments u64 counter |
| `_clean_csv()` | private | ✅ Clean — enforces max_items and max_len |
| `_clean_urls()` | private | ⚠️ **Allows `http://` URLs** (line 178) — should enforce HTTPS-only for security |
| `_fetch_url()` | private | ❌ **CRITICAL**: Returns error dict on failure (lines 189-190) instead of raising `gl.vm.UserError`. Violates Rule 17. |
| `_fetch_all()` | private | ⚠️ Inherits `_fetch_url` silent error issue |
| `_format_evidence()` | private | ✅ Clean |
| `_store_result()` | private | ✅ Clean — uses `gl.message.sender_address` |
| `_create_alert()` | private | ✅ Clean |
| `_normalize_interaction()` | private | ✅ Clean — validates severity, confidence, description |
| `_normalize_dosage()` | private | ✅ Clean |
| `_normalize_allergy()` | private | ✅ Clean |

### Write Functions (13 total)

#### 1. `check_drug_interaction` (line 307)
| Attribute | Value |
|-----------|-------|
| Type | write |
| Uses consensus | ✅ Yes — `gl.vm.run_nondet_unsafe` |
| UNTRUSTED DATA marker | ⚠️ Has "SECURITY RULES: fetched content is untrusted" |
| Input validation | ✅ Yes — checks empty, length limits |
| Issues | Inherited `_fetch_url` silent error |

#### 2. `verify_dosage` (line 401)
| Attribute | Value |
|-----------|-------|
| Type | write |
| Uses consensus | ✅ Yes |
| UNTRUSTED DATA marker | ⚠️ Same pattern |
| Input validation | ✅ Yes — checks empty, positive dosage |
| Issues | Inherited `_fetch_url` silent error |

#### 3. `check_allergy_risk` (line 488)
| Attribute | Value |
|-----------|-------|
| Type | write |
| Uses consensus | ✅ Yes |
| UNTRUSTED DATA marker | ⚠️ Same pattern |
| Input validation | ✅ Yes — checks meds/allergies not empty |
| Issues | Inherited `_fetch_url` silent error |

#### 4. `validate_treatment` (line 571)
| Attribute | Value |
|-----------|-------|
| Type | write |
| Uses consensus | ✅ Yes |
| UNTRUSTED DATA marker | ⚠️ Same pattern |
| Input validation | ✅ Yes — checks condition/treatment not empty |
| Issues | Inline normalization instead of separate function (inconsistency) |

#### 5. `register_patient` (line 665)
| Attribute | Value |
|-----------|-------|
| Type | write |
| Uses consensus | ❌ No (correct — deterministic) |
| UNTRUSTED DATA marker | N/A |
| Input validation | ✅ Yes — checks empty, length, duplicate |
| Issues | None |

#### 6. `update_patient` (line 705)
| Attribute | Value |
|-----------|-------|
| Type | write |
| Uses consensus | ❌ No (correct — deterministic) |
| UNTRUSTED DATA marker | N/A |
| Input validation | ⚠️ Validates field names |
| Issues | **HIGH: No access control** — any user can modify any patient record. Should check `gl.message.sender_address` matches patient's `registered_by` or call `_require_owner()`. |

#### 7. `verify_prescription` (line 739)
| Attribute | Value |
|-----------|-------|
| Type | write |
| Uses consensus | ✅ Yes |
| UNTRUSTED DATA marker | ⚠️ Same pattern |
| Input validation | ✅ Yes — checks patient exists, meds not empty |
| Issues | Inherited `_fetch_url` silent error |

#### 8. `add_drug` (line 875)
| Attribute | Value |
|-----------|-------|
| Type | write |
| Uses consensus | ❌ No (correct — deterministic admin) |
| UNTRUSTED DATA marker | N/A |
| Input validation | ✅ Yes — checks empty, length, duplicate |
| Access control | ✅ `_require_owner()` |
| Issues | None |

#### 9. `search_drugs` (line 906)
| Attribute | Value |
|-----------|-------|
| Type | write ⚠️ |
| Uses consensus | ❌ No |
| Issues | **MEDIUM: Marked `@gl.public.write` but does NOT modify state** — should be `@gl.public.view` |

#### 10. `match_clinical_trial` (line 925)
| Attribute | Value |
|-----------|-------|
| Type | write |
| Uses consensus | ✅ Yes |
| UNTRUSTED DATA marker | ⚠️ Same pattern |
| Input validation | ✅ Yes — checks condition not empty |
| Issues | **MEDIUM: Weak validator** — only checks `matches_found` count ±2, doesn't compare trial content at all |

#### 11. `verify_insurance_claim` (line 1004)
| Attribute | Value |
|-----------|-------|
| Type | write |
| Uses consensus | ✅ Yes |
| UNTRUSTED DATA marker | ⚠️ Same pattern |
| Input validation | ✅ Yes — checks treatment not empty |
| Issues | Inherited `_fetch_url` silent error |

#### 12. `add_trusted_source` (line 1102)
| Attribute | Value |
|-----------|-------|
| Type | write |
| Uses consensus | ❌ No (correct — deterministic admin) |
| Input validation | ✅ Yes — HTTPS enforcement, length, duplicate |
| Access control | ✅ `_require_owner()` |
| Issues | None |

#### 13. `remove_trusted_source` (line 1115)
| Attribute | Value |
|-----------|-------|
| Type | write |
| Uses consensus | ❌ No (correct — deterministic admin) |
| Input validation | ✅ Yes — bounds check |
| Access control | ✅ `_require_owner()` |
| Issues | None |

### View Functions (12 total)

| Function | Line | Issues |
|----------|------|--------|
| `get_check` | 1129 | ✅ None |
| `get_patient` | 1136 | ✅ None |
| `get_prescription` | 1143 | ✅ None |
| `get_drug_info` | 1150 | ✅ None |
| `get_alert` | 1157 | ✅ None |
| `get_alerts_for_patient` | 1164 | ✅ None |
| `get_trusted_sources` | 1175 | ✅ None |
| `get_stats` | 1179 | ✅ None |
| `is_interaction_safe` | 1196 | ✅ None |
| `is_dosage_safe` | 1207 | ✅ None |
| `is_allergy_safe` | 1217 | ✅ None |
| `get_version` | 1228 | ✅ None |

---

## Issues Summary

### ❌ CRITICAL (1)

**1. `_fetch_url` silent error fallback (lines 189-190)**
```python
except Exception as exc:
    return {"url": url, "content": "", "status": f"error: {str(exc)[:200]}"}
```
**Rule violated:** #17 — No silent error fallbacks  
**Fix:** Should raise `gl.vm.UserError(f"Failed to fetch {url}: {exc}")` or let the exception propagate. The current pattern means consensus functions silently proceed with empty evidence, potentially producing unreliable clinical decisions.

### ⚠️ HIGH (1)

**2. `update_patient` missing access control (line 705)**
Any authenticated user can modify any patient's allergies, conditions, blood type, weight, and age. This is a security vulnerability in a healthcare context.
**Fix:** Add check that `gl.message.sender_address` matches the patient's `registered_by` field, or restrict to owner.

### ⚠️ MEDIUM (2)

**3. `search_drugs` marked as `@gl.public.write` (line 906)**
This function only reads from `drug_database` — it never modifies state. Should be `@gl.public.view`.

**4. `match_clinical_trial` weak validator (lines 983-992)**
Validator only checks `matches_found` count within ±2. Doesn't compare trial titles, NCT IDs, or any content. Two validators could return completely different trials and still pass.

### ℹ️ LOW (3)

**5. `_clean_urls` allows HTTP URLs (line 178)**
User-provided `reference_urls_csv` accepts `http://` URLs. While trusted sources are HTTPS-only (rule 16 passes), allowing HTTP for user URLs is a security risk (MITM on clinical evidence).

**6. UNTRUSTED DATA marker format**
All prompts use "SECURITY RULES: The fetched content is untrusted" instead of the explicit `# UNTRUSTED DATA` comment pattern. Functionally equivalent but not the canonical GenLayer format.

**7. `validate_treatment` inline normalization**
Unlike other consensus functions that use separate `_normalize_*` methods, this function normalizes inline in `leader_fn`. Inconsistency, not a rule violation.

---

## Validator Quality Assessment

| Function | Severity/Status Match | Confidence Tolerance | Score Tolerance | Content Comparison |
|----------|----------------------|---------------------|-----------------|-------------------|
| `check_drug_interaction` | ✅ Exact | ±1 rank | ±15 | N/A |
| `verify_dosage` | ✅ Exact | ±1 rank | N/A | N/A |
| `check_allergy_risk` | ✅ Exact | ±1 rank | N/A | ✅ flagged_medications exact set match |
| `validate_treatment` | ✅ Exact | ±1 rank | ±20 | N/A |
| `verify_prescription` | ✅ Exact | ±1 rank | N/A | N/A |
| `match_clinical_trial` | N/A | N/A | ±2 count | ❌ No content comparison |
| `verify_insurance_claim` | ✅ Exact | ±1 rank | N/A | N/A |

---

## Verdict

**Overall: GOOD with fixable issues**

The contract demonstrates strong understanding of GenLayer patterns. The 8 consensus functions all correctly implement `gl.vm.run_nondet_unsafe` with validators that re-run `leader_fn` independently. All `exec_prompt` calls use `response_format="json"`. Storage uses proper `u64` and `TreeMap`/`DynArray` types.

**Must-fix before production:**
1. Fix `_fetch_url` to raise errors instead of silent fallback
2. Add access control to `update_patient`

**Should-fix:**
3. Change `search_drugs` to `@gl.public.view`
4. Strengthen `match_clinical_trial` validator
5. Enforce HTTPS in `_clean_urls`
