import importlib.util
import pathlib
import subprocess
import sys
import unittest

root=pathlib.Path(__file__).parent
sys.path.insert(0,str(root))
spec=importlib.util.spec_from_file_location("agent_cycle",root/"agent_cycle.py")
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
TASK={"instructions":"Create a small documentation file","allowed_paths":["docs/test.md"],"apply_to_branch":True}
EVIDENCE={"tests":"git diff --check","diff_paths":["docs/test.md"],"scope_verified":True}

class AgentCycleTests(unittest.TestCase):
    def test_one_verified_cycle_stays_pending_review(self):
        calls=[]
        def gen(prompt,attempt,out): calls.append(attempt)
        result=m.execute(TASK,"policy","/tmp/agent-cycle-unit-test",generator=gen,
            verifier=lambda i:EVIDENCE,judge=lambda s:{"provider":"offline","choice":None})
        self.assertEqual(calls,[1])
        self.assertEqual(result["decision"],"VERIFY")
        self.assertFalse(result["behavior_verified"])
    def test_retries_only_bounded_check_failures(self):
        calls=[]
        def gen(prompt,attempt,out): calls.append(attempt)
        def verify(attempt):
            if attempt==1: raise subprocess.CalledProcessError(1,["node","--check"],stderr=b"SyntaxError")
            return EVIDENCE
        result=m.execute(dict(TASK,max_attempts=2),"policy","/tmp/agent-cycle-unit-test",generator=gen,
            verifier=verify,judge=lambda s:{"provider":"offline","choice":None})
        self.assertEqual(calls,[1,2])
        self.assertEqual(result["attempts"],2)
    def test_unsafe_scope_fails_closed_without_retry(self):
        calls=[]
        def gen(prompt,attempt,out): calls.append(attempt)
        with self.assertRaises(ValueError):
            m.execute(dict(TASK,max_attempts=2),"policy","/tmp/agent-cycle-unit-test",
                generator=gen,verifier=lambda i:(_ for _ in ()).throw(ValueError("unsafe scope")),
                judge=lambda s:{"provider":"offline","choice":None})
        self.assertEqual(calls,[1])
    def test_jev_cannot_force_unverified_complete(self):
        result=m.execute(TASK,"policy","/tmp/agent-cycle-unit-test",
            generator=lambda *x:None,verifier=lambda i:EVIDENCE,
            judge=lambda s:{"provider":"jev","choice":"COMPLETE","confidence":0.99})
        self.assertEqual(result["decision"],"VERIFY")
    def test_external_decision_error_falls_back_offline(self):
        result=m.execute(TASK,"policy","/tmp/agent-cycle-unit-test",
            generator=lambda *x:None,verifier=lambda i:EVIDENCE,
            judge=lambda s:(_ for _ in ()).throw(RuntimeError("offline")))
        self.assertEqual(result["decision"],"VERIFY")

if __name__=="__main__":
    unittest.main()
