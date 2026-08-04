# MedGuard

**Clinical Decision Support Oracle on GenLayer** — Full-stack healthcare platform with 10 on-chain AI-powered clinical tools, 50-patient registry, 100-drug pharmaceutical database, and animated clinical workflow visualization.

---

## Live Deployment

| Detail | Value |
|--------|-------|
| **Contract Address** | [`0x2916Ec2952B83210B6c02f3D00E3CC2452Be4703`](https://explorer-studio.genlayer.com/address/0x2916Ec2952B83210B6c02f3D00E3CC2452Be4703) |
| **Network** | GenLayer StudioNet |
| **Chain ID** | 61999 (0xF22F) |
| **Explorer** | [explorer-studio.genlayer.com](https://explorer-studio.genlayer.com) |
| **Frontend** | [genlayer-medguard.vercel.app](https://genlayer-medguard.vercel.app) |
| **RPC URL** | `https://studio.genlayer.com/api` |
| **Native Token** | GEN |

---

## What It Does

MedGuard is an intelligent contract platform for healthcare professionals. It provides **10 core clinical functions**, all executed on-chain with AI consensus:

| # | Tool | Description | Type |
|---|------|-------------|------|
| 1 | **Drug Interaction** | Check two drugs for harmful interactions with AI-powered analysis | write |
| 2 | **Dosage Verification** | Verify medication dosages against patient weight and age | write |
| 3 | **Allergy Risk** | Cross-reference medications with known patient allergies | write |
| 4 | **Treatment Validation** | Validate proposed treatments against medical conditions | write |
| 5 | **Patient Registry** | Register and manage patient records on-chain | write |
| 6 | **Prescription Verify** | Verify prescriptions against patient history and safety | write |
| 7 | **Drug Database** | Search and manage the on-chain pharmaceutical database | write |
| 8 | **Medical Alerts** | View critical patient alerts and safety notifications | view |
| 9 | **Clinical Trials** | Match patients to relevant clinical trial opportunities | write |
| 10 | **Insurance Claims** | Verify insurance claims against treatment costs | write |

---

## Clinical Workflow

```
User Query → Contract (write tx) → Web Fetch (trusted sources) → AI Analysis → Consensus (leader + validator) → Result → Auto-Alert (if dangerous)
```

Each clinical tool follows the same on-chain consensus pattern:

1. **Submit** — Healthcare worker provides clinical query (drug names, dosages, patient info)
2. **Fetch** — Contract fetches from trusted medical sources via `gl.nondet.web.render()`
3. **Analyze** — AI evaluates against pharmacological data and clinical guidelines
4. **Consensus** — Leader and validator must agree on severity/safety levels exactly
5. **Store** — Clinical assessment stored on-chain with unique record ID
6. **Alert** — If dangerous result detected, automatic emergency alert created

---

## Severity & Safety Levels

### Drug Interaction Severity
| Level | Meaning |
|-------|---------|
| NONE | No known interaction |
| MINOR | Minimal significance, monitor patient |
| MODERATE | May require dose adjustment or monitoring |
| MAJOR | Avoid combination if possible |
| CONTRAINDICATED | Do not combine under any circumstances |

### Dosage Safety
| Level | Meaning |
|-------|---------|
| SAFE | Within therapeutic range |
| SUBTHERAPEUTIC | Below effective dose |
| ABOVE_THERAPEUTIC | Exceeds recommended range |
| DANGEROUS | Potentially toxic dose |

### Allergy Risk
| Level | Meaning |
|-------|---------|
| NO_RISK | No cross-reactivity found |
| MILD_RISK | Low likelihood, monitor |
| MODERATE_RISK | Consider alternatives |
| SEVERE_RISK | Avoid medication |
| ANAPHYLAXIS_RISK | Life-threatening — do not administer |

---

## Data

### Patient Registry (50 patients)
Pre-loaded with 50 American patients including:
- Patient IDs (P001–P050), full names, ages (24–82), weights (54–95 kg)
- Blood types (A+, A-, B+, B-, O+, O-, AB+, AB-)
- Known allergies (Penicillin, Sulfa, NSAIDs, Codeine, Statins, etc.)
- Medical conditions (Diabetes, Hypertension, Asthma, Cancer, CKD, etc.)

### Drug Database (100 drugs)
Comprehensive pharmaceutical catalog covering:
- **Categories**: Antibiotics, Antihypertensives, Antidiabetics, Antidepressants, NSAIDs, Statins, Anticoagulants, Corticosteroids, Immunosuppressants, Vitamins/Supplements
- **Data per drug**: Common dosages, side effects, contraindications
- **Examples**: Amoxicillin, Lisinopril, Metformin, Atorvastatin, Warfarin, Insulin Glargine, Methotrexate, Epinephrine

---

## Frontend Features

### 3 Main Tabs
| Tab | Content |
|-----|---------|
| **Workflow** | Animated clinical workflow — doctor walks through all 10 steps with chain flow visualization |
| **Patients (50)** | Searchable patient table with ID, name, age, weight, blood type, allergies, conditions |
| **Drug Database (100)** | Searchable drug table with name, category, dosages, side effects, contraindications |

### Dashboard (Import/Export)
- Import patients and drugs from CSV/JSON files
- Sample files available for download
- Export data as CSV/JSON
- localStorage persistence across page refreshes

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

---

## GenLayer Rules Compliance

| Rule | Status |
|------|--------|
| bigint u64 storage types (not Python int) | ✅ |
| UNTRUSTED DATA markers in all prompts | ✅ |
| gl.vm.run_nondet_unsafe consensus | ✅ |
| Constructor NO args | ✅ |
| gl.message.sender_address for caller tracking | ✅ |
| gl.vm.UserError for error handling | ✅ |
| TreeMap/DynArray auto-init | ✅ |
| web.render + exec_prompt inside leader_fn | ✅ |
| validator re-runs leader_fn for consensus | ✅ |
| JSON response_format on all exec_prompt | ✅ |
| Input validation & boundary clamping | ✅ |
| emit_transfer (not needed — no token transfers) | ✅ |

**Tests: 64/64 PASSED**

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

## Consensus Architecture

```python
def leader_fn() -> dict:
    fetched = self._fetch_all(urls, trusted)
    evidence = self._format_evidence(fetched)
    response = gl.nondet.exec_prompt(prompt, response_format="json")
    return self._normalize_*(response)

def validator_fn(leader_result) -> bool:
    my = leader_fn()                    # Re-run independently
    other = leader_result.calldata
    return my["severity"] == other["severity"]  # Must agree exactly

result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
```

Key principle: **Clinical severity levels must agree exactly** — patient safety is non-negotiable. Confidence allows ±1 rank, scores allow ±15–20 points.

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
| Data Persistence | localStorage + on-chain (TreeMap) |

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
│   │   ├── favicon.svg          # MedGuard favicon
│   │   ├── logo.svg             # MedGuard logo
│   │   ├── sample_patients.json # Sample patient data
│   │   ├── sample_patients.csv  # Sample patient data (CSV)
│   │   ├── sample_drugs.json    # Sample drug data
│   │   └── sample_drugs.csv     # Sample drug data (CSV)
│   ├── src/
│   │   ├── App.tsx              # Main application (12 pages)
│   │   ├── config.ts            # Network + contract config
│   │   ├── importExport.ts      # CSV/JSON import/export utilities
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
