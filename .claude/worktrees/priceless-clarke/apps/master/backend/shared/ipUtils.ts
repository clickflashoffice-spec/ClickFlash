export const isPrivateIp = (ip: string): boolean => {
  if (!ip) return false;
  // Localhost
  if (ip === '127.0.0.1' || ip === '::1' || ip.includes('localhost')) return true;
  // Private ranges
  return (
    /^10\./.test(ip) ||           // 10.0.0.0 - 10.255.255.255
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip) || // 172.16.0.0 - 172.31.255.255
    /^192\.168\./.test(ip) ||      // 192.168.0.0 - 192.168.255.255
    /^::ffff:10\./.test(ip) ||
    /^::ffff:172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip) ||
    /^::ffff:192\.168\./.test(ip)
  );
};
