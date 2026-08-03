"""
MedGuard v2 contract invariant tests.
Covers: consensus, all clinical functions, patient management, prescriptions,
drug database, alerts, clinical trials, insurance claims, access control.
"""
from pathlib import Path
import re

SOURCE = (Path(__file__).parents[1] / "contracts" / "medguard.py").read_text()

def test_valid_syntax():
    import ast
    ast.parse(SOURCE)

# ═══════════════════════════════════════════════
# CONSENSUS PRIMITIVES
# ═══════════════════════════════════════════════

def test_uses_run_nondet_unsafe():
    assert "gl.vm.run_nondet_unsafe" in SOURCE

def test_uses_nondet_web_render():
    assert "gl.nondet.web.render" in SOURCE

def test_uses_exec_prompt():
    assert "gl.nondet.exec_prompt" in SOURCE

# ═══════════════════════════════════════════════
# WEB FETCH INSIDE CONSENSUS
# ═══════════════════════════════════════════════

def test_fetch_inside_leader_fn():
    matches = re.findall(r'def leader_fn\(\).*?def validator_fn', SOURCE, re.DOTALL)
    assert len(matches) >= 6  # 7 consensus functions
    for match in matches:
        assert "_fetch_all" in match or "web.render" in match

def test_validator_re_runs_leader():
    matches = re.findall(r'def validator_fn.*?gl\.vm\.run_nondet_unsafe', SOURCE, re.DOTALL)
    assert len(matches) >= 6
    for match in matches:
        assert "leader_fn()" in match

# ═══════════════════════════════════════════════
# CLINICAL SEVERITY LEVELS
# ═══════════════════════════════════════════════

def test_five_severity_levels():
    for s in ["SEVERITY_NONE", "SEVERITY_MINOR", "SEVERITY_MODERATE", "SEVERITY_MAJOR", "SEVERITY_CONTRAINDICATED"]:
        assert s in SOURCE

def test_dosage_safety_levels():
    for s in ["DOSAGE_SAFE", "DOSAGE_LOW", "DOSAGE_HIGH", "DOSAGE_DANGEROUS"]:
        assert s in SOURCE

def test_allergy_risk_levels():
    for s in ["ALLERGY_NONE", "ALLERGY_MILD", "ALLERGY_MODERATE", "ALLERGY_SEVERE", "ALLERGY_ANAPHYLAXIS"]:
        assert s in SOURCE

def test_alert_types():
    for s in ["ALERT_DRUG_INTERACTION", "ALERT_ALLERGY_RISK", "ALERT_DOSAGE_ERROR", "ALERT_CONTRAINDICATION"]:
        assert s in SOURCE

def test_alert_severity():
    for s in ["ALERT_LOW", "ALERT_MEDIUM", "ALERT_HIGH", "ALERT_CRITICAL"]:
        assert s in SOURCE

def test_prescription_status():
    for s in ["RX_PENDING", "RX_VERIFIED", "RX_FLAGGED", "RX_REJECTED"]:
        assert s in SOURCE

def test_claim_verdicts():
    for s in ["CLAIM_APPROVED", "CLAIM_DENIED", "CLAIM_PARTIAL", "CLAIM_REVIEW"]:
        assert s in SOURCE

# ═══════════════════════════════════════════════
# ALL 10 WRITE FUNCTIONS
# ═══════════════════════════════════════════════

def test_check_drug_interaction():
    assert "def check_drug_interaction" in SOURCE

def test_verify_dosage():
    assert "def verify_dosage" in SOURCE

def test_check_allergy_risk():
    assert "def check_allergy_risk" in SOURCE

def test_validate_treatment():
    assert "def validate_treatment" in SOURCE

def test_register_patient():
    assert "def register_patient" in SOURCE

def test_update_patient():
    assert "def update_patient" in SOURCE

def test_verify_prescription():
    assert "def verify_prescription" in SOURCE

def test_add_drug():
    assert "def add_drug" in SOURCE

def test_match_clinical_trial():
    assert "def match_clinical_trial" in SOURCE

def test_verify_insurance_claim():
    assert "def verify_insurance_claim" in SOURCE

# ═══════════════════════════════════════════════
# VIEW FUNCTIONS
# ═══════════════════════════════════════════════

def test_get_check():
    assert "def get_check" in SOURCE

def test_get_patient():
    assert "def get_patient" in SOURCE

def test_get_prescription():
    assert "def get_prescription" in SOURCE

def test_get_drug_info():
    assert "def get_drug_info" in SOURCE

def test_get_alert():
    assert "def get_alert" in SOURCE

def test_get_alerts_for_patient():
    assert "def get_alerts_for_patient" in SOURCE

def test_search_drugs():
    assert "def search_drugs" in SOURCE

def test_get_trusted_sources():
    assert "def get_trusted_sources" in SOURCE

def test_get_stats():
    assert "def get_stats" in SOURCE

def test_is_safe_views():
    assert "def is_interaction_safe" in SOURCE
    assert "def is_dosage_safe" in SOURCE
    assert "def is_allergy_safe" in SOURCE

def test_get_version():
    assert "def get_version" in SOURCE
    assert "medguard/2.0.0" in SOURCE

# ═══════════════════════════════════════════════
# AUTO-ALERT SYSTEM
# ═══════════════════════════════════════════════

def test_auto_alert_on_dangerous_interaction():
    match = re.search(r'def check_drug_interaction.*?def verify_dosage', SOURCE, re.DOTALL)
    assert match
    body = match.group()
    assert "_create_alert" in body
    assert "ALERT_CRITICAL" in body

def test_auto_alert_on_dangerous_dosage():
    match = re.search(r'def verify_dosage.*?def check_allergy_risk', SOURCE, re.DOTALL)
    assert match
    body = match.group()
    assert "_create_alert" in body

