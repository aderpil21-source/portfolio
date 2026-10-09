import importlib.util
import pathlib
import unittest

p = pathlib.Path(__file__).with_name("ai_router.py")
spec = importlib.util.spec_from_file_location("ai_router", p)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

class RouterTests(unittest.TestCase):
    def test_small(self): self.assertEqual(m.classify("Change title text"), "LUNA_LOW")
    def test_medium(self): self.assertEqual(m.classify("Fix mobile layout"), "LUNA_MEDIUM")
    def test_high(self): self.assertEqual(m.classify("Review authentication security"), "LUNA_HIGH")
    def test_failing_checks_cannot_complete(self): self.assertEqual(m.decide(checks_passed=False, scope_verified=True, attempts=0), "RETRY")
    def test_scope_must_be_verified(self): self.assertEqual(m.decide(checks_passed=True, scope_verified=False, attempts=0), "VERIFY")
    def test_no_complete_without_behavior_evidence(self): self.assertEqual(m.decide(checks_passed=True, scope_verified=True, attempts=0), "VERIFY")
    def test_complete_only_with_evidence(self): self.assertEqual(m.decide(checks_passed=True, scope_verified=True, behavior_verified=True, attempts=0), "COMPLETE")
    def test_escalation(self): self.assertEqual(m.decide(checks_passed=False, scope_verified=False, attempts=2), "ESCALATE")
    def test_security_escalation(self): self.assertEqual(m.decide(checks_passed=True, scope_verified=False, attempts=0, security_sensitive=True), "ESCALATE")
    def test_low_confidence(self): self.assertEqual(m.validate_jev("COMPLETE", 0.3), "VERIFY")
    def test_invalid_choice(self): self.assertEqual(m.validate_jev("DELETE_ALL", 0.99), "VERIFY")
    def test_valid_jev_choice(self): self.assertEqual(m.validate_jev("RETRY", 0.9), "RETRY")
    def test_jev_cannot_override_missing_behavior(self):
        self.assertEqual(m.guarded_jev("COMPLETE", 0.99, checks_passed=True, scope_verified=True, attempts=0), "VERIFY")
    def test_jev_cannot_override_security_escalation(self):
        self.assertEqual(m.guarded_jev("CONTINUE", 0.99, checks_passed=True, scope_verified=True, behavior_verified=True, attempts=0, security_sensitive=True), "ESCALATE")

if __name__ == "__main__":
    unittest.main()
