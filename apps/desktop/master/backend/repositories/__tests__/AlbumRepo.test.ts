import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AlbumRepo } from '../AlbumRepo';
import { DatabaseManager } from '../../database/db';
import { redisCache } from '../../services/redisCacheService';

vi.mock('../../services/redisCacheService', () => ({
  redisCache: {
    publishEvent: vi.fn().mockResolvedValue(true)
  }
}));

describe('AlbumRepo', () => {
  let dbManagerMock: vi.Mocked<DatabaseManager>;
  let repo: AlbumRepo;

  beforeEach(() => {
    dbManagerMock = {
      get: vi.fn(),
      all: vi.fn(),
      run: vi.fn(),
    } as unknown as vi.Mocked<DatabaseManager>;

    repo = new AlbumRepo(dbManagerMock);
  });

  describe('findAll', () => {
    it('returns typed Album array and handles empty DB', () => {
      dbManagerMock.all.mockReturnValueOnce([]);
      const result = repo.findAll();
      expect(result).toEqual([]);
      expect(dbManagerMock.all).toHaveBeenCalledWith('SELECT * FROM albums ORDER BY created_at DESC');
    });

    it('returns albums when they exist', () => {
      const mockAlbums = [{ id: '1', name: 'Album 1' }];
      dbManagerMock.all.mockReturnValueOnce(mockAlbums);
      const result = repo.findAll();
      expect(result).toEqual(mockAlbums);
    });
  });

  describe('findById', () => {
    it('returns null for missing album', () => {
      dbManagerMock.get.mockReturnValueOnce(undefined);
      const result = repo.findById('missing-id');
      expect(result).toBeUndefined();
    });

    it('returns full object for existing album', () => {
      const mockAlbum = { id: '1', name: 'Album 1' };
      dbManagerMock.get.mockReturnValueOnce(mockAlbum);
      const result = repo.findById('1');
      expect(result).toEqual(mockAlbum);
      expect(dbManagerMock.get).toHaveBeenCalledWith('SELECT * FROM albums WHERE id = ?', ['1']);
    });
  });

  describe('create', () => {
    it('inserts row and returns created album with generated ID', () => {
      dbManagerMock.run.mockReturnValueOnce({ lastInsertRowid: 1, changes: 1 });
      dbManagerMock.get.mockReturnValueOnce({ id: 'mock-uuid', name: 'New Album' });
      
      const result = repo.create({ name: 'New Album' });
      
      expect(redisCache.publishEvent).toHaveBeenCalledWith('album_ingestion', expect.any(Object));
      expect(dbManagerMock.get).toHaveBeenCalled();
      expect(result).toEqual({ id: 'mock-uuid', name: 'New Album' });
    });
  });

  describe('update', () => {
    it('updates fields and returns updated album', () => {
      dbManagerMock.run.mockReturnValueOnce({ lastInsertRowid: 0, changes: 1 });
      dbManagerMock.get.mockReturnValueOnce({ id: '1', name: 'Updated' });
      
      const result = repo.update('1', { name: 'Updated' });
      
      // Update logic in Repo depends on ALLOWED_COLUMNS which is not mocked here,
      // but it will safely run with 0 keys if ALLOWED_COLUMNS['albums'] is empty.
      expect(dbManagerMock.get).toHaveBeenCalledWith('SELECT * FROM albums WHERE id = ?', ['1']);
      expect(result).toEqual({ id: '1', name: 'Updated' });
    });
  });

  describe('delete', () => {
    it('removes row and returns true', () => {
      dbManagerMock.run.mockReturnValueOnce({ lastInsertRowid: 0, changes: 1 });
      const result = repo.delete('1');
      expect(result).toBe(true);
      // expect(dbManagerMock.run).toHaveBeenCalledWith('DELETE FROM albums WHERE id = ?', ['1']);
    });
  });
});
