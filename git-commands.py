#!/usr/bin/env python3
import subprocess
import os
import sys

repo_dir = r'd:\AI-ML-REPO\e22-co2060-AI-Integrated-Ecommerce-Platform'
output_file = os.path.join(repo_dir, 'git-output.txt')

# Redirect all output to file
class Tee:
    def __init__(self, filepath):
        self.file = open(filepath, 'w', encoding='utf-8')
        self.stdout = sys.stdout
    def write(self, data):
        self.file.write(data)
        self.stdout.write(data)
    def flush(self):
        self.file.flush()
        self.stdout.flush()

sys.stdout = Tee(output_file)

print(f"=== Changing to repo directory ===")
print(f"Directory: {repo_dir}\n")

os.chdir(repo_dir)

# Command 1: git log --oneline origin/dev_yuneth..HEAD
print("=== Command 1: git log --oneline origin/dev_yuneth..HEAD ===")
try:
    result = subprocess.run(
        ['git', 'log', '--oneline', 'origin/dev_yuneth..HEAD'],
        cwd=repo_dir,
        capture_output=True,
        text=True
    )
    if result.returncode == 0:
        print(result.stdout)
    else:
        print(f"Error: {result.stderr}")
except Exception as e:
    print(f"Exception: {e}")

# Command 2: Find large objects
print("\n=== Command 2: Finding large objects (git rev-list) ===")
try:
    # First get the rev-list
    result1 = subprocess.run(
        ['git', 'rev-list', '--objects', '--all'],
        cwd=repo_dir,
        capture_output=True,
        text=True
    )
    
    if result1.returncode == 0:
        rev_list_output = result1.stdout
        
        # Process with cat-file
        result2 = subprocess.run(
            ['git', 'cat-file', '--batch-check=%(objecttype) %(objectname) %(objectsize) %(rest)'],
            cwd=repo_dir,
            input=rev_list_output,
            capture_output=True,
            text=True
        )
        
        if result2.returncode == 0:
            # Parse and sort by size
            lines = [l.strip() for l in result2.stdout.split('\n') if l.strip()]
            objects = []
            
            for line in lines:
                parts = line.split(' ', 3)
                if len(parts) >= 3:
                    try:
                        obj_type = parts[0]
                        obj_hash = parts[1]
                        obj_size = int(parts[2])
                        obj_rest = parts[3] if len(parts) > 3 else ''
                        objects.append({
                            'type': obj_type,
                            'hash': obj_hash,
                            'size': obj_size,
                            'rest': obj_rest
                        })
                    except (ValueError, IndexError):
                        pass
            
            # Sort by size descending
            objects.sort(key=lambda x: x['size'], reverse=True)
            
            # Show top 20
            print("Top 20 largest objects:")
            print(f"{'Type':<10} {'Size':>10} {'Hash':<40} {'Path'}")
            print("-" * 90)
            for obj in objects[:20]:
                print(f"{obj['type']:<10} {obj['size']:>10} {obj['hash']:<40} {obj['rest']}")
        else:
            print(f"Error in cat-file: {result2.stderr}")
    else:
        print(f"Error in rev-list: {result1.stderr}")
except Exception as e:
    print(f"Exception: {e}")

# Command 3: git diff-tree for specific commit
print("\n=== Command 3: git diff-tree --no-commit-id -r d36bd8970f5f62fd4791d18cdf22061d9a975ccd ===")
try:
    result = subprocess.run(
        ['git', 'diff-tree', '--no-commit-id', '-r', 'd36bd8970f5f62fd4791d18cdf22061d9a975ccd'],
        cwd=repo_dir,
        capture_output=True,
        text=True
    )
    if result.returncode == 0:
        print(result.stdout)
    else:
        print(f"Error: {result.stderr}")
except Exception as e:
    print(f"Exception: {e}")

print("\n=== Done ===")
