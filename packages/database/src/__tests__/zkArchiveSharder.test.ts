import { describe, it, expect } from 'vitest';
import { ZkArchiveSharder } from '../zkArchiveSharder';

describe('ZkArchiveSharder', () => {
  it('generates a 12-shard (8 data + 4 parity) manifest with Merkle roots and ZK proofs', () => {
    const totalBytes = 80000000; // 80 MB cold batch
    const manifest = ZkArchiveSharder.shardArchive('archive-season-2026', totalBytes);

    expect(manifest.archiveId).toBe('archive-season-2026');
    expect(manifest.erasureCoding.dataShards).toBe(8);
    expect(manifest.erasureCoding.parityShards).toBe(4);
    expect(manifest.erasureCoding.totalShards).toBe(12);
    expect(manifest.shards).toHaveLength(12);
    expect(manifest.merkleRoot).toContain('merkle_root_0x');
    expect(manifest.zkPossessionProof).toContain('zk_snark_proof_possession');
  });

  it('validates reconstruction feasibility when at least 8 shards are available', () => {
    const manifest = ZkArchiveSharder.shardArchive('archive-season-2026', 80000000);

    // 8 shards available (exact minimum threshold)
    expect(ZkArchiveSharder.canReconstruct(manifest, [0, 1, 2, 3, 4, 5, 6, 7])).toBe(true);

    // 9 shards available (including parity)
    expect(ZkArchiveSharder.canReconstruct(manifest, [0, 2, 4, 6, 8, 9, 10, 11, 1])).toBe(true);

    // 7 shards available (below threshold)
    expect(ZkArchiveSharder.canReconstruct(manifest, [0, 1, 2, 3, 4, 5, 6])).toBe(false);
  });
});
