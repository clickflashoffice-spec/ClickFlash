import asyncio
import urllib.request
import urllib.error
import subprocess
from google.antigravity import Agent, LocalAgentConfig

# 1. Custom tool to check Edge Node health
def check_edge_node_health() -> str:
    """Pings the ClickFlash Master Studio OS on Port 8090 to check its status.
    
    Returns:
        A string indicating if the server is healthy or unreachable.
    """
    url = "http://localhost:8090"
    try:
        req = urllib.request.Request(url, method="HEAD")
        urllib.request.urlopen(req, timeout=3)
        return "HEALTHY: The Master Studio Edge Node is running on port 8090."
    except urllib.error.URLError:
        return "UNREACHABLE: Connection refused on port 8090. The Edge Node might be down."
    except Exception as e:
        return f"ERROR: {str(e)}"

# 2. Custom tool to check Pull Requests
def check_open_pull_requests() -> str:
    """Checks for open Pull Requests in the ClickFlash repository using the GitHub CLI.
    
    Returns:
        A list of open PRs or a message saying none are open.
    """
    try:
        # Run `gh pr list` using subprocess
        result = subprocess.run(["gh", "pr", "list"], capture_output=True, text=True, check=True)
        if not result.stdout.strip():
            return "No open pull requests at the moment."
        return f"Open Pull Requests:\n{result.stdout}"
    except FileNotFoundError:
        return "ERROR: GitHub CLI ('gh') is not installed or not in PATH."
    except subprocess.CalledProcessError as e:
        return f"ERROR: Failed to fetch PRs. Are you logged in to GitHub? (Error: {e})"

async def monitor_ecosystem():
    # 3. Configure the agent with BOTH tools
    config = LocalAgentConfig(
        tools=[check_edge_node_health, check_open_pull_requests],
        system_instructions=(
            "You are the ClickFlash Ecosystem Monitor. Your job is to verify the "
            "health of the local edge nodes AND summarize open engineering tasks.\n"
            "1. ALWAYS use the `check_edge_node_health` tool first.\n"
            "2. If the node is down, suggest the correct pnpm command to restart it (`pnpm run dev:master`).\n"
            "3. Then, use the `check_open_pull_requests` tool to see if there is pending work.\n"
            "4. Provide a unified status report."
        )
    )
    
    # 4. Spin up the agent
    print("🤖 Starting ClickFlash Ecosystem Agent...\n")
    async with Agent(config) as agent:
        
        response = await agent.chat("Please perform a routine health check on our Edge Node and check for open PRs.")
        
        print("Agent Response:")
        print("-" * 40)
        async for chunk in response.stream():
            print(chunk, end="", flush=True)
        print("\n" + "-" * 40)

if __name__ == "__main__":
    asyncio.run(monitor_ecosystem())
