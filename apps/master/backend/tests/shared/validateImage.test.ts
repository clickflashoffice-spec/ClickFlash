import { describe, it, expect, beforeAll } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { validateImageMagicNumber } from '../../services/validateImage';

describe('validateImage', () => {
  const testDir = path.join(__dirname, 'testFiles');

  beforeAll(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  it('should reject fake JPG file', async () => {
    const fakeJpg = path.join(testDir, 'malicious.jpg');
    fs.writeFileSync(fakeJpg, "const exploit = 'This is not an image at all';");

    const result = await validateImageMagicNumber(fakeJpg);
    
    expect(result).toBe(false);

    fs.unlinkSync(fakeJpg);
  });

  it('should reject tiny file', async () => {
    const tinyFile = path.join(testDir, 'tiny.jpg');
    fs.writeFileSync(tinyFile, 'A');

    const result = await validateImageMagicNumber(tinyFile);
    
    expect(result).toBe(false);

    fs.unlinkSync(tinyFile);
  });

  it('should accept valid JPEG header', async () => {
    const validJpg = path.join(testDir, 'valid.jpg');
    const jpegBuffer = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
    fs.writeFileSync(validJpg, jpegBuffer);

    const result = await validateImageMagicNumber(validJpg);
    
    expect(result).toBe(true);

    fs.unlinkSync(validJpg);
  });
});
