import { setupServer } from 'msw/node';
import { authHandlers } from './handlers/authHandlers';
import { cloudHandlers } from './handlers/cloudHandlers';
import { syncHandlers } from './handlers/syncHandlers';
import { orderHandlers } from './handlers/orderHandlers';
import { photoHandlers } from './handlers/photoHandlers';
import { systemHandlers } from './handlers/systemHandlers';

export const syncServer = setupServer(
  ...authHandlers,
  ...cloudHandlers,
  ...syncHandlers,
  ...orderHandlers,
  ...photoHandlers,
  ...systemHandlers,
);

syncServer.listen({
  onUnhandledRequest: 'warn',
});

export function closeServer(): Promise<void> {
  return new Promise((resolve) => {
    syncServer.close();
    setTimeout(resolve, 100);
  });
}
