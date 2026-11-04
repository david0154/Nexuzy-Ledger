import os from 'node:os';
import Bonjour from 'bonjour-service';

export function advertiseLanService({ port, hostname = os.hostname(), BonjourClass = Bonjour, onError }) {
  const bonjour = new BonjourClass({}, onError);
  const hostName = hostname.replace(/\.$/, '');
  try {
    bonjour.publish({
      name: `Nexuzy Ledger (${hostName})`,
      type: 'nexuzy-ledger',
      protocol: 'tcp',
      host: `${hostName}.local`,
      port,
      txt: { app: 'Nexuzy Ledger', tls: 'https' },
      disableIPv6: true,
    });
  } catch (err) {
    bonjour.destroy();
    throw err;
  }
  let closed = false;
  return {
    close: () => {
      if (closed) return Promise.resolve();
      closed = true;
      return new Promise((resolve) => bonjour.unpublishAll(() => {
        bonjour.destroy();
        resolve();
      }));
    },
  };
}
