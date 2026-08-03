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
function ts() { return new Date().toISOString().replace("T", " ").slice(0, 19); }

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
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error("RPC timeout — StudioNet may be busy")), ms))]);
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

  // Load stats
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

  // Load recent history
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
          } catch { /* skip missing */ }
        }
        if (!c) setHistory(results);
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
    const client = wr ?? mkClient(accs[0] as `0x${string}`);
    return client;
  }

  async function doDrugInteraction() {
    if (!ca || !drugA.trim() || !drugB.trim()) return;
    const cl = await ensureReady(); if (!cl) return;
    await withTx("Drug Interaction Check", () => cl.writeContract({
      address: ca, functionName: "check_drug_interaction",
      args: [drugA.trim(), drugB.trim(), drugContext.trim(), ""],
      value: 0n,
    }));
    setDrugA(""); setDrugB(""); setDrugContext("");
  }

  async function doDosageCheck() {
    if (!ca || !dosageDrug.trim() || !dosageMg) return;
    const cl = await ensureReady(); if (!cl) return;
    await withTx("Dosage Verification", () => cl.writeContract({
      address: ca, functionName: "verify_dosage",
      args: [dosageDrug.trim(), parseFloat(dosageMg), parseFloat(dosageWeight) || 0, parseInt(dosageAge) || 0, ""],
      value: 0n,
    }));
    setDosageDrug(""); setDosageMg(""); setDosageWeight(""); setDosageAge("");
  }

  async function doAllergyCheck() {
    if (!ca || !allergyMeds.trim() || !allergyList.trim()) return;
    const cl = await ensureReady(); if (!cl) return;
    await withTx("Allergy Cross-Check", () => cl.writeContract({
      address: ca, functionName: "check_allergy_risk",
      args: [allergyMeds.trim(), allergyList.trim(), "", ""],
      value: 0n,
    }));
    setAllergyMeds(""); setAllergyList("");
  }

  async function doTreatmentValidation() {
    if (!ca || !treatCondition.trim() || !treatPlan.trim()) return;
    const cl = await ensureReady(); if (!cl) return;
    await withTx("Treatment Validation", () => cl.writeContract({
      address: ca, functionName: "validate_treatment",
      args: [treatCondition.trim(), treatPlan.trim(), "", ""],
      value: 0n,
    }));
    setTreatCondition(""); setTreatPlan("");
  }

  const busy = tx.k === "sign" || tx.k === "wait";

  function severityColor(s: string) {
    if (s === "NONE" || s === "NO_RISK" || s === "SAFE" || s === "APPROPRIATE") return "var(--cyan)";
    if (s === "MINOR" || s === "MILD_RISK" || s === "SUBTHERAPEUTIC" || s === "PARTIALLY_APPROPRIATE") return "#ffd54f";
    if (s === "MODERATE" || s === "MODERATE_RISK" || s === "ABOVE_THERAPEUTIC") return "#ff9800";
    if (s === "MAJOR" || s === "SEVERE_RISK") return "#ff5252";
    if (s === "CONTRAINDICATED" || s === "ANAPHYLAXIS_RISK" || s === "DANGEROUS" || s === "INAPPROPRIATE") return "#ff1744";
    return "var(--text-muted)";
  }

  function checkTypeLabel(t: string) {
    const map: Record<string, string> = {
      drug_interaction: "DRUG INTERACTION",
      dosage_check: "DOSAGE CHECK",
      allergy_check: "ALLERGY CHECK",
      treatment_validation: "TREATMENT VALIDATION",
    };
    return map[t] ?? t.toUpperCase();
  }

  return (
    <>
      {/* Top Nav */}
      <nav className="topnav">
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <span className="topnav-brand">
            <span style={{ color: "var(--cyan)" }}>✚</span> MedGuard
          </span>
          <div className="topnav-links">
            <a className={`topnav-link ${page === "dashboard" ? "active" : ""}`} onClick={() => setPage("dashboard")}>Dashboard</a>
            <a className={`topnav-link ${page === "interaction" ? "active" : ""}`} onClick={() => setPage("interaction")}>Interactions</a>
            <a className={`topnav-link ${page === "dosage" ? "active" : ""}`} onClick={() => setPage("dosage")}>Dosage</a>
            <a className={`topnav-link ${page === "allergy" ? "active" : ""}`} onClick={() => setPage("allergy")}>Allergy</a>
            <a className={`topnav-link ${page === "treatment" ? "active" : ""}`} onClick={() => setPage("treatment")}>Treatment</a>
            <a className={`topnav-link ${page === "history" ? "active" : ""}`} onClick={() => setPage("history")}>History</a>
          </div>
        </div>
        <div className="topnav-right">
          <div className="network-pill">
            <span className="net-dot" />
            <span>{w.status === "connected" ? `StudioNet · ${short(w.address)}` : "StudioNet"}</span>
          </div>
          <button className="btn btn-cyan btn-sm" onClick={() => w.status === "connected" ? disconnect() : connect()}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>account_balance_wallet</span>
            {w.status === "connected" ? short(w.address) : "Connect Wallet"}
          </button>
        </div>
      </nav>

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-profile">
          <div className="sidebar-avatar">
            <span style={{ color: "var(--cyan)", fontSize: 20, fontWeight: 700 }}>✚</span>
          </div>
          <div>
            <div className="sidebar-name">MedGuard</div>
            <div className="sidebar-id">StudioNet · {ca ? short(ca) : "Not deployed"}</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          <a className={`sidebar-link ${page === "dashboard" ? "active" : ""}`} onClick={() => setPage("dashboard")}>
            <span className="icon material-symbols-outlined">dashboard</span> Dashboard
          </a>
          <a className={`sidebar-link ${page === "interaction" ? "active" : ""}`} onClick={() => setPage("interaction")}>
            <span className="icon material-symbols-outlined">medication</span> Drug Interaction
          </a>
          <a className={`sidebar-link ${page === "dosage" ? "active" : ""}`} onClick={() => setPage("dosage")}>
            <span className="icon material-symbols-outlined">monitor_weight</span> Dosage Check
          </a>
          <a className={`sidebar-link ${page === "allergy" ? "active" : ""}`} onClick={() => setPage("allergy")}>
            <span className="icon material-symbols-outlined">allergy</span> Allergy Check
          </a>
          <a className={`sidebar-link ${page === "treatment" ? "active" : ""}`} onClick={() => setPage("treatment")}>
            <span className="icon material-symbols-outlined">healing</span> Treatment
          </a>
          <a className={`sidebar-link ${page === "history" ? "active" : ""}`} onClick={() => setPage("history")}>
            <span className="icon material-symbols-outlined">history</span> History
          </a>
        </nav>
        <div className="sidebar-bottom">
          <a className="sidebar-link" href={ca ? explorerAddress(ca) : "#"} target="_blank" rel="noreferrer">
            <span className="icon material-symbols-outlined">open_in_new</span> Explorer
          </a>
          <a className="sidebar-link" href={GH} target="_blank" rel="noreferrer">
            <span className="icon material-symbols-outlined">code</span> GitHub
          </a>
        </div>
      </aside>

      {/* Main */}
      <main className="main forensic-grid">
        {loadErr && <div className="alert alert-error">Failed to load: {loadErr}</div>}

        {/* Dashboard */}
        {page === "dashboard" && (
          <div className="fade-in">
            <div className="page-hdr">
              <div>
                <p className="page-hdr-label">Clinical Decision Support</p>
                <h1 className="page-hdr-title">MedGuard Dashboard</h1>
                <p className="page-hdr-sub">On-chain clinical safety checks for healthcare workers. Drug interactions, dosage verification, allergy screening, and treatment validation powered by AI consensus.</p>
              </div>
            </div>
            <div className="stat-row">
              <div className="stat-box"><p className="stat-box-label">Total Checks</p><p className="stat-box-value cyan">{stats?.total_checks ?? 0}</p></div>
              <div className="stat-box"><p className="stat-box-label">Trusted Sources</p><p className="stat-box-value">{stats?.trusted_sources_count ?? 0}</p></div>
              <div className="stat-box"><p className="stat-box-label">Contract</p><p className="stat-box-value text">{ca ? short(ca) : "Not deployed"}</p></div>
              <div className="stat-box"><p className="stat-box-label">Network</p><p className="stat-box-value text">StudioNet 61999</p></div>
            </div>

            <div className="dashboard-grid">
              <div className="dash-card" onClick={() => setPage("interaction")}>
                <span className="material-symbols-outlined dash-icon" style={{ color: "var(--cyan)" }}>medication</span>
                <h3>Drug Interaction</h3>
                <p>Screen two drugs for adverse interactions before co-administration.</p>
              </div>
              <div className="dash-card" onClick={() => setPage("dosage")}>
                <span className="material-symbols-outlined dash-icon" style={{ color: "#ffd54f" }}>monitor_weight</span>
                <h3>Dosage Verification</h3>
                <p>Validate prescribed doses against therapeutic guidelines.</p>
              </div>
              <div className="dash-card" onClick={() => setPage("allergy")}>
                <span className="material-symbols-outlined dash-icon" style={{ color: "#ff9800" }}>allergy</span>
                <h3>Allergy Cross-Check</h3>
                <p>Screen medications against patient allergy list for cross-reactivity.</p>
              </div>
              <div className="dash-card" onClick={() => setPage("treatment")}>
                <span className="material-symbols-outlined dash-icon" style={{ color: "#69f0ae" }}>healing</span>
                <h3>Treatment Validation</h3>
                <p>Validate proposed treatments against clinical guidelines.</p>
              </div>
            </div>

            {history.length > 0 && (
              <>
                <div className="section-title" style={{ marginTop: 32 }}>Recent Checks</div>
                {history.slice(0, 5).map(h => (
                  <div className="sub-item" key={h.id}>
                    <span className="sub-verdict" style={{ borderColor: severityColor(String(h.result?.severity || h.result?.safety || h.result?.risk_level || h.result?.verdict || "")), color: severityColor(String(h.result?.severity || h.result?.safety || h.result?.risk_level || h.result?.verdict || "")) }}>
                      {String(h.result?.severity || h.result?.safety || h.result?.risk_level || h.result?.verdict || "CHECK")}
                    </span>
                    <div className="sub-body">
                      <div className="sub-who">#{h.id} · {checkTypeLabel(h.type)} · <span style={{ color: "var(--cyan)" }}>{short(h.caller)}</span></div>
                      <div className="sub-text">{h.result?.description ? String(h.result.description).slice(0, 150) : "No description"}</div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* Drug Interaction */}
        {page === "interaction" && (
          <div className="fade-in">
            <div className="page-hdr">
              <div>
                <p className="page-hdr-label">Clinical Pharmacology</p>
                <h1 className="page-hdr-title">Drug Interaction Check</h1>
                <p className="page-hdr-sub">Screen two drugs for adverse interactions using on-chain clinical sources and AI consensus.</p>
              </div>
            </div>
            <div className="check-form">
              <div className="hairline" style={{ background: "var(--surface)", padding: 24 }}>
                <div className="section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: "var(--cyan)" }}>medication</span> Interaction Parameters
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Drug A</label>
                    <input value={drugA} onChange={e => setDrugA(e.target.value)} placeholder="e.g. Warfarin" disabled={busy} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Drug B</label>
                    <input value={drugB} onChange={e => setDrugB(e.target.value)} placeholder="e.g. Aspirin" disabled={busy} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Patient Context (optional)</label>
                  <textarea value={drugContext} onChange={e => setDrugContext(e.target.value)} placeholder="Age, weight, existing conditions, other medications..." disabled={busy} />
                </div>
                <button className="btn btn-cyan btn-full" onClick={doDrugInteraction} disabled={busy || !drugA.trim() || !drugB.trim()}>
                  {busy ? "Processing…" : "Check Interaction"}
                </button>
                <TxPanel tx={tx} />
              </div>
            </div>
          </div>
        )}

        {/* Dosage */}
        {page === "dosage" && (
          <div className="fade-in">
            <div className="page-hdr">
              <div>
                <p className="page-hdr-label">Pharmacy Verification</p>
                <h1 className="page-hdr-title">Dosage Verification</h1>
                <p className="page-hdr-sub">Validate prescribed doses against therapeutic guidelines with patient-specific adjustments.</p>
              </div>
            </div>
            <div className="check-form">
              <div className="hairline" style={{ background: "var(--surface)", padding: 24 }}>
                <div className="section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#ffd54f" }}>monitor_weight</span> Dosage Parameters
                </div>
                <div className="form-group">
                  <label className="form-label">Medication Name</label>
                  <input value={dosageDrug} onChange={e => setDosageDrug(e.target.value)} placeholder="e.g. Metformin" disabled={busy} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Prescribed Dose (mg)</label>
                    <input type="number" value={dosageMg} onChange={e => setDosageMg(e.target.value)} placeholder="500" disabled={busy} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Patient Weight (kg)</label>
                    <input type="number" value={dosageWeight} onChange={e => setDosageWeight(e.target.value)} placeholder="70" disabled={busy} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Patient Age (years)</label>
                    <input type="number" value={dosageAge} onChange={e => setDosageAge(e.target.value)} placeholder="45" disabled={busy} />
                  </div>
                </div>
                <button className="btn btn-cyan btn-full" onClick={doDosageCheck} disabled={busy || !dosageDrug.trim() || !dosageMg}>
                  {busy ? "Processing…" : "Verify Dosage"}
                </button>
                <TxPanel tx={tx} />
              </div>
            </div>
          </div>
        )}

        {/* Allergy */}
        {page === "allergy" && (
          <div className="fade-in">
            <div className="page-hdr">
              <div>
                <p className="page-hdr-label">Patient Safety</p>
                <h1 className="page-hdr-title">Allergy Cross-Check</h1>
                <p className="page-hdr-sub">Screen a medication list against known patient allergies for cross-reactivity risks.</p>
              </div>
            </div>
            <div className="check-form">
              <div className="hairline" style={{ background: "var(--surface)", padding: 24 }}>
                <div className="section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#ff9800" }}>allergy</span> Allergy Parameters
                </div>
                <div className="form-group">
                  <label className="form-label">Medications (comma-separated)</label>
                  <textarea value={allergyMeds} onChange={e => setAllergyMeds(e.target.value)} placeholder="Amoxicillin, Ibuprofen, Metformin" disabled={busy} style={{ minHeight: 60 }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Known Allergies (comma-separated)</label>
                  <textarea value={allergyList} onChange={e => setAllergyList(e.target.value)} placeholder="Penicillin, Sulfa drugs, NSAIDs" disabled={busy} style={{ minHeight: 60 }} />
                </div>
                <button className="btn btn-cyan btn-full" onClick={doAllergyCheck} disabled={busy || !allergyMeds.trim() || !allergyList.trim()}>
                  {busy ? "Processing…" : "Check Allergy Risk"}
                </button>
                <TxPanel tx={tx} />
              </div>
            </div>
          </div>
        )}

        {/* Treatment */}
        {page === "treatment" && (
          <div className="fade-in">
            <div className="page-hdr">
              <div>
                <p className="page-hdr-label">Protocol Validation</p>
                <h1 className="page-hdr-title">Treatment Validation</h1>
                <p className="page-hdr-sub">Validate proposed treatment plans against clinical guidelines and evidence-based medicine.</p>
              </div>
            </div>
            <div className="check-form">
              <div className="hairline" style={{ background: "var(--surface)", padding: 24 }}>
                <div className="section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#69f0ae" }}>healing</span> Treatment Parameters
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
          </div>
        )}

        {/* History */}
        {page === "history" && (
          <div className="fade-in">
            <div className="page-hdr">
              <div>
                <p className="page-hdr-label">Audit Trail</p>
                <h1 className="page-hdr-title">Check History</h1>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Type</th>
                  <th>Result</th>
                  <th>Confidence</th>
                  <th>Caller</th>
                </tr>
              </thead>
              <tbody>
                {history.map(h => {
                  const resultVal = String(h.result?.severity || h.result?.safety || h.result?.risk_level || h.result?.verdict || "—");
                  const conf = String(h.result?.confidence || "—");
                  return (
                    <tr key={h.id}>
                      <td className="mono">#{h.id}</td>
                      <td><span className="badge badge-pending">{checkTypeLabel(h.type)}</span></td>
                      <td><span style={{ color: severityColor(resultVal), fontWeight: 700, fontFamily: "var(--mono)", fontSize: 12 }}>{resultVal}</span></td>
                      <td className="mono">{conf}</td>
                      <td className="mono" style={{ color: "var(--cyan)" }}>{short(h.caller)}</td>
                    </tr>
                  );
                })}
                {history.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>No clinical checks performed yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <span>© 2026 MedGuard · Clinical Decision Support · Built on GenLayer · StudioNet</span>
        <div className="footer-links">
          <a href={GH} target="_blank" rel="noreferrer">GitHub</a>
          <a href="https://explorer-studio.genlayer.com" target="_blank" rel="noreferrer">Explorer</a>
          <a href="https://genlayer.com" target="_blank" rel="noreferrer">GenLayer</a>
        </div>
      </footer>
    </>
  );
}

// Helpers
async function runRetry(fn: () => Promise<string>, onRetry: () => void) {
  for (let i = 1; i <= 3; i++) {
    try { return await fn(); } catch (err) {
      const m = ((err as Error).message ?? "").toLowerCase();
      if (m.includes("user rejected") || m.includes("user denied") || i === 3) throw err;
      if (m.includes("reverted") || m.includes("out of gas") || m.includes("execution reverted")) { onRetry(); await new Promise(r => setTimeout(r, 4000)); continue; }
      throw err;
    }
  }
  throw new Error("unreachable");
}

function humanErr(m: string) {
  const l = m.toLowerCase();
  if (l.includes("user rejected") || l.includes("user denied")) return "You cancelled the signature.";
  if (l.includes("insufficient funds")) return "Not enough GEN to cover gas.";
  if (l.includes("reverted") || l.includes("out of gas")) return "Transaction reverted. Try again.";
  if (l.includes("timeout")) return "RPC timeout — StudioNet may be busy. Try again.";
  if (l.includes("rate limit")) return "Rate limited by StudioNet. Wait a moment and retry.";
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
