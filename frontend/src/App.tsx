import { useEffect, useState } from "react";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { explorerAddress, explorerTx, getContractAddress, RPC_URL } from "./config";
import { useReadClient, useWriteClient } from "./useGenLayer";
import { useWallet } from "./useWallet";

function mkClient(addr: `0x${string}`) {
  return createClient({ chain: studionet, account: addr, endpoint: RPC_URL, provider: window.ethereum as any });
}

const GH = "https://github.com/Jinchainne/medguard";
function short(a: string) { return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : ""; }

type CheckResult = {
  id: string;
  type: string;
  query: Record<string, unknown>;
  result: Record<string, unknown>;
  caller: string;
};

type Tx = { k: "idle" } | { k: "sign"; label: string } | { k: "wait"; label: string; hash: string } | { k: "ok"; label: string; hash: string } | { k: "fail"; label: string; err: string };

const TIMEOUT_MS = 15000;
function withTimeout<T>(p: Promise<T>, ms = TIMEOUT_MS): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error("RPC timeout")), ms))]);
}
async function retryRead<T>(fn: () => Promise<T>, maxRetries = 3, delayMs = 3000): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try { return await withTimeout(fn()); }
    catch (err) {
      const msg = (err as Error).message || "";
      if ((msg.includes("rate limit") || msg.includes("timeout") || msg.includes("Failed to fetch")) && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, delayMs));
        delayMs = Math.min(delayMs * 1.5, 15000);
      } else { throw err; }
    }
  }
  throw new Error("unreachable");
}

/* ── Inline SVG Medical Icons ── */
function IconDrugInteraction() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
      <path d="M10 6.5h4M6.5 10v4M14 17.5h-4M17.5 14v-4"/>
      <path d="M10.5 10.5l3 3" strokeDasharray="2 2"/>
    </svg>
  );
}
function IconDosage() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v4M8 6h8l1 4H7l1-4z"/><rect x="7" y="10" width="10" height="12" rx="2"/>
      <path d="M10 14h4M12 14v4"/><circle cx="12" cy="18" r="0.5" fill="currentColor"/>
    </svg>
  );
}
function IconAllergy() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
      <path d="M8 9l2 2-2 2M16 9l-2 2 2 2M10 15h4"/>
      <circle cx="12" cy="12" r="9" strokeDasharray="3 3" opacity="0.3"/>
    </svg>
  );
}
function IconTreatment() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L12 6M12 18L12 22M2 12L6 12M18 12L22 12"/>
      <rect x="7" y="7" width="10" height="10" rx="5"/>
      <path d="M10 12h4M12 10v4"/>
    </svg>
  );
}
function IconShield() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <path d="M9 12l2 2 4-4"/>
    </svg>
  );
}
function ECGLine() {
  return (
    <svg className="ecg-line" width="100%" height="40" viewBox="0 0 800 40" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0, left: 0, opacity: 0.15 }}>
      <path d="M0,20 L200,20 L220,20 L230,5 L240,35 L250,10 L260,30 L270,20 L400,20 L420,20 L430,5 L440,35 L450,10 L460,30 L470,20 L600,20 L620,20 L630,5 L640,35 L650,10 L660,30 L670,20 L800,20"
        fill="none" stroke="#00dbe9" strokeWidth="1.5">
        <animate attributeName="stroke-dasharray" values="0,1600;1600,0" dur="4s" repeatCount="indefinite"/>
        <animate attributeName="stroke-dashoffset" values="1600;0" dur="4s" repeatCount="indefinite"/>
      </path>
    </svg>
  );
}
function DNACurve({ side }: { side: "left" | "right" }) {
  return (
    <svg width="60" height="200" viewBox="0 0 60 200" style={{ position: 'absolute', [side]: -20, top: '20%', opacity: 0.04 }}>
      {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
        <g key={i}>
          <ellipse cx="15" cy={i * 25 + 10} rx="12" ry="4" fill="none" stroke="#00dbe9" strokeWidth="1" transform={`rotate(${i % 2 ? 30 : -30}, 15, ${i * 25 + 10})`}/>
          <ellipse cx="45" cy={i * 25 + 10} rx="12" ry="4" fill="none" stroke="#00dbe9" strokeWidth="1" transform={`rotate(${i % 2 ? -30 : 30}, 45, ${i * 25 + 10})`}/>
          <line x1="20" y1={i * 25 + 10} x2="40" y2={i * 25 + 10} stroke="#00dbe9" strokeWidth="0.5" opacity="0.5"/>
        </g>
      ))}
    </svg>
  );
}

