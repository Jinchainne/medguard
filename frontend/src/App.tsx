/* ═══════════════════════════════════════════════════════════
   MedGuard — Clinical Decision Support Oracle on GenLayer
   ═══════════════════════════════════════════════════════════ */
import React, { useEffect, useState, useCallback } from "react";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import { explorerAddress, explorerTx, getContractAddress, RPC_URL } from "./config";
import { useReadClient, useWriteClient } from "./useGenLayer";
import { useWallet } from "./useWallet";
import { parseImportData, mapToPatients, mapToDrugs, toCSV, downloadFile, readFileAsText, PatientImport, DrugImport } from "./importExport";

/* ─── Types ─── */
type Page =
  | "dashboard"
  | "interaction"
  | "dosage"
  | "allergy"
  | "treatment"
  | "patients"
  | "prescription"
  | "drugs"
  | "alerts"
  | "trials"
  | "insurance"
  | "history";

interface TxState {
  status: "idle" | "pending" | "success" | "error";
  hash?: string;
  result?: string;
  error?: string;
}

interface CheckRecord {
  id: string;
  type: string;
  inputs: string;
  result: string;
  timestamp: string;
}

/* ─── Inline SVG Medical Icons ─── */
const IconDrugInteraction = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="8" width="7" height="12" rx="3.5" transform="rotate(-30 6.5 14)" />
    <rect x="14" y="4" width="7" height="12" rx="3.5" transform="rotate(30 17.5 10)" />
    <line x1="9" y1="10" x2="15" y2="14" strokeDasharray="2 2" />
  </svg>
);

const IconDosage = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V2" />
    <path d="M18 2v8a2 2 0 0 1-2 2h-2" />
    <path d="M6 2h12" />
    <path d="M12 14v8" />
    <path d="M8 18h8" />
  </svg>
);

const IconAllergy = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const IconTreatment = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
    <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
    <circle cx="20" cy="10" r="2" />
  </svg>
);

const IconPatient = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconPrescription = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    <path d="M9 14l2 2 4-4" />
  </svg>
);

const IconDrug = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5" />
    <path d="M10.5 1.5v3h3v-3" />
    <line x1="9" y1="10" x2="15" y2="10" />
    <line x1="12" y1="7" x2="12" y2="13" />
  </svg>
);

const IconAlert = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 01-3.46 0" />
    <line x1="12" y1="8" x2="12" y2="11" />
    <line x1="12" y1="14" x2="12.01" y2="14" />
  </svg>
);

const IconTrial = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 3h6v6l4 8H5l4-8V3z" />
    <line x1="9" y1="3" x2="15" y2="3" />
    <path d="M8.5 14h7" />
  </svg>
);

const IconInsurance = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
    <path d="M12 8v4" />
    <path d="M10 10h4" />
  </svg>
);

const IconShield = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

const ECGLine = () => (
  <svg className="ecg-line" width="600" height="60" viewBox="0 0 600 60" fill="none">
    <polyline
      points="0,30 80,30 100,30 110,10 120,50 130,10 140,50 150,30 170,30 250,30 270,30 280,10 290,50 300,10 310,50 320,30 340,30 420,30 440,30 450,10 460,50 470,10 480,50 490,30 510,30 600,30"
      stroke="var(--teal)"
      strokeWidth="1.5"
      fill="none"
      opacity="0.6"
    >
      <animate attributeName="stroke-dashoffset" from="1200" to="0" dur="3s" repeatCount="indefinite" />
    </polyline>
  </svg>
);

const DNACurve = () => (
  <svg width="40" height="120" viewBox="0 0 40 120" fill="none" stroke="var(--teal)" strokeWidth="1" opacity="0.15">
    <path d="M5,0 Q35,15 5,30 Q-25,45 5,60 Q35,75 5,90 Q-25,105 5,120" />
    <path d="M35,0 Q5,15 35,30 Q65,45 35,60 Q5,75 35,90 Q65,105 35,120" />
    <line x1="12" y1="15" x2="28" y2="15" />
    <line x1="12" y1="45" x2="28" y2="45" />
    <line x1="12" y1="75" x2="28" y2="75" />
    <line x1="12" y1="105" x2="28" y2="105" />
  </svg>
);

/* ─── TxPanel Component ─── */
function TxPanel({ tx }: { tx: TxState }) {
  if (tx.status === "idle") return null;
  return (
    <div className="tx-panel">
      <div className="tx-status">
        {tx.status === "pending" && <><span className="spinner" /> Processing transaction…</>}
        {tx.status === "success" && <>✓ Transaction confirmed</>}
        {tx.status === "error" && <>✗ Transaction failed</>}
      </div>
      {tx.hash && (
        <a className="tx-hash" href={explorerTx(tx.hash)} target="_blank" rel="noopener noreferrer">
          {tx.hash}
        </a>
      )}
      {tx.error && <div className="tx-error">{tx.error}</div>}
      {tx.result && tx.status === "success" && (
        <div className="result-detail" style={{ marginTop: 8 }}>{tx.result}</div>
      )}
    </div>
  );
}

/* ─── Utility: try-parse JSON, return raw string on failure ─── */
function tryParse(raw: string): any {
  try { return JSON.parse(raw); } catch { return raw; }
}

/* Friendly error messages for viem/contract errors */
function friendlyError(e: any, context?: string): string {
  const msg = e?.message || String(e);
  if (msg.includes("NOT_FOUND") || msg.includes("PATIENT_NOT_FOUND") || msg.includes("DRUG_NOT_FOUND")) {
    return `Record not found on-chain. ${context || "It may not have been registered yet."}`;
  }
  if (msg.includes("Missing or invalid parameters") || msg.includes("execution failed")) {
    return `Record not found or not available on-chain. ${context || "Check the ID and try again."}`;
  }
  if (msg.includes("ONLY_OWNER")) return "Only the contract owner can perform this action.";
  if (msg.includes("PATIENT_EXISTS")) return "A patient with this ID already exists.";
  if (msg.includes("DRUG_EXISTS")) return "A drug with this name already exists in the database.";
  if (msg.includes("user rejected") || msg.includes("User rejected")) return "Transaction was cancelled by user.";
  return msg.slice(0, 200);
}

