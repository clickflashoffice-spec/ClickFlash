param (
    [Parameter(Mandatory=$true)][string]$BranchName,
    [Parameter(Mandatory=$true)][string]$TaskName
)

$WorktreePath = "../ClickFlash-Worktrees/$TaskName"
Write-Host "[GitOps] Spawning isolated worktree at $WorktreePath for branch $BranchName"

git worktree add -b $BranchName $WorktreePath main
Write-Host "[GitOps] Worktree ready. Agents should cd into $WorktreePath to perform risky operations."
