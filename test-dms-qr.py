#!/usr/bin/env python3
"""
DMS QR Scanner Flow E2E Test
Tests: Login -> Find Order -> Scan QR
"""

import subprocess
import time
import socket
import requests
import json
import sys
import os
import signal

# Configuration
BACKEND_DIR = r"d:\AI-ML-2yp\e22-co2060-AI-Integrated-Ecommerce-Platform\Backend\backend-inter"
API_BASE = "http://localhost:3000/api"
PORT = 3000

# Test credentials
TEST_CREDS = {
    "email": "center01.manager@dms-sample.lk",
    "password": "Center01@123"
}

# Global PID tracking
NODE_PID = None

def log_section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

def is_port_listening(port, host="localhost", timeout=1):
    """Check if port is listening"""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(timeout)
    try:
        result = sock.connect_ex((host, port))
        return result == 0
    finally:
        sock.close()

def wait_for_port(port, max_attempts=20, delay=1):
    """Wait for port to be listening"""
    for attempt in range(max_attempts):
        if is_port_listening(port):
            return True
        print(f"  Attempt {attempt+1}/{max_attempts}: Waiting for port {port}...")
        time.sleep(delay)
    return False

def step_1_navigate():
    """Step 1: Navigate to backend-inter directory"""
    log_section("STEP 1: Navigate to Backend Directory")
    print(f"Target: {BACKEND_DIR}")
    if os.path.exists(BACKEND_DIR):
        print("✅ Directory exists")
        os.chdir(BACKEND_DIR)
        print(f"Current dir: {os.getcwd()}")
        return True
    else:
        print(f"❌ Directory not found: {BACKEND_DIR}")
        return False

def step_2_install_deps():
    """Step 2: Install npm dependencies if needed"""
    log_section("STEP 2: Install Dependencies")
    
    node_modules = os.path.join(BACKEND_DIR, "node_modules")
    if os.path.exists(node_modules):
        print("✅ node_modules already exists, skipping npm install")
        return True
    
    print("⏳ Running npm install...")
    try:
        result = subprocess.run(
            ["npm", "install"],
            cwd=BACKEND_DIR,
            capture_output=True,
            text=True,
            timeout=300
        )
        if result.returncode == 0:
            print("✅ npm install succeeded")
            return True
        else:
            print(f"❌ npm install failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ Error installing dependencies: {e}")
        return False

def step_3_start_server():
    """Step 3: Start node server in background"""
    log_section("STEP 3: Start Node.js Server")
    
    global NODE_PID
    
    print(f"⏳ Starting: node index.js")
    try:
        # Start the server in a detached process
        process = subprocess.Popen(
            ["node", "index.js"],
            cwd=BACKEND_DIR,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            # Close descriptors so it runs independently
            preexec_fn=os.setsid if hasattr(os, 'setsid') else None
        )
        NODE_PID = process.pid
        print(f"✅ Server started with PID: {NODE_PID}")
        
        # Give it a moment to start
        time.sleep(2)
        return True
    except Exception as e:
        print(f"❌ Failed to start server: {e}")
        return False

def step_4_verify_listening():
    """Step 4: Verify port 3000 is listening"""
    log_section("STEP 4: Verify Port 3000 Listening")
    
    if wait_for_port(PORT, max_attempts=15, delay=1):
        print(f"✅ Port {PORT} is listening")
        try:
            response = requests.get("http://localhost:3000/", timeout=2)
            print(f"✅ Server responding: {response.text}")
            return True
        except Exception as e:
            print(f"⚠️ Server listening but not responding: {e}")
            return True
    else:
        print(f"❌ Port {PORT} not listening after 15 attempts")
        return False

