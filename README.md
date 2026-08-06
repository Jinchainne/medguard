<div align="center">

<img src="docs/banner.svg" alt="MedGuard — Clinical Decision Support Oracle" width="100%"/>

[![GenLayer](https://img.shields.io/badge/StudioNet-61999-0ea5e9?style=for-the-badge&logo=ethereum&logoColor=white)](https://explorer-studio.genlayer.com/address/0x2916Ec2952B83210B6c02f3D00E3CC2452Be4703)
[![License](https://img.shields.io/badge/License-MIT-10b981?style=for-the-badge)](LICENSE)
[![Vercel](https://img.shields.io/badge/Live-App-000?style=for-the-badge&logo=vercel&logoColor=white)](https://genlayer-medguard.vercel.app)

<br/>

**AI-powered on-chain clinical decision support with 10 tools, real GEN consensus, and fail-safe evidence handling.**

[Live App](https://genlayer-medguard.vercel.app) · [Explorer](https://explorer-studio.genlayer.com/address/0x2916Ec2952B83210B6c02f3D00E3CC2452Be4703) · [Contract](contracts/medguard.py)

</div>

---

## Workflow

<img src="docs/workflow.svg" alt="MedGuard Workflow" width="100%"/>

---

## Tools

| # | Tool | What it checks | Evidence source |
|:-:|:-----|:---------------|:----------------|
| 1 | **Drug Interaction** | Severity between two drugs | drugs.com · dailymed · pubmed |
| 2 | **Dosage Verification** | Safe range by age/weight | medlineplus · fda.gov · dailymed |
| 3 | **Allergy Cross-Check** | Cross-reactivity risk | drugs.com · medlineplus |
| 4 | **Treatment Validation** | Protocol compliance | pubmed · who.int · fda.gov |
| 5 | **Patient Registry** | 50-patient CRUD with allergies/conditions | — |
| 6 | **Prescription Verification** | Conflict detection against patient record | medlineplus · fda.gov · dailymed |
| 7 | **Drug Database** | Searchable 103-drug catalog | — |
| 8 | **Medical Alerts** | Auto-created when severity ≥ MAJOR | — |
| 9 | **Clinical Trial Matching** | Patient-to-trial matching | clinicaltrials.gov · pubmed |
| 10 | **Insurance Claim** | Coverage verdict | cms.gov · fda.gov |

---

## Consensus

Every write function uses **leader/validator** pattern:

```
┌─────────────┐     ┌─────────────┐
│   Leader    │     │  Validator  │
│  (author)   │     │ (independent│
│             │     │             │
│ 1. Fetch    │     │ 1. Fetch    │
│    sources  │     │    same     │
│ 2. AI       │     │    sources  │
│    analyze  │     │ 2. AI       │
│ 3. Return   │     │    analyze  │
│    result   │     │ 3. Compare  │
└──────┬──────┘     └──────┬──────┘
       │                   │
       └───────┬───────────┘
               ▼
     ┌─────────────────┐
     │   Must agree    │
     │   on severity   │
     │   exactly       │
     └────────┬────────┘
              ▼
        On-chain result
        + auto-alert
```

**Severity must match exactly** — patient safety is non-negotiable.

---

## Security

| Layer | Protection |
|:------|:-----------|
| **Data** | UNTRUSTED DATA markers in every prompt |
| **Network** | HTTPS-only — `_clean_urls` rejects non-HTTPS |
| **Access** | Patient updates locked to registrant + owner |
| **Input** | Name length, CSV format, range validation |
| **Evidence** | Fail-safely — returns UNAVAILABLE when sources down |
| **Sources** | Query-specific — each tool fetches from relevant databases |

---

## Contract

```
0x2916Ec2952B83210B6c02f3D00E3CC2452Be4703  (StudioNet 61999)
```

### Writes (7 — all use leader/validator)
```
check_drug_interaction(drug_a, drug_b, context, urls)
check_dosage(drug, dose_mg, unit, age, weight, context, urls)
check_allergy_risk(medications_csv, allergies_csv, context, urls)
validate_treatment(condition, treatment, context, urls)
verify_prescription(patient_id, drug, dose, freq, context, urls)
match_clinical_trial(condition, context, urls)
verify_insurance_claim(insurance, treatment, context, urls)
```

### Reads (9)
```
search_drugs(query)           get_check(check_id)
get_patient(patient_id)       get_prescription(rx_id)
get_drug_info(drug_name)      get_alert(alert_id)
get_alerts_for_patient(pid)   get_trusted_sources()
get_stats()
```

---

## Project

```
medguard/
├── contracts/
│   └── medguard.py              # Intelligent contract
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # 10-tool clinical UI
│   │   ├── useGenLayer.ts       # genlayer-js client
│   │   ├── useWallet.ts         # Wallet connection
│   │   └── importExport.ts      # CSV/JSON import/export
│   ├── public/
│   │   ├── sample_patients.json # 50 patient records
│   │   └── sample_drugs.json    # 103-drug database
│   └── package.json
├── tests/
│   └── test_medguard.py
├── docs/
│   ├── banner.svg               # Header banner
│   ├── workflow.svg             # Workflow diagram
│   ├── tools.svg                # 10 tools diagram
│   └── architecture.svg         # Architecture
└── README.md
```

---

## Run

```bash
git clone https://github.com/Jinchainne/medguard.git
cd medguard/frontend
npm install && npm run dev
```

```bash
python -m pytest tests/ -v
```

---

<div align="center">

**Built on [GenLayer](https://genlayer.com)** · [MIT](LICENSE)

</div>
