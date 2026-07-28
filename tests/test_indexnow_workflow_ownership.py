from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
WORKFLOWS = ROOT / ".github" / "workflows"
DEPLOY_WORKFLOW = WORKFLOWS / "deploy-cloudflare-pages.yml"
SITEMAP_DIFF_WORKFLOW = WORKFLOWS / "indexnow-sitemap-diff.yml"


class IndexNowWorkflowOwnershipTests(unittest.TestCase):
    def test_only_sitemap_diff_workflow_submits_to_indexnow(self):
        workflow_text = {
            path.name: path.read_text(encoding="utf-8")
            for path in WORKFLOWS.glob("*.yml")
        }
        submitters = [
            name
            for name, text in workflow_text.items()
            if "scripts/notify-indexnow.py" in text
        ]

        self.assertEqual(submitters, [SITEMAP_DIFF_WORKFLOW.name])

    def test_submission_follows_successful_production_deploy(self):
        text = SITEMAP_DIFF_WORKFLOW.read_text(encoding="utf-8")

        self.assertIn('workflows: ["Deploy Cloudflare Pages"]', text)
        self.assertIn("github.event.workflow_run.conclusion == 'success'", text)
        self.assertIn("github.event.workflow_run.head_branch == 'main'", text)
        self.assertIn("Upload IndexNow reports", text)
        self.assertIn("indexnow-diff-report.json", text)
        self.assertIn("indexnow-submission-report.json", text)

    def test_deploy_workflow_keeps_live_verification_without_submission(self):
        text = DEPLOY_WORKFLOW.read_text(encoding="utf-8")

        self.assertIn("Verify production custom domain", text)
        self.assertNotIn("scripts/notify-indexnow.py", text)
        self.assertNotIn("indexnow-deploy-report.json", text)


if __name__ == "__main__":
    unittest.main()
