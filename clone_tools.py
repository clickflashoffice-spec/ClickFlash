import subprocess
import os
import sys

def clone_repo(url, dest):
    print(f"Cloning {url} to {dest}...")
    try:
        if not os.path.exists(dest):
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            subprocess.run(["git", "clone", "--depth", "1", url, dest], check=True)
            print(f"Successfully cloned {url}")
        else:
            print(f"Destination {dest} already exists.")
    except Exception as e:
        print(f"Failed to clone {url}: {e}")

if __name__ == "__main__":
    repos = [
        ("https://github.com/CaviraOSS/OpenMemory", ".agent/tools/OpenMemory"),
        ("https://github.com/router-for-me/CLIProxyAPI", ".agent/tools/CLIProxyAPI")
    ]
    
    for url, dest in repos:
        clone_repo(url, dest)