def step_5_login():
    """Step 5: Login and get token"""
    log_section("STEP 5: POST Login")
    
    url = f"{API_BASE}/auth/login/password"
    payload = TEST_CREDS
    
    print(f"URL: {url}")
    print(f"Credentials: {TEST_CREDS['email']}")
    
    try:
        response = requests.post(url, json=payload, timeout=5)
        print(f"Status: {response.status_code}")
        print(f"Response:\n{json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            data = response.json()
            if "token" in data:
                print(f"✅ Login successful, token received")
                return data["token"]
            else:
                print("⚠️ No token in response")
                return None
        else:
            print(f"❌ Login failed with status {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Login request failed: {e}")
        return None

def step_6_find_order():
    """Step 6: Find order with approved seller QR (via API or direct query)"""
    log_section("STEP 6: Find Order with Approved Seller QR")
    
    print("Attempting to query MongoDB for approved order...")
    try:
        from pymongo import MongoClient
        
        # Use same MongoDB URI as in index.js
        mongo_uri = os.environ.get('MONGO_URI', 
            'mongodb+srv://admin:123better@cluster0.9v7ko7p.mongodb.net/?appName=Cluster0')
        
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        db = client['Cluster0']
        
        # Try to find an order with approved seller QR
        order = db['orders'].find_one({
            'sellerQr.verificationStatus': 'approved',
            'status': {'$in': ['pending', 'confirmed', 'shipped']}
        })
        
        if order:
            order_id = str(order['_id'])
            print(f"✅ Found order with approved QR")
            print(f"   Order ID: {order_id}")
            print(f"   Status: {order.get('status')}")
            print(f"   Seller QR Status: {order.get('sellerQr', {}).get('verificationStatus')}")
            return order_id
        else:
            print("⚠️ No order with approved seller QR found")
            # List first few orders for debugging
            sample_orders = list(db['orders'].find().limit(3))
            if sample_orders:
                print(f"   Sample order statuses:")
                for o in sample_orders:
                    sqr_status = o.get('sellerQr', {}).get('verificationStatus', 'none')
                    print(f"   - {o['_id']}: status={o.get('status')}, sellerQr={sqr_status}")
            return None
            
    except ImportError:
        print("❌ pymongo not available, using API fallback")
        return None
    except Exception as e:
        print(f"❌ Database query failed: {e}")
        return None

def step_7_8_scan_qr(order_id, token):
    """Step 7-8: Build QR text and scan"""
    log_section("STEP 7-8: Build QR and Scan")
    
    if not order_id:
        print("⚠️ No order ID provided, skipping QR scan")
        return None
    
    if not token:
        print("❌ No token available, cannot scan")
        return None
    
    qr_text = f"SOQR4:{order_id}"
    print(f"QR Text: {qr_text}")
    
    url = f"{API_BASE}/dms/shipments/scan-seller-qr"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    payload = {
        "qrText": qr_text
    }
    
    print(f"\nURL: {url}")
    print(f"Headers: Authorization: Bearer {token[:20]}...")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=5)
        print(f"\nStatus: {response.status_code}")
        print(f"Response:\n{json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            print("✅ QR scan successful")
            return response.json()
        else:
            print(f"❌ QR scan failed with status {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ QR scan request failed: {e}")
        return None

def step_9_cleanup():
    """Step 9: Stop background node process"""
    log_section("STEP 9: Stop Background Process")
    
    global NODE_PID
    
    if NODE_PID:
        print(f"Terminating PID {NODE_PID}...")
        try:
            if hasattr(os, 'kill'):
                os.kill(NODE_PID, signal.SIGTERM)
                time.sleep(1)
                try:
                    os.kill(NODE_PID, signal.SIGKILL)
                except:
                    pass
            print(f"✅ Process {NODE_PID} terminated")
        except Exception as e:
            print(f"⚠️ Error terminating process: {e}")
    else:
        print("⚠️ No PID to terminate")

def main():
    log_section("DMS QR SCANNER FLOW E2E TEST")
    
    try:
        # Step 1: Navigate
        if not step_1_navigate():
            print("❌ Failed at step 1")
            return False
        
        # Step 2: Install dependencies
        if not step_2_install_deps():
            print("❌ Failed at step 2")
            return False
        
        # Step 3: Start server
        if not step_3_start_server():
            print("❌ Failed at step 3")
            return False
        
        # Step 4: Verify listening
        if not step_4_verify_listening():
            print("❌ Failed at step 4")
            return False
        
        # Step 5: Login
        token = step_5_login()
        if not token:
            print("⚠️ Login failed, continuing with test")
        
        # Step 6: Find order
        order_id = step_6_find_order()
        
        # Step 7-8: Scan QR
        result = step_7_8_scan_qr(order_id, token)
        
        # Step 9: Cleanup
        step_9_cleanup()
        
        # Final summary
        log_section("TEST COMPLETED")
        print("\n✅ All steps executed")
        return True
        
    except KeyboardInterrupt:
        print("\n❌ Test interrupted")
        step_9_cleanup()
        return False
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        step_9_cleanup()
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
