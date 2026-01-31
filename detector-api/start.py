"""
Chess Detection App Launcher
Runs all services with a single command:
- Detection API (FastAPI on port 8000)
- Screen Capture Tool (tkinter GUI)
"""

import subprocess
import sys
import time
import threading
from pathlib import Path


def run_api():
    """Run the detection API in background."""
    print("[Launcher] Starting Detection API on port 8000...")
    import uvicorn
    from main import app
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")


def run_screen_capture():
    """Run the screen capture GUI."""
    print("[Launcher] Starting Screen Capture Tool...")
    time.sleep(3)  # Wait for API to start
    subprocess.run(
        [sys.executable, "screen_capture.py"],
        cwd=Path(__file__).parent
    )


if __name__ == "__main__":
    print("=" * 50)
    print("  Chess Detection Launcher")
    print("=" * 50)
    print()
    print("This will start:")
    print("  1. Detection API (port 8000)")
    print("  2. Screen Capture Tool (GUI)")
    print()
    print("Make sure you run 'npm run dev' in another terminal")
    print("for the webapp at http://localhost:3000")
    print()
    print("=" * 50)
    
    # Start API in background thread
    api_thread = threading.Thread(target=run_api, daemon=True)
    api_thread.start()
    
    # Run screen capture in main thread (tkinter needs main thread)
    run_screen_capture()
