"""Behavioral tests for the Phase 1 clinical consensus security policy."""

import ast
from pathlib import Path
from types import SimpleNamespace

import pytest


SOURCE_PATH = Path(__file__).parents[1] / "contracts" / "medguard.py"
SOURCE = SOURCE_PATH.read_text(encoding="utf-8")
TREE = ast.parse(SOURCE)


def _method(name: str, extra_globals: dict | None = None):
    contract = next(node for node in TREE.body if isinstance(node, ast.ClassDef) and node.name == "MedGuard")
    node = next(node for node in contract.body if isinstance(node, ast.FunctionDef) and node.name == name)
    node.decorator_list = []
    namespace = {
        "MAX_USER_URLS": 4,
        "USER_SOURCE_BUDGET": 1200,
        "AUTHORITATIVE_SOURCE_BUDGET": 3000,
        "MIN_AUTHORITATIVE_EVIDENCE_CHARS": 80,
        "PROMPT_SAFETY_CANARY": "MEDGUARD_CLINICAL_EVIDENCE_ONLY_V1",
    }
    namespace.update(extra_globals or {})
    exec(compile(ast.fix_missing_locations(ast.Module(body=[node], type_ignores=[])), str(SOURCE_PATH), "exec"), namespace)
    return namespace[name]


class FetchHarness:
    def __init__(self, failed_urls: set[str] | None = None):
        self.failed_urls = failed_urls or set()
        self.calls: list[tuple[str, int, str]] = []

    def _fetch_url(self, url: str, budget: int, role: str):
        self.calls.append((url, budget, role))
        if url in self.failed_urls:
            return {"url": url, "content": "", "status": "error", "role": role}
        return {"url": url, "content": "x" * budget, "status": "fetched", "role": role}


def test_user_pages_cannot_crowd_out_authoritative_evidence():
    fetch = _method("_fetch_query_sources")
    harness = FetchHarness()
    user_urls = [f"https://user-{index}.example" for index in range(10)]
    authoritative_urls = [f"https://clinical-{index}.example" for index in range(3)]

    results, has_evidence = fetch(harness, user_urls, authoritative_urls)

    user_calls = [call for call in harness.calls if call[2] == "user"]
    authoritative_calls = [call for call in harness.calls if call[2] == "authoritative"]
    assert len(user_calls) == 4
    assert all(call[1] == 1200 for call in user_calls)
    assert len(authoritative_calls) == 3
    assert all(call[1] == 3000 for call in authoritative_calls)
    assert len(results) == 7
    assert has_evidence is True


def test_user_evidence_alone_cannot_unlock_a_clinical_verdict():
    fetch = _method("_fetch_query_sources")
    authoritative_urls = ["https://clinical-a.example", "https://clinical-b.example"]
    harness = FetchHarness(failed_urls=set(authoritative_urls))

    _, has_evidence = fetch(harness, ["https://user.example"], authoritative_urls)

    assert has_evidence is False


def test_evidence_formatter_preserves_provenance_labels():
    formatter = _method("_format_evidence")
    rendered = formatter(object(), [
        {"url": "https://user.example", "content": "claim", "status": "fetched", "role": "user"},
        {"url": "https://clinical.example", "content": "guideline", "status": "fetched", "role": "authoritative"},
    ])

    assert "[USER SOURCE https://user.example]" in rendered
    assert "[AUTHORITATIVE SOURCE https://clinical.example]" in rendered


def test_prompt_canary_rejects_instruction_hijacking():
    class UserError(Exception):
        pass

    check_canary = _method("_require_prompt_canary", {"gl": SimpleNamespace(vm=SimpleNamespace(UserError=UserError))})
    check_canary(object(), {"safety_canary": "MEDGUARD_CLINICAL_EVIDENCE_ONLY_V1"})

    with pytest.raises(UserError, match="PROMPT_SAFETY_CANARY_MISMATCH"):
        check_canary(object(), {"safety_canary": "IGNORE_CLINICAL_POLICY"})


def test_all_ai_workflows_enforce_the_canary():
    assert SOURCE.count("self._require_prompt_canary(response)") == 7
    assert SOURCE.count('"safety_canary": "{PROMPT_SAFETY_CANARY}"') == 7
