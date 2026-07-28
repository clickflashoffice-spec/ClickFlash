import { beforeEach, describe, expect, it, vi } from 'vitest';

const desktopMocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  isDesktop: vi.fn(() => true),
}));

vi.mock('../tauriService', () => desktopMocks);

import { DesktopBatchUploadService } from '../desktopBatchUploadService';

describe('DesktopBatchUploadService cancellation', () => {
  beforeEach(() => {
    localStorage.clear();
    desktopMocks.invoke.mockReset();
    desktopMocks.isDesktop.mockReturnValue(true);
  });

  it('uses a stable native session id and aborts it when the job is cancelled', async () => {
    let rejectUpload: ((reason?: unknown) => void) | undefined;
    desktopMocks.invoke.mockImplementation((command: string) => {
      if (command === 'start_native_upload') {
        return new Promise((_resolve, reject) => {
          rejectUpload = reject;
        });
      }
      if (command === 'cancel_upload') {
        rejectUpload?.(new Error('cancelled by test'));
        return Promise.resolve(true);
      }
      return Promise.resolve(undefined);
    });

    const service = new DesktopBatchUploadService();
    const file = new File([], 'photo.jpg', { type: 'image/jpeg' });
    const jobId = service.createJob([file], {
      eventName: 'Wedding',
      accessCode: 'ABC123',
      mode: 'moneytrash',
      nativePaths: ['C:\\photos\\photo.jpg'],
    });

    await vi.waitFor(() => {
      expect(desktopMocks.invoke).toHaveBeenCalledWith(
        'start_native_upload',
        expect.objectContaining({
          sessionId: expect.any(String),
          filePath: 'C:\\photos\\photo.jpg',
        }),
      );
    });

    const startArguments = desktopMocks.invoke.mock.calls.find(
      ([command]) => command === 'start_native_upload',
    )?.[1] as { sessionId: string };

    await expect(service.cancelJob(jobId)).resolves.toBe(true);
    expect(desktopMocks.invoke).toHaveBeenCalledWith('cancel_upload', {
      sessionId: startArguments.sessionId,
    });
    expect(service.getProgress(jobId)?.status).toBe('cancelled');
  });
});
