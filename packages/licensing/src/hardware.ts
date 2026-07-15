import si from 'systeminformation';
import { createHash } from 'node:crypto';

export async function getMachineFingerprint(): Promise<string> {
  try {
    const [cpu, network] = await Promise.all([
      si.cpu(),
      si.networkInterfaces()
    ]);

    // Use CPU brand and physical cores as part of fingerprint
    const cpuInfo = `${cpu.brand}-${cpu.physicalCores}`;
    
    // Find the first default network interface MAC address
    let mac = '00:00:00:00:00:00';
    if (Array.isArray(network)) {
      const defaultIface = network.find(n => n.default) || network[0];
      if (defaultIface && defaultIface.mac) {
        mac = defaultIface.mac;
      }
    }

    const rawFingerprint = `${cpuInfo}|${mac}`;
    
    // SHA-256 hash to create a clean fingerprint string
    return createHash('sha256').update(rawFingerprint).digest('hex');
  } catch (err) {
    throw new Error('Failed to generate machine fingerprint: ' + err);
  }
}
