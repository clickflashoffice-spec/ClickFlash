import sharp from 'sharp';
import { BlurhashService } from '../../services/blurhashService';

describe('BlurhashService', () => {
  it('should generate a valid blurhash from a Buffer', async () => {
    // Create a 50x50 red test image in buffer using sharp
    const testBuffer = await sharp({
      create: {
        width: 50,
        height: 50,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 }
      }
    }).png().toBuffer();

    const hash = await BlurhashService.generateBlurhash(testBuffer, 4, 3);
    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');
    expect(hash!.length).toBeGreaterThan(10);
  });

  it('should return null when passed invalid image buffer/path gracefully without crashing', async () => {
    const invalidBuffer = Buffer.from('this is not an image');
    const hash = await BlurhashService.generateBlurhash(invalidBuffer);
    expect(hash).toBeNull();
  });
});
