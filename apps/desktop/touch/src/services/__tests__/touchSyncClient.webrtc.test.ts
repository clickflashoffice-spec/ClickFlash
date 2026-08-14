import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TouchSyncClient } from '../touchSyncClient';
import { Bonjour } from 'bonjour-service';

const mockBrowser = {
  on: vi.fn(),
};
const mockBonjour = {
  find: vi.fn(() => mockBrowser),
  destroy: vi.fn(),
};

vi.mock('bonjour-service', () => {
  return {
    Bonjour: vi.fn(function () { return mockBonjour; }),
  };
});

describe('TouchSyncClient WebRTC Transfer', () => {
  let client: TouchSyncClient;
  let lastCreatedWs: any;
  let lastCreatedPeerConnection: any;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    // @ts-ignore
    TouchSyncClient.instance = undefined; // Reset singleton
    client = (TouchSyncClient as any).getInstance();

    Object.defineProperty(globalThis, 'crypto', {
      value: {
        randomUUID: () => 'mock-uuid',
      },
      writable: true,
      configurable: true,
    });

    class MockWebSocket {
      static OPEN = 1;
      static CONNECTING = 0;
      static CLOSING = 2;
      static CLOSED = 3;
      readyState = 1;
      send = vi.fn();
      close = vi.fn();
      onopen: any = null;
      onmessage: any = null;
      onerror: any = null;
      onclose: any = null;
      constructor(public url: string) {
        lastCreatedWs = this;
      }
    }
    const wsConstructor = vi.fn(function (url: string) {
      return new MockWebSocket(url);
    });
    (wsConstructor as any).OPEN = 1;
    (wsConstructor as any).CONNECTING = 0;
    (wsConstructor as any).CLOSING = 2;
    (wsConstructor as any).CLOSED = 3;
    global.WebSocket = wsConstructor as any;

    const mockDataChannel = {
      close: vi.fn(),
      send: vi.fn(),
      addEventListener: vi.fn((event, cb) => {
        if (event === 'open') setTimeout(cb, 10);
        if (event === 'bufferedamountlow') setTimeout(cb, 10);
      }),
      bufferedAmount: 0,
    };

    class MockRTCDataChannel {
      close = vi.fn();
      send = vi.fn();
      addEventListener = vi.fn((event: string, cb: () => void) => {
        if (event === 'open') setTimeout(cb, 10);
        if (event === 'bufferedamountlow') setTimeout(cb, 10);
      });
      bufferedAmount = 0;
    }
    global.RTCDataChannel = vi.fn(function () {
      return new MockRTCDataChannel();
    }) as any;

    class MockRTCPeerConnection {
      createDataChannel = vi.fn(() => mockDataChannel);
      createOffer = vi.fn(() => Promise.resolve({ type: 'offer', sdp: 'mock-sdp' }));
      createAnswer = vi.fn(() => Promise.resolve({ type: 'answer', sdp: 'mock-sdp' }));
      setLocalDescription = vi.fn(() => Promise.resolve());
      setRemoteDescription = vi.fn(() => Promise.resolve());
      addIceCandidate = vi.fn(() => Promise.resolve());
      close = vi.fn();
      localDescription = { type: 'offer', sdp: 'mock-sdp' };
      ondatachannel: any = null;
      onicecandidate: any = null;
      onconnectionstatechange: any = null;
      constructor() {
        lastCreatedPeerConnection = this;
      }
    }
    global.RTCPeerConnection = vi.fn(function () {
      return new MockRTCPeerConnection();
    }) as any;

    class MockBlob {
      type: string;
      size: number;
      constructor(chunks: any[] = [], options?: any) {
        this.type = options?.type || '';
        this.size = chunks.reduce((acc: number, chunk: any) => acc + (chunk?.byteLength || chunk?.size || 0), 0);
      }
      arrayBuffer() {
        return Promise.resolve(new ArrayBuffer(this.size));
      }
    }
    global.Blob = vi.fn(function (chunks?: any[], options?: any) {
      return new MockBlob(chunks, options);
    }) as any;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('discovers master via Bonjour and connects', () => {
    client.init();
    expect(Bonjour).toHaveBeenCalled();
    expect(mockBonjour.find).toHaveBeenCalledWith({ type: 'clickflash-sync' });

    const upCall = mockBrowser.on.mock.calls.find((call: any[]) => call[0] === 'up');
    expect(upCall).toBeDefined();
    const upCallback = upCall![1];
    upCallback({ host: '127.0.0.1', port: 8092 });
    
    // Check if websocket connects to the discovered master
    expect(global.WebSocket).toHaveBeenCalledWith('ws://127.0.0.1:8092');
  });

  it('creates WebRTC offer and sends via signaling', async () => {
    client.init();
    const wsInstance = lastCreatedWs;
    if (wsInstance.onopen) wsInstance.onopen();

    const photo = new Blob([new ArrayBuffer(1024)], { type: 'image/jpeg' });
    
    // Test that it sends WEBRTC_OFFER
    const transferPromise = client.transferPhoto('target-id', photo as any, 'test.jpg');
    
    // Wait for async execution
    await vi.advanceTimersByTimeAsync(50);
    
    expect(wsInstance.send).toHaveBeenCalled();
    const sentMessages = wsInstance.send.mock.calls.map((call: any[]) => JSON.parse(call[0]));
    const offerMessage = sentMessages.find((msg: any) => msg.type === 'WEBRTC_OFFER');
    expect(offerMessage).toBeDefined();
    expect(offerMessage.payload.targetId).toBe('target-id');
    expect(offerMessage.payload.description).toBeDefined();
  });

  it('reassembles photo transfer chunks correctly (3 chunks of 64KB)', async () => {
    client.init();
    const wsInstance = lastCreatedWs;
    if (wsInstance.onopen) wsInstance.onopen();

    // Trigger handleWebRtcSignal to create peer transfer as receiver
    const offerMsg = {
      type: 'WEBRTC_OFFER',
      senderId: 'peer-123',
      timestamp: Date.now(),
      payload: {
        targetId: (client as any).kioskId,
        transferId: 'mock-transfer-id',
        description: { type: 'offer', sdp: 'mock-sdp' }
      }
    };

    if (wsInstance.onmessage) wsInstance.onmessage({ data: JSON.stringify(offerMsg) });
    await vi.advanceTimersByTimeAsync(10);
    
    const state = (client as any).peerTransfers.get('mock-transfer-id');
    expect(state).toBeDefined();

    // Simulate datachannel configuration
    const mockChannel = {
      binaryType: 'blob',
      bufferedAmountLowThreshold: 0,
      close: vi.fn(),
      send: vi.fn(),
      onmessage: null as any,
      onerror: null as any
    };
    state.connection.ondatachannel({ channel: mockChannel });

    const photoReceivedMock = vi.fn();
    client.on('photo:received', photoReceivedMock);

    // Simulate sending metadata
    mockChannel.onmessage({
      data: JSON.stringify({
        kind: 'metadata',
        transferId: 'mock-transfer-id',
        fileName: 'test.jpg',
        mimeType: 'image/jpeg',
        size: 3 * 64 * 1024
      })
    });

    // Simulate sending 3 chunks
    mockChannel.onmessage({ data: new ArrayBuffer(64 * 1024) });
    mockChannel.onmessage({ data: new ArrayBuffer(64 * 1024) });
    mockChannel.onmessage({ data: new ArrayBuffer(64 * 1024) });

    // Simulate complete message
    mockChannel.onmessage({
      data: JSON.stringify({
        kind: 'complete',
        transferId: 'mock-transfer-id'
      })
    });

    expect(photoReceivedMock).toHaveBeenCalled();
    const receivedEvent = photoReceivedMock.mock.calls[0][0];
    expect(receivedEvent.size).toBe(3 * 64 * 1024);
  });

  it('triggers HTTP fallback after 30s timeout', async () => {
    client.init();
    const wsInstance = lastCreatedWs;
    if (wsInstance.onopen) wsInstance.onopen();
    
    const fallbackMock = vi.fn();
    client.on('photo:transfer:fallback', fallbackMock);

    const offerMsg = {
      type: 'WEBRTC_OFFER',
      senderId: 'peer-123',
      timestamp: Date.now(),
      payload: {
        targetId: (client as any).kioskId,
        transferId: 'timeout-transfer-id',
        description: { type: 'offer', sdp: 'mock-sdp' }
      }
    };
    if (wsInstance.onmessage) wsInstance.onmessage({ data: JSON.stringify(offerMsg) });
    await vi.advanceTimersByTimeAsync(10);
    
    // Advance timers by 30 seconds
    await vi.advanceTimersByTimeAsync(30_000);

    expect(fallbackMock).toHaveBeenCalled();
    expect(fallbackMock.mock.calls[0][0].reason).toBe('WebRTC transfer timed out');
  });

  it('respects bufferedAmount backpressure', async () => {
    client.init();
    const wsInstance = lastCreatedWs;
    if (wsInstance.onopen) wsInstance.onopen();
    
    const largePhotoSize = 2 * 1024 * 1024; // 2MB
    const photo = new Blob([new ArrayBuffer(largePhotoSize)], { type: 'image/jpeg' });
    
    let bufferedAmount = 0;
    const mockChannel = {
      readyState: 'open',
      close: vi.fn(),
      send: vi.fn((data) => {
        if (data instanceof ArrayBuffer) {
          bufferedAmount += data.byteLength;
        }
      }),
      addEventListener: vi.fn((event, cb) => {
        if (event === 'open') setTimeout(cb, 1);
        if (event === 'bufferedamountlow') {
          // Simulate buffered amount dropping below threshold after some time
          setTimeout(() => {
            bufferedAmount = 0;
            cb();
          }, 10);
        }
      }),
      get bufferedAmount() {
        return bufferedAmount;
      }
    };
    
    class CustomPeerConnection {
      createDataChannel = vi.fn(() => mockChannel);
      createOffer = vi.fn(() => Promise.resolve({ type: 'offer', sdp: 'mock-sdp' }));
      setLocalDescription = vi.fn(() => Promise.resolve());
      localDescription = { type: 'offer', sdp: 'mock-sdp' };
      close = vi.fn();
    }
    global.RTCPeerConnection = vi.fn(function () {
      return new CustomPeerConnection();
    }) as any;

    const transferPromise = client.transferPhoto('target-id', photo as any, 'large.jpg');
    
    // Let the event loop run a bit to trigger the backpressure
    await vi.advanceTimersByTimeAsync(5);
    
    // Wait for the transfer to complete
    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(100);
    
    await transferPromise;
    expect(mockChannel.send).toHaveBeenCalled();
  });
});
