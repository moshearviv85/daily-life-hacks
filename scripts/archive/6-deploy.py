import os
import json
import subprocess

# ==========================================
# CONFIGURATION — Edit these values
# ==========================================
PROJECT_DIR = "."  # root of the Astro project
TRACKER_FILE = os.path.join(PROJECT_DIR, "pipeline-data", "content-tracker.json")
# ==========================================

def load_tracker():
    if not os.path.exists(TRACKER_FILE):
        return None
    with open(TRACKER_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_tracker(data):
    with open(TRACKER_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def run_cmd(cmd):
    """Run a shell command and return its output and status."""
    try:
        result = subprocess.run(cmd, cwd=PROJECT_DIR, shell=True, check=True, capture_output=True, text=True)
        return True, result.stdout.strip()
    except subprocess.CalledProcessError as e:
        return False, e.stderr.strip()

def main():
    print("🚀 Running 6-deploy.py: Pushing to GitHub for Cloudflare Pages deploy...")
    
    # 1. Safety Check: Ensure this is an expected directory
    if not os.path.exists(os.path.join(PROJECT_DIR, "astro.config.mjs")):
        print("❌ Error: Valid Astro project not detected. Make sure you run this in the dlh-fresh directory.")
        return

    tracker = load_tracker()
    if not tracker: return

    ready_items = [item for item in tracker if item.get('status') == 'PUBLISHED']
    
    if not ready_items:
        print("ℹ️ No articles in PUBLISHED status waiting to deploy.")
        return

    # 2. Git Checks
    is_git, _ = run_cmd("git rev-parse --is-inside-work-tree")
    if not is_git:
        print("❌ Error: Not a git repository. Run 'git init' and add your remote first.")
        repo = input("Do you want to run `git init` now? [Y/N]\n> ").strip().upper()
        if repo == 'Y':
            run_cmd("git init")
            remote = input("Enter your GitHub repository remote URL (e.g., https://github.com/user/repo.git):\n> ").strip()
            if remote:
                run_cmd(f"git remote add origin {remote}")
                run_cmd("git branch -M main")
            else:
                return
        else:
            return

    # Ensure clean status of the specific paths to show
    print("\n🔍 Checking git status for articles and images...")
    
    files_to_commit = []
    
    articles_status, out1 = run_cmd("git status src/data/articles --short")
    if articles_status and out1:
        files_to_commit.extend(out1.split("\n"))
        
    images_status, out2 = run_cmd("git status public/images --short")
    if images_status and out2:
        files_to_commit.extend(out2.split("\n"))
        
    if not files_to_commit:
        print("⚠️ Git says there are no new files in src/data/articles/ or public/images/ to commit.")
        print("It's possible they are already committed.")
        choice = input("Mark trackers as DEPLOYED anyway? [Y/N]\n> ").strip().upper()
        if choice == 'Y':
            for item in ready_items:
                item['status'] = 'DEPLOYED'
                item['deployed'] = True
            save_tracker(tracker)
            print("✅ Tracker updated.")
        return

    # 4. Confirmation
    print("\n" + "═"*40)
    print("Files ready to be staged and committed:")
    for f in files_to_commit:
        print(f"  {f}")
        
    commit_msg = f"Auto-publish {len(ready_items)} new articles with images"
    print(f"\nCommit message: \"{commit_msg}\"")
    print("═"*40)
    
    choice = input("Proceed with `git add`, `git commit`, and `git push`? [Y/N]\n> ").strip().upper()
    if choice != 'Y':
        print("❌ Deployment cancelled.")
        return
        
    print("⚙️ Staging files...")
    run_cmd("git add src/data/articles/")
    run_cmd("git add public/images/")
    
    print("⚙️ Committing...")
    commit_ok, commit_err = run_cmd(f'git commit -m "{commit_msg}"')
    if not commit_ok and "nothing to commit" not in commit_err:
        print(f"❌ Commit failed: {commit_err}")
        return
        
    print("🚀 Pushing to origin main (this triggers Cloudflare Pages!)...")
    push_ok, push_err = run_cmd("git push origin main")
    
    if not push_ok:
        print(f"❌ Push failed:\n{push_err}")
        print("Tip: You might need to `git pull` or configure your credentials.")
        return
        
    print("✅ Successfully pushed to GitHub!")
    
    # 6. Update Tracker
    for item in ready_items:
        item['status'] = 'DEPLOYED'
        item['deployed'] = True
        
    save_tracker(tracker)
    print("\n🎉 Cloudflare Pages will build your site in a few moments!")

if __name__ == "__main__":
    main()
