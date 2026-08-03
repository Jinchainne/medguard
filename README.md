# MedGuard

Comprehensive Clinical Decision Support Oracle for GenLayer. Full-stack healthcare platform with on-chain drug interaction screening, dosage verification, allergy cross-checks, treatment validation, patient records, prescription verification, drug database, emergency alerts, clinical trial matching, and insurance claim verification.

---

## Live Deployment

| Detail | Value |
|--------|-------|
| **Contract Address** | [`0x747292eE674133Ec346444A26BdE687edD2C2454`](https://explorer-studio.genlayer.com/address/0x747292eE674133Ec346444A26BdE687edD2C2454) |
| **Network** | GenLayer StudioNet |
| **Chain ID** | 61999 |
| **Explorer** | [explorer-studio.genlayer.com](https://explorer-studio.genlayer.com) |
| **Frontend** | [genlayer-medguard.vercel.app](https://genlayer-medguard.vercel.app) |
| **RPC URL** | `https://studio.genlayer.com/api` |
| **Native Token** | GEN |

---

## What It Does

MedGuard is a comprehensive intelligent contract platform for healthcare professionals. It provides **10 core functions**, all executed on-chain with AI consensus:

### 1. Drug Interaction Screening
Check if two drugs can be safely co-administered. Returns severity level, risk score (0–100), pharmacological mechanism, and clinical recommendation.

| Severity | Meaning |
|----------|---------|
| NONE | No known interaction |
| MINOR | Minimal significance, monitor patient |
| MODERATE | May require dose adjustment or monitoring |
| MAJOR | Avoid combination if possible |
| CONTRAINDICATED | Do not combine under any circumstances |

### 2. Dosage Verification
Validate prescribed doses against therapeutic guidelines. Supports patient weight and age for pediatric/geriatric adjustments.

| Safety Level | Meaning |
|--------------|---------|
| SAFE | Within therapeutic range |
| SUBTHERAPEUTIC | Below effective dose |
| ABOVE_THERAPEUTIC | Exceeds recommended range |
| DANGEROUS | Potentially toxic dose |

### 3. Allergy Cross-Check
Screen medication lists against patient allergies. Cross-references cross-reactivity (e.g., penicillin → amoxicillin) and flags high-risk medications.

| Risk Level | Meaning |
|------------|---------|
| NO_RISK | No cross-reactivity found |
| MILD_RISK | Low likelihood, monitor |
| MODERATE_RISK | Consider alternatives |
| SEVERE_RISK | Avoid medication |
| ANAPHYLAXIS_RISK | Life-threatening — do not administer |

### 4. Treatment Protocol Validation
Verify proposed treatments against clinical guidelines. Validates the treatment plan for a given condition with on-chain source evidence.

### 5. Patient Records Management
Register and manage patient records on-chain: allergies, existing conditions, blood type, age, and weight. Records persist on-chain and are used by prescription verification.

### 6. Prescription Verification
Verify prescriptions against patient records. Automatically cross-references:
- Drug-drug interactions between prescribed medications
- Patient allergy conflicts
- Dosage appropriateness for patient age/weight

Returns status: VERIFIED, FLAGGED, or REJECTED with detailed clinical assessment.

### 7. Drug Database
Owner-managed searchable drug catalog with:
- Drug category classification
- Common dosage ranges
- Known side effects
- Contraindications

### 8. Emergency Alert System
Automatic alerts triggered when:
- Drug interaction detected (MAJOR or CONTRAINDICATED)
- Dangerous dosage detected
- Severe allergy risk (SEVERE or ANAPHYLAXIS)
- Prescription flagged or rejected

Alert severity levels: LOW, MEDIUM, HIGH, CRITICAL

### 9. Clinical Trial Matching
AI-powered matching of patient conditions against clinical trials from authoritative sources (clinicaltrials.gov, WHO, research institutions).

### 10. Insurance Claim Verification
Verify medical insurance claims against fair market pricing data. Returns verdict: APPROVED, DENIED, PARTIAL_COVERAGE, or NEEDS_REVIEW.

---

## How It Works

```
Clinical query + patient context → Fetch on-chain → AI cross-references guidelines → Consensus result → Auto-alerts if dangerous
```

1. **Submit** — Healthcare worker provides clinical query
2. **Fetch** — Contract fetches trusted clinical sources on-chain via `gl.nondet.web.render()` inside consensus
3. **Analyze** — AI evaluates against fetched pharmacological data and clinical guidelines
4. **Consensus** — Leader and validator must agree on severity/safety level, confidence (±1 rank), and scores (±15–20 points)
5. **Result** — Clinical assessment stored on-chain with quick safety check views
6. **Alert** — If dangerous result detected, automatic emergency alert created

---

## Contract Functions

### Write (13 functions)

| Function | Description |
|----------|-------------|
| `check_drug_interaction(drug_a, drug_b, context, urls)` | Screen two drugs for interactions |
| `verify_dosage(drug, mg, weight, age, urls)` | Validate dosage against guidelines |
| `check_allergy_risk(meds_csv, allergies_csv, context, urls)` | Cross-check meds vs allergies |
| `validate_treatment(condition, treatment, context, urls)` | Validate treatment against guidelines |
| `register_patient(id, name, allergies, conditions, blood_type, age, weight)` | Register patient record |
| `update_patient(id, field, value)` | Update patient record field |
| `verify_prescription(patient_id, meds_csv, notes, urls)` | Verify prescription safety |
| `add_drug(name, category, dosages, side_effects, contraindications)` | Add drug to database (owner) |
| `search_drugs(query)` | Search drug database |
| `match_clinical_trial(condition, context, urls)` | Match patient to clinical trials |
| `verify_insurance_claim(treatment, cost, provider, context, urls)` | Verify insurance claim |
| `add_trusted_source(url)` | Add trusted source (owner) |
| `remove_trusted_source(index)` | Remove trusted source (owner) |

### View (12 functions)

| Function | Description |
|----------|-------------|
| `get_check(id)` | Get full clinical check result |
| `get_patient(id)` | Get patient record |
| `get_prescription(id)` | Get prescription verification result |
| `get_drug_info(name)` | Get drug information |
| `get_alert(id)` | Get alert details |
| `get_alerts_for_patient(patient_id)` | Get all alerts for a patient |
| `get_trusted_sources()` | List trusted clinical sources |
| `get_stats()` | System-wide analytics |
| `is_interaction_safe(id)` | Quick: is this interaction safe? |
| `is_dosage_safe(id)` | Quick: is this dosage safe? |
| `is_allergy_safe(id)` | Quick: are these meds safe? |
| `get_version()` | Contract version |

---

## Analytics Dashboard

The `get_stats()` view returns comprehensive system analytics:

| Metric | Description |
|--------|-------------|
| `total_checks` | Total on-chain operations |
| `total_patients` | Registered patients |
| `total_prescriptions` | Verified prescriptions |
| `total_alerts` | Emergency alerts generated |
| `total_drug_checks` | Drug interaction checks |
| `total_dosage_checks` | Dosage verifications |
| `total_allergy_checks` | Allergy cross-checks |
| `total_treatment_checks` | Treatment validations |
| `total_claims` | Insurance claims verified |
| `drug_database_size` | Drugs in database |
| `trusted_sources_count` | Trusted clinical sources |

---

## Frontend Pages

| Page | Description |
|------|-------------|
| Dashboard | Hero section, analytics stats, tool cards, recent activity |
| Drug Interaction | Two-drug interaction screening form |
| Dosage Check | Dosage verification with patient parameters |
| Allergy Check | Medication vs allergy cross-check form |
| Treatment | Treatment protocol validation form |
| Patients | Patient registration and record management |
| Prescription | Prescription verification against patient records |
| Drug Database | Drug catalog search and management |
| Alerts | Emergency alert dashboard with severity filtering |
| Clinical Trials | AI-powered clinical trial matching |
| Insurance | Insurance claim verification |
| History | Complete audit trail of all on-chain operations |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contract | Python (py-genlayer) |
| Frontend | React 19, TypeScript 5.6, Vite 6 |
| Blockchain SDK | genlayer-js |
| Network | GenLayer StudioNet (Chain ID 61999) |
| Hosting | Vercel |
| AI Consensus | GenLayer validators (leader + validator pattern) |

---

## Project Structure

```
medguard/
├── contracts/
│   └── medguard.py              # Intelligent Contract ( 13 write + 12 view functions)
├── tests/
│   └── test_medguard.py         # 64 invariant tests
├── frontend/
│   ├── public/
│   │   ├── favicon.svg          # Blue Y favicon
│   │   └── logo.svg             # MedGuard logo
│   ├── src/
│   │   ├── App.tsx              # Main application (12 pages)
│   │   ├── config.ts            # Network + contract config
│   │   ├── styles.css           # Medical-themed dark UI
│   │   ├── main.tsx             # Entry point
│   │   ├── useGenLayer.ts       # Read/write client hooks
│   │   ├── useWallet.ts         # Wallet connection hook
│   │   └── env.d.ts             # TypeScript declarations
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── .gitignore
└── README.md
```

---

## Frontend Setup

```bash
cd frontend
npm install
npm run dev          # Development server at localhost:5173
npm run build        # Production build
npm run preview      # Preview production build
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_CONTRACT_ADDRESS` | Override contract address (optional) |

---

## Consensus Architecture

```python
def leader_fn() -> dict:
    # Fetch ALL URLs + trusted sources INSIDE consensus
    fetched = self._fetch_all(urls, trusted)
    # AI analyzes clinical data against fetched evidence
    return self._normalize_*(response)

def validator_fn(leader_result) -> bool:
    # Must agree on: severity/safety (exact), confidence (±1 rank),
    # risk_score (±15-20 points), flagged_medications (exact set)
    return my["severity"] == other["severity"]
```

Key: **Clinical severity levels must agree exactly** — patient safety is non-negotiable.

---

## Use Cases

- **Emergency Rooms** — Quick drug interaction check before administering medications
- **Pharmacies** — Verify prescriptions against patient allergy records
- **ICU** — Validate complex multi-drug regimens
- **Telemedicine** — Remote clinical decision support
- **Nursing** — Dosage verification before medication administration
- **Clinical Trials** — Patient matching and protocol validation
- **Insurance** — Claim verification against fair market pricing
- **Medical Education** — Training tool for clinical pharmacology

---

## Author

- **Jinchainne** — [GitHub](https://github.com/Jinchainne)
