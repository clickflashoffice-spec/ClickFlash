import { dataService } from '../dataService';

describe('DataService', () => {
  let originalWindow: any;
  let originalFetch: any;

  beforeEach(() => {
    (window as any).electron = {
      invoke: jest.fn(),
    };

    global.fetch = jest.fn();

    // Reset dataService's isElectron state by recreating the logic or mock
    (dataService as any).isElectron = true;
  });

  afterEach(() => {
    global.window = originalWindow;
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe('albums', () => {
    it('getAll calls window.electron.invoke with correct args', async () => {
      ((window as any).electron.invoke as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: [{ id: '1', name: 'Album 1' }]
      });

      const result = await dataService.albums.getAll();
      expect(global.window.electron?.invoke).toHaveBeenCalledWith('repo:request', {
        collection: 'albums',
        repo: 'albums',
        action: 'findAll',
        params: undefined,
        payload: undefined
      });
      expect(result).toEqual([{ id: '1', name: 'Album 1' }]);
    });

    it('create calls invoke with correct args', async () => {
      ((window as any).electron.invoke as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { id: '1', name: 'New Album' }
      });

      const result = await dataService.albums.create({ name: 'New Album' });
      expect(global.window.electron?.invoke).toHaveBeenCalledWith('repo:request', {
        collection: 'albums',
        repo: 'albums',
        action: 'create',
        params: { name: 'New Album' },
        payload: { name: 'New Album' }
      });
      expect(result).toEqual({ id: '1', name: 'New Album' });
    });
  });

  describe('photos', () => {
    it('searchPhotos uses IPC search channel', async () => {
      ((window as any).electron.invoke as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: []
      });

      const result = await dataService.photos.search('query');
      expect(global.window.electron?.invoke).toHaveBeenCalledWith('repo:request', {
        collection: 'photos',
        repo: 'photos',
        action: 'search',
        params: { query: 'query' },
        payload: { query: 'query' }
      });
      expect(result).toEqual([]);
    });
  });

  describe('settings', () => {
    it('get returns value via IPC', async () => {
      ((window as any).electron.invoke as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: 'value'
      });

      const result = await dataService.settings.get('key');
      expect(global.window.electron?.invoke).toHaveBeenCalledWith('repo:request', {
        collection: 'settings',
        repo: 'settings',
        action: 'findByKey',
        params: { key: 'key' },
        payload: { key: 'key' }
      });
      expect(result).toEqual('value');
    });
  });

  describe('Error propagation', () => {
    it('rejected IPC promise throws typed error', async () => {
      ((window as any).electron.invoke as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'Custom error message'
      });

      await expect(dataService.albums.getAll()).rejects.toThrow('Custom error message');
    });
  });

  describe('Fallback to HTTP apiService', () => {
    it('falls back to fetch when window.electron is undefined', async () => {
      delete (window as any).electron;
      (dataService as any).isElectron = false;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '1' })
      });

      const result = await dataService.albums.getAll();
      expect(global.fetch).toHaveBeenCalledWith('/api/albums/findAll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      expect(result).toEqual({ id: '1' });
    });
  });
});
