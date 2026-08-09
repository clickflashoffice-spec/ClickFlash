import os
import subprocess
import time

# Configuration
# Ensure this is executed from the root of the Clickflash deep dive repository
PROJECT_DIR = os.getcwd() 
MAX_LOOPS = 50

def run_antigravity_agent(prompt):
    print(f"[🤖 Loop] Sending autonomous command to Antigravity...")
    
    # Passing arguments as a list prevents shell injection and quote escaping errors
    cmd = [
        "antigravity", "run", 
        "--prompt", prompt, 
        "--allow-execute", 
        "--auto-approve"
    ]
    
    # shell=False is safer and more reliable for CLI wrappers
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.stdout, result.stderr

def main():
    # Base system instruction strictly enforcing build rules and exclusions
    base_prompt = (
        "Analyze the entire project repository context. "
        "Execute code fixes iteratively until no errors remain for the Web and Electron builds only. "
        "Strictly ignore and skip any tasks related to UI/UX modifications or NSIS installer generation. "
        "After every execution cycle, update README.md and all project .md documentation "
        "reflecting what was built, fixed, and changing state."
    )
    
    current_prompt = base_prompt
    loop_count = 0
    
    while loop_count < MAX_LOOPS:
        loop_count += 1
        print(f"\n🔄 --- STARTING AUTONOMOUS LOOP CYCLE {loop_count} ---")
        
        stdout, stderr = run_antigravity_agent(current_prompt)
        
        # Log management
        with open("antigravity_loop.log", "a", encoding="utf-8") as log_file:
            log_file.write(f"\n--- Cycle {loop_count} ---\nSTDOUT:\n{stdout}\nSTDERR:\n{stderr}\n")
            
        if "SUCCESS" in stdout or "Objectives met" in stdout:
            print("✅ [Loop] Antigravity successfully completed the goals autonomously!")
            break
            
        if stderr.strip() or "Error" in stdout:
            print("⚠️ [Loop] Imperfection found. Re-feeding logs back into loop for auto-fix...")
            # Feed the error back into the agent while reinforcing the strict base rules
            current_prompt = f"{base_prompt}\n\nFix the following errors encountered in the previous loop:\nSTDERR: {stderr}\nSTDOUT: {stdout}"
        else:
            print("🔍 [Loop] Scanning for next tasks...")
            current_prompt = f"{base_prompt}\n\nScan directory for any incomplete offline synchronization features, optimize code, and maintain .md docs."
            
        time.sleep(3) # Prevent API rate throttling and high CPU spikes

if __name__ == "__main__":
    main()
