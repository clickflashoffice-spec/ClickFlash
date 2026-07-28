# ClickFlash Ride Node

The Ride Node captures DSLR images and uploads them to Cloudflare R2. Local capture files are deleted only after R2 acknowledges the same byte length and SHA-256 checksum. Any missing configuration, upload error, checksum mismatch, or ambiguous acknowledgement keeps the local source for recovery.

Configure these values through the runtime secret manager or service environment:

- `R2_ENDPOINT_URL`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `R2_PREFIX` (optional; defaults to `ride-captures`)

Run the data-safety tests with:

```bash
python -m unittest discover -s tests -v
```