export function App() {
  const ca = getContractAddress();
  const { state: w, connect, disconnect, switchToStudioNet } = useWallet();
  const rd = useReadClient();
  const wAddr = w.status === "connected" ? w.address : null;
  const wr = useWriteClient(wAddr);

  const [page, setPage] = useState<"dashboard" | "interaction" | "dosage" | "allergy" | "treatment" | "history">("dashboard");
  const [tx, setTx] = useState<Tx>({ k: "idle" });
  const [tick, setTick] = useState(0);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [stats, setStats] = useState<{ total_checks: number; trusted_sources_count: number } | null>(null);
  const [history, setHistory] = useState<CheckResult[]>([]);
  const [lastResult, setLastResult] = useState<CheckResult | null>(null);

  // Form states
  const [drugA, setDrugA] = useState("");
  const [drugB, setDrugB] = useState("");
  const [drugContext, setDrugContext] = useState("");
  const [dosageDrug, setDosageDrug] = useState("");
  const [dosageMg, setDosageMg] = useState("");
  const [dosageWeight, setDosageWeight] = useState("");
  const [dosageAge, setDosageAge] = useState("");
  const [allergyMeds, setAllergyMeds] = useState("");
  const [allergyList, setAllergyList] = useState("");
  const [treatCondition, setTreatCondition] = useState("");
  const [treatPlan, setTreatPlan] = useState("");

  useEffect(() => {
    if (!ca) return;
    let c = false;
    (async () => {
      setLoadErr(null);
      try {
        const s = await retryRead(() => rd.readContract({ address: ca, functionName: "get_stats", args: [] })) as { total_checks: number; trusted_sources_count: number };
        if (!c) setStats(s);
      } catch (err) { if (!c) setLoadErr((err as Error).message); }
    })();
    return () => { c = true; };
  }, [ca, rd, tick]);

  useEffect(() => {
    if (!ca || !stats || stats.total_checks === 0) return;
    let c = false;
    (async () => {
      try {
        const results: CheckResult[] = [];
        const maxId = stats.total_checks;
        const start = Math.max(1, maxId - 9);
        for (let i = maxId; i >= start; i--) {
          try {
            const raw = await retryRead(() => rd.readContract({ address: ca, functionName: "get_check", args: [String(i)] })) as string;
            const parsed = JSON.parse(raw);
            if (!c) results.push(parsed);
          } catch { /* skip */ }
        }
        if (!c) { setHistory(results); if (results.length > 0) setLastResult(results[0]); }
      } catch { /* silent */ }
    })();
    return () => { c = true; };
  }, [ca, rd, stats, tick]);

  async function withTx(label: string, fn: () => Promise<string>) {
    setTx({ k: "sign", label });
    let hash: string | undefined;
    try {
      hash = await runRetry(fn, () => setTx({ k: "wait", label, hash: "" }));
      setTx({ k: "wait", label, hash });
      await rd.waitForTransactionReceipt({ hash: hash as any, status: "ACCEPTED" as any, retries: 240, interval: 4000 });
      setTx({ k: "ok", label, hash });
      setTick(n => n + 1);
    } catch (err) { setTx({ k: "fail", label, err: humanErr((err as Error).message) }); }
  }

  async function ensureReady() {
    if (w.status === "no-wallet") { setTx({ k: "fail", label: "Connect", err: "Install MetaMask or OKX Wallet." }); return null; }
    if (w.status === "disconnected") { try { await connect(); } catch { return null; } }
    if (w.status === "wrong-chain") { try { await switchToStudioNet(); } catch { return null; } }
    const eth = window.ethereum; if (!eth) return null;
    const accs = await eth.request({ method: "eth_accounts" }) as string[];
    if (!accs?.length) return null;
    return wr ?? mkClient(accs[0] as `0x${string}`);
  }

  async function doDrugInteraction() {
    if (!ca) { setTx({ k: "fail", label: "Drug Interaction Check", err: "Contract not deployed. Deploy the intelligent contract first." }); return; }
    if (!drugA.trim() || !drugB.trim()) return;
    const cl = await ensureReady(); if (!cl) return;
    await withTx("Drug Interaction Check", () => cl.writeContract({ address: ca, functionName: "check_drug_interaction", args: [drugA.trim(), drugB.trim(), drugContext.trim(), ""], value: 0n }));
    setDrugA(""); setDrugB(""); setDrugContext("");
  }
  async function doDosageCheck() {
    if (!ca) { setTx({ k: "fail", label: "Dosage Verification", err: "Contract not deployed. Deploy the intelligent contract first." }); return; }
    if (!dosageDrug.trim() || !dosageMg) return;
    const cl = await ensureReady(); if (!cl) return;
    await withTx("Dosage Verification", () => cl.writeContract({ address: ca, functionName: "verify_dosage", args: [dosageDrug.trim(), parseFloat(dosageMg), parseFloat(dosageWeight) || 0, parseInt(dosageAge) || 0, ""], value: 0n }));
    setDosageDrug(""); setDosageMg(""); setDosageWeight(""); setDosageAge("");
  }
  async function doAllergyCheck() {
    if (!ca) { setTx({ k: "fail", label: "Allergy Cross-Check", err: "Contract not deployed. Deploy the intelligent contract first." }); return; }
    if (!allergyMeds.trim() || !allergyList.trim()) return;
    const cl = await ensureReady(); if (!cl) return;
    await withTx("Allergy Cross-Check", () => cl.writeContract({ address: ca, functionName: "check_allergy_risk", args: [allergyMeds.trim(), allergyList.trim(), "", ""], value: 0n }));
    setAllergyMeds(""); setAllergyList("");
  }
  async function doTreatmentValidation() {
    if (!ca) { setTx({ k: "fail", label: "Treatment Validation", err: "Contract not deployed. Deploy the intelligent contract first." }); return; }
    if (!treatCondition.trim() || !treatPlan.trim()) return;
    const cl = await ensureReady(); if (!cl) return;
    await withTx("Treatment Validation", () => cl.writeContract({ address: ca, functionName: "validate_treatment", args: [treatCondition.trim(), treatPlan.trim(), "", ""], value: 0n }));
    setTreatCondition(""); setTreatPlan("");
  }

  const busy = tx.k === "sign" || tx.k === "wait";

  function severityColor(s: string) {
    const upper = s.toUpperCase();
    if (["NONE", "NO_RISK", "SAFE", "APPROPRIATE"].includes(upper)) return "var(--success)";
    if (["MINOR", "MILD_RISK", "SUBTHERAPEUTIC", "PARTIALLY_APPROPRIATE"].includes(upper)) return "var(--warn)";
    if (["MODERATE", "MODERATE_RISK", "ABOVE_THERAPEUTIC"].includes(upper)) return "#ff9800";
    if (["MAJOR", "SEVERE_RISK"].includes(upper)) return "var(--error)";
    if (["CONTRAINDICATED", "ANAPHYLAXIS_RISK", "DANGEROUS", "INAPPROPRIATE"].includes(upper)) return "#ff1744";
    return "var(--text-muted)";
  }
  function severityBadge(s: string) {
    const upper = s.toUpperCase();
    if (["NONE", "NO_RISK", "SAFE", "APPROPRIATE"].includes(upper)) return "badge-safe";
    if (["MINOR", "MILD_RISK", "SUBTHERAPEUTIC"].includes(upper)) return "badge-warn";
    return "badge-danger";
  }
  function checkTypeLabel(t: string) {
    const map: Record<string, string> = { drug_interaction: "Drug Interaction", dosage_check: "Dosage Check", allergy_check: "Allergy Check", treatment_validation: "Treatment Validation" };
    return map[t] ?? t;
  }
  function resultValue(r: Record<string, unknown>) {
    return String(r?.severity || r?.safety || r?.risk_level || r?.verdict || "—");
  }

  return (
    <>
      <nav className="topnav">
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div className="topnav-brand">
            <img src="/logo.svg" alt="MedGuard" />
            <span>Med<span style={{ color: "var(--cyan)" }}>Guard</span></span>
          </div>
          <div className="topnav-links">
            {(["dashboard", "interaction", "dosage", "allergy", "treatment", "history"] as const).map(p => (
              <a key={p} className={`topnav-link ${page === p ? "active" : ""}`} onClick={() => setPage(p)}>
                {p === "dashboard" ? "Dashboard" : p === "interaction" ? "Interactions" : p === "dosage" ? "Dosage" : p === "allergy" ? "Allergy" : p === "treatment" ? "Treatment" : "History"}
              </a>
            ))}
          </div>
        </div>
        <div className="topnav-right">
          <div className="network-pill">
            <span className="net-dot" />
            <span>{w.status === "connected" || w.status === "wrong-chain" ? `StudioNet · ${short(w.address)}` : "StudioNet"}</span>
          </div>
          <button className="btn btn-cyan btn-sm" onClick={async () => {
              if (w.status === "connected") disconnect();
              else if (w.status === "wrong-chain") { try { await switchToStudioNet(); } catch {} }
              else { try { await connect(); } catch {} }
            }}>
            {w.status === "connected" ? short(w.address) : w.status === "wrong-chain" ? "Wrong Chain" : "Connect Wallet"}
          </button>
        </div>
      </nav>

      <aside className="sidebar">
        <div className="sidebar-profile">
          <div className="sidebar-avatar"><img src="/logo.svg" alt="" /></div>
          <div>
            <div className="sidebar-name">MedGuard</div>
            <div className="sidebar-id">StudioNet · {ca ? short(ca) : "Not deployed"}</div>
            {(w.status === "connected" || w.status === "wrong-chain") && (
              <div className="sidebar-id" style={{ color: 'var(--cyan)', marginTop: 2 }}>Wallet: {short(w.address)}</div>
            )}
          </div>
        </div>
        <nav className="sidebar-nav">
          <a className={`sidebar-link ${page === "dashboard" ? "active" : ""}`} onClick={() => setPage("dashboard")}>
            <span className="icon material-symbols-outlined">dashboard</span> Dashboard
          </a>
          <a className={`sidebar-link ${page === "interaction" ? "active" : ""}`} onClick={() => setPage("interaction")}>
            <span className="icon"><IconDrugInteraction /></span> Drug Interaction
          </a>
          <a className={`sidebar-link ${page === "dosage" ? "active" : ""}`} onClick={() => setPage("dosage")}>
            <span className="icon"><IconDosage /></span> Dosage Check
          </a>
          <a className={`sidebar-link ${page === "allergy" ? "active" : ""}`} onClick={() => setPage("allergy")}>
            <span className="icon"><IconAllergy /></span> Allergy Check
          </a>
          <a className={`sidebar-link ${page === "treatment" ? "active" : ""}`} onClick={() => setPage("treatment")}>
            <span className="icon"><IconTreatment /></span> Treatment
          </a>
          <a className={`sidebar-link ${page === "history" ? "active" : ""}`} onClick={() => setPage("history")}>
            <span className="icon material-symbols-outlined">history</span> History
          </a>
        </nav>
        <div className="sidebar-bottom">
          <a className="sidebar-link" href={ca ? explorerAddress(ca) : "#"} target="_blank" rel="noreferrer">
            <span className="icon material-symbols-outlined" style={{ fontSize: 18 }}>open_in_new</span> Explorer
          </a>
          <a className="sidebar-link" href={GH} target="_blank" rel="noreferrer">
            <span className="icon material-symbols-outlined" style={{ fontSize: 18 }}>code</span> GitHub
          </a>
        </div>
      </aside>

      <main className="main" style={{ position: 'relative' }}>
        <DNACurve side="left" /><DNACurve side="right" />
        {!ca && (
          <div className="alert alert-info" style={{ marginBottom: 20 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>info</span>
            <span>Contract not deployed yet. Connect wallet and deploy the intelligent contract to enable on-chain clinical checks.</span>
          </div>
        )}
        {loadErr && <div className="alert alert-error"><span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span> {loadErr}</div>}

        {/* ═══ DASHBOARD ═══ */}
        {page === "dashboard" && (
          <div className="fade-in">
            <div className="hero" style={{ position: 'relative' }}>
              <ECGLine />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div className="hero-label">Clinical Decision Support Oracle</div>
                <h1 className="hero-title">On-Chain Healthcare<br/>Safety Verification</h1>
                <p className="hero-sub">
                  Drug interactions, dosage verification, allergy screening, and treatment protocol validation — powered by AI consensus on GenLayer.
                </p>
                <div className="hero-badge">
                  <span className="dot" /> Live on StudioNet · Chain ID 61999
                </div>
              </div>
            </div>

            <div className="stat-row">
              <div className="stat-box">
                <p className="stat-box-label"><IconShield /> Total Checks</p>
                <p className="stat-box-value cyan">{stats?.total_checks ?? 0}</p>
              </div>
              <div className="stat-box">
                <p className="stat-box-label">Trusted Sources</p>
                <p className="stat-box-value gold">{stats?.trusted_sources_count ?? 0}</p>
              </div>
              <div className="stat-box">
                <p className="stat-box-label">Contract</p>
                <p className="stat-box-value text">{ca ? short(ca) : "Not deployed"}</p>
              </div>
              <div className="stat-box">
                <p className="stat-box-label">Network</p>
                <p className="stat-box-value text">StudioNet 61999</p>
              </div>
            </div>

            <div className="section-title">Clinical Tools</div>
            <div className="feature-grid">
              <div className="feature-card" onClick={() => setPage("interaction")} style={!ca ? { opacity: 0.6 } : undefined}>
                <div className="feature-icon cyan"><IconDrugInteraction /></div>
                <h3>Drug Interaction {!ca && <span style={{fontSize:11, color:'var(--text-muted)', fontWeight:400}}>(deploy required)</span>}</h3>
                <p>Screen two drugs for adverse interactions before co-administration. 5 severity levels from minor to contraindicated.</p>
                <span className="material-symbols-outlined arrow">arrow_forward</span>
              </div>
              <div className="feature-card" onClick={() => setPage("dosage")}>
                <div className="feature-icon gold"><IconDosage /></div>
                <h3>Dosage Verification</h3>
                <p>Validate prescribed doses against therapeutic guidelines with patient-specific adjustments for weight and age.</p>
                <span className="material-symbols-outlined arrow">arrow_forward</span>
              </div>
              <div className="feature-card" onClick={() => setPage("allergy")}>
                <div className="feature-icon orange"><IconAllergy /></div>
                <h3>Allergy Cross-Check</h3>
                <p>Screen medication lists against known patient allergies for cross-reactivity and anaphylaxis risk.</p>
                <span className="material-symbols-outlined arrow">arrow_forward</span>
              </div>
              <div className="feature-card" onClick={() => setPage("treatment")}>
                <div className="feature-icon green"><IconTreatment /></div>
                <h3>Treatment Validation</h3>
                <p>Validate proposed treatment plans against clinical guidelines and evidence-based medicine.</p>
                <span className="material-symbols-outlined arrow">arrow_forward</span>
              </div>
            </div>

            {history.length > 0 && (
              <>
                <div className="section-title">Recent Clinical Checks</div>
                {history.slice(0, 5).map(h => (
                  <div className="result-card" key={h.id} onClick={() => { setLastResult(h); setPage("history"); }}>
                    <div className="result-header">
                      <span className={`result-badge ${severityBadge(resultValue(h.result))}`} style={{ borderColor: severityColor(resultValue(h.result)), color: severityColor(resultValue(h.result)) }}>
                        {resultValue(h.result)}
                      </span>
                      <span className="result-meta">#{h.id} · {checkTypeLabel(h.type)}</span>
                    </div>
                    <div className="result-body">{h.result?.description ? String(h.result.description).slice(0, 160) : "No description available"}</div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ═══ DRUG INTERACTION ═══ */}
        {page === "interaction" && (
          <div className="fade-in">
            <div className="page-hdr">
              <div className="page-hdr-label"><IconDrugInteraction /> Clinical Pharmacology</div>
              <h1 className="page-hdr-title">Drug Interaction Check</h1>
              <p className="page-hdr-sub">Screen two drugs for adverse interactions using on-chain clinical sources and AI consensus.</p>
            </div>
            <div className="form-card">
              <div className="form-card-header">
                <div className="icon cyan" style={{ background: 'rgba(0,219,233,0.1)', color: 'var(--cyan)' }}><IconDrugInteraction /></div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>Interaction Parameters</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Enter two drugs to check for interactions</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Drug A</label>
                  <input value={drugA} onChange={e => setDrugA(e.target.value)} placeholder="e.g. Warfarin" disabled={busy} />
                  <span className="form-hint">First medication</span>
                </div>
                <div className="form-group">
                  <label className="form-label">Drug B</label>
                  <input value={drugB} onChange={e => setDrugB(e.target.value)} placeholder="e.g. Aspirin" disabled={busy} />
                  <span className="form-hint">Second medication</span>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Patient Context <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                <textarea value={drugContext} onChange={e => setDrugContext(e.target.value)} placeholder="Age, weight, existing conditions, other medications..." disabled={busy} />
              </div>
              <button className="btn btn-cyan btn-full" onClick={doDrugInteraction} disabled={busy || !drugA.trim() || !drugB.trim()}>
                {busy ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Processing…</> : "Check Interaction"}
              </button>
              <TxPanel tx={tx} />
            </div>
          </div>
        )}

        {/* ═══ DOSAGE ═══ */}
        {page === "dosage" && (
          <div className="fade-in">
            <div className="page-hdr">
              <div className="page-hdr-label"><IconDosage /> Pharmacy Verification</div>
              <h1 className="page-hdr-title">Dosage Verification</h1>
              <p className="page-hdr-sub">Validate prescribed doses against therapeutic guidelines with patient-specific adjustments.</p>
            </div>
            <div className="form-card">
              <div className="form-card-header">
                <div className="icon" style={{ background: 'rgba(255,213,79,0.1)', color: 'var(--gold)' }}><IconDosage /></div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>Dosage Parameters</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Enter medication and patient details</div>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Medication Name</label>
                <input value={dosageDrug} onChange={e => setDosageDrug(e.target.value)} placeholder="e.g. Metformin" disabled={busy} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Dose (mg)</label>
                  <input type="number" value={dosageMg} onChange={e => setDosageMg(e.target.value)} placeholder="500" disabled={busy} />
                </div>
                <div className="form-group">
                  <label className="form-label">Weight (kg)</label>
                  <input type="number" value={dosageWeight} onChange={e => setDosageWeight(e.target.value)} placeholder="70" disabled={busy} />
                </div>
                <div className="form-group">
                  <label className="form-label">Age (years)</label>
                  <input type="number" value={dosageAge} onChange={e => setDosageAge(e.target.value)} placeholder="45" disabled={busy} />
                </div>
              </div>
              <button className="btn btn-cyan btn-full" onClick={doDosageCheck} disabled={busy || !dosageDrug.trim() || !dosageMg}>
                {busy ? "Processing…" : "Verify Dosage"}
              </button>
              <TxPanel tx={tx} />
            </div>
          </div>
        )}

        {/* ═══ ALLERGY ═══ */}
        {page === "allergy" && (
          <div className="fade-in">
            <div className="page-hdr">
              <div className="page-hdr-label"><IconAllergy /> Patient Safety</div>
              <h1 className="page-hdr-title">Allergy Cross-Check</h1>
              <p className="page-hdr-sub">Screen medications against known patient allergies for cross-reactivity risks.</p>
            </div>
            <div className="form-card">
              <div className="form-card-header">
                <div className="icon" style={{ background: 'rgba(255,152,0,0.1)', color: '#ff9800' }}><IconAllergy /></div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>Allergy Parameters</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Enter medications and known allergies</div>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Medications <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(comma-separated)</span></label>
                <textarea value={allergyMeds} onChange={e => setAllergyMeds(e.target.value)} placeholder="Amoxicillin, Ibuprofen, Metformin" disabled={busy} />
              </div>
              <div className="form-group">
                <label className="form-label">Known Allergies <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(comma-separated)</span></label>
                <textarea value={allergyList} onChange={e => setAllergyList(e.target.value)} placeholder="Penicillin, Sulfa drugs, NSAIDs" disabled={busy} />
              </div>
              <button className="btn btn-cyan btn-full" onClick={doAllergyCheck} disabled={busy || !allergyMeds.trim() || !allergyList.trim()}>
                {busy ? "Processing…" : "Check Allergy Risk"}
              </button>
              <TxPanel tx={tx} />
            </div>
          </div>
        )}

        {/* ═══ TREATMENT ═══ */}
        {page === "treatment" && (
          <div className="fade-in">
            <div className="page-hdr">
              <div className="page-hdr-label"><IconTreatment /> Protocol Validation</div>
              <h1 className="page-hdr-title">Treatment Validation</h1>
              <p className="page-hdr-sub">Validate proposed treatments against clinical guidelines and evidence-based medicine.</p>
            </div>
            <div className="form-card">
              <div className="form-card-header">
                <div className="icon" style={{ background: 'rgba(105,240,174,0.1)', color: 'var(--success)' }}><IconTreatment /></div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>Treatment Parameters</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Enter condition and proposed treatment</div>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Medical Condition</label>
                <input value={treatCondition} onChange={e => setTreatCondition(e.target.value)} placeholder="e.g. Type 2 Diabetes Mellitus" disabled={busy} />
              </div>
              <div className="form-group">
                <label className="form-label">Proposed Treatment</label>
                <textarea value={treatPlan} onChange={e => setTreatPlan(e.target.value)} placeholder="e.g. Metformin 500mg twice daily, lifestyle modifications" disabled={busy} />
              </div>
              <button className="btn btn-cyan btn-full" onClick={doTreatmentValidation} disabled={busy || !treatCondition.trim() || !treatPlan.trim()}>
                {busy ? "Processing…" : "Validate Treatment"}
              </button>
              <TxPanel tx={tx} />
            </div>
          </div>
        )}

        {/* ═══ HISTORY ═══ */}
        {page === "history" && (
          <div className="fade-in">
            <div className="page-hdr">
              <div className="page-hdr-label"><span className="material-symbols-outlined" style={{ fontSize: 16 }}>history</span> Audit Trail</div>
              <h1 className="page-hdr-title">Check History</h1>
            </div>

            {lastResult && (
              <div className="result-card" style={{ marginBottom: 24, borderColor: severityColor(resultValue(lastResult.result)) }}>
                <div className="result-header">
                  <span className={`result-badge ${severityBadge(resultValue(lastResult.result))}`} style={{ borderColor: severityColor(resultValue(lastResult.result)), color: severityColor(resultValue(lastResult.result)) }}>
                    {resultValue(lastResult.result)}
                  </span>
                  <span className="result-meta">#{lastResult.id} · {checkTypeLabel(lastResult.type)} · Confidence: {String(lastResult.result?.confidence || "—")}</span>
                </div>
                <div className="result-body">{lastResult.result?.description ? String(lastResult.result.description) : "No description"}</div>
                {String(lastResult.result?.recommendation || "") && (
                  <div className="result-detail" style={{ marginTop: 12 }}>
                    <strong style={{ color: 'var(--cyan)' }}>Recommendation:</strong> {String(lastResult.result.recommendation)}
                  </div>
                )}
              </div>
            )}

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th><th>Type</th><th>Result</th><th>Confidence</th><th>Caller</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(h => {
                    const val = resultValue(h.result);
                    return (
                      <tr key={h.id} onClick={() => setLastResult(h)} style={{ cursor: 'pointer' }}>
                        <td className="mono">#{h.id}</td>
                        <td><span className="badge badge-pending">{checkTypeLabel(h.type)}</span></td>
                        <td><span style={{ color: severityColor(val), fontWeight: 700, fontFamily: "var(--mono)", fontSize: 12 }}>{val}</span></td>
                        <td className="mono">{String(h.result?.confidence || "—")}</td>
                        <td className="mono" style={{ color: "var(--cyan)" }}>{short(h.caller)}</td>
                      </tr>
                    );
                  })}
                  {history.length === 0 && (
                    <tr><td colSpan={5} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 40, display: 'block', margin: '0 auto 8px', opacity: 0.3 }}>medical_information</span>
                      No clinical checks performed yet
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <footer className="footer">
        <span>© 2026 MedGuard · Clinical Decision Support · Built on GenLayer</span>
        <div className="footer-links">
          <a href={GH} target="_blank" rel="noreferrer">GitHub</a>
          <a href="https://explorer-studio.genlayer.com" target="_blank" rel="noreferrer">Explorer</a>
          <a href="https://genlayer.com" target="_blank" rel="noreferrer">GenLayer</a>
        </div>
      </footer>
    </>
  );
}

async function runRetry(fn: () => Promise<string>, onRetry: () => void) {
  for (let i = 1; i <= 3; i++) {
    try { return await fn(); } catch (err) {
      const m = ((err as Error).message ?? "").toLowerCase();
      if (m.includes("user rejected") || m.includes("user denied") || i === 3) throw err;
      if (m.includes("reverted") || m.includes("out of gas")) { onRetry(); await new Promise(r => setTimeout(r, 4000)); continue; }
      throw err;
    }
  }
  throw new Error("unreachable");
}
function humanErr(m: string) {
  const l = m.toLowerCase();
  if (l.includes("user rejected") || l.includes("user denied")) return "You cancelled the signature.";
  if (l.includes("insufficient funds")) return "Not enough GEN to cover gas.";
  if (l.includes("reverted")) return "Transaction reverted. Try again.";
  if (l.includes("timeout")) return "RPC timeout. Try again.";
  return m;
}
function TxPanel({ tx }: { tx: Tx }) {
  if (tx.k === "idle") return null;
  const label = tx.k === "sign" ? "Awaiting signature" : tx.k === "wait" ? "Pending" : tx.k === "ok" ? "Accepted" : "Failed";
  return (
    <div className="tx-panel">
      <div className="tx-status">
        {(tx.k === "sign" || tx.k === "wait") && <span className="spinner" />}
        <span>{tx.label} · {label}</span>
      </div>
      {"hash" in tx && tx.hash && <a className="tx-hash" href={explorerTx(tx.hash)} target="_blank" rel="noreferrer">{tx.hash}</a>}
      {tx.k === "fail" && <div className="tx-error">{tx.err}</div>}
    </div>
  );
}
