# MedGuard

Clinical Decision Support Oracle for GenLayer. Full-stack healthcare platform with on-chain drug interaction screening, dosage verification, allergy cross-checks, treatment validation, patient records, prescription verification, drug database, emergency alerts, clinical trial matching, and insurance claim verification.

---

## Live Deployment

| Detail | Value |
|--------|-------|
| **Contract Address** | [`0x2916Ec2952B83210B6c02f3D00E3CC2452Be4703`](https://explorer-studio.genlayer.com/address/0x2916Ec2952B83210B6c02f3D00E3CC2452Be4703) |
| **Network** | GenLayer StudioNet |
| **Chain ID** | 61999 |
| **Explorer** | [explorer-studio.genlayer.com](https://explorer-studio.genlayer.com) |
| **Frontend** | [genlayer-medguard.vercel.app](https://genlayer-medguard.vercel.app) |
| **RPC URL** | `https://studio.genlayer.com/api` |
| **Native Token** | GEN |

---

## What It Does

MedGuard is an intelligent contract platform for healthcare professionals. It provides **10 core clinical functions**, all executed on-chain with AI consensus:

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
Verify proposed treatments against clinical guidelines with on-chain source evidence.

### 5. Patient Records Management
Register and manage patient records on-chain: allergies, conditions, blood type, age, weight. Records persist on-chain and sync across all pages.

### 6. Prescription Verification
Verify prescriptions against patient records. Automatically cross-references drug-drug interactions, allergy conflicts, and dosage appropriateness.

### 7. Drug Database
Owner-managed searchable drug catalog with category, dosages, side effects, and contraindications.

### 8. Emergency Alert System
Automatic alerts triggered when dangerous interactions, dosages, or allergy risks are detected.

### 9. Clinical Trial Matching
AI-powered matching of patient conditions against clinical trials from authoritative sources.

### 10. Insurance Claim Verification
Verify medical insurance claims against fair market pricing data.

---

## How It Works

```
Clinical query + patient context → Fetch on-chain → AI cross-references → Consensus result → Auto-alerts if dangerous
```

1. **Submit** — Healthcare worker provides clinical query
2. **Fetch** — Contract fetches trusted clinical sources on-chain via `gl.nondet.web.render()`
3. **Analyze** — AI evaluates against pharmacological data and clinical guidelines
4. **Consensus** — Leader and validator must agree on severity/safety, confidence (±1 rank), scores (±15–20 points)
5. **Result** — Clinical assessment stored on-chain with quick safety check views
6. **Alert** — If dangerous result detected, automatic emergency alert created

---

## Frontend Features

### Data Management (Dashboard)
- **Import/Export** patients and drugs from CSV/JSON files
- **Sample files** available for download (sample_patients.json/csv, sample_drugs.json/csv)
- **localStorage persistence** — data survives page refresh
- **Shared data** — imported data available across all pages via dropdown selectors

### Clinical Pages (12 pages)
| Page | Features |
|------|----------|
| Dashboard | Stats, Import/Export, Clinical Tools grid |
| Drug Interaction | Drug A + Drug B selectors from database |
| Dosage Check | Drug selector + patient weight/age |
| Allergy Check | Patient selector (auto-fills allergies) + multi-drug selector |
| Treatment | Condition + treatment validation |
| Patients | Register new + Select/Lookup existing |
| Prescription | Patient selector + multi-drug selector |
| Drug Database | Add drug + Search + Lookup |
| Alerts | Patient selector for alert lookup |
| Clinical Trials | Condition-based trial matching |
| Insurance | Treatment + cost verification |
| History | Full audit trail with formatted result cards |

### Dropdown Selectors
- **PatientSelector** — Select from registered patients or enter ID manually
- **DrugSelector** — Select from drug database or enter name manually
- **MultiDrugSelector** — Tag-style multi-select with add/remove

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

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contract | Python (py-genlayer) |
| Frontend | React 19, TypeScript, Vite 6 |
| Blockchain SDK | genlayer-js |
| Network | GenLayer StudioNet (Chain ID 61999) |
| Hosting | Vercel |
| AI Consensus | GenLayer validators (leader + validator pattern) |
| Data Persistence | localStorage + on-chain |

---

## Project Structure

```
medguard/
├── contracts/
│   └── medguard.py              # Intelligent Contract (13 write + 12 view functions)
├── tests/
│   └── test_medguard.py         # 64 invariant tests
├── frontend/
│   ├── public/
│   │   ├── favicon.svg          # Blue Y favicon
│   │   ├── logo.svg             # MedGuard logo
│   │   ├── sample_patients.json # Sample patient data (5 records)
│   │   ├── sample_patients.csv  # Sample patient data (CSV)
│   │   ├── sample_drugs.json    # Sample drug data (8 drugs)
│   │   └── sample_drugs.csv     # Sample drug data (CSV)
│   ├── src/
│   │   ├── App.tsx              # Main application (12 pages)
│   │   ├── config.ts            # Network + contract config
│   │   ├── importExport.ts      # CSV/JSON import/export utilities
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

## Sample Data

### Patients (sample_patients.json)
```json
[
  { "patient_id": "PAT-001", "full_name": "Nguyen Van An", "allergies": "Penicillin, Latex", "conditions": "Diabetes Type 2, Hypertension", "blood_type": "O+", "age_years": 45, "weight_kg": 72 },
  { "patient_id": "PAT-002", "full_name": "Tran Thi Bich", "allergies": "Sulfa drugs", "conditions": "Asthma", "blood_type": "A+", "age_years": 32, "weight_kg": 58 }
]
```

### Drugs (sample_drugs.json)
```json
[
  { "drug_name": "Metformin", "category": "Antidiabetic", "common_dosages": "500mg, 850mg, 1000mg", "side_effects": "Nausea, Diarrhea, Lactic acidosis", "contraindications": "Renal impairment, Hepatic disease" },
  { "drug_name": "Amoxicillin", "category": "Antibiotic - Penicillin", "common_dosages": "250mg, 500mg, 875mg", "side_effects": "Diarrhea, Rash, Allergic reaction", "contraindications": "Penicillin allergy, Mononucleosis" }
]
```

---

## Consensus Architecture

```python
def leader_fn() -> dict:
    fetched = self._fetch_all(urls, trusted)
    response = gl.nondet.exec_prompt(prompt, response_format="json")
    return self._normalize_*(response)

def validator_fn(leader_result) -> bool:
    my = leader_fn()
    return my["severity"] == other["severity"]  # Must agree exactly
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

---

## Author

- **Jinchainne** — [GitHub](https://github.com/Jinchainne)
