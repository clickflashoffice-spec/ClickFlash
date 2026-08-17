import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PhotoRepo } from '../PhotoRepo';
import { DatabaseManager } from '../../database/db';
import { redisCache } from '../../services/redisCacheService';

vi.mock('../../services/redisCacheService', () => ({
  redisCache: {
    publishEvent: vi.fn().mockResolvedValue(true)
  }
}));

describe('PhotoRepo', () => {
  let dbManagerMock: vi.Mocked<DatabaseManager>;
  let repo: PhotoRepo;

  beforeEach(() => {
    dbManagerMock = {
      get: vi.fn(),
      all: vi.fn(),
      run: vi.fn(),
    } as unknown as vi.Mocked<DatabaseManager>;

    repo = new PhotoRepo(dbManagerMock);
  });

  describe('findByAlbumId', () => {
    it('returns photos for album', () => {
      const mockPhotos = [{ id: '1', albumId: 'album-1' }];
      dbManagerMock.all.mockReturnValueOnce(mockPhotos);
      const result = repo.findByAlbumId('album-1');
      expect(result).toEqual(mockPhotos);
      expect(dbManagerMock.all).toHaveBeenCalledWith(
        'SELECT * FROM photos WHERE albumId = ? ORDER BY created_at DESC',
        ['album-1']
      );
    });
  });

  describe('findById', () => {
    it('returns null for missing photo', () => {
      dbManagerMock.get.mockReturnValueOnce(undefined);
      const result = repo.findById('missing-id');
      expect(result).toBeUndefined();
    });

    it('returns full object for existing photo', () => {
      const mockPhoto = { id: '1', name: 'Photo 1' };
      dbManagerMock.get.mockReturnValueOnce(mockPhoto);
      const result = repo.findById('1');
      expect(result).toEqual(mockPhoto);
    });
  });

  describe('create', () => {
    it('inserts and returns with ID', () => {
      dbManagerMock.run.mockReturnValueOnce({ lastInsertRowid: 1, changes: 1 });
      dbManagerMock.get.mockReturnValueOnce({ id: 'mock-uuid', albumId: '1' });
      
      const result = repo.create({ albumId: '1' });
      expect(redisCache.publishEvent).toHaveBeenCalledWith('photo_ingestion', expect.any(Object));
      expect(dbManagerMock.get).toHaveBeenCalled();
      expect(result).toEqual({ id: 'mock-uuid', albumId: '1' });
    });
  });

  describe('update', () => {
    it('updates and returns updated photo', () => {
      dbManagerMock.run.mockReturnValueOnce({ lastInsertRowid: 0, changes: 1 });
      dbManagerMock.get.mockReturnValueOnce({ id: '1', name: 'Updated' });
      
      const result = repo.update('1', { name: 'Updated' });
      expect(result).toEqual({ id: '1', name: 'Updated' });
    });
  });

  describe('delete', () => {
    it('removes photo', () => {
      dbManagerMock.run.mockReturnValueOnce({ lastInsertRowid: 0, changes: 1 });
      const result = repo.delete('1');
      expect(result).toBe(true);
      // expect(dbManagerMock.run).toHaveBeenCalledWith('DELETE FROM photos WHERE id = ?', ['1']);
    });
  });

  describe('search', () => {
    it('empty string returns all', () => {
      repo.search('');
      expect(dbManagerMock.all).toHaveBeenCalledWith('SELECT * FROM photos ORDER BY created_at DESC');
    });

    it('happy path returns matching photos, special chars sanitized', () => {
      repo.search('hello! @world');
      expect(dbManagerMock.all).toHaveBeenCalledWith(
        'SELECT * FROM photos WHERE id IN (SELECT id FROM photos_fts WHERE photos_fts MATCH ?)',
        ['hello world*']
      );
    });
  });
});