def test_auto_alert_on_severe_allergy():
    match = re.search(r'def check_allergy_risk.*?def validate_treatment', SOURCE, re.DOTALL)
    assert match
    body = match.group()
    assert "_create_alert" in body

def test_auto_alert_on_flagged_prescription():
    match = re.search(r'def verify_prescription.*?def add_drug', SOURCE, re.DOTALL)
    assert match
    body = match.group()
    assert "_create_alert" in body

# ═══════════════════════════════════════════════
# PATIENT MANAGEMENT
# ═══════════════════════════════════════════════

def test_patient_storage():
    assert "self.patients" in SOURCE
    assert "TreeMap" in SOURCE

def test_patient_fields():
    assert "allergies" in SOURCE
    assert "conditions" in SOURCE
    assert "blood_type" in SOURCE
    assert "age_years" in SOURCE
    assert "weight_kg" in SOURCE

def test_patient_id_exists_check():
    match = re.search(r'def register_patient.*?def update_patient', SOURCE, re.DOTALL)
    assert match
    assert "PATIENT_EXISTS" in match.group()

# ═══════════════════════════════════════════════
# PRESCRIPTION VERIFICATION
# ═══════════════════════════════════════════════

def test_prescription_storage():
    assert "self.prescriptions" in SOURCE

def test_prescription_checks_allergies():
    match = re.search(r'def verify_prescription.*?def add_drug', SOURCE, re.DOTALL)
    assert match
    body = match.group()
    assert "patient_allergies" in body
    assert "allergy_conflicts" in body

def test_prescription_checks_interactions():
    match = re.search(r'def verify_prescription.*?def add_drug', SOURCE, re.DOTALL)
    assert match
    body = match.group()
    assert "interactions_found" in body

# ═══════════════════════════════════════════════
# DRUG DATABASE
# ═══════════════════════════════════════════════

def test_drug_database_storage():
    assert "self.drug_database" in SOURCE

def test_drug_database_fields():
    assert "side_effects" in SOURCE
    assert "contraindications" in SOURCE
    assert "common_dosages" in SOURCE

# ═══════════════════════════════════════════════
# ANALYTICS COUNTERS
# ═══════════════════════════════════════════════

def test_analytics_counters():
    for c in ["total_drug_checks", "total_dosage_checks", "total_allergy_checks",
              "total_treatment_checks", "total_prescriptions", "total_alerts",
              "total_patients", "total_claims"]:
        assert c in SOURCE

def test_analytics_in_stats():
    match = re.search(r'def get_stats.*?def is_interaction_safe', SOURCE, re.DOTALL)
    assert match
    body = match.group()
    assert "total_patients" in body
    assert "total_prescriptions" in body
    assert "total_alerts" in body
    assert "drug_database_size" in body

# ═══════════════════════════════════════════════
# ACCESS CONTROL
# ═══════════════════════════════════════════════

def test_owner_only_functions():
    assert "_require_owner" in SOURCE
    assert "add_trusted_source" in SOURCE
    assert "remove_trusted_source" in SOURCE
    assert "add_drug" in SOURCE

def test_owner_set_in_constructor():
    match = re.search(r'def __init__\(self\):(.*?)def ', SOURCE, re.DOTALL)
    assert match
    body = match.group(1)
    assert "owner" in body and "sender_address" in body

# ═══════════════════════════════════════════════
# STORAGE
# ═══════════════════════════════════════════════

def test_treemap_storage():
    assert "TreeMap" in SOURCE

def test_dynarray_storage():
    assert "DynArray" in SOURCE

def test_extends_gl_contract():
    assert "gl.Contract" in SOURCE

def test_constructor_no_args():
    assert "def __init__(self):" in SOURCE

# ═══════════════════════════════════════════════
# PROMPT SECURITY
# ═══════════════════════════════════════════════

def test_security_rules():
    assert "SECURITY RULES" in SOURCE

# ═══════════════════════════════════════════════
# LIMITS
# ═══════════════════════════════════════════════

def test_limits():
    for l in ["MAX_NAME_LEN", "MAX_CSV_LEN", "MAX_CONTEXT_LEN", "MAX_URL_LEN", "MAX_URLS", "MAX_FETCH_CHARS"]:
        assert l in SOURCE

# ═══════════════════════════════════════════════
# GENLAYER FEATURES
# ═══════════════════════════════════════════════

def test_gl_message_sender():
    assert "gl.message.sender_address" in SOURCE

def test_gl_vm_user_error():
    assert "gl.vm.UserError" in SOURCE

def test_json_dumps():
    assert "json.dumps" in SOURCE

def test_json_loads():
    assert "json.loads" in SOURCE

# ═══════════════════════════════════════════════
# URL HANDLING
# ═══════════════════════════════════════════════

def test_https_enforcement():
    assert "https://" in SOURCE

def test_url_limits():
    assert "MAX_URL_LEN" in SOURCE
    assert "MAX_URLS" in SOURCE
    assert "MAX_FETCH_CHARS" in SOURCE

# ═══════════════════════════════════════════════
# MEDICAL SOURCES
# ═══════════════════════════════════════════════

def test_trusted_medical_sources():
    assert "drugs.com" in SOURCE
    assert "pubmed.ncbi.nlm.nih.gov" in SOURCE
    assert "fda.gov" in SOURCE
    assert "clinicaltrials.gov" in SOURCE

# ═══════════════════════════════════════════════
# ALLERGY FLAGGED MEDS IN VALIDATOR
# ═══════════════════════════════════════════════

def test_allergy_flagged_meds_in_validator():
    match = re.search(r'def check_allergy_risk.*?def validate_treatment', SOURCE, re.DOTALL)
    assert match
    body = match.group()
    assert "flagged_medications" in body
