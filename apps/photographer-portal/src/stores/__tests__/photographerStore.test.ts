import { describe, it, expect, beforeEach } from 'vitest';
import { usePhotographerStore } from '../photographerStore';
import type { UploadBatchItem } from '@clickflash/types';

describe('usePhotographerStore', () => {
  beforeEach(() => {
    usePhotographerStore.setState({
      session: {
        photographerId: 'photog_test_01',
        photographerName: 'Test Pro',
        token: 'token_123',
        activeEventName: 'Grand Opening',
        activeAccessCode: 'OPEN2026',
      },
      batch: [],
      stats: {
        totalUploaded: 0,
        totalKeepers: 0,
        guestViews: 0,
        completedOrders: 0,
        earnedCommissionsCents: 0,
        payoutStatus: 'connected',
      },
      isUploading: false,
    });
  });

  it('updates event details correctly', () => {
    const { updateEventDetails } = usePhotographerStore.getState();
    updateEventDetails('VIP Coaster Gala', 'VIP999', 'WB-404');

    const session = usePhotographerStore.getState().session;
    expect(session?.activeEventName).toBe('VIP Coaster Gala');
    expect(session?.activeAccessCode).toBe('VIP999');
    expect(session?.activeWristbandId).toBe('WB-404');
  });

  it('adds items to batch and toggles keeper status', () => {
    const { addFilesToBatch, toggleKeeper } = usePhotographerStore.getState();

    const mockItem: UploadBatchItem = {
      id: 'batch_item_1',
      file: new File(['fake-bytes'], 'img1.jpg', { type: 'image/jpeg' }),
      previewUrl: 'blob://test/img1.jpg',
      fileName: 'img1.jpg',
      fileSize: 1024,
      sharpnessScore: 92,
      isKeeper: true,
      status: 'pending',
      progress: 0,
    };

    addFilesToBatch([mockItem]);
    expect(usePhotographerStore.getState().batch).toHaveLength(1);
    expect(usePhotographerStore.getState().batch[0].isKeeper).toBe(true);

    toggleKeeper('batch_item_1');
    expect(usePhotographerStore.getState().batch[0].isKeeper).toBe(false);
  });

  it('filters out completed items when clearing batch', () => {
    const { addFilesToBatch, clearCompletedBatch } = usePhotographerStore.getState();

    addFilesToBatch([
      {
        id: 'item_pending',
        file: new File([''], 'p.jpg'),
        previewUrl: 'blob://p.jpg',
        fileName: 'p.jpg',
        fileSize: 512,
        sharpnessScore: 85,
        isKeeper: true,
        status: 'pending',
        progress: 0,
      },
      {
        id: 'item_completed',
        file: new File([''], 'c.jpg'),
        previewUrl: 'blob://c.jpg',
        fileName: 'c.jpg',
        fileSize: 512,
        sharpnessScore: 90,
        isKeeper: true,
        status: 'completed',
        progress: 100,
      },
    ]);

    expect(usePhotographerStore.getState().batch).toHaveLength(2);
    clearCompletedBatch();
    expect(usePhotographerStore.getState().batch).toHaveLength(1);
    expect(usePhotographerStore.getState().batch[0].id).toBe('item_pending');
  });

  it('updates stats and commissions', () => {
    const { setStats } = usePhotographerStore.getState();
    setStats({ totalUploaded: 50, earnedCommissionsCents: 15000 });

    const stats = usePhotographerStore.getState().stats;
    expect(stats.totalUploaded).toBe(50);
    expect(stats.earnedCommissionsCents).toBe(15000);
  });
});
