
import { TransferService } from '../services/TransferService';
import fs from 'fs';

// Mock everything locally
const mockDbManager = {
    query: (sql: string) => {
        if (sql.includes('SELECT * FROM photos')) return [{ id: 1, url: 'photo1.jpg' }];
        if (sql.includes('SELECT photoId, descriptor')) return [{ photoId: 1, descriptor: '[]' }];
        return [];
    },
    get: () => ({ title: 'Test Album' })
};
const mockLogger = { info: console.log, warn: console.warn, error: console.error, debug: console.log } as any;

// We will just spy with console.log instead of jest.fn
fs.existsSync = ((_path: any) => true) as any;
fs.mkdirSync = ((path: any) => console.log(`mkdir ${path}`)) as any;
fs.promises.copyFile = (async (src: any, dest: any) => console.log(`copy ${src} -> ${dest}`)) as any;
fs.promises.writeFile = (async (path: any, _data: any) => console.log(`write metadata to ${path}`)) as any;

async function runTest() {
    console.log('Starting TransferService Test...');
    const service = new TransferService({
        dbManager: mockDbManager as any,
        logger: mockLogger,
        wss: { clients: [] }
    });

    try {
        const result = await service.sendAlbumToKiosks('album-123', new Set(['/mock/kiosk']));
        console.log('Test Result:', result);
    } catch (e) {
        console.error('Test Failed:', e);
    }
}

runTest();
