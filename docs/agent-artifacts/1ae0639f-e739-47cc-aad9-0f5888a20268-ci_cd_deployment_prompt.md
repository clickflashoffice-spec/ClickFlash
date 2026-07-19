# 🚢 The Ultimate DevOps & Release Orchestrator Prompt

**Copy and paste this prompt when the codebase is finished and you want the agent to handle the entire CI/CD pipeline: committing code, merging PRs, deploying to Cloudflare, and running live production tests.**

***

```markdown
<USER_REQUEST>
**Goal:** You are a Principal DevOps Engineer and Release Manager. Your objective is to securely commit, merge, fully test, and deploy the entire 6-app ClickFlash ecosystem to production. You have full access to GitHub CLI (`gh`), git, Cloudflare Wrangler CLI (`wrangler`), and our local build tools.

**Required Skills:** Load and apply the following skills:
- `@git-workflow` (For advanced branching, PR creation, and merging)
- `@performance-engineer` (For monitoring build times and edge deployment performance)
- `@security-auditor` (To ensure secrets/API keys are NOT committed to the repo)

---

### 📋 The Release Pipeline Execution

Create a `task.md` to track this deployment pipeline. Do not stop until the code is merged, deployed to Cloudflare, packaged for desktop, and fully verified by end-to-end tests.

#### **Phase 1: Pre-Flight Monorepo Verification**
1. **Secrets Audit:** Run a fast grep search across the codebase to ensure no Stripe keys, Cloudflare tokens, or local `.env` secrets are accidentally staged.
2. **Build & Lint Check:** Run `turbo run build` and `pnpm run lint:all` across all workspaces. **Block the deployment** if any app fails to build or has strict TypeScript errors.
3. **Unit Tests:** Run `turbo run test`. All local jest/vitest suites must pass.

#### **Phase 2: Git Orchestration & PR Merge**
1. **Commit:** Stage all finalized changes. Write a comprehensive, multi-line conventional commit message summarizing the massive ecosystem updates (e.g., `feat(ecosystem): 360-audit, custom auth, offline editor, and UI overhaul`).
2. **Push & PR:** Push the current branch to origin. Use the `gh` CLI to create a Pull Request against the `main` branch. 
3. **Merge:** Automatically approve and merge the Pull Request into `main`. 
4. **Tagging:** Create and push a new Git release tag (e.g., `v2.0.0-production`).

#### **Phase 3: Cloudflare Global Deployment (The Cloud Apps)**
1. **Cloudflare Workers & D1/R2:** Use the `wrangler` CLI to deploy the edge backend. Ensure the D1 database bindings and R2 storage buckets are correctly linked to the production environment.
2. **Deploy Web Apps:** Deploy `apps/management`, `apps/gallery`, and `apps/website` to Cloudflare Pages. 
3. **Verify Edge:** Wait for the Cloudflare deployment success URLs and verify the pages return HTTP 200.

#### **Phase 4: Desktop Packaging (The Local Apps)**
1. **Electron Build:** Trigger the production packaging for the `apps/master` and `apps/touch` Electron apps (`pnpm run make` or `electron-builder`).
2. **Tauri Build:** Trigger the production build for the `apps/moneytrash` Next.js + Tauri app (`cargo tauri build`).
3. **Artifacts:** Ensure the `.exe` / `.dmg` installers are successfully generated in the `dist/` folders.

#### **Phase 5: Live Production E2E Cross-App Test**
1. **Target Live URLs:** Update the Playwright config to target the **live production URLs** (for the Gallery and Management apps) rather than localhost.
2. **Run The Gauntlet:** Execute `pnpm run test:e2e:prod`. This test suite must simulate:
   - *Master App (Local)* syncing a photo to *Cloudflare D1 (Prod)*.
   - *Management Hub (Prod URL)* seeing the photo data.
   - *Customer Gallery (Prod URL)* displaying the photo and executing a dummy Stripe checkout.
3. **Rollback (If Failed):** If the production E2E tests fail critically, immediately use `git revert` or Cloudflare rollback commands and halt the pipeline.

### 🎯 Directives for the Agent
1. **You Have The Keys:** Assume you have all necessary CLI access (`gh`, `wrangler`, `git`). Just run the terminal commands.
2. **Do Not Ask for Permission:** Unless a terminal command throws a severe error, proceed to the next phase automatically. You are the release orchestrator.
3. **Walkthrough:** Once Phase 5 is green, generate a `walkthrough.md` containing the live production URLs, the git commit hashes, and the test run summary.

Initiate the deployment pipeline starting with Phase 1!
</USER_REQUEST>
```
