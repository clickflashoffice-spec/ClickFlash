import { LanSyncBroker, CRDTLogEntry } from '../../services/lanSyncBroker';

describe('LanSyncBroker', () => {
  let broker: LanSyncBroker;

  beforeEach(() => {
    broker = LanSyncBroker.getInstance();
  });

  afterEach(async () => {
    await broker.stop();
  });

  it('should record and deduplicate mutations based on timestamp', () => {
    const entry1: CRDTLogEntry = {
      id: 'mut-1',
      entityType: 'order',
      entityId: 'ord-100',
      mutationType: 'create',
      data: { total: 50 },
      timestamp: 1000,
      nodeId: 'kiosk-1'
    };

    const entry2Older: CRDTLogEntry = {
      ...entry1,
      timestamp: 500,
      data: { total: 40 }
    };

    const entry3Newer: CRDTLogEntry = {
      ...entry1,
      timestamp: 2000,
      data: { total: 60 }
    };

    broker.recordMutation(entry1);
    broker.recordMutation(entry2Older); // Should be ignored (older)
    broker.recordMutation(entry3Newer); // Should update (newer)

    const result = broker.reconcileCRDTLogs('kiosk-2', [], 0);
    expect(result.deltaLogs).toHaveLength(1);
    expect(result.deltaLogs[0].data.total).toBe(60);
  });

  it('should return delta mutations for peers during reconciliation', () => {
    const mutA: CRDTLogEntry = {
      id: 'mut-A',
      entityType: 'photo',
      entityId: 'photo-1',
      mutationType: 'create',
      data: { filename: 'IMG_0001.jpg' },
      timestamp: 1500,
      nodeId: 'kiosk-1'
    };

    const mutB: CRDTLogEntry = {
      id: 'mut-B',
      entityType: 'photo',
      entityId: 'photo-2',
      mutationType: 'create',
      data: { filename: 'IMG_0002.jpg' },
      timestamp: 2500,
      nodeId: 'master'
    };

    broker.recordMutation(mutA);
    broker.recordMutation(mutB);

    // Kiosk-1 requests reconciliation since timestamp 1000
    // Should NOT get mutA (because mutA originated from kiosk-1), but SHOULD get mutB
    const reconcileResult = broker.reconcileCRDTLogs('kiosk-1', [], 1000);
    expect(reconcileResult.deltaLogs).toHaveLength(1);
    expect(reconcileResult.deltaLogs[0].id).toBe('mut-B');
  });

  it('should apply client logs during reconciliation', () => {
    const clientLog: CRDTLogEntry = {
      id: 'mut-client-1',
      entityType: 'session',
      entityId: 'sess-1',
      mutationType: 'update',
      data: { customerName: 'John Doe' },
      timestamp: 3000,
      nodeId: 'kiosk-99'
    };

    const result = broker.reconcileCRDTLogs('kiosk-99', [clientLog], 0);
    expect(result.appliedCount).toBe(1);

    // Verify it is now in Master state for other kiosks
    const otherKioskCheck = broker.reconcileCRDTLogs('kiosk-other', [], 0);
    expect(otherKioskCheck.deltaLogs.some(d => d.id === 'mut-client-1')).toBe(true);
  });
});
