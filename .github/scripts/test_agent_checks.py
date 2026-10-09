import importlib.util
import pathlib
import unittest

p = pathlib.Path(__file__).with_name("agent_checks.py")
spec = importlib.util.spec_from_file_location("agent_checks", p)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

class AgentChecksTests(unittest.TestCase):
    def test_allow_documentation(self):
        self.assertTrue(m.safe_path("docs/agent-smoke.md"))
    def test_allow_source(self):
        self.assertTrue(m.safe_path("src/components/Button.tsx"))
    def test_disallow_main_html(self):
        self.assertFalse(m.safe_path("index.html"))
    def test_disallow_workflows(self):
        self.assertFalse(m.safe_path(".github/workflows/run.yml"))
    def test_disallow_env(self):
        self.assertFalse(m.safe_path("configs/.env"))
    def test_disallow_path_traversal(self):
        self.assertFalse(m.safe_path("../secrets.json"))
    def test_disallow_absolute(self):
        self.assertFalse(m.safe_path("/tmp/config.json"))
    def test_disallow_dependency_script(self):
        self.assertFalse(m.safe_path("package.json"))
    def test_disallow_lead_api(self):
        self.assertFalse(m.safe_path("lead-api/server.js"))
    def test_requires_explicit_apply(self):
        with self.assertRaises(ValueError):
            m.validate_task({"instructions":"Make a small change","allowed_paths":["docs/test.md"]})
    def test_allows_bounded_task(self):
        task={"instructions":"Write a concise note","allowed_paths":["docs/test.md"],"apply_to_branch":True}
        self.assertEqual(m.validate_task(task),task)
    def test_disallow_many_paths(self):
        with self.assertRaises(ValueError):
            m.validate_task({"instructions":"Write a concise note","allowed_paths":["docs/%s.md"%i for i in range(9)],"apply_to_branch":True})
    def test_disallow_many_attempts(self):
        with self.assertRaises(ValueError):
            m.validate_task({"instructions":"Write a concise note","allowed_paths":["docs/test.md"],"apply_to_branch":True,"max_attempts":3})
    def test_disallow_boolean_attempts(self):
        with self.assertRaises(ValueError):
            m.validate_task({"instructions":"Write a concise note","allowed_paths":["docs/test.md"],"apply_to_branch":True,"max_attempts":True})
    def test_disallow_empty_task(self):
        with self.assertRaises(ValueError):
            m.validate_task({"instructions":"","allowed_paths":["docs/test.md"],"apply_to_branch":True})

if __name__ == "__main__":
    unittest.main()
