function constantTimeEqual(left: string, right: string): boolean {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  if (leftBytes.length !== rightBytes.length) return false;

  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index] ^ rightBytes[index];
  }
  return difference === 0;
}

export function hasValidProvisioningSecret(
  request: Request,
  configuredSecret: string | undefined,
  bodySecret?: unknown,
): boolean {
  if (!configuredSecret) return false;
  const suppliedSecret = request.headers.get("X-Provisioning-Secret")
    || (typeof bodySecret === "string" ? bodySecret : "");
  return constantTimeEqual(suppliedSecret, configuredSecret);
}