/* ─── Main App ─── */
function ResultDetailCard({ data, onClose }: { data: any; onClose: () => void }) {
  const result = data?.result || {};
  const query = data?.query || {};
  const checkType = data?.type || "unknown";

  const severity = result.severity || result.safety || result.risk_level || result.verdict || "—";
  const confidence = result.confidence || "—";
  const riskScore = result.risk_score ?? "—";
  const description = result.description || "No description available.";
  const mechanism = result.mechanism || "";
  const recommendation = result.recommendation || "";
  const alternatives = result.alternatives || "";
  const guidelineSource = result.guideline_source || "";

  function severityColor(s: string) {
    const upper = s.toUpperCase();
    if (["NONE", "NO_RISK", "SAFE", "APPROPRIATE"].includes(upper)) return "var(--green)";
    if (["MINOR", "MILD_RISK", "SUBTHERAPEUTIC", "PARTIALLY_APPROPRIATE"].includes(upper)) return "var(--gold)";
    if (["MODERATE", "MODERATE_RISK", "ABOVE_THERAPEUTIC"].includes(upper)) return "#ff9800";
    if (["MAJOR", "SEVERE_RISK"].includes(upper)) return "var(--red)";
    if (["CONTRAINDICATED", "ANAPHYLAXIS_RISK", "DANGEROUS", "INAPPROPRIATE"].includes(upper)) return "#ff1744";
    return "var(--text-muted)";
  }
  function severityBadge(s: string) {
    const upper = s.toUpperCase();
    if (["NONE", "NO_RISK", "SAFE", "APPROPRIATE"].includes(upper)) return "badge-safe";
    if (["MINOR", "MILD_RISK", "SUBTHERAPEUTIC", "PARTIALLY_APPROPRIATE"].includes(upper)) return "badge-warn";
    return "badge-danger";
  }
  function confBadge(c: string) {
    if (c === "high") return "badge-safe";
    if (c === "medium") return "badge-warn";
    return "badge-pending";
  }
  function typeLabel(t: string) {
    const map: Record<string, string> = {
      drug_interaction: "Drug Interaction", dosage_check: "Dosage Check",
      allergy_check: "Allergy Check", treatment_validation: "Treatment",
      clinical_trial_match: "Clinical Trial", insurance_claim: "Insurance Claim"
    };
    return map[t] ?? t;
  }

  return (
    <div className="result-card" style={{ marginTop: 16, border: `1px solid ${severityColor(severity)}` }}>
      <div className="result-header" style={{ justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span className="result-badge badge-info">{typeLabel(checkType)}</span>
          <span className={`result-badge ${severityBadge(severity)}`} style={{ borderColor: severityColor(severity), color: severityColor(severity) }}>
            {severity}
          </span>
          <span className={`result-badge ${confBadge(confidence)}`}>
            {confidence} confidence
          </span>
          {riskScore !== "—" && (
            <span className="result-badge badge-pending">
              Risk: {riskScore}/100
            </span>
          )}
        </div>
        <button className="btn btn-sm" onClick={onClose}>Close</button>
      </div>

      {/* Query Info */}
      {Object.keys(query).length > 0 && (
        <div style={{ margin: "12px 0", padding: "10px 14px", background: "var(--surface-high)", borderRadius: 8, fontSize: 12 }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Input Parameters</div>
          {Object.entries(query).map(([k, v]) => (
            <div key={k} style={{ marginBottom: 4 }}>
              <span style={{ color: "var(--teal)", fontFamily: "var(--mono)", fontSize: 11 }}>{k}:</span>{" "}
              <span style={{ color: "var(--text-dim)", fontSize: 13 }}>{Array.isArray(v) ? v.join(", ") : String(v)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Description */}
      <div style={{ margin: "12px 0", padding: "12px 16px", background: "var(--surface)", borderRadius: 8, borderLeft: `3px solid ${severityColor(severity)}` }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Clinical Assessment</div>
        <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.7 }}>{description}</div>
      </div>

      {/* Mechanism */}
      {mechanism && (
        <div style={{ margin: "8px 0", padding: "10px 14px", background: "var(--surface-high)", borderRadius: 8 }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--blue)", marginBottom: 4, textTransform: "uppercase" }}>Mechanism</div>
          <div style={{ fontSize: 13, color: "var(--text-dim)" }}>{mechanism}</div>
        </div>
      )}

      {/* Recommendation */}
      {recommendation && (
        <div style={{ margin: "8px 0", padding: "10px 14px", background: "var(--green-glow)", borderRadius: 8, border: "1px solid rgba(0,168,107,0.2)" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--green)", marginBottom: 4, textTransform: "uppercase" }}>Recommendation</div>
          <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6 }}>{recommendation}</div>
        </div>
      )}

      {/* Alternatives */}
      {alternatives && (
        <div style={{ margin: "8px 0", padding: "10px 14px", background: "var(--gold-glow)", borderRadius: 8 }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--gold)", marginBottom: 4, textTransform: "uppercase" }}>Alternatives</div>
          <div style={{ fontSize: 13, color: "var(--text-dim)" }}>{alternatives}</div>
        </div>
      )}

      {/* Guideline Source */}
      {guidelineSource && (
        <div style={{ margin: "8px 0", fontSize: 11, color: "var(--text-muted)" }}>
          <span style={{ fontFamily: "var(--mono)", color: "var(--blue)" }}>Source:</span> {guidelineSource}
        </div>
      )}

      {/* ID */}
      <div style={{ marginTop: 12, fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--mono)" }}>
        Check ID: {data?.id} · Caller: {data?.caller?.slice(0, 10)}...
      </div>
    </div>
  );
}

function PatientSelector({ value, onChange, label, patients }: { value: string; onChange: (v: string) => void; label?: string; patients: any[] }) {
  return (
    <div className="form-group">
      <label className="form-label">{label || "Patient"}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">-- Select patient --</option>
        {patients.map((p: any) => (
          <option key={p.patient_id} value={p.patient_id}>
            {p.patient_id} — {p.full_name} ({p.allergies?.join(", ") || "no allergies"})
          </option>
        ))}
      </select>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Or type:</span>
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="PAT-001" style={{ flex: 1, padding: "6px 10px", fontSize: 13 }} />
      </div>
    </div>
  );
}

function DrugSelector({ value, onChange, label, placeholder, drugs }: { value: string; onChange: (v: string) => void; label?: string; placeholder?: string; drugs: any[] }) {
  return (
    <div className="form-group">
      <label className="form-label">{label || "Medication"}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">-- Select from database --</option>
        {drugs.map((d: any) => (
          <option key={d.drug_name} value={d.drug_name}>
            {d.drug_name} ({d.category || "uncategorized"})
          </option>
        ))}
      </select>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Or type:</span>
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder || "e.g. Metformin"} style={{ flex: 1, padding: "6px 10px", fontSize: 13 }} />
      </div>
    </div>
  );
}

function MultiDrugSelector({ value, onChange, label, placeholder, drugs }: { value: string; onChange: (v: string) => void; label?: string; placeholder?: string; drugs: any[] }) {
  const drugNames = value.split(",").map(s => s.trim()).filter(Boolean);
  const addDrug = (d: string) => { if (d && !drugNames.includes(d)) onChange([...drugNames, d].join(", ")); };
  const removeDrug = (d: string) => onChange(drugNames.filter(x => x !== d).join(", "));
  return (
    <div className="form-group">
      <label className="form-label">{label || "Medications"}</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
        {drugNames.map((d: string, i: number) => (
          <span key={i} className="badge badge-info" style={{ cursor: "pointer" }} onClick={() => removeDrug(d)}>{d} ×</span>
        ))}
      </div>
      <select value="" onChange={(e) => { addDrug(e.target.value); e.target.value = ""; }}>
        <option value="">+ Add from database</option>
        {drugs.filter((d: any) => !drugNames.includes(d.drug_name)).map((d: any) => (
          <option key={d.drug_name} value={d.drug_name}>{d.drug_name}</option>
        ))}
      </select>
      <input value="" onChange={(e) => { if (e.target.value.trim()) { addDrug(e.target.value.trim()); e.target.value = ""; } }} placeholder={placeholder || "Type drug name and press Enter"} style={{ marginTop: 4 }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const t = e.currentTarget.value.trim(); if (t) { addDrug(t); e.currentTarget.value = ""; } } }} />
    </div>
  );
}

function ImportExportPanel({ type, onImport, onExportData }: { 
  type: "patients" | "drugs"; 
  onImport: (items: any[]) => void;
  onExportData: () => any[];
}) {
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const fileRef = { current: null as HTMLInputElement | null };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      const raw = parseImportData(text, file.name);
      const mapped = type === "patients" ? mapToPatients(raw) : mapToDrugs(raw);
      setPreview(mapped);
      setImportStatus(`Found ${mapped.length} ${type} in ${file.name}`);
    } catch (err: any) {
      setImportStatus(`Error: ${err.message}`);
      setPreview([]);
    }
    e.target.value = '';
  };

  const doImport = () => {
    if (preview.length === 0) return;
    onImport(preview);
    setImportStatus(`Imported ${preview.length} ${type}!`);
    setPreview([]);
  };

  const doExport = (format: 'csv' | 'json') => {
    const data = onExportData();
    if (data.length === 0) { setImportStatus('No data to export'); return; }
    if (format === 'json') {
      downloadFile(JSON.stringify(data, null, 2), `medguard_${type}.json`, 'application/json');
    } else {
      const cols = type === "patients" 
        ? ['patient_id', 'full_name', 'allergies', 'conditions', 'blood_type', 'age_years', 'weight_kg']
        : ['drug_name', 'category', 'common_dosages', 'side_effects', 'contraindications'];
      downloadFile(toCSV(data, cols), `medguard_${type}.csv`, 'text/csv');
    }
    setImportStatus(`Exported ${data.length} ${type} as ${format.toUpperCase()}`);
  };

  return (
    <div style={{ padding: 16, background: "var(--surface-high)", borderRadius: 12, border: "1px solid var(--border)", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--blue)" }}>upload_file</span>
        <span style={{ fontFamily: "var(--mono)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
          Import / Export {type}
        </span>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <label className="btn btn-sm" style={{ cursor: "pointer" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>file_upload</span> Import CSV/JSON
          <input type="file" accept=".csv,.json,.txt" onChange={handleFileSelect} style={{ display: "none" }} />
        </label>
        <a className="btn btn-sm" href={`/sample_${type}.json`} download style={{ textDecoration: "none" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span> Sample JSON
        </a>
        <a className="btn btn-sm" href={`/sample_${type}.csv`} download style={{ textDecoration: "none" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span> Sample CSV
        </a>
        <button className="btn btn-sm" onClick={() => doExport('csv')}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span> Export CSV
        </button>
        <button className="btn btn-sm" onClick={() => doExport('json')}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>data_object</span> Export JSON
        </button>
        {preview.length > 0 && (
          <button className="btn btn-green btn-sm" onClick={doImport}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check</span> Import {preview.length} items
          </button>
        )}
      </div>
      {importStatus && (
        <div style={{ marginTop: 8, fontSize: 12, color: importStatus.includes("Error") ? "var(--red)" : "var(--green)", fontFamily: "var(--mono)" }}>
          {importStatus}
        </div>
      )}
      {preview.length > 0 && (
        <div style={{ marginTop: 12, maxHeight: 200, overflow: "auto" }}>
          <table style={{ width: "100%", fontSize: 11 }}>
            <thead>
              <tr>
                {Object.keys(preview[0]).map(k => (
                  <th key={k} style={{ padding: "4px 8px", textAlign: "left", fontFamily: "var(--mono)", fontSize: 9, textTransform: "uppercase", color: "var(--text-muted)" }}>{k}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.slice(0, 5).map((row, i) => (
                <tr key={i}>
                  {Object.values(row).map((v: any, j) => (
                    <td key={j} style={{ padding: "4px 8px", borderBottom: "1px solid var(--border)", fontSize: 11 }}>{Array.isArray(v) ? v.join(", ") : String(v)}</td>
                  ))}
                </tr>
              ))}
              {preview.length > 5 && (
                <tr><td colSpan={Object.keys(preview[0]).length} style={{ padding: "4px 8px", color: "var(--text-muted)", fontSize: 10 }}>...and {preview.length - 5} more</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Workflow Doctor Animation Component ── */
const workflowSteps = [
  { num: 1, icon: "💊", title: "Drug Interaction", page: "interaction" as Page, color: "#2563eb" },
  { num: 2, icon: "⚖️", title: "Dosage Check", page: "dosage" as Page, color: "#059669" },
  { num: 3, icon: "🛡️", title: "Allergy Risk", page: "allergy" as Page, color: "#dc2626" },
  { num: 4, icon: "🩺", title: "Treatment", page: "treatment" as Page, color: "#0891b2" },
  { num: 5, icon: "👤", title: "Patients", page: "patients" as Page, color: "#d97706" },
  { num: 6, icon: "📋", title: "Prescription", page: "prescription" as Page, color: "#2563eb" },
  { num: 7, icon: "💉", title: "Drug DB", page: "drugs" as Page, color: "#059669" },
  { num: 8, icon: "🔔", title: "Alerts", page: "alerts" as Page, color: "#dc2626" },
  { num: 9, icon: "🧪", title: "Trials", page: "trials" as Page, color: "#0891b2" },
  { num: 10, icon: "🏦", title: "Insurance", page: "insurance" as Page, color: "#d97706" },
];

/* ── Pixel MC Doctor — bounces/blinks in corner like retro game ── */
/* ── AI Guide — auto-reads English instructions per page ── */
const aiGuides: Record<string, { title: string; steps: string[] }> = {
  dashboard: {
    title: "Welcome to MedGuard",
    steps: [
      "Welcome to MedGuard — your AI-powered Clinical Decision Support Oracle on GenLayer blockchain.",
      "This dashboard shows 10 clinical tools. Each tool runs on-chain with AI consensus for patient safety.",
      "STEP 1: Import patient data using the Import CSV/JSON button, or use the auto-loaded 50 sample patients.",
      "STEP 2: Import drug data using the Import CSV/JSON button, or use the auto-loaded 103 sample drugs.",
      "STEP 3: Click any Clinical Tool card below to start a clinical check. Each tool fetches trusted medical sources on-chain.",
      "STEP 4: Connect your wallet (OKX or MetaMask) to submit transactions. The contract is on GenLayer StudioNet (Chain 61999).",
      "STEP 5: Watch the Clinical Workflow animation above — it shows how data flows through all 10 tools with glowing arrows.",
      "All clinical results are stored on-chain and can be viewed in the History page. Let's begin!"
    ]
  },
  interaction: {
    title: "Drug Interaction Check",
    steps: [
      "This tool checks if two drugs can be safely taken together using AI analysis.",
      "STEP 1: Select Drug A from the dropdown (populated from your Drug Database) or type a drug name.",
      "STEP 2: Select Drug B the same way. These are the two drugs you want to check for interactions.",
      "STEP 3: Optionally add patient context — age, weight, conditions — for more accurate results.",
      "STEP 4: Click 'Check Interaction' to submit. The contract fetches from trusted sources (drugs.com, PubMed, FDA).",
      "STEP 5: AI analyzes the interaction and returns severity (NONE to CONTRAINDICATED), risk score, and recommendation.",
      "If severity is MAJOR or CONTRAINDICATED, an automatic alert is created for the patient."
    ]
  },
  dosage: {
    title: "Dosage Verification",
    steps: [
      "This tool verifies if a medication dosage is safe for a specific patient.",
      "STEP 1: Select or type the drug name from your database.",
      "STEP 2: Enter the prescribed dosage in milligrams (mg).",
      "STEP 3: Enter patient weight in kg and age in years for personalized dosing.",
      "STEP 4: Click 'Verify Dosage' to submit. AI checks against therapeutic guidelines.",
      "STEP 5: Result shows SAFE, SUBTHERAPEUTIC, ABOVE_THERAPEUTIC, or DANGEROUS with recommended range.",
      "If DANGEROUS, an automatic critical alert is created immediately."
    ]
  },
  allergy: {
    title: "Allergy Cross-Check",
    steps: [
      "This tool cross-references medications against known patient allergies.",
      "STEP 1: Enter medications as a comma-separated list (e.g., Amoxicillin, Ibuprofen).",
      "STEP 2: Enter known allergies as a comma-separated list (e.g., Penicillin, Sulfa drugs).",
      "STEP 3: Add patient context if available for better cross-reactivity analysis.",
      "STEP 4: Click 'Check Allergy Risk' to submit. AI checks cross-reactivity patterns.",
      "STEP 5: Result shows risk level (NO_RISK to ANAPHYLAXIS_RISK) with flagged medications.",
      "CRITICAL: If ANAPHYLAXIS_RISK, an automatic critical alert is created. Never assume safety when uncertain."
    ]
  },
  treatment: {
    title: "Treatment Validation",
    steps: [
      "This tool validates if a proposed treatment is appropriate for a medical condition.",
      "STEP 1: Enter the medical condition (e.g., Type 2 Diabetes, Hypertension).",
      "STEP 2: Enter the proposed treatment (e.g., Metformin 500mg twice daily).",
      "STEP 3: Add patient context for personalized validation.",
      "STEP 4: Click 'Validate Treatment' to submit. AI checks against clinical guidelines.",
      "STEP 5: Result shows verdict (APPROPRIATE to INAPPROPRIATE) with guideline source and alternatives."
    ]
  },
  patients: {
    title: "Patient Registry",
    steps: [
      "This page manages patient records on-chain. Data is also stored locally for quick access.",
      "TO REGISTER: Enter Patient ID, Full Name, Allergies, Conditions, Blood Type, Age, and Weight.",
      "Click 'Register Patient' to store the record on-chain. This requires a wallet transaction.",
      "TO LOOKUP: Select a patient from the dropdown or enter their ID and click 'Lookup'.",
      "Local patients (imported via CSV/JSON) are shown in the dropdown immediately.",
      "On-chain patients require a blockchain lookup. The system checks local data first, then on-chain.",
      "TIP: Import the 50 sample patients from the Dashboard to populate the dropdown instantly."
    ]
  },
  prescription: {
    title: "Prescription Verification",
    steps: [
      "This tool verifies a prescription against the patient's full medical record.",
      "STEP 1: Select or enter the Patient ID. The system loads their allergies and conditions.",
      "STEP 2: Enter prescribed medications as a comma-separated list.",
      "STEP 3: Add prescriber notes if available.",
      "STEP 4: Click 'Verify Prescription' to submit. AI performs a comprehensive safety check.",
      "STEP 5: The AI cross-references ALL allergies, drug interactions, and dosage appropriateness.",
      "Result: VERIFIED (safe), FLAGGED (concerns found), or REJECTED (unsafe). Auto-alerts if flagged/rejected."
    ]
  },
  drugs: {
    title: "Drug Database",
    steps: [
      "This page manages the on-chain pharmaceutical database.",
      "TO ADD: Enter Drug Name, Category, Common Dosages, Side Effects, and Contraindications.",
      "Click 'Add Drug' to store on-chain. Only the contract owner can add drugs.",
      "TO SEARCH: Enter a drug name in the search field. Results show partial matches.",
      "The database is pre-loaded with 103 drugs from the Dashboard import.",
      "Drug data is used by other tools — the dropdown selectors pull from this database.",
      "TIP: Import the 103 sample drugs from the Dashboard to populate the database instantly."
    ]
  },
  alerts: {
    title: "Medical Alerts",
    steps: [
      "This page shows critical patient alerts and safety notifications.",
      "Alerts are AUTO-GENERATED when dangerous interactions, dosages, or allergy risks are detected.",
      "Alert types: DRUG_INTERACTION, ALLERGY_RISK, DOSAGE_ERROR, CONTRAINDICATION.",
      "Severity levels: LOW, MEDIUM, HIGH, CRITICAL.",
      "TO VIEW: Select a patient from the dropdown to see their specific alerts.",
      "Alerts are stored on-chain and cannot be deleted. They serve as a permanent safety audit trail."
    ]
  },
  trials: {
    title: "Clinical Trial Matching",
    steps: [
      "This tool matches patients to relevant clinical trial opportunities.",
      "STEP 1: Enter the patient's medical condition (e.g., Breast Cancer, Multiple Sclerosis).",
      "STEP 2: Add patient context — age, stage, prior treatments — for better matching.",
      "STEP 3: Click 'Match Trials' to submit. AI searches clinicaltrials.gov and WHO databases.",
      "STEP 4: Results show matching trials with NCT IDs, Phase, Status, Eligibility, and Contact info.",
      "Only reputable sources are used. If no suitable trials found, an empty list is returned."
    ]
  },
  insurance: {
    title: "Insurance Claim Verification",
    steps: [
      "This tool verifies insurance claims against fair market pricing data.",
      "STEP 1: Enter the treatment description (e.g., Knee Replacement Surgery).",
      "STEP 2: Enter the claimed cost in dollars.",
      "STEP 3: Optionally enter the insurance provider name.",
      "STEP 4: Click 'Verify Claim' to submit. AI checks against medical pricing databases.",
      "STEP 5: Result shows verdict (APPROVED, DENIED, PARTIAL_COVERAGE, NEEDS_REVIEW) with fair cost estimate.",
      "If data is insufficient, the system returns NEEDS_REVIEW instead of guessing."
    ]
  },
  history: {
    title: "Check History",
    steps: [
      "This page shows all clinical checks performed during this session.",
      "Each entry shows: Type, Input parameters, Result ID, and Timestamp.",
      "Click 'View' on any entry to see the full clinical assessment with severity, confidence, and recommendations.",
      "History is session-based (stored in React state). Export results using the Dashboard export tools.",
      "On-chain results can be looked up by their Result ID using the contract's get_check function."
    ]
  }
};

function PixelMCDoc({ currentPage }: { currentPage: string }) {
  const [open, setOpen] = React.useState(false);
  const [stepIdx, setStepIdx] = React.useState(0);
  const [typedText, setTypedText] = React.useState("");
  const [isTyping, setIsTyping] = React.useState(false);
  const [muted, setMuted] = React.useState(false);
  const [speaking, setSpeaking] = React.useState(false);
  const guide = aiGuides[currentPage] || aiGuides.dashboard;
  const currentStep = guide.steps[stepIdx] || guide.steps[0];
  const synthRef = React.useRef<SpeechSynthesisUtterance | null>(null);

  // Speak text aloud
  const speak = React.useCallback((text: string) => {
    if (muted || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.95;
    utter.pitch = 1.0;
    utter.volume = 1.0;
    // Pick a good English voice
    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find(v => v.lang.startsWith("en") && v.name.includes("Google")) ||
                    voices.find(v => v.lang.startsWith("en-US")) ||
                    voices.find(v => v.lang.startsWith("en")) || null;
    if (enVoice) utter.voice = enVoice;
    utter.onstart = () => setSpeaking(true);
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    synthRef.current = utter;
    window.speechSynthesis.speak(utter);
  }, [muted]);

  // Stop speaking
  const stopSpeak = React.useCallback(() => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  // Typewriter + speak effect
  React.useEffect(() => {
    if (!open) { stopSpeak(); return; }
    setTypedText("");
    setIsTyping(true);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setTypedText(currentStep.slice(0, i));
      if (i >= currentStep.length) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 18);
    // Start speaking immediately
    speak(currentStep);
    return () => { clearInterval(interval); stopSpeak(); };
  }, [open, currentStep, speak, stopSpeak]);

  // Reset step when page changes
  React.useEffect(() => {
    setStepIdx(0);
  }, [currentPage]);

  const nextStep = () => {
    if (stepIdx < guide.steps.length - 1) setStepIdx(stepIdx + 1);
  };
  const prevStep = () => {
    if (stepIdx > 0) setStepIdx(stepIdx - 1);
  };

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div style={{
          position: "fixed", bottom: 110, right: 20, width: 380, maxHeight: 420,
          background: "var(--surface-high, #0f172a)", border: "2px solid var(--teal, #00d4aa)",
          borderRadius: 16, zIndex: 1001, display: "flex", flexDirection: "column",
          boxShadow: "0 8px 32px rgba(0,212,170,0.2), 0 0 60px rgba(0,212,170,0.08)",
          overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            padding: "12px 16px", background: "linear-gradient(135deg, #00d4aa, #2563eb)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>🩺</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "white" }}>Dr. MedGuard AI</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)" }}>Clinical Guide — {guide.title}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {/* Speaking indicator */}
              {speaking && (
                <div style={{ display: "flex", alignItems: "center", gap: 3, marginRight: 4 }}>
                  <div style={{ width: 3, height: 8, background: "white", borderRadius: 2, animation: "mcBounce 0.3s infinite" }} />
                  <div style={{ width: 3, height: 12, background: "white", borderRadius: 2, animation: "mcBounce 0.4s infinite" }} />
                  <div style={{ width: 3, height: 6, background: "white", borderRadius: 2, animation: "mcBounce 0.35s infinite" }} />
                </div>
              )}
              {/* Mute button */}
              <button onClick={() => { setMuted(!muted); if (!muted) stopSpeak(); }} style={{
                background: muted ? "rgba(255,0,0,0.3)" : "rgba(255,255,255,0.2)", border: "none", color: "white",
                borderRadius: 8, width: 28, height: 28, cursor: "pointer", fontSize: 13,
              }} title={muted ? "Unmute" : "Mute"}>{muted ? "🔇" : "🔊"}</button>
              {/* Replay button */}
              <button onClick={() => speak(currentStep)} style={{
                background: "rgba(255,255,255,0.2)", border: "none", color: "white",
                borderRadius: 8, width: 28, height: 28, cursor: "pointer", fontSize: 13,
              }} title="Replay">🔁</button>
              {/* Close */}
              <button onClick={() => setOpen(false)} style={{
                background: "rgba(255,255,255,0.2)", border: "none", color: "white",
                borderRadius: 8, width: 28, height: 28, cursor: "pointer", fontSize: 14, fontWeight: 700,
              }}>✕</button>
            </div>
          </div>

          {/* Content */}
          <div style={{ flex: 1, padding: 16, overflow: "auto" }}>
            <div style={{
              fontSize: 12, color: "var(--text-muted, #94a3b8)", fontFamily: "var(--mono, monospace)",
              marginBottom: 8, letterSpacing: "0.05em", textTransform: "uppercase",
            }}>
              Step {stepIdx + 1} of {guide.steps.length}
            </div>
            <div style={{
              fontSize: 14, color: "var(--text, #e2e8f0)", lineHeight: 1.7,
              fontFamily: "var(--mono, monospace)", minHeight: 80,
            }}>
              {typedText}
              {isTyping && <span style={{ color: "var(--teal)", animation: "mcBounce 0.5s infinite" }}>▌</span>}
            </div>
          </div>

          {/* Navigation */}
          <div style={{
            padding: "10px 16px", borderTop: "1px solid var(--border, #1e293b)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <button onClick={prevStep} disabled={stepIdx === 0} style={{
              background: stepIdx === 0 ? "transparent" : "var(--surface, #1e293b)",
              border: "1px solid var(--border, #334155)", color: stepIdx === 0 ? "#475569" : "var(--teal)",
              borderRadius: 8, padding: "6px 14px", cursor: stepIdx === 0 ? "default" : "pointer",
              fontSize: 12, fontWeight: 600,
            }}>← Back</button>
            <div style={{ display: "flex", gap: 4 }}>
              {guide.steps.map((_, i) => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: i === stepIdx ? "var(--teal)" : "var(--border, #334155)",
                  transition: "all 0.3s",
                }} />
              ))}
            </div>
            <button onClick={nextStep} disabled={stepIdx === guide.steps.length - 1} style={{
              background: stepIdx === guide.steps.length - 1 ? "transparent" : "var(--teal, #00d4aa)",
              border: "1px solid var(--teal, #00d4aa)", color: stepIdx === guide.steps.length - 1 ? "#475569" : "#0f172a",
              borderRadius: 8, padding: "6px 14px",
              cursor: stepIdx === guide.steps.length - 1 ? "default" : "pointer",
              fontSize: 12, fontWeight: 700,
            }}>{stepIdx === guide.steps.length - 1 ? "Done ✓" : "Next →"}</button>
          </div>
        </div>
      )}

      {/* Doctor character — click to toggle */}
      <div onClick={() => setOpen(!open)} style={{
        position: "fixed", bottom: 20, right: 20, zIndex: 1000,
        animation: "mcBounce 0.8s ease-in-out infinite",
        cursor: "pointer", filter: "drop-shadow(0 4px 16px rgba(0,212,170,0.3))",
      }} title="Click me for AI guide!">
        {/* Notification bubble when closed */}
        {!open && (
          <div style={{
            position: "absolute", top: -32, right: 0,
            background: "white", color: "#1e3a5f", fontSize: 10, fontWeight: 700,
            padding: "4px 10px", borderRadius: 12, whiteSpace: "nowrap",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)", fontFamily: "var(--mono, monospace)",
          }}>
            Need help? Click me!
          </div>
        )}
        <svg width="64" height="88" viewBox="0 0 64 88" style={{ imageRendering: "pixelated" as any }}>
          <rect x="18" y="4" width="28" height="10" rx="4" fill="#2c3e50" />
          <rect x="16" y="10" width="4" height="10" rx="2" fill="#2c3e50" />
          <rect x="44" y="10" width="4" height="10" rx="2" fill="#2c3e50" />
          <rect x="20" y="12" width="24" height="22" rx="5" fill="#fcd5b8" />
          <rect x="28" y="2" width="8" height="6" rx="2" fill="#bdc3c7" />
          <rect x="30" y="3" width="4" height="3" rx="1" fill="#ecf0f1" />
          <rect x="26" y="20" width="5" height="4" rx="2" fill="#2c3e50">
            <animate attributeName="height" values="4;1;4" dur="3s" repeatCount="indefinite" />
            <animate attributeName="y" values="20;22;20" dur="3s" repeatCount="indefinite" />
          </rect>
          <rect x="34" y="20" width="5" height="4" rx="2" fill="#2c3e50">
            <animate attributeName="height" values="4;1;4" dur="3s" repeatCount="indefinite" />
            <animate attributeName="y" values="20;22;20" dur="3s" repeatCount="indefinite" />
          </rect>
          <rect x="27" y="20" width="2" height="2" rx="1" fill="white">
            <animate attributeName="opacity" values="1;0;1" dur="3s" repeatCount="indefinite" />
          </rect>
          <rect x="35" y="20" width="2" height="2" rx="1" fill="white">
            <animate attributeName="opacity" values="1;0;1" dur="3s" repeatCount="indefinite" />
          </rect>
          <path d="M26 28 Q32 34 38 28" stroke="#e74c3c" strokeWidth="2" fill="none" strokeLinecap="round" />
          <circle cx="22" cy="28" r="3" fill="#ffb3b3" opacity="0.5" />
          <circle cx="42" cy="28" r="3" fill="#ffb3b3" opacity="0.5" />
          <rect x="23" y="17" width="8" height="7" rx="2" fill="none" stroke="#546e7a" strokeWidth="1.5" />
          <rect x="33" y="17" width="8" height="7" rx="2" fill="none" stroke="#546e7a" strokeWidth="1.5" />
          <line x1="31" y1="20" x2="33" y2="20" stroke="#546e7a" strokeWidth="1.5" />
          <rect x="16" y="36" width="32" height="28" rx="4" fill="white" stroke="#ddd" strokeWidth="1" />
          <path d="M24 36 L32 44 L40 36" fill="#f0f4ff" stroke="#ccc" strokeWidth="0.5" />
          <path d="M22 36 Q16 42 18 52" stroke="#3498db" strokeWidth="2" fill="none" />
          <circle cx="18" cy="54" r="3" fill="#3498db" />
          <circle cx="18" cy="54" r="1.5" fill="#2980b9" />
          <rect x="38" y="42" width="12" height="18" rx="2" fill="#2563eb" />
          <rect x="40" y="44" width="8" height="2" rx="1" fill="white" opacity="0.7" />
          <rect x="40" y="48" width="8" height="1.5" rx="0.5" fill="white" opacity="0.5" />
          <rect x="40" y="52" width="5" height="1.5" rx="0.5" fill="white" opacity="0.4" />
          <rect x="8" y="38" width="8" height="18" rx="4" fill="white" stroke="#ddd" strokeWidth="0.5" />
          <rect x="48" y="38" width="8" height="18" rx="4" fill="white" stroke="#ddd" strokeWidth="0.5" />
          <rect x="10" y="56" width="6" height="5" rx="2.5" fill="#fcd5b8" />
          <rect x="48" y="56" width="6" height="5" rx="2.5" fill="#fcd5b8" />
          <rect x="20" y="64" width="8" height="14" rx="4" fill="#1e3a5f" />
          <rect x="36" y="64" width="8" height="14" rx="4" fill="#1e3a5f" />
          <rect x="17" y="76" width="12" height="6" rx="3" fill="#2c3e50" />
          <rect x="35" y="76" width="12" height="6" rx="3" fill="#2c3e50" />
          <rect x="42" y="40" width="7" height="9" rx="1.5" fill="#e2e8f0" />
          <rect x="43" y="41" width="5" height="3" rx="0.5" fill="#2563eb" opacity="0.5" />
        </svg>
      </div>
    </>
  );
}
/* ── Workflow with glowing arrow transitions ── */
function WorkflowDoctor({ activeStep, setActiveStep, playing, setPlaying }: { activeStep: number; setActiveStep: (n: number | ((p: number) => number)) => void; playing: boolean; setPlaying: (b: boolean) => void }) {
  const intervalRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (playing) {
      setActiveStep(prev => prev >= workflowSteps.length - 1 ? 0 : prev + 1);
      intervalRef.current = window.setInterval(() => {
        setActiveStep(prev => prev >= workflowSteps.length - 1 ? 0 : prev + 1);
      }, 1600);
    }
    return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } };
  }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, background: "var(--surface-high)", borderRadius: 12, padding: "12px 16px", border: "1px solid var(--border)" }}>
        <button className={`btn btn-sm ${playing ? "btn-danger" : "btn-primary"}`} onClick={() => setPlaying(!playing)}>
          {playing ? "⏸ Pause" : "▶ Auto Play"}
        </button>
        <div style={{ flex: 1, height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${activeStep >= 0 ? ((activeStep + 1) / workflowSteps.length) * 100 : 0}%`, background: "linear-gradient(90deg, var(--teal), var(--blue))", borderRadius: 3, transition: "width 0.5s ease" }} />
        </div>
        <span style={{ fontSize: 13, fontFamily: "var(--mono)", color: "var(--teal)", fontWeight: 600, minWidth: 60, textAlign: "right" }}>
          {Math.max(0, activeStep + 1)} / {workflowSteps.length}
        </span>
      </div>

      {/* Row 1: Steps 1-5 with arrows */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 8 }}>
        {workflowSteps.slice(0, 5).map((s, i) => (
          <React.Fragment key={i}>
            <div
              onClick={() => setActiveStep(i)}
              style={{
                flex: 1, position: "relative", background: i === activeStep ? `${s.color}22` : "var(--surface-high)",
                border: `2px solid ${i === activeStep ? s.color : i < activeStep ? "var(--teal)" : "var(--border)"}`,
                borderRadius: 12, padding: "14px 10px", cursor: "pointer", transition: "all 0.5s ease",
                opacity: i <= activeStep ? 1 : 0.4,
                transform: i === activeStep ? "scale(1.05)" : "scale(1)",
                boxShadow: i === activeStep ? `0 0 20px ${s.color}40, 0 0 40px ${s.color}15` : "none",
                minHeight: 100,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 9, color: i === activeStep ? s.color : "var(--text-muted)", fontFamily: "var(--mono)", fontWeight: i === activeStep ? 700 : 400 }}>STEP {s.num}</span>
                <span style={{
                  width: 18, height: 18, borderRadius: "50%",
                  background: i < activeStep ? "var(--teal)" : i === activeStep ? s.color : "var(--border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, color: "white", fontWeight: 700, transition: "all 0.3s",
                }}>
                  {i < activeStep ? "✓" : i === activeStep ? "●" : ""}
                </span>
              </div>
              <div style={{ fontSize: 24, marginBottom: 6, textAlign: "center" }}>{s.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: i === activeStep ? "white" : "var(--text)", textAlign: "center", lineHeight: 1.3 }}>{s.title}</div>
            </div>
            {/* Glowing arrow between cards */}
            {i < 4 && (
              <div style={{
                width: 28, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <span style={{
                  fontSize: 18, fontWeight: 900, transition: "all 0.5s ease",
                  color: i < activeStep ? "var(--teal)" : "var(--border)",
                  textShadow: i < activeStep ? "0 0 12px var(--teal), 0 0 24px var(--teal)" : "none",
                  opacity: i < activeStep ? 1 : 0.3,
                  animation: i === activeStep - 1 ? "arrowGlow 0.8s ease-in-out infinite" : "none",
                }}>→</span>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Turn arrow (row 1 → row 2) */}
      <div style={{ display: "flex", justifyContent: "flex-end", paddingRight: 20, marginBottom: 4 }}>
        <span style={{
          fontSize: 18, fontWeight: 900, transition: "all 0.5s ease", transform: "rotate(90deg)",
          color: activeStep >= 4 ? "var(--teal)" : "var(--border)",
          textShadow: activeStep >= 4 ? "0 0 12px var(--teal)" : "none",
          opacity: activeStep >= 4 ? 1 : 0.3,
        }}>→</span>
      </div>

      {/* Row 2: Steps 6-10 with arrows */}
      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        {workflowSteps.slice(5, 10).map((s, i) => {
          const idx = i + 5;
          return (
            <React.Fragment key={idx}>
              <div
                onClick={() => setActiveStep(idx)}
                style={{
                  flex: 1, position: "relative", background: idx === activeStep ? `${s.color}22` : "var(--surface-high)",
                  border: `2px solid ${idx === activeStep ? s.color : idx < activeStep ? "var(--teal)" : "var(--border)"}`,
                  borderRadius: 12, padding: "14px 10px", cursor: "pointer", transition: "all 0.5s ease",
                  opacity: idx <= activeStep ? 1 : 0.4,
                  transform: idx === activeStep ? "scale(1.05)" : "scale(1)",
                  boxShadow: idx === activeStep ? `0 0 20px ${s.color}40, 0 0 40px ${s.color}15` : "none",
                  minHeight: 100,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 9, color: idx === activeStep ? s.color : "var(--text-muted)", fontFamily: "var(--mono)", fontWeight: idx === activeStep ? 700 : 400 }}>STEP {s.num}</span>
                  <span style={{
                    width: 18, height: 18, borderRadius: "50%",
                    background: idx < activeStep ? "var(--teal)" : idx === activeStep ? s.color : "var(--border)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, color: "white", fontWeight: 700, transition: "all 0.3s",
                  }}>
                    {idx < activeStep ? "✓" : idx === activeStep ? "●" : ""}
                  </span>
                </div>
                <div style={{ fontSize: 24, marginBottom: 6, textAlign: "center" }}>{s.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: idx === activeStep ? "white" : "var(--text)", textAlign: "center", lineHeight: 1.3 }}>{s.title}</div>
              </div>
              {/* Glowing arrow */}
              {i < 4 && (
                <div style={{ width: 28, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{
                    fontSize: 18, fontWeight: 900, transition: "all 0.5s ease",
                    color: idx < activeStep ? "var(--teal)" : "var(--border)",
                    textShadow: idx < activeStep ? "0 0 12px var(--teal), 0 0 24px var(--teal)" : "none",
                    opacity: idx < activeStep ? 1 : 0.3,
                    animation: idx === activeStep - 1 ? "arrowGlow 0.8s ease-in-out infinite" : "none",
                  }}>→</span>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
export function App() {
  const wallet = useWallet();
  const ca = getContractAddress();
  const readClient = useReadClient();
  const writeClient = useWriteClient(
    wallet.state.status === "connected" ? wallet.state.address : null
  );

  const [page, setPage] = useState<Page>("dashboard");
  const [wfStep, setWfStep] = useState(-1);
  const [wfPlaying, setWfPlaying] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [history, setHistory] = useState<CheckRecord[]>([]);
  const [historyDetail, setHistoryDetail] = useState<any>(null);
  const [sharedPatients, setSharedPatients] = useState<any[]>([]);
  const [sharedDrugs, setSharedDrugs] = useState<any[]>([]);

  // Always load fresh sample data from server (overwrites stale localStorage)
  useEffect(() => {
    fetch("/sample_patients.json").then(r => r.json()).then(data => {
      if (data.length > 0) {
        const mapped = data.map((p: any) => ({
          ...p,
          allergies: typeof p.allergies === "string" ? p.allergies.split(",").map((s: string) => s.trim()).filter(Boolean) : p.allergies || [],
          conditions: typeof p.conditions === "string" ? p.conditions.split(",").map((s: string) => s.trim()).filter(Boolean) : p.conditions || [],
          prescription_count: 0,
        }));
        setSharedPatients(mapped);
      }
    }).catch(() => {
      // Fallback to localStorage if fetch fails
      try { setSharedPatients(JSON.parse(localStorage.getItem("medguard_patients") || "[]")); } catch { /* noop */ }
    });
    fetch("/sample_drugs.json").then(r => r.json()).then(data => {
      if (data.length > 0) setSharedDrugs(data);
    }).catch(() => {
      try { setSharedDrugs(JSON.parse(localStorage.getItem("medguard_drugs") || "[]")); } catch { /* noop */ }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist to localStorage on change
  useEffect(() => { localStorage.setItem("medguard_patients", JSON.stringify(sharedPatients)); }, [sharedPatients]);
  useEffect(() => { localStorage.setItem("medguard_drugs", JSON.stringify(sharedDrugs)); }, [sharedDrugs]);

  /* Load stats */
  const loadStats = useCallback(async () => {
    if (!ca) return;
    try {
      const raw = await readClient.readContract({
        address: ca,
        functionName: "get_stats",
        args: [],
      });
      setStats(typeof raw === "string" ? tryParse(raw) : raw);
    } catch (e) {
      console.error("loadStats", e);
    }
  }, [ca, readClient]);

  useEffect(() => { loadStats(); }, [loadStats]);

  /* Ensure wallet + write client ready */
  function ensureReady(): boolean {
    if (!ca) return false;
    if (wallet.state.status !== "connected") {
      wallet.connect();
      return false;
    }
    if (!writeClient) return false;
    return true;
  }

  /* With-transaction helper */
  function withTx(fn: () => Promise<any>, onResult?: (r: any) => void) {
    return async () => {
      if (!ensureReady()) return;
      setTx({ status: "pending" });
      try {
        const txResult = await fn();
        // write() returns {hash, result}, read() returns data directly
        const hashStr = typeof txResult === "object" && txResult?.hash ? txResult.hash : String(txResult);
        setTx({ status: "success", hash: hashStr });
        // Get the latest check ID from contract after tx finality
        try {
          const sRaw = await read("get_stats") as any;
          const s = typeof sRaw === "string" ? JSON.parse(sRaw) : sRaw;
          const latestId = String(s?.total_checks ?? "");
          if (onResult) onResult(latestId || hashStr);
        } catch {
          if (onResult) onResult(hashStr);
        }
        loadStats();
      } catch (e: any) {
        setTx({ status: "error", error: e?.message ?? String(e) });
      }
    };
  }

  const [tx, setTx] = useState<TxState>({ status: "idle" });

  /* Generic write helper — waits for transaction finality */
  async function write(functionName: string, args: any[]): Promise<{hash: string, result: any}> {
    const hash = await writeClient!.writeContract({
      address: ca!,
      functionName,
      args,
      value: 0n,
    });
    const hashStr = typeof hash === "string" ? hash : String(hash);
    // Wait for transaction finality
    const receipt = await writeClient!.waitForTransactionReceipt({
      hash: hashStr as any,
      status: TransactionStatus.ACCEPTED,
      interval: 2000,
      retries: 150,
    });
    // Extract result from transaction
    let result = null;
    try {
      const txData = await writeClient!.getTransaction({ hash: hashStr as any });
      result = txData;
    } catch {}
    return { hash: hashStr, result: receipt || result };
  }

  /* Generic read helper */
  async function read(functionName: string, args: any[] = []): Promise<any> {
    const raw = await readClient.readContract({
      address: ca!,
      functionName,
      args,
    });
    return typeof raw === "string" ? tryParse(raw) : raw;
  }

  /* Append to history */
  function addHistory(type: string, inputs: string, result: string) {
    setHistory((h) => [
      { id: `${Date.now()}`, type, inputs, result, timestamp: new Date().toISOString() },
      ...h,
    ]);
  }

  /* ─── Sidebar Navigation Config ─── */
  const navSections: { label: string; items: { page: Page; icon: React.ReactNode; name: string }[] }[] = [
    {
      label: "Clinical",
      items: [
        { page: "dashboard", icon: <IconShield />, name: "Dashboard" },
        { page: "interaction", icon: <IconDrugInteraction />, name: "Drug Interaction" },
        { page: "dosage", icon: <IconDosage />, name: "Dosage Check" },
        { page: "allergy", icon: <IconAllergy />, name: "Allergy Check" },
        { page: "treatment", icon: <IconTreatment />, name: "Treatment" },
      ],
    },
    {
      label: "Management",
      items: [
        { page: "patients", icon: <IconPatient />, name: "Patients" },
        { page: "prescription", icon: <IconPrescription />, name: "Prescription" },
        { page: "drugs", icon: <IconDrug />, name: "Drug Database" },
        { page: "alerts", icon: <IconAlert />, name: "Alerts" },
      ],
    },
    {
      label: "Advanced",
      items: [
        { page: "trials", icon: <IconTrial />, name: "Clinical Trials" },
        { page: "insurance", icon: <IconInsurance />, name: "Insurance" },
        { page: "history", icon: <IconShield />, name: "History" },
      ],
    },
  ];

  /* ─── Dashboard Page ─── */
  function DashboardPage() {
    const statItems = stats ? [
      { label: "Total Checks", value: stats.total_checks ?? 0, color: "blue" },
      { label: "Patients", value: stats.total_patients ?? 0, color: "green" },
      { label: "Prescriptions", value: stats.total_prescriptions ?? 0, color: "teal" },
      { label: "Drug DB Size", value: stats.drug_database_size ?? 0, color: "gold" },
      { label: "Drug Checks", value: stats.total_drug_checks ?? 0, color: "blue" },
      { label: "Dosage Checks", value: stats.total_dosage_checks ?? 0, color: "green" },
      { label: "Allergy Checks", value: stats.total_allergy_checks ?? 0, color: "teal" },
      { label: "Treatment Checks", value: stats.total_treatment_checks ?? 0, color: "gold" },
      { label: "Alerts", value: stats.total_alerts ?? 0, color: "red" },
      { label: "Trusted Sources", value: stats.trusted_sources_count ?? 0, color: "text" },
      { label: "Insurance Claims", value: stats.total_claims ?? 0, color: "blue" },
    ] : [];

    const featureCards: { page: Page; icon: React.ReactNode; color: string; title: string; desc: string }[] = [
      { page: "interaction", icon: <IconDrugInteraction />, color: "blue", title: "Drug Interaction", desc: "Check two drugs for harmful interactions with AI-powered analysis" },
      { page: "dosage", icon: <IconDosage />, color: "green", title: "Dosage Verification", desc: "Verify medication dosages against patient weight and age" },
      { page: "allergy", icon: <IconAllergy />, color: "red", title: "Allergy Risk", desc: "Cross-reference medications with known patient allergies" },
      { page: "treatment", icon: <IconTreatment />, color: "teal", title: "Treatment Validation", desc: "Validate proposed treatments against medical conditions" },
      { page: "patients", icon: <IconPatient />, color: "gold", title: "Patient Registry", desc: "Register and manage patient records on-chain" },
      { page: "prescription", icon: <IconPrescription />, color: "blue", title: "Prescription Verify", desc: "Verify prescriptions against patient history and safety" },
      { page: "drugs", icon: <IconDrug />, color: "green", title: "Drug Database", desc: "Search and manage the on-chain pharmaceutical database" },
      { page: "alerts", icon: <IconAlert />, color: "red", title: "Medical Alerts", desc: "View critical patient alerts and safety notifications" },
      { page: "trials", icon: <IconTrial />, color: "teal", title: "Clinical Trials", desc: "Match patients to relevant clinical trial opportunities" },
      { page: "insurance", icon: <IconInsurance />, color: "gold", title: "Insurance Claims", desc: "Verify insurance claims against treatment costs" },
    ];

    return (
      <div className="fade-in">
        <div className="hero">
          <ECGLine />
          <div className="hero-label">Clinical Decision Support Oracle</div>
          <h1 className="hero-title">MedGuard</h1>
          <p className="hero-sub">
            AI-powered clinical decision support on GenLayer blockchain. Verify drug interactions,
            validate dosages, check allergies, and manage patient safety — all on-chain with
            trusted medical references.
          </p>
          <span className="hero-badge">
            <span className="dot" /> GenLayer StudioNet · Chain {61999}
          </span>
        </div>

        <div className="stat-row">
          {statItems.map((s, i) => (
            <div className="stat-box" key={i}>
              <div className="stat-box-label">{s.label}</div>
              <div className={`stat-box-value ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="section-title">Data Import / Export</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
          <ImportExportPanel 
            type="patients" 
            onImport={(items) => {
              items.forEach((p: PatientImport) => {
                if (!sharedPatients.find((x: any) => x.patient_id === p.patient_id)) {
                  setSharedPatients((prev: any[]) => [...prev, { 
                    ...p, 
                    allergies: typeof p.allergies === 'string' ? p.allergies.split(',').map(s => s.trim()).filter(Boolean) : p.allergies || [], 
                    conditions: typeof p.conditions === 'string' ? p.conditions.split(',').map(s => s.trim()).filter(Boolean) : p.conditions || [], 
                    prescription_count: 0 
                  }]);
                }
              });
            }}
            onExportData={() => sharedPatients}
          />
          <ImportExportPanel 
            type="drugs" 
            onImport={(items) => {
              items.forEach((d: DrugImport) => {
                if (!sharedDrugs.find((x: any) => x.drug_name === d.drug_name)) {
                  setSharedDrugs((prev: any[]) => [...prev, { 
                    ...d, 
                    common_dosages: typeof d.common_dosages === 'string' ? d.common_dosages.split(',').map(s => s.trim()) : d.common_dosages || [], 
                    side_effects: typeof d.side_effects === 'string' ? d.side_effects.split(',').map(s => s.trim()) : d.side_effects || [], 
                    contraindications: typeof d.contraindications === 'string' ? d.contraindications.split(',').map(s => s.trim()) : d.contraindications || [] 
                  }]);
                }
              });
            }}
            onExportData={() => sharedDrugs}
          />
        </div>

        {/* Clinical Workflow — rendered outside DashboardPage to prevent unmount */}

        <div className="section-title">Clinical Tools</div>
        <div className="feature-grid">
          {featureCards.map((c) => (
            <div
              key={c.page}
              className={`feature-card ${c.color}`}
              onClick={() => setPage(c.page)}
            >
              <div className={`feature-icon ${c.color}`}>{c.icon}</div>
              <h3>{c.title}</h3>
              <p>{c.desc}</p>
              <span className="arrow">→</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ─── Drug Interaction Page ─── */
  function InteractionPage() {
    const [drugA, setDrugA] = useState("");
    const [drugB, setDrugB] = useState("");
    const [context, setContext] = useState("");
    const [result, setResult] = useState<string | null>(null);

    const submit = withTx(
      () => write("check_drug_interaction", [drugA, drugB, context, ""]),
      (r) => {
        setResult(r);
        addHistory("Drug Interaction", `${drugA} + ${drugB}`, r);
      }
    );

    return (
      <div className="fade-in">
        <div className="page-hdr">
          <div className="page-hdr-label"><span className="icon"><IconDrugInteraction /></span> Clinical</div>
          <h1 className="page-hdr-title">Drug Interaction Check</h1>
          <p className="page-hdr-sub">Check two medications for harmful interactions using AI-powered analysis with trusted medical references.</p>
        </div>
        {!ca && <div className="alert alert-error">Contract not deployed. Check configuration.</div>}
        <div className="form-card">
          <div className="form-card-header">
            <div className="icon" style={{ background: "var(--blue-glow)", color: "var(--blue)" }}><IconDrugInteraction /></div>
            <div>
              <strong>Interaction Analysis</strong>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Enter two drugs to check for interactions</div>
            </div>
          </div>
          <DrugSelector value={drugA} onChange={setDrugA} label="Drug A" placeholder="e.g. Warfarin" drugs={sharedDrugs} />
                      <DrugSelector value={drugB} onChange={setDrugB} label="Drug B" placeholder="e.g. Aspirin" drugs={sharedDrugs} />
          <div className="form-group">
            <label className="form-label">Patient Context <span className="form-hint">(optional)</span></label>
            <textarea value={context} onChange={(e) => setContext(e.target.value)} placeholder="Age, weight, conditions..." />
          </div>
          <button className="btn btn-primary btn-full" onClick={submit} disabled={tx.status === "pending" || !drugA || !drugB}>
            {tx.status === "pending" ? "Checking…" : "Check Interaction"}
          </button>
          <TxPanel tx={tx} />
        </div>
        {result && (
          <div className="result-card" style={{ marginTop: 16 }}>
            <div className="result-header">
              <span className="result-badge badge-info">Result</span>
              <span className="result-meta">Check ID: {result}</span>
            </div>
            <div className="result-body">
              <button className="btn btn-sm" onClick={async () => {
                try { const d = await read("get_check", [result]); setResult(typeof d === "string" ? d : JSON.stringify(d, null, 2)); } catch (e: any) { setResult(friendlyError(e)); }
              }}>Load Full Result</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ─── Dosage Check Page ─── */
  function DosagePage() {
    const [drug, setDrug] = useState("");
    const [dosage, setDosage] = useState("");
    const [weight, setWeight] = useState("");
    const [age, setAge] = useState("");
    const [result, setResult] = useState<string | null>(null);

    const submit = withTx(
      () => write("verify_dosage", [drug, parseFloat(dosage), parseFloat(weight), parseInt(age), ""]),
      (r) => {
        setResult(r);
        addHistory("Dosage Check", `${drug} ${dosage}mg, ${weight}kg, ${age}y`, r);
      }
    );

    return (
      <div className="fade-in">
        <div className="page-hdr">
          <div className="page-hdr-label"><span className="icon"><IconDosage /></span> Clinical</div>
          <h1 className="page-hdr-title">Dosage Verification</h1>
          <p className="page-hdr-sub">Verify medication dosages are safe and appropriate for the patient's weight and age.</p>
        </div>
        {!ca && <div className="alert alert-error">Contract not deployed. Check configuration.</div>}
        <div className="form-card">
          <div className="form-card-header">
            <div className="icon" style={{ background: "var(--green-glow)", color: "var(--green)" }}><IconDosage /></div>
            <div>
              <strong>Dosage Verification</strong>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Enter dosage details for safety check</div>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Drug Name</label>
            <input value={drug} onChange={(e) => setDrug(e.target.value)} placeholder="e.g. Amoxicillin" />
          </div>
          <div className="form-group">
            <label className="form-label">Dosage (mg)</label>
            <input type="number" value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="e.g. 500" />
          </div>
          <div className="form-group">
            <label className="form-label">Patient Weight (kg)</label>
            <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 70" />
          </div>
          <div className="form-group">
            <label className="form-label">Patient Age (years)</label>
            <input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 35" />
          </div>
          <button className="btn btn-primary btn-full" onClick={submit} disabled={tx.status === "pending" || !drug || !dosage || !weight || !age}>
            {tx.status === "pending" ? "Verifying…" : "Verify Dosage"}
          </button>
          <TxPanel tx={tx} />
        </div>
        {result && (
          <div className="result-card" style={{ marginTop: 16 }}>
            <div className="result-header">
              <span className="result-badge badge-info">Result</span>
              <span className="result-meta">Check ID: {result}</span>
            </div>
            <div className="result-body">
              <button className="btn btn-sm" onClick={async () => {
                try { const d = await read("get_check", [result]); setResult(typeof d === "string" ? d : JSON.stringify(d, null, 2)); } catch (e: any) { setResult(friendlyError(e)); }
              }}>Load Full Result</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ─── Allergy Check Page ─── */
  function AllergyPage() {
    const [meds, setMeds] = useState("");
    const [allergies, setAllergies] = useState("");
    const [context, setContext] = useState("");
    const [result, setResult] = useState<string | null>(null);
    const [allergyPatient, setAllergyPatient] = useState("");

    const submit = withTx(
      () => write("check_allergy_risk", [meds, allergies, context, ""]),
      (r) => {
        setResult(r);
        addHistory("Allergy Check", `Meds: ${meds}, Allergies: ${allergies}`, r);
      }
    );

    return (
      <div className="fade-in">
        <div className="page-hdr">
          <div className="page-hdr-label"><span className="icon"><IconAllergy /></span> Clinical</div>
          <h1 className="page-hdr-title">Allergy Risk Check</h1>
          <p className="page-hdr-sub">Cross-reference medications against known patient allergies to prevent adverse reactions.</p>
        </div>
        {!ca && <div className="alert alert-error">Contract not deployed. Check configuration.</div>}
        <div className="form-card">
          <div className="form-card-header">
            <div className="icon" style={{ background: "var(--red-glow)", color: "var(--red)" }}><IconAllergy /></div>
            <div>
              <strong>Allergy Analysis</strong>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Comma-separated lists for batch checking</div>
            </div>
          </div>
          <PatientSelector patients={sharedPatients} value={allergyPatient} onChange={(v) => {
            setAllergyPatient(v);
            const p = sharedPatients.find((x: any) => x.patient_id === v);
            if (p) { setAllergies(p.allergies?.join(", ") || ""); }
          }} label="Quick Fill from Patient" />
          <MultiDrugSelector value={meds} onChange={setMeds} label="Medications to Check" placeholder="Type drug name and press Enter" drugs={sharedDrugs} />
          <div className="form-group">
            <label className="form-label">Known Allergies (comma-separated)</label>
            <input value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="e.g. Penicillin, Sulfa" />
            <span className="form-hint">Auto-filled when patient selected above</span>
          </div>
          <div className="form-group">
            <label className="form-label">Patient Context <span className="form-hint">(optional)</span></label>
            <textarea value={context} onChange={(e) => setContext(e.target.value)} placeholder="Additional patient context..." />
          </div>
          <button className="btn btn-primary btn-full" onClick={submit} disabled={tx.status === "pending" || !meds || !allergies}>
            {tx.status === "pending" ? "Checking…" : "Check Allergy Risk"}
          </button>
          <TxPanel tx={tx} />
        </div>
        {result && (
          <div className="result-card" style={{ marginTop: 16 }}>
            <div className="result-header">
              <span className="result-badge badge-info">Result</span>
              <span className="result-meta">Check ID: {result}</span>
            </div>
            <div className="result-body">
              <button className="btn btn-sm" onClick={async () => {
                try { const d = await read("get_check", [result]); setResult(typeof d === "string" ? d : JSON.stringify(d, null, 2)); } catch (e: any) { setResult(friendlyError(e)); }
              }}>Load Full Result</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ─── Treatment Validation Page ─── */
  function TreatmentPage() {
    const [condition, setCondition] = useState("");
    const [treatment, setTreatment] = useState("");
    const [context, setContext] = useState("");
    const [result, setResult] = useState<string | null>(null);

    const submit = withTx(
      () => write("validate_treatment", [condition, treatment, context, ""]),
      (r) => {
        setResult(r);
        addHistory("Treatment Validation", `${condition} → ${treatment}`, r);
      }
    );

    return (
      <div className="fade-in">
        <div className="page-hdr">
          <div className="page-hdr-label"><span className="icon"><IconTreatment /></span> Clinical</div>
          <h1 className="page-hdr-title">Treatment Validation</h1>
          <p className="page-hdr-sub">Validate proposed treatments against medical conditions and best practices.</p>
        </div>
        {!ca && <div className="alert alert-error">Contract not deployed. Check configuration.</div>}
        <div className="form-card">
          <div className="form-card-header">
            <div className="icon" style={{ background: "var(--teal-glow)", color: "var(--teal)" }}><IconTreatment /></div>
            <div>
              <strong>Treatment Analysis</strong>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>AI-powered treatment validation</div>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Medical Condition</label>
            <input value={condition} onChange={(e) => setCondition(e.target.value)} placeholder="e.g. Type 2 Diabetes" />
          </div>
          <div className="form-group">
            <label className="form-label">Proposed Treatment</label>
            <input value={treatment} onChange={(e) => setTreatment(e.target.value)} placeholder="e.g. Metformin 500mg twice daily" />
          </div>
          <div className="form-group">
            <label className="form-label">Patient Context <span className="form-hint">(optional)</span></label>
            <textarea value={context} onChange={(e) => setContext(e.target.value)} placeholder="Age, comorbidities, current medications..." />
          </div>
          <button className="btn btn-primary btn-full" onClick={submit} disabled={tx.status === "pending" || !condition || !treatment}>
            {tx.status === "pending" ? "Validating…" : "Validate Treatment"}
          </button>
          <TxPanel tx={tx} />
        </div>
        {result && (
          <div className="result-card" style={{ marginTop: 16 }}>
            <div className="result-header">
              <span className="result-badge badge-info">Result</span>
              <span className="result-meta">Check ID: {result}</span>
            </div>
            <div className="result-body">
              <button className="btn btn-sm" onClick={async () => {
                try { const d = await read("get_check", [result]); setResult(typeof d === "string" ? d : JSON.stringify(d, null, 2)); } catch (e: any) { setResult(friendlyError(e)); }
              }}>Load Full Result</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ─── Patients Page ─── */
  function PatientCard({ data }: { data: any }) {
    return (
      <div style={{ padding: 16, background: "var(--surface)", borderRadius: 12, border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>{data.full_name}</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--teal)" }}>{data.patient_id}</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <span className="badge badge-info">{data.blood_type || "—"}</span>
            <span className="badge badge-safe">{data.age_years}y</span>
            <span className="badge badge-warn">{data.weight_kg}kg</span>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ padding: "10px 12px", background: "var(--surface-high)", borderRadius: 8 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--red)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Allergies</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {(data.allergies || []).length > 0 ? data.allergies.map((a: string, i: number) => (
                <span key={i} className="badge badge-danger">{a}</span>
              )) : <span style={{ fontSize: 12, color: "var(--text-muted)" }}>None recorded</span>}
            </div>
          </div>
          <div style={{ padding: "10px 12px", background: "var(--surface-high)", borderRadius: 8 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--gold)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Conditions</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {(data.conditions || []).length > 0 ? data.conditions.map((c: string, i: number) => (
                <span key={i} className="badge badge-warn">{c}</span>
              )) : <span style={{ fontSize: 12, color: "var(--text-muted)" }}>None recorded</span>}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 10, display: "flex", gap: 16, fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--mono)" }}>
          <span>Rx Count: {data.prescription_count ?? 0}</span>
          <span>Registered: {data.registered_by?.slice(0, 10)}...</span>
        </div>
      </div>
    );
  }

  function PatientsPage() {
      const [patientId, setPatientId] = useState("");
      const [fullName, setFullName] = useState("");
      const [pAllergies, setPAllergies] = useState("");
      const [conditions, setConditions] = useState("");
      const [bloodType, setBloodType] = useState("");
      const [pAge, setPAge] = useState("");
      const [pWeight, setPWeight] = useState("");
      const [lookupId, setLookupId] = useState("");
      const [patientData, setPatientData] = useState<any>(null);
    const [listLoading, setListLoading] = useState(false);

    const regSubmit = withTx(
      () => write("register_patient", [patientId, fullName, pAllergies, conditions, bloodType, parseInt(pAge), parseFloat(pWeight)]),
      (r) => {
        addHistory("Patient Register", `${patientId}: ${fullName}`, r);
        // Auto-add to list
        setSharedPatients(prev => [...prev, { patient_id: patientId, full_name: fullName, allergies: pAllergies.split(",").map(s => s.trim()).filter(Boolean), conditions: conditions.split(",").map(s => s.trim()).filter(Boolean), blood_type: bloodType, age_years: parseInt(pAge) || 0, weight_kg: parseFloat(pWeight) || 0, prescription_count: 0 }]);
        setPatientId(""); setFullName(""); setPAllergies(""); setConditions(""); setBloodType(""); setPAge(""); setPWeight("");
      }
    );

    const lookupPatient = async () => {
      if (!lookupId) return;
      // First check local data
      const local = sharedPatients.find((p: any) => p.patient_id === lookupId);
      if (local) { setPatientData(local); return; }
      // Then try on-chain
      if (!ca) return;
      try {
        const d = await read("get_patient", [lookupId]);
        if (d && typeof d === 'object' && d.patient_id) {
          setPatientData(d);
          if (!sharedPatients.find((p: any) => p.patient_id === d.patient_id)) {
            setSharedPatients((prev: any[]) => [...prev, d]);
          }
        } else {
          setPatientData({ error: "Patient not found locally or on-chain" });
        }
      } catch (e: any) {
        setPatientData({ error: friendlyError(e, "Patient not found. Register on-chain or import via CSV/JSON.") });
      }
    };

    const loadAllPatients = async () => {
      if (!ca) return;
      setListLoading(true);
      try {
        const sRaw = await read("get_stats") as any;
        const s = typeof sRaw === "string" ? JSON.parse(sRaw) : sRaw;
        const totalChecks = s?.total_checks ?? 0;
        const patients: any[] = [];
        // Scan recent checks for patient registrations
        for (let i = totalChecks; i >= Math.max(1, totalChecks - 50); i--) {
          try {
            const check = await read("get_check", [String(i)]);
            if (check?.type === "patient_register" || check?.query?.patient_id) {
              const pid = check.query?.patient_id;
              if (pid && !patients.find(p => p.patient_id === pid)) {
                try {
                  const pat = await read("get_patient", [pid]);
                  if (pat) patients.push(pat);
                } catch {}
              }
            }
          } catch {}
        }
        setSharedPatients(patients);
      } catch {}
      setListLoading(false);
    };

    return (
      <div className="fade-in">
        <div className="page-hdr">
          <div className="page-hdr-label"><span className="icon"><IconPatient /></span> Management</div>
          <h1 className="page-hdr-title">Patient Registry</h1>
          <p className="page-hdr-sub">Register and manage patient records securely on the blockchain.</p>
        </div>
        {!ca && <div className="alert alert-error">Contract not deployed. Check configuration.</div>}
        {sharedPatients.length > 0 && (
          <div className="alert alert-info" style={{ marginBottom: 16 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>info</span>
            {sharedPatients.length} patients loaded from Dashboard import. Data syncs across all pages.
          </div>
        )}

        {/* Register Form */}
        <div className="form-card" style={{ marginBottom: 20 }}>
          <div className="form-card-header">
            <div className="icon" style={{ background: "var(--green-glow)", color: "var(--green)" }}><IconPatient /></div>
            <div>
              <strong>Register New Patient</strong>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Add a new patient record on-chain</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Patient ID</label>
              <input value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="e.g. PAT-001" />
            </div>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. John Doe" />
            </div>
            <div className="form-group">
              <label className="form-label">Allergies (comma-separated)</label>
              <input value={pAllergies} onChange={(e) => setPAllergies(e.target.value)} placeholder="e.g. Penicillin, Latex" />
            </div>
            <div className="form-group">
              <label className="form-label">Conditions (comma-separated)</label>
              <input value={conditions} onChange={(e) => setConditions(e.target.value)} placeholder="e.g. Diabetes, Hypertension" />
            </div>
            <div className="form-group">
              <label className="form-label">Blood Type</label>
              <input value={bloodType} onChange={(e) => setBloodType(e.target.value)} placeholder="e.g. O+" />
            </div>
            <div className="form-group">
              <label className="form-label">Age (years)</label>
              <input type="number" value={pAge} onChange={(e) => setPAge(e.target.value)} placeholder="e.g. 45" />
            </div>
            <div className="form-group">
              <label className="form-label">Weight (kg)</label>
              <input type="number" value={pWeight} onChange={(e) => setPWeight(e.target.value)} placeholder="e.g. 72" />
            </div>
          </div>
          <button className="btn btn-green btn-full" onClick={regSubmit} disabled={tx.status === "pending" || !patientId || !fullName}>
            {tx.status === "pending" ? "Registering…" : "Register Patient"}
          </button>
          <TxPanel tx={tx} />
        </div>

        {/* Patient Selector */}
        <div className="form-card">
          <div className="form-card-header">
            <div className="icon" style={{ background: "var(--teal-glow)", color: "var(--teal)" }}><IconPatient /></div>
            <div>
              <strong>Select Patient</strong>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Choose from registered patients or enter ID manually</div>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Patient</label>
            <select 
              value={lookupId} 
              onChange={(e) => { const v = e.target.value; setLookupId(v); if (v) { const p = sharedPatients.find((x: any) => x.patient_id === v); if (p) setPatientData(p); else lookupPatient(); } }}
              style={{ marginBottom: 8 }}
            >
              <option value="">-- Select patient from list --</option>
              {sharedPatients.map((p: any) => (
                <option key={p.patient_id} value={p.patient_id}>
                  {p.patient_id} — {p.full_name} ({p.allergies?.join(", ") || "no allergies"})
                </option>
              ))}
            </select>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Or enter ID:</span>
              <input value={lookupId} onChange={(e) => setLookupId(e.target.value)} placeholder="e.g. PAT-001" style={{ flex: 1 }} />
              <button className="btn btn-primary btn-sm" onClick={lookupPatient} disabled={!lookupId}>Lookup</button>
            </div>
          </div>
          {patientData && !patientData.error && <div style={{ marginTop: 16 }}><PatientCard data={patientData} /></div>}
          {patientData?.error && <div className="alert alert-error" style={{ marginTop: 12 }}>{patientData.error}</div>}
        </div>
      </div>
    );
  }

  /* ─── Prescription Page ─── */
  function PrescriptionPage() {
    const [pId, setPId] = useState("");
    const [pMeds, setPMeds] = useState("");
    const [pNotes, setPNotes] = useState("");
    const [result, setResult] = useState<string | null>(null);
    const [prescLookup, setPrescLookup] = useState("");
    const [prescData, setPrescData] = useState<string | null>(null);

    const submit = withTx(
      () => write("verify_prescription", [pId, pMeds, pNotes, ""]),
      (r) => {
        setResult(r);
        addHistory("Prescription Verify", `Patient: ${pId}, Meds: ${pMeds}`, r);
      }
    );

    const lookupPresc = async () => {
      if (!prescLookup || !ca) return;
      try {
        const d = await read("get_prescription", [prescLookup]);
        if (d && typeof d === 'object') {
          setPrescData(JSON.stringify(d, null, 2));
        } else {
          setPrescData(String(d || "Not found"));
        }
      } catch (e: any) {
        setPrescData(friendlyError(e, "Prescription not found."));
      }
    };

    return (
      <div className="fade-in">
        <div className="page-hdr">
          <div className="page-hdr-label"><span className="icon"><IconPrescription /></span> Management</div>
          <h1 className="page-hdr-title">Prescription Verification</h1>
          <p className="page-hdr-sub">Verify prescriptions against patient history, allergies, and safety guidelines.</p>
        </div>
        {!ca && <div className="alert alert-error">Contract not deployed. Check configuration.</div>}
        <div className="form-card" style={{ marginBottom: 20 }}>
          <div className="form-card-header">
            <div className="icon" style={{ background: "var(--blue-glow)", color: "var(--blue)" }}><IconPrescription /></div>
            <div>
              <strong>Verify Prescription</strong>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Check prescription safety for a registered patient</div>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Patient</label>
            <select 
              value={pId} 
              onChange={(e) => setPId(e.target.value)}
            >
              <option value="">-- Select patient --</option>
              {sharedPatients.map((p: any) => (
                <option key={p.patient_id} value={p.patient_id}>
                  {p.patient_id} — {p.full_name} (Allergies: {p.allergies?.join(", ") || "none"})
                </option>
              ))}
            </select>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Or enter ID:</span>
              <input value={pId} onChange={(e) => setPId(e.target.value)} placeholder="e.g. PAT-001" style={{ flex: 1 }} />
            </div>
          </div>
          <MultiDrugSelector value={pMeds} onChange={setPMeds} label="Medications" placeholder="Type drug name and press Enter" drugs={sharedDrugs} />
          <div className="form-group">
            <label className="form-label">Prescriber Notes <span className="form-hint">(optional)</span></label>
            <textarea value={pNotes} onChange={(e) => setPNotes(e.target.value)} placeholder="Additional notes from prescriber..." />
          </div>
          <button className="btn btn-primary btn-full" onClick={submit} disabled={tx.status === "pending" || !pId || !pMeds}>
            {tx.status === "pending" ? "Verifying…" : "Verify Prescription"}
          </button>
          <TxPanel tx={tx} />
        </div>
        {result && (
          <div className="result-card" style={{ marginBottom: 20 }}>
            <div className="result-header">
              <span className="result-badge badge-info">Prescription ID</span>
              <span className="result-meta">{result}</span>
            </div>
          </div>
        )}
        <div className="form-card">
          <div className="form-card-header">
            <div className="icon" style={{ background: "var(--teal-glow)", color: "var(--teal)" }}><IconPrescription /></div>
            <div>
              <strong>Lookup Prescription</strong>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Retrieve prescription details by ID</div>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Prescription ID</label>
            <input value={prescLookup} onChange={(e) => setPrescLookup(e.target.value)} placeholder="e.g. PRSC-001" />
          </div>
          <button className="btn btn-primary" onClick={lookupPresc} disabled={!prescLookup}>Lookup</button>
          {prescData && <div className="result-detail" style={{ marginTop: 12 }}>{prescData}</div>}
        </div>
      </div>
    );
  }

  /* ─── Drug Database Page ─── */
  function DrugsPage() {
    const [dName, setDName] = useState("");
    const [dCategory, setDCategory] = useState("");
    const [dDosages, setDDosages] = useState("");
    const [dSideEffects, setDSideEffects] = useState("");
    const [dContra, setDContra] = useState("");
    const [searchQ, setSearchQ] = useState("");
    const [searchResults, setSearchResults] = useState<any>(null);
    const [drugInfo, setDrugInfo] = useState("");
    const [drugInfoResult, setDrugInfoResult] = useState<string | null>(null);

    const addSubmit = withTx(
      () => write("add_drug", [dName, dCategory, dDosages, dSideEffects, dContra]),
      (r) => {
        addHistory("Add Drug", dName, r);
        setSharedDrugs((prev: any[]) => [...prev, { drug_name: dName, category: dCategory, common_dosages: dDosages.split(",").map((s: string) => s.trim()), side_effects: dSideEffects.split(",").map((s: string) => s.trim()), contraindications: dContra.split(",").map((s: string) => s.trim()) }]);
        setDName(""); setDCategory(""); setDDosages(""); setDSideEffects(""); setDContra("");
      }
    );

    const doSearch = withTx(
      () => read("search_drugs", [searchQ]),
      (r) => {
        addHistory("Drug Search", searchQ, r);
        try {
          const parsed = typeof r.data === "string" ? JSON.parse(r.data) : r.data;
          setSearchResults(Array.isArray(parsed) ? { results: parsed, count: parsed.length } : { results: [], count: 0 });
        } catch { setSearchResults({ results: [], count: 0 }); }
      }
    );

    const doLookup = async () => {
      if (!drugInfo || !ca) return;
      try {
        const d = await read("get_drug_info", [drugInfo]);
        if (d && typeof d === 'object') {
          setDrugInfoResult(JSON.stringify(d, null, 2));
        } else {
          setDrugInfoResult(String(d || "Drug not found"));
        }
      } catch (e: any) {
        setDrugInfoResult(friendlyError(e, "Drug not found in database."));
      }
    };

    return (
      <div className="fade-in">
        <div className="page-hdr">
          <div className="page-hdr-label"><span className="icon"><IconDrug /></span> Management</div>
          <h1 className="page-hdr-title">Drug Database</h1>
          <p className="page-hdr-sub">Search the on-chain pharmaceutical database and manage drug records.</p>
        </div>
        {!ca && <div className="alert alert-error">Contract not deployed. Check configuration.</div>}

        <div className="form-card" style={{ marginBottom: 20 }}>
          <div className="form-card-header">
            <div className="icon" style={{ background: "var(--green-glow)", color: "var(--green)" }}><IconDrug /></div>
            <div>
              <strong>Add Drug</strong>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Owner-only: Add a new drug to the database</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Drug Name</label>
              <input value={dName} onChange={(e) => setDName(e.target.value)} placeholder="e.g. Metformin" />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <input value={dCategory} onChange={(e) => setDCategory(e.target.value)} placeholder="e.g. Antidiabetic" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Common Dosages (comma-separated)</label>
            <input value={dDosages} onChange={(e) => setDDosages(e.target.value)} placeholder="e.g. 500mg, 850mg, 1000mg" />
          </div>
          <div className="form-group">
            <label className="form-label">Side Effects (comma-separated)</label>
            <input value={dSideEffects} onChange={(e) => setDSideEffects(e.target.value)} placeholder="e.g. Nausea, Diarrhea, Lactic acidosis" />
          </div>
          <div className="form-group">
            <label className="form-label">Contraindications (comma-separated)</label>
            <input value={dContra} onChange={(e) => setDContra(e.target.value)} placeholder="e.g. Renal impairment, Hepatic disease" />
          </div>
          <button className="btn btn-green btn-full" onClick={addSubmit} disabled={tx.status === "pending" || !dName}>
            {tx.status === "pending" ? "Adding…" : "Add Drug"}
          </button>
          <TxPanel tx={tx} />
        </div>

        <div className="form-card" style={{ marginBottom: 20 }}>
          <div className="form-card-header">
            <div className="icon" style={{ background: "var(--blue-glow)", color: "var(--blue)" }}><IconDrug /></div>
            <div>
              <strong>Search Drugs</strong>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Search the on-chain drug database</div>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Search Query</label>
            <input value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="e.g. Metformin" />
          </div>
          <button className="btn btn-primary" onClick={doSearch} disabled={!searchQ}>Search</button>
          {searchResults && (
            <div className="result-detail" style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>
              {typeof searchResults === "string" ? searchResults : JSON.stringify(searchResults, null, 2)}
            </div>
          )}
        </div>

        <div className="form-card">
          <div className="form-card-header">
            <div className="icon" style={{ background: "var(--teal-glow)", color: "var(--teal)" }}><IconDrug /></div>
            <div>
              <strong>Drug Info Lookup</strong>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Get detailed info by exact drug name</div>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Drug Name</label>
            <input value={drugInfo} onChange={(e) => setDrugInfo(e.target.value)} placeholder="e.g. Aspirin" />
          </div>
          <button className="btn btn-primary" onClick={doLookup} disabled={!drugInfo}>Lookup</button>
          {drugInfoResult && <div className="result-detail" style={{ marginTop: 12 }}>{drugInfoResult}</div>}
        </div>
      </div>
    );
  }

  /* ─── Alerts Page ─── */
  function AlertsPage() {
    const [alertLookup, setAlertLookup] = useState("");
    const [alertData, setAlertData] = useState<string | null>(null);
    const [patientAlerts, setPatientAlerts] = useState<any>(null);
    const [alertPatientId, setAlertPatientId] = useState("");

    const lookupAlert = async () => {
      if (!alertLookup || !ca) return;
      try {
        const d = await read("get_alert", [alertLookup]);
        if (d && typeof d === 'object') {
          setAlertData(JSON.stringify(d, null, 2));
        } else {
          setAlertData(String(d || "Alert not found"));
        }
      } catch (e: any) {
        setAlertData(friendlyError(e, "Alert not found. It may not have been generated yet."));
      }
    };

    const lookupPatientAlerts = async () => {
      if (!alertPatientId || !ca) return;
      try {
        const dRaw = await read("get_alerts_for_patient", [alertPatientId]);
        const d = typeof dRaw === "string" ? JSON.parse(dRaw) : dRaw;
        setPatientAlerts(d);
      } catch (e: any) {
        setPatientAlerts({ error: friendlyError(e, "No alerts found for this patient.") });
      }
    };

    return (
      <div className="fade-in">
        <div className="page-hdr">
          <div className="page-hdr-label"><span className="icon"><IconAlert /></span> Management</div>
          <h1 className="page-hdr-title">Medical Alerts</h1>
          <p className="page-hdr-sub">View critical patient alerts and safety notifications generated by the oracle.</p>
        </div>
        {!ca && <div className="alert alert-error">Contract not deployed. Check configuration.</div>}

        <div className="form-card" style={{ marginBottom: 20 }}>
          <div className="form-card-header">
            <div className="icon" style={{ background: "var(--red-glow)", color: "var(--red)" }}><IconAlert /></div>
            <div>
              <strong>Alert Lookup</strong>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Retrieve a specific alert by ID</div>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Alert ID</label>
            <input value={alertLookup} onChange={(e) => setAlertLookup(e.target.value)} placeholder="e.g. ALT-001" />
          </div>
          <button className="btn btn-primary" onClick={lookupAlert} disabled={!alertLookup}>Lookup Alert</button>
          {alertData && <div className="result-detail" style={{ marginTop: 12 }}>{alertData}</div>}
        </div>

        <div className="form-card">
          <div className="form-card-header">
            <div className="icon" style={{ background: "var(--gold-glow)", color: "var(--gold)" }}><IconAlert /></div>
            <div>
              <strong>Patient Alerts</strong>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Get all alerts for a specific patient</div>
            </div>
          </div>
          <PatientSelector value={alertPatientId} onChange={setAlertPatientId} label="Patient" patients={sharedPatients} />
          <button className="btn btn-primary" onClick={lookupPatientAlerts} disabled={!alertPatientId}>Get Alerts</button>
          {patientAlerts && (
            <div style={{ marginTop: 12 }}>
              {Array.isArray(patientAlerts) ? (
                patientAlerts.length === 0 ? (
                  <div className="alert alert-info">No alerts found for this patient.</div>
                ) : (
                  patientAlerts.map((a: any, i: number) => (
                    <div className="result-card" key={i}>
                      <div className="result-header">
                        <span className={`result-badge ${a.severity === "critical" ? "badge-danger" : a.severity === "warning" ? "badge-warn" : "badge-info"}`}>
                          {a.severity ?? "info"}
                        </span>
                        <span className="result-meta">{a.alert_id ?? a.id ?? `Alert ${i + 1}`}</span>
                      </div>
                      <div className="result-body">{a.message ?? a.description ?? JSON.stringify(a)}</div>
                    </div>
                  ))
                )
              ) : (
                <div className="result-detail" style={{ whiteSpace: "pre-wrap" }}>
                  {typeof patientAlerts === "string" ? patientAlerts : JSON.stringify(patientAlerts, null, 2)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ─── Clinical Trials Page ─── */
  function TrialsPage() {
    const [tCondition, setTCondition] = useState("");
    const [tContext, setTContext] = useState("");
    const [result, setResult] = useState<string | null>(null);

    const submit = withTx(
      () => write("match_clinical_trial", [tCondition, tContext, ""]),
      (r) => {
        setResult(r);
        addHistory("Clinical Trial Match", tCondition, r);
      }
    );

    return (
      <div className="fade-in">
        <div className="page-hdr">
          <div className="page-hdr-label"><span className="icon"><IconTrial /></span> Advanced</div>
          <h1 className="page-hdr-title">Clinical Trial Matching</h1>
          <p className="page-hdr-sub">Match patients to relevant clinical trial opportunities based on their condition and profile.</p>
        </div>
        {!ca && <div className="alert alert-error">Contract not deployed. Check configuration.</div>}
        <div className="form-card">
          <div className="form-card-header">
            <div className="icon" style={{ background: "var(--teal-glow)", color: "var(--teal)" }}><IconTrial /></div>
            <div>
              <strong>Trial Matching</strong>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Find clinical trials for a condition</div>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Medical Condition</label>
            <input value={tCondition} onChange={(e) => setTCondition(e.target.value)} placeholder="e.g. Rheumatoid Arthritis" />
          </div>
          <div className="form-group">
            <label className="form-label">Patient Context</label>
            <textarea value={tContext} onChange={(e) => setTContext(e.target.value)} placeholder="Age, weight, current medications, history..." />
          </div>
          <button className="btn btn-primary btn-full" onClick={submit} disabled={tx.status === "pending" || !tCondition}>
            {tx.status === "pending" ? "Matching…" : "Find Clinical Trials"}
          </button>
          <TxPanel tx={tx} />
        </div>
        {result && (
          <div className="result-card" style={{ marginTop: 16 }}>
            <div className="result-header">
              <span className="result-badge badge-info">Result</span>
              <span className="result-meta">Check ID: {result}</span>
            </div>
            <div className="result-body">
              <button className="btn btn-sm" onClick={async () => {
                try { const d = await read("get_check", [result]); setResult(typeof d === "string" ? d : JSON.stringify(d, null, 2)); } catch (e: any) { setResult(friendlyError(e)); }
              }}>Load Full Result</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ─── Insurance Page ─── */
  function InsurancePage() {
    const [iTreatment, setITreatment] = useState("");
    const [iCost, setICost] = useState("");
    const [iProvider, setIProvider] = useState("");
    const [iContext, setIContext] = useState("");
    const [result, setResult] = useState<string | null>(null);

    const submit = withTx(
      () => write("verify_insurance_claim", [iTreatment, parseFloat(iCost), iProvider, iContext, ""]),
      (r) => {
        setResult(r);
        addHistory("Insurance Claim", `${iTreatment} — $${iCost} via ${iProvider}`, r);
      }
    );

    return (
      <div className="fade-in">
        <div className="page-hdr">
          <div className="page-hdr-label"><span className="icon"><IconInsurance /></span> Advanced</div>
          <h1 className="page-hdr-title">Insurance Claim Verification</h1>
          <p className="page-hdr-sub">Verify insurance claims against treatment costs and patient context.</p>
        </div>
        {!ca && <div className="alert alert-error">Contract not deployed. Check configuration.</div>}
        <div className="form-card">
          <div className="form-card-header">
            <div className="icon" style={{ background: "var(--gold-glow)", color: "var(--gold)" }}><IconInsurance /></div>
            <div>
              <strong>Claim Verification</strong>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Verify an insurance claim for fairness</div>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Treatment</label>
            <input value={iTreatment} onChange={(e) => setITreatment(e.target.value)} placeholder="e.g. Knee Replacement Surgery" />
          </div>
          <div className="form-group">
            <label className="form-label">Claimed Cost ($)</label>
            <input type="number" value={iCost} onChange={(e) => setICost(e.target.value)} placeholder="e.g. 45000" />
          </div>
          <div className="form-group">
            <label className="form-label">Insurance Provider</label>
            <input value={iProvider} onChange={(e) => setIProvider(e.target.value)} placeholder="e.g. BlueCross BlueShield" />
          </div>
          <div className="form-group">
            <label className="form-label">Patient Context <span className="form-hint">(optional)</span></label>
            <textarea value={iContext} onChange={(e) => setIContext(e.target.value)} placeholder="Patient details, location, plan type..." />
          </div>
          <button className="btn btn-primary btn-full" onClick={submit} disabled={tx.status === "pending" || !iTreatment || !iCost || !iProvider}>
            {tx.status === "pending" ? "Verifying…" : "Verify Claim"}
          </button>
          <TxPanel tx={tx} />
        </div>
        {result && (
          <div className="result-card" style={{ marginTop: 16 }}>
            <div className="result-header">
              <span className="result-badge badge-info">Result</span>
              <span className="result-meta">Check ID: {result}</span>
            </div>
            <div className="result-body">
              <button className="btn btn-sm" onClick={async () => {
                try { const d = await read("get_check", [result]); setResult(typeof d === "string" ? d : JSON.stringify(d, null, 2)); } catch (e: any) { setResult(friendlyError(e)); }
              }}>Load Full Result</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ─── History Page ─── */
  function HistoryPage() {
    return (
      <div className="fade-in">
        <div className="page-hdr">
          <div className="page-hdr-label"><span className="icon"><IconShield /></span> Advanced</div>
          <h1 className="page-hdr-title">Check History</h1>
          <p className="page-hdr-sub">View all clinical checks performed during this session with full detail access.</p>
        </div>

        {history.length === 0 ? (
          <div className="alert alert-info">
            No checks performed yet. Use the clinical tools to start verifying medications and treatments.
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Inputs</th>
                  <th>Result ID</th>
                  <th>Time</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td>
                      <span className={`badge ${
                        h.type.includes("Interaction") ? "badge-info" :
                        h.type.includes("Dosage") ? "badge-safe" :
                        h.type.includes("Allergy") ? "badge-danger" :
                        h.type.includes("Treatment") ? "badge-warn" :
                        "badge-pending"
                      }`}>{h.type}</span>
                    </td>
                    <td className="mono">{h.inputs}</td>
                    <td className="mono">{h.result}</td>
                    <td className="mono">{new Date(h.timestamp).toLocaleTimeString()}</td>
                    <td>
                      <button className="btn btn-sm" onClick={async () => {
                        try {
                          const fn = h.type.includes("Patient") ? "get_patient" :
                                     h.type.includes("Prescription") ? "get_prescription" : "get_check";
                          try {
                          let d = await read(fn, [h.result]);
                          if (typeof d === "string") { try { d = JSON.parse(d); } catch { d = { result: { description: d } }; } }
                          setHistoryDetail(d);
                        } catch (err: any) {
                          setHistoryDetail({ result: { description: friendlyError(err) }, type: h.type, query: {} });
                        }
                        } catch (e: any) {
                          setHistoryDetail(friendlyError(e));
                        }
                      }}>View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {historyDetail && <ResultDetailCard data={historyDetail} onClose={() => setHistoryDetail(null)} />}
      </div>
    );
  }

  /* ─── Page Router ─── */
  function renderPage() {
    switch (page) {
      case "dashboard": return <DashboardPage />;
      case "interaction": return <InteractionPage />;
      case "dosage": return <DosagePage />;
      case "allergy": return <AllergyPage />;
      case "treatment": return <TreatmentPage />;
      case "patients": return <PatientsPage />;
      case "prescription": return <PrescriptionPage />;
      case "drugs": return <DrugsPage />;
      case "alerts": return <AlertsPage />;
      case "trials": return <TrialsPage />;
      case "insurance": return <InsurancePage />;
      case "history": return <HistoryPage />;
    }
  }

  /* ─── Wallet button ─── */
  function WalletButton() {
    const { state, connect, disconnect, switchToStudioNet } = wallet;
    if (state.status === "no-wallet") {
      return <span className="network-pill" style={{ color: "var(--red)", cursor: "default" }}>No Wallet</span>;
    }
    if (state.status === "disconnected") {
      return <button className="btn btn-primary btn-sm" onClick={connect}>Connect Wallet</button>;
    }
    if (state.status === "wrong-chain") {
      return <button className="btn btn-sm" style={{ borderColor: "var(--gold)", color: "var(--gold)" }} onClick={switchToStudioNet}>Switch to StudioNet</button>;
    }
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className="network-pill">
          <span className="net-dot" /> StudioNet
        </span>
        <button className="btn btn-sm" onClick={disconnect}>
          {state.address.slice(0, 6)}…{state.address.slice(-4)}
        </button>
      </div>
    );
  }

  /* ─── Render ─── */
  return (
    <>
      {/* Top Nav */}
      <nav className="topnav">
        <div className="topnav-brand">
          <img src="/favicon.svg" alt="MedGuard" />
          MedGuard
        </div>
        <div className="topnav-links">
          {(["dashboard", "interaction", "dosage", "allergy", "treatment", "patients", "prescription", "drugs", "alerts", "trials", "insurance", "history"] as Page[]).map((p) => (
            <a
              key={p}
              className={`topnav-link ${page === p ? "active" : ""}`}
              onClick={() => { setPage(p); setTx({ status: "idle" }); }}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </a>
          ))}
        </div>
        <div className="topnav-right">
          <WalletButton />
        </div>
      </nav>

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-profile">
          <div className="sidebar-avatar">
            <img src="/favicon.svg" alt="M" />
          </div>
          <div>
            <div className="sidebar-name">MedGuard</div>
            <div className="sidebar-id">Clinical Decision Support</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {navSections.map((sec) => (
            <div key={sec.label}>
              <div className="sidebar-section">{sec.label}</div>
              {sec.items.map((item) => (
                <a
                  key={item.page}
                  className={`sidebar-link ${page === item.page ? "active" : ""}`}
                  onClick={() => { setPage(item.page); setTx({ status: "idle" }); }}
                >
                  <span className="icon">{item.icon}</span>
                  {item.name}
                </a>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          {ca && (
            <a
              className="sidebar-link"
              href={explorerAddress(ca)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 10 }}
            >
              <span className="icon"><IconShield /></span>
              {ca.slice(0, 8)}…{ca.slice(-6)}
            </a>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="main">
        {/* Workflow animation — rendered here to survive DashboardPage unmounts */}
        {page === "dashboard" && (
          <>
            <div className="section-title">Clinical Workflow</div>
            <WorkflowDoctor activeStep={wfStep} setActiveStep={setWfStep} playing={wfPlaying} setPlaying={setWfPlaying} />
          </>
        )}
        {renderPage()}
      </main>

      {/* Footer */}
      <footer className="footer">
        <span>MedGuard · Clinical Decision Support</span>
        <div className="footer-links">
          <a href="https://explorer-studio.genlayer.com" target="_blank" rel="noopener noreferrer">Explorer</a>
          <a href="https://studio.genlayer.com" target="_blank" rel="noopener noreferrer">GenLayer</a>
          {ca && <a href={explorerAddress(ca)} target="_blank" rel="noopener noreferrer">Contract</a>}
        </div>
      </footer>
      <PixelMCDoc currentPage={page} />
    </>
  );
}
