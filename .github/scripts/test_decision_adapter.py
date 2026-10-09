import importlib.util
import io
import json
import pathlib
import unittest

p = pathlib.Path(__file__).with_name("decision_adapter.py")
spec = importlib.util.spec_from_file_location("decision_adapter", p)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

class FakeResponse:
    def __enter__(self): return self
    def __exit__(self, *a): pass
    def read(self, n): return json.dumps({"answers":{"next":{"choice":"VERIFY","confidence":0.92}}}).encode()

class DecisionAdapterTests(unittest.TestCase):
    def test_offline_default(self):
        r=m.request_decision("Tests passed",environ={})
        self.assertIsNone(r["choice"])
    def test_paid_jev_blocked(self):
        with self.assertRaises(m.DecisionsDisabled):
            m.request_decision("Need choice",environ={"ENABLE_EXTERNAL_DECISIONS":"1","DECISION_PROVIDER":"jev","TYPESAFE_API_KEY":"private-test-key"})
    def test_free_adapter_disabled_by_default(self):
        with self.assertRaises(m.DecisionsDisabled):
            m.request_decision("Need choice",environ={"DECISION_PROVIDER":"openrouter-free","OPENROUTER_API_KEY":"private-test-key"})
    def test_free_adapter_mock_transport(self):
        records=[]
        def fake(req,timeout):
            records.append((req.full_url,timeout))
            return FakeResponse()
        out=m.request_decision("Need choice",environ={"ENABLE_EXTERNAL_DECISIONS":"1","DECISION_PROVIDER":"openrouter-free","OPENROUTER_API_KEY":"private-test-key"},opener=fake)
        self.assertEqual(out["choice"],"VERIFY")
        self.assertEqual(records[0][1],10)
    def test_paid_jev_mock_requires_opt_in(self):
        out=m.request_decision("Need choice",environ={"ENABLE_EXTERNAL_DECISIONS":"1","ALLOW_PAID_JEV_API":"1","DECISION_PROVIDER":"jev","TYPESAFE_API_KEY":"test-key"},opener=lambda req,timeout:FakeResponse())
        self.assertEqual(out["provider"],"jev")
    def test_refuse_invalid_choice(self):
        with self.assertRaises(ValueError):
            m.parse_choice({"answers":{"next":{"choice":"DELETE","confidence":1.0}}})
    def test_refuse_invalid_confidence(self):
        with self.assertRaises(ValueError):
            m.parse_choice({"answers":{"next":{"choice":"COMPLETE","confidence":1.5}}})
    def test_state_bounded(self):
        with self.assertRaises(ValueError):
            m.build_request("X"*3000,model="jev-latest")
    def test_unexpected_api_error_does_not_leak_key(self):
        secret="private-test-key"
        def broken(req,timeout): raise OSError("danger")
        with self.assertRaises(RuntimeError) as caught:
            m.request_decision("Need choice",environ={"ENABLE_EXTERNAL_DECISIONS":"1","DECISION_PROVIDER":"openrouter-free","OPENROUTER_API_KEY":secret},opener=broken)
        self.assertNotIn(secret,str(caught.exception))

if __name__=="__main__":
    unittest.main()
