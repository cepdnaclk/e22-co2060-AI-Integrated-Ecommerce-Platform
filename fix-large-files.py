#!/usr/bin/env python3
"""
Fix script to remove large files (AI-ML/venv/) from unpushed commits
and push to GitHub.

The AI-ML/venv/ directory (~1GB+ of binaries) was accidentally committed.
This script:
1. Soft-resets to origin/dev_yuneth (keeps all file changes staged)
2. Removes venv and __pycache__ from git index (not from disk)
3. Creates a clean commit without the large files
4. Pushes to GitHub
"""
import subprocess
import sys
import os

repo_dir = r'd:\AI-ML-REPO\e22-co2060-AI-Integrated-Ecommerce-Platform'
os.chdir(repo_dir)

def run(cmd, check=True):
    print(f"  $ {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=repo_dir)
    if result.stdout.strip():
        print(f"    {result.stdout.strip()[:500]}")
    if result.returncode != 0 and check:
        print(f"    ERROR: {result.stderr.strip()[:500]}")
        sys.exit(1)
    return result

print("=" * 60)
print("FIX: Remove large files from unpushed commits")
print("=" * 60)

# Step 0: Safety backup
print("\n[Step 0] Creating safety backup branch...")
run(['git', 'branch', '-f', 'backup_before_fix', 'HEAD'])

# Step 1: Check current state
print("\n[Step 1] Current state:")
run(['git', '--no-pager', 'log', '--oneline', 'origin/dev_yuneth..HEAD'])

# Step 2: Soft reset to origin/dev_yuneth
print("\n[Step 2] Soft-resetting to origin/dev_yuneth (keeps changes staged)...")
run(['git', 'reset', '--soft', 'origin/dev_yuneth'])

# Step 3: Remove venv and __pycache__ from git index
print("\n[Step 3] Removing AI-ML/venv/ and AI-ML/__pycache__/ from git index...")
run(['git', 'rm', '-r', '--cached', 'AI-ML/venv/'], check=False)
run(['git', 'rm', '-r', '--cached', 'AI-ML/__pycache__/'], check=False)

# Step 4: Update .gitignore to prevent this from happening again
gitignore_path = os.path.join(repo_dir, '.gitignore')
with open(gitignore_path, 'r') as f:
    content = f.read()

needs_update = False
additions = []
if 'AI-ML/venv/' not in content:
    additions.append('AI-ML/venv/')
    needs_update = True
if 'AI-ML/__pycache__/' not in content:
    additions.append('AI-ML/__pycache__/')
    needs_update = True

if needs_update:
    print(f"\n[Step 4] Updating .gitignore with: {additions}")
    with open(gitignore_path, 'a') as f:
        for item in additions:
            f.write(f'\n{item}')
    run(['git', 'add', '.gitignore'])
else:
    print("\n[Step 4] .gitignore already covers venv/ patterns")

# Step 5: Create clean commit
print("\n[Step 5] Creating clean commit (without large files)...")
run(['git', 'commit', '-m', 'feat: AI face authentication, admin features, and UI improvements\n\n- Add face recognition authentication (AI-ML module)\n- Implement admin product management\n- Add admin login with session verification\n- UI improvements and bug fixes\n\nNote: Removed accidentally committed venv/ directory'])

# Step 6: Verify
print("\n[Step 6] Verifying - checking for large blobs in new commit...")
result = run(['git', '--no-pager', 'log', '--oneline', 'origin/dev_yuneth..HEAD'])

# Check sizes of objects in new commits
print("\n[Step 7] Checking object sizes in new commits...")
rev_result = run(['git', 'rev-list', '--objects', 'origin/dev_yuneth..HEAD'])
if rev_result.stdout.strip():
    cat_result = subprocess.run(
        ['git', 'cat-file', '--batch-check=%(objecttype) %(objectname) %(objectsize) %(rest)'],
        input=rev_result.stdout,
        capture_output=True,
        text=True,
        cwd=repo_dir
    )
    if cat_result.returncode == 0:
        lines = cat_result.stdout.strip().split('\n')
        large_files = []
        for line in lines:
            parts = line.split(' ', 3)
            if len(parts) >= 3:
                try:
                    size = int(parts[2])
                    if size > 50_000_000:  # 50MB
                        large_files.append((size, parts[3] if len(parts) > 3 else 'unknown'))
                except (ValueError, IndexError):
                    pass
        
        if large_files:
            print(f"\n  WARNING: Still have {len(large_files)} file(s) > 50MB:")
            for size, path in sorted(large_files, reverse=True):
                print(f"    {size/1024/1024:.1f}MB - {path}")
            print("\n  Push may still fail. Consider using Git LFS for these files.")
        else:
            print("  ✓ No files > 50MB found in new commits!")

# Step 8: Push
print("\n[Step 8] Pushing to origin/dev_yuneth...")
push_result = run(['git', 'push', 'origin', 'dev_yuneth'], check=False)
if push_result.returncode == 0:
    print("\n" + "=" * 60)
    print("SUCCESS! Pushed to GitHub successfully.")
    print("=" * 60)
else:
    print(f"\n  Push failed: {push_result.stderr.strip()[:500]}")
    print("\n  If it says 'non-fast-forward', you may need:")
    print("    git push --force-with-lease origin dev_yuneth")
    print("\n  If files are still too large, you may need Git LFS.")

print(f"\n  Safety backup branch: backup_before_fix")
print(f"  To restore if needed: git reset --hard backup_before_fix")
