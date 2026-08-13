import { describe, it, expect } from 'vitest';
import { WatermarkService } from '../src/services/watermark';

describe('watermark service LSB steganography', () => {
  it('LSB embedding produces output buffer same length as input', () => {
    const input = new Uint8Array(500).fill(128); // 500 bytes
    const payload = 'TEST';
    const output = WatermarkService.embedLSBPayload(input, payload);
    
    expect(output.length).toBe(input.length);
  });

  it('extracted message matches embedded message', async () => {
    const input = new Uint8Array(1000).fill(255);
    const payload = 'SECRET_MESSAGE_123';
    
    const output = WatermarkService.embedLSBPayload(input, payload);
    const extracted = await WatermarkService.extractForensicPayload(output);
    
    expect(extracted).toBe(payload);
  });

  it('different messages produce different LSB patterns', () => {
    const input = new Uint8Array(500).fill(0);
    const out1 = WatermarkService.embedLSBPayload(input, 'MSG1');
    const out2 = WatermarkService.embedLSBPayload(input, 'MSG2');
    
    expect(out1).not.toEqual(out2);
  });

  it('empty message embeds/extracts correctly', async () => {
    const input = new Uint8Array(500).fill(100);
    const output = WatermarkService.embedLSBPayload(input, '');
    
    const extracted = await WatermarkService.extractForensicPayload(output);
    expect(extracted).toBe('');
  });

  it('message longer than pixel capacity throws clear error or truncates safely', async () => {
    const input = new Uint8Array(150).fill(0); // Very small, offset is 15
    const payload = 'VERY_LONG_PAYLOAD_THAT_WILL_NOT_FIT_IN_SMALL_BUFFER_AT_ALL_1234567890';
    
    // The service handles this by returning the output without fully embedding if too small
    const output = WatermarkService.embedLSBPayload(input, payload);
    expect(output.length).toBe(input.length);
    
    const extracted = await WatermarkService.extractForensicPayload(output);
    // Should be null because the payload couldn't be fully written or read properly, or partial. 
    // Testing that it doesn't throw unhandled exception.
    expect(extracted).toBeNull();
  });
});
