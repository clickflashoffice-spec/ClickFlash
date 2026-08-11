import assert from 'node:assert/strict';
import test from 'node:test';

import ptpIp from '../src/services/PtpIpClient.ts';

const { PtpIpClient, PtpIpTransportUnavailableError } = ptpIp;

function createSocketHarness() {
  let onConnected = null;
  let destroyed = false;
  const listeners = new Map();
  const socket = {
    on(event, listener) {
      listeners.set(event, listener);
    },
    destroy() {
      destroyed = true;
    },
  };

  return {
    factory(_options, connected) {
      onConnected = connected;
      return socket;
    },
    connect() {
      assert.ok(onConnected, 'The client must register a connection callback.');
      onConnected();
    },
    isDestroyed() {
      return destroyed;
    },
  };
}

test('PTP/IP fails closed when no certified socket adapter is installed', async () => {
  const client = new PtpIpClient();

  await assert.rejects(
    client.connect(),
    (error) => error instanceof PtpIpTransportUnavailableError
  );
});

test('PTP/IP reports connected only after the injected adapter confirms it', async () => {
  const harness = createSocketHarness();
  const client = new PtpIpClient('192.168.1.50', 15740, harness.factory);
  let resolved = false;
  const connection = client.connect().then(() => {
    resolved = true;
  });

  await Promise.resolve();
  assert.equal(resolved, false);
  harness.connect();
  await connection;
  assert.equal(resolved, true);

  client.disconnect();
  assert.equal(harness.isDestroyed(), true);
});
