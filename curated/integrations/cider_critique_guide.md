## ClickFlash PR Critique Guide
When reviewing Pull Requests, enforce the following:
1. Did the author accidentally add UI to the Headless Master OS? Reject if true.
2. Are they using actual Redis commands instead of the DbWriteQueue.ts SQLite wrapper? Reject if true.
3. Is clickflash-rust-core being invoked safely with fallbacks?
4. Ensure no hardcoded credentials for AWS/Cloudflare exist in the diff.
