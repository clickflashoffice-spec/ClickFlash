
import {
  parseKioskPin,
  parseOpenDirectoryOptions,
  parseOpenFileOptions,
  parsePrintOptions,
  parseSaveFileOptions,
} from '../../../ipc-validation';

describe('canonical desktop IPC validation', () => {
  it('accepts an omitted directory-dialog options object', () => {
    expect(parseOpenDirectoryOptions(undefined)).toBeUndefined();
  });

  it('rejects unexpected dialog capabilities', () => {
    expect(() => parseOpenDirectoryOptions({ properties: ['showHiddenFiles'] })).toThrow();
    expect(() => parseOpenFileOptions({ title: 'Photo', arbitrary: true })).toThrow();
  });

  it('bounds user-controlled dialog strings', () => {
    expect(() => parseOpenDirectoryOptions({ title: 'x'.repeat(201) })).toThrow();
    expect(() => parseSaveFileOptions({ defaultPath: `C:/${'x'.repeat(4096)}` })).toThrow();
  });

  it('accepts constrained Electron file filters', () => {
    expect(parseOpenFileOptions({
      filters: [{ name: 'Images', extensions: ['jpg', 'png'] }],
      multiple: true,
    })).toEqual({
      filters: [{ name: 'Images', extensions: ['jpg', 'png'] }],
      multiple: true,
    });
  });

  it('rejects dotted or path-shaped file extensions', () => {
    expect(() => parseOpenFileOptions({
      filters: [{ name: 'Executable', extensions: ['../exe'] }],
    })).toThrow();
  });

  it('requires a bounded printer name and strips unknown print fields', () => {
    expect(parsePrintOptions({ printer: 'DNP DS620' })).toEqual({
      printer: 'DNP DS620',
      silent: true,
    });
    expect(() => parsePrintOptions({ printer: 'DNP DS620', copies: 5000 })).toThrow();
    expect(() => parsePrintOptions({ printer: '' })).toThrow();
  });

  it('rejects malformed kiosk PIN payloads', () => {
    expect(parseKioskPin('123456')).toBe('123456');
    expect(() => parseKioskPin('123\0')).toThrow();
    expect(() => parseKioskPin({ pin: '123456' })).toThrow();
  });
});
