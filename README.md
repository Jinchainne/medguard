# MedGuard

Clinical Decision Support Oracle for GenLayer. On-chain drug interaction screening, dosage verification, allergy cross-checks, and treatment protocol validation for healthcare workers.

---

## Live Deployment

| Detail | Value |
|--------|-------|
| **Contract Address** | [`0x747292eE674133Ec346444A26BdE687edD2C2454`](https://explorer-studio.genlayer.com/address/0x747292eE674133Ec346444A26BdE687edD2C2454) |
| **Network** | GenLayer StudioNet |
| **Chain ID** | `61999` |
| **Explorer** | [explorer-studio.genlayer.com](https://explorer-studio.genlayer.com) |
| **Frontend** | [genlayer-medguard.vercel.app](https://genlayer-medguard.vercel.app) |
| **RPC URL** | `https://studio.genlayer.com/api` |
| **Native Token** | GEN |

---

## What It Does

MedGuard is an intelligent contract designed for healthcare professionals at the point of care. It provides four core clinical safety functions, all executed on-chain with AI consensus:

### 1. Drug Interaction Screening

Check if two drugs can be safely co-administered. Returns severity level, risk score (0–100), pharmacological mechanism, and clinical recommendation.

| Severity | Meaning |
|----------|---------|
| `NONE` | No known interaction |
| `MINOR` | Minimal significance, monitor patient |
| `MODERATE` | May require dose adjustment or monitoring |
| `MAJOR` | Avoid combination if possible |
| `CONTRAINDICATED` | Do not combine under any circumstances |

### 2. Dosage Verification

Validate prescribed doses against therapeutic guidelines. Supports patient weight and age for pediatric/geriatric adjustments.

| Safety Level | Meaning |
|--------------|---------|
| `SAFE` | Within therapeutic range |
| `SUBTHERAPEUTIC` | Below effective dose |
| `ABOVE_THERAPEUTIC` | Exceeds recommended range |
| `DANGEROUS` | Potentially toxic dose |

### 3. Allergy Cross-Check

Screen medication lists against patient allergies. Cross-references cross-reactivity (e.g., penicillin → amoxicillin) and flags high-risk medications.

| Risk Level | Meaning |
|------------|---------|
| `NO_RISK` | No cross-reactivity found |
| `MILD_RISK` | Low likelihood, monitor |
| `MODERATE_RISK` | Consider alternatives |
| `SEVERE_RISK` | Avoid medication |
| `ANAPHYLAXIS_RISK` | Life-threatening — do not administer |

### 4. Treatment Protocol Validation

Verify proposed treatments against clinical guidelines. Validates the treatment plan for a given condition with on-chain source evidence.

---

## How It Works

```
Clinical query + patient context → Fetch on-chain → AI cross-references guidelines → Consensus result
```

1. **Submit** — Healthcare worker provides clinical query (drugs, dosage, allergies, or treatment)
2. **Fetch** — Contract fetches trusted clinical sources on-chain via `gl.nondet.web.render()` inside consensus
3. **Analyze** — AI evaluates against fetched pharmacological data and clinical guidelines
4. **Consensus** — Leader and validator must agree on severity/safety level, confidence (±1 rank), and scores (±15–20 points)
5. **Result** — Clinical assessment stored on-chain with quick safety check views

---

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

---

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

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Smart Contract | Python (GenLayer `py-genlayer`) |
| Frontend | React 19, TypeScript 5.6 |
| Build Tool | Vite 6 |
| Chain SDK | `genlayer-js` |
| Hosting | Vercel |

---

## Project Structure

```
medguard/
├── contracts/
│   └── medguard.py              # Intelligent Contract (Python)
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Main application component
│   │   ├── config.ts            # Contract address, chain config
│   │   ├── main.tsx             # React entry point
│   │   ├── styles.css           # Global styles
│   │   ├── useGenLayer.ts       # GenLayer contract interaction hook
│   │   ├── useWallet.ts         # Wallet connection hook
│   │   └── env.d.ts             # TypeScript env declarations
│   ├── public/
│   │   ├── favicon.svg
│   │   └── logo.svg
│   ├── index.html               # HTML entry point
│   ├── package.json             # Dependencies and scripts
│   ├── tsconfig.json            # TypeScript configuration
│   └── vite.config.ts           # Vite build configuration
├── tests/
│   └── test_medguard.py         # Invariant tests
└── README.md
```

---

## Frontend Setup

### Prerequisites

- Node.js 18+
- npm or yarn

### Install Dependencies

```bash
cd frontend
npm install
```

### Development Server

```bash
npm run dev
```

Starts a local dev server at `http://localhost:5173` with hot module replacement.

### Build for Production

```bash
npm run build
```

Output goes to `frontend/dist/`.

### Preview Production Build

```bash
npm run preview
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_CONTRACT_ADDRESS` | Override contract address | `0x747292eE674133Ec346444A26BdE687edD2C2454` |

---

## Use Cases

- **Emergency rooms** — Quick drug interaction check before administering medications
- **Pharmacy** — Verify prescriptions against patient allergy records
- **ICU** — Validate complex multi-drug regimens
- **Telemedicine** — Remote clinical decision support
- **Nursing** — Dosage verification before medication administration
- **Clinical trials** — Treatment protocol validation

---

## Author

- **Jinchainne** — [GitHub](https://github.com/Jinchainne)
