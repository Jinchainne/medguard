"""
MedGuard contract invariant tests.
Covers: consensus, drug interactions, dosage, allergy, treatment validation, access control.
"""
from pathlib import Path
import re

SOURCE = (Path(__file__).parents[1] / "contracts" / "medguard.py").read_text()

def test_valid_syntax():
    import ast
    ast.parse(SOURCE)

# ── Consensus primitives ──

def test_uses_run_nondet_unsafe():
    assert "gl.vm.run_nondet_unsafe" in SOURCE

def test_uses_nondet_web_render():
    assert "gl.nondet.web.render" in SOURCE

def test_uses_exec_prompt():
    assert "gl.nondet.exec_prompt" in SOURCE

# ── Web fetch inside consensus ──

def test_fetch_inside_leader_fn():
    matches = re.findall(r'def leader_fn\(\).*?def validator_fn', SOURCE, re.DOTALL)
    assert len(matches) >= 3  # 4 functions, each has leader/validator
    for match in matches:
        assert "_fetch_all" in match or "web.render" in match

def test_validator_re_runs_leader():
    matches = re.findall(r'def validator_fn.*?gl\.vm\.run_nondet_unsafe', SOURCE, re.DOTALL)
    assert len(matches) >= 3
    for match in matches:
        assert "leader_fn()" in match

# ── Drug interaction severity (5 levels) ──

def test_five_severity_levels():
    assert "NONE" in SOURCE
    assert "MINOR" in SOURCE
    assert "MODERATE" in SOURCE
    assert "MAJOR" in SOURCE
    assert "CONTRAINDICATED" in SOURCE

def test_severity_in_validator():
    match = re.search(r'def check_drug_interaction.*?def verify_dosage', SOURCE, re.DOTALL)
    assert match
    body = match.group()
    assert "severity" in body

# ── Dosage safety levels ──

def test_dosage_safety_levels():
    assert "SAFE" in SOURCE
    assert "SUBTHERAPEUTIC" in SOURCE
    assert "ABOVE_THERAPEUTIC" in SOURCE
    assert "DANGEROUS" in SOURCE

# ── Allergy risk levels ──

def test_allergy_risk_levels():
    assert "NO_RISK" in SOURCE
    assert "MILD_RISK" in SOURCE
    assert "MODERATE_RISK" in SOURCE
    assert "SEVERE_RISK" in SOURCE
    assert "ANAPHYLAXIS_RISK" in SOURCE

# ── 4 core clinical functions ──

def test_check_drug_interaction():
    assert "def check_drug_interaction" in SOURCE

def test_verify_dosage():
    assert "def verify_dosage" in SOURCE

def test_check_allergy_risk():
    assert "def check_allergy_risk" in SOURCE

def test_validate_treatment():
    assert "def validate_treatment" in SOURCE

# ── Quick safety views ──

def test_is_interaction_safe():
    assert "def is_interaction_safe" in SOURCE

def test_is_dosage_safe():
    assert "def is_dosage_safe" in SOURCE

def test_is_allergy_safe():
    assert "def is_allergy_safe" in SOURCE

# ── Consensus checks ──

def test_consensus_checks_severity():
    match = re.search(r'def check_drug_interaction.*?def verify_dosage', SOURCE, re.DOTALL)
    assert match
    body = match.group()
    assert "severity" in body
    assert "confidence" in body
    assert "risk_score" in body

# ── Access control ──

def test_owner_only_functions():
    assert "_require_owner" in SOURCE
    assert "add_trusted_source" in SOURCE
    assert "remove_trusted_source" in SOURCE

def test_owner_set_in_constructor():
    match = re.search(r'def __init__\(self\):(.*?)def ', SOURCE, re.DOTALL)
    assert match
    body = match.group(1)
    assert "owner" in body and "sender_address" in body

# ── Storage ──

def test_treemap_storage():
    assert "TreeMap" in SOURCE

def test_dynarray_storage():
    assert "DynArray" in SOURCE

def test_extends_gl_contract():
    assert "gl.Contract" in SOURCE

def test_constructor_no_args():
    assert "def __init__(self):" in SOURCE

# ── View functions ──

def test_get_check():
    assert "def get_check" in SOURCE

def test_get_trusted_sources():
    assert "def get_trusted_sources" in SOURCE

def test_is_safe_views():
    assert "def is_interaction_safe" in SOURCE
    assert "def is_dosage_safe" in SOURCE
    assert "def is_allergy_safe" in SOURCE

def test_get_stats():
    assert "def get_stats" in SOURCE

def test_get_version():
    assert "def get_version" in SOURCE

# ── Prompt security ──

def test_security_rules():
    assert "SECURITY RULES" in SOURCE

# ── Limits ──

def test_drug_name_limit():
    assert "MAX_DRUG_NAME_LEN" in SOURCE

def test_drugs_list_limit():
    assert "MAX_DRUGS_LIST" in SOURCE

def test_allergies_list_limit():
    assert "MAX_ALLERGIES_LIST" in SOURCE

# ── Storage pattern ──

def test_checks_stored():
    assert "self.checks" in SOURCE

def test_returns_check_id():
    assert "check_id" in SOURCE

# ── GenLayer features ──

def test_gl_message_sender():
    assert "gl.message.sender_address" in SOURCE

def test_gl_vm_user_error():
    assert "gl.vm.UserError" in SOURCE

def test_json_dumps():
    assert "json.dumps" in SOURCE

def test_json_loads():
    assert "json.loads" in SOURCE

# ── URL handling ──

def test_https_enforcement():
    assert "https://" in SOURCE

def test_url_limits():
    assert "MAX_URL_LEN" in SOURCE
    assert "MAX_URLS" in SOURCE
    assert "MAX_FETCH_CHARS" in SOURCE

# ── Medical sources ──

def test_trusted_medical_sources():
    assert "drugs.com" in SOURCE
    assert "pubmed.ncbi.nlm.nih.gov" in SOURCE
    assert "fda.gov" in SOURCE

# ── Allergy flagged meds agreement ──

def test_allergy_flagged_meds_in_validator():
    match = re.search(r'def check_allergy_risk.*?def validate_treatment', SOURCE, re.DOTALL)
    assert match
    body = match.group()
    assert "flagged_medications" in body
