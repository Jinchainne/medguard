# MedGuard

Clinical Decision Support Oracle for GenLayer. On-chain drug interaction screening, dosage verification, allergy cross-checks, and treatment protocol validation for healthcare workers.

## What It Does

MedGuard is an intelligent contract designed for healthcare professionals at the point of care:

- **Drug Interaction Screening** — Check if two drugs can be safely co-administered
- **Dosage Verification** — Validate prescribed doses against therapeutic guidelines
- **Allergy Cross-Check** — Screen medication lists against patient allergies
- **Treatment Protocol Validation** — Verify proposed treatments against clinical guidelines

## How It Works

```
Clinical query + patient context → Fetch on-chain → AI cross-references guidelines → Consensus result
```

1. **Submit** — Healthcare worker provides clinical query (drugs, dosage, allergies, or treatment)
2. **Fetch** — Contract fetches trusted clinical sources on-chain via `gl.nondet.web.render()` inside consensus
3. **Analyze** — AI evaluates against fetched pharmacological data and clinical guidelines
4. **Consensus** — Leader and validator must agree on severity/safety level, confidence (±1 rank), and scores (±15-20 points)
5. **Result** — Clinical assessment stored on-chain with quick safety check views

## Core Functions

### Drug Interaction Check
| Severity | Meaning |
|----------|---------|
| NONE | No known interaction |
| MINOR | Minimal significance, monitor patient |
| MODERATE | May require dose adjustment or monitoring |
| MAJOR | Avoid combination if possible |
| CONTRAINDICATED | Do not combine under any circumstances |

### Dosage Verification
| Safety Level | Meaning |
|--------------|---------|
| SAFE | Within therapeutic range |
| SUBTHERAPEUTIC | Below effective dose |
| ABOVE_THERAPEUTIC | Exceeds recommended range |
| DANGEROUS | Potentially toxic dose |

### Allergy Cross-Check
| Risk Level | Meaning |
|------------|---------|
| NO_RISK | No cross-reactivity found |
| MILD_RISK | Low likelihood, monitor |
| MODERATE_RISK | Consider alternatives |
| SEVERE_RISK | Avoid medication |
| ANAPHYLAXIS_RISK | Life-threatening — do not administer |

## Contract Functions

### Write
| Function | Description |
|----------|-------------|
| `check_drug_interaction(drug_a, drug_b, context, urls)` | Screen two drugs for interactions |
| `verify_dosage(drug, mg, weight, age, urls)` | Validate dosage against guidelines |
| `check_allergy_risk(meds_csv, allergies_csv, context, urls)` | Cross-check meds vs allergies |
| `validate_treatment(condition, treatment, context, urls)` | Validate treatment against guidelines |
| `add_trusted_source(url)` | Owner adds trusted clinical source |
| `remove_trusted_source(index)` | Owner removes a source |

### View
| Function | Description |
|----------|-------------|
| `get_check(id)` | Get full clinical check result |
| `get_trusted_sources()` | List trusted clinical sources |
| `get_stats()` | Total checks, sources count |
| `is_interaction_safe(id)` | Quick: is this interaction safe? |
| `is_dosage_safe(id)` | Quick: is this dosage safe? |
| `is_allergy_safe(id)` | Quick: are these meds safe for this patient? |
| `get_version()` | Contract version |

## Consensus Architecture

```python
def leader_fn() -> dict:
    # Fetch ALL URLs + trusted sources INSIDE consensus
    fetched = self._fetch_all(urls, trusted)
    # AI analyzes clinical data against fetched evidence
    # Returns severity/safety + confidence + risk_score
    return self._normalize_*(response)

def validator_fn(leader_result) -> bool:
    # Must agree on: severity/safety (exact), confidence (±1 rank),
    # risk_score (±15 points), flagged_medications (exact set)
    return my["severity"] == other["severity"]
```

Key: **Clinical severity levels must agree exactly** — patient safety is non-negotiable.

## Use Cases

- **Emergency rooms**: Quick drug interaction check before administering medications
- **Pharmacy**: Verify prescriptions against patient allergy records
- **ICU**: Validate complex multi-drug regimens
- **Telemedicine**: Remote clinical decision support
- **Nursing**: Dosage verification before medication administration
- **Clinical trials**: Treatment protocol validation

## Project Structure

```
├── contracts/
│   └── medguard.py             # Intelligent Contract
├── tests/
│   └── test_medguard.py        # Invariant tests
└── README.md
```

## Author

- **Jinchainne** — [GitHub](https://github.com/Jinchainne)
