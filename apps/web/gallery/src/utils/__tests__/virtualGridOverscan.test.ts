import { getVelocityAdjustedOverscan } from '@/components/common/VirtualGrid';

describe('getVelocityAdjustedOverscan', () => {
  it('keeps the configured overscan while scrolling slowly', () => {
    expect(getVelocityAdjustedOverscan(3, 0.4)).toBe(3);
  });

  it('expands overscan for medium and fast scrolling without exceeding the cap', () => {
    expect(getVelocityAdjustedOverscan(3, 1)).toBe(6);
    expect(getVelocityAdjustedOverscan(3, 3)).toBe(12);
    expect(getVelocityAdjustedOverscan(30, 4)).toBe(24);
  });
});
