# MedGuard

**Clinical Decision Support Oracle on GenLayer** — Full-stack healthcare platform with 10 on-chain AI-powered clinical tools, animated workflow visualization, 50-patient registry, and 103-drug pharmaceutical database.

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

## GenLayer Rules Compliance

| # | Rule | Status |
|---|------|--------|
| 1 | gl.vm.run_nondet_unsafe consensus (7 functions) | ✅ |
| 2 | Validator re-runs leader_fn independently (7/7) | ✅ |
| 3 | gl.nondet.web.render for fetching inside leader_fn | ✅ |
| 4 | gl.nondet.exec_prompt with response_format="json" (7/7) | ✅ |
| 5 | UNTRUSTED DATA markers in all prompts (7/7) | ✅ |
| 6 | Constructor NO args: def __init__(self) | ✅ |
| 7 | u64 storage types for numerics (9 fields) | ✅ |
| 8 | TreeMap/DynArray auto-initialized (7+1) | ✅ |
| 9 | gl.message.sender_address for caller tracking | ✅ |
| 10 | gl.vm.UserError for error handling (42 calls) | ✅ |
| 11 | Input validation (46 strip + 8 len checks) | ✅ |
| 12 | Access control (_require_owner) on admin functions | ✅ |
| 13 | HTTPS-only trusted source enforcement | ✅ |
| 14 | No silent error fallbacks | ✅ |
| 15 | Meaningful non-deterministic results (not trivial) | ✅ |

**Tests: 64/64 PASSED**

---

## 10 Clinical Workflow Steps

| # | Tool | Description | Type |
|---|------|-------------|------|
| 1 | **Drug Interaction** | Check two drugs for harmful interactions with AI analysis | write |
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

## Clinical Workflow Animation

The dashboard features an animated clinical workflow with:
- **Glowing arrow transitions** between steps that light up sequentially
- **Pixel art MC doctor** character in the bottom-right corner (bouncing, blinking, retro game style)
- **Auto Play** mode with 1.6s per step
- **Progress bar** showing current step (X/10)
- **Step cards** with glow effects, checkmarks, and active indicators

---

## Frontend Features

### 3 Main Tabs
| Tab | Content |
|-----|---------|
| **Dashboard** | Stats, Import/Export, Clinical Workflow animation, Clinical Tools grid |
| **Patients (50)** | Auto-loaded patient table with search (P001–P050, American names) |
| **Drug Database (103)** | Auto-loaded drug table with search (103 drugs across all categories) |

### Key Features
- **Auto-load sample data** on first visit (50 patients, 103 drugs from JSON)
- **Local-first patient lookup** (checks localStorage before on-chain)
- **Import/Export** patients and drugs via CSV/JSON
- **Dropdown selectors** populated from local data across all pages
- **Wallet integration** with OKX/MetaMask on StudioNet
- **12 pages**: Dashboard, Interaction, Dosage, Allergy, Treatment, Patients, Prescription, Drugs, Alerts, Trials, Insurance, History

---

## Consensus Architecture

```python
def leader_fn() -> dict:
    fetched = self._fetch_all(urls, trusted)        # Fetch clinical sources
    evidence = self._format_evidence(fetched)        # Format evidence
    response = gl.nondet.exec_prompt(prompt, ...)    # AI analysis
    return self._normalize_*(response)               # Validate & normalize

def validator_fn(leader_result) -> bool:
    my = leader_fn()                                 # Re-run independently
    other = leader_result.calldata
    return my["severity"] == other["severity"]       # Must agree exactly

result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
```

**Key principle**: Clinical severity levels must agree exactly between leader and validator — patient safety is non-negotiable.

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

---

## Project Structure

```
medguard/
├── contracts/
│   └── medguard.py              # Intelligent Contract (13 write + 12 view)
├── tests/
│   └── test_medguard.py         # 64 invariant tests
├── frontend/
│   ├── public/
│   │   ├── sample_patients.json # 50 American patients
│   │   ├── sample_patients.csv  # Patient data (CSV)
│   │   ├── sample_drugs.json    # 103 drugs
│   │   └── sample_drugs.csv     # Drug data (CSV)
│   ├── src/
│   │   ├── App.tsx              # Main app (workflow + 12 pages)
│   │   ├── config.ts            # Network + contract config
│   │   ├── importExport.ts      # CSV/JSON utilities
│   │   ├── useGenLayer.ts       # Read/write client hooks
│   │   ├── useWallet.ts         # Wallet connection hook
│   │   └── styles.css           # Dark theme + animations
│   └── package.json
├── .gitignore
└── README.md
```

---

## Frontend Setup

```bash
cd frontend
npm install
npm run dev          # localhost:5173
npm run build        # Production build
```

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
