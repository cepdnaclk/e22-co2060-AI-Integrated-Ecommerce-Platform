#!/usr/bin/env python3
"""
Execute test steps and capture output
"""
import subprocess
import sys
import os

def run_command(cmd, description=""):
    """Run a command and return output"""
    if description:
        print(f"\n{'='*60}")
        print(f"  {description}")
        print(f"{'='*60}")
    
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=True,
            timeout=300
        )
        output = result.stdout + result.stderr
        print(output)
        return result.returncode, output
    except Exception as e:
        error_msg = f"ERROR: {e}"
        print(error_msg)
        return 1, error_msg

# Change to project directory
os.chdir(r"D:\AI-ML-2yp\e22-co2060-AI-Integrated-Ecommerce-Platform")

print("\n" + "="*60)
print("  PYTHON ENVIRONMENT AND DEPENDENCY CHECK")
print("="*60)

# Step 1: Check Python version
exit_code, python_version_output = run_command(
    "python --version",
    "STEP 1: Check Python Version"
)

# Step 2: Check installed packages
exit_code, pip_list_output = run_command(
    'python -m pip list | findstr /E "(requests|pymongo)"',
    "STEP 2: Check Installed Packages"
)

# Step 3: Install missing packages
print("\n" + "="*60)
print("  STEP 3: Install Missing Dependencies")
print("="*60)

installed_packages = []

# Check and install requests
exit_code, _ = run_command(
    'python -m pip list 2>&1 | findstr "requests"',
    ""
)
if exit_code != 0:
    print("Installing requests...")
    run_command("python -m pip install requests", "")
    installed_packages.append("requests")
    print("✓ requests installed")
else:
    print("✓ requests already installed")

# Check and install pymongo
exit_code, _ = run_command(
    'python -m pip list 2>&1 | findstr "pymongo"',
    ""
)
if exit_code != 0:
    print("Installing pymongo...")
    run_command("python -m pip install pymongo", "")
    installed_packages.append("pymongo")
    print("✓ pymongo installed")
else:
    print("✓ pymongo already installed")

# Step 4: Run the test script
exit_code, test_output = run_command(
    "python test-dms-qr.py",
    "STEP 4: Run Test Script"
)

# Generate report
print("\n" + "="*60)
print("  FINAL REPORT")
print("="*60)

# Extract Python version from output
python_version = python_version_output.strip() if python_version_output else "Unknown"
print(f"\nPython version: {python_version}")

if installed_packages:
    print(f"Missing packages installed: {', '.join(installed_packages)}")
else:
    print("Missing packages installed: None (all already installed)")

if exit_code == 0:
    print(f"Test result: PASS")
else:
    print(f"Test result: FAIL (exit code: {exit_code})")
    print("\nTest output (errors):")
    print(test_output[-1000:] if len(test_output) > 1000 else test_output)

sys.exit(exit_code)
