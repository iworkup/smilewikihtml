import Bonjour from 'bonjour-service';

const hostname = 'smilewikihtml.local';

// Advertise the same hostname from macOS, Windows and Linux without renaming the OS.
export default function lanHost() {
  function attach(server) {
    const http = server.httpServer;
    if (!http) return;
    let bonjour;
    let cleanupPromise;

    function cleanup() {
      if (cleanupPromise) return cleanupPromise;
      process.off('SIGINT', cleanup);
      process.off('SIGTERM', cleanup);
      if (!bonjour) return Promise.resolve();
      const instance = bonjour;
      bonjour = undefined;
      cleanupPromise = new Promise(resolve => {
        // Send goodbye records before closing the multicast socket.
        instance.unpublishAll(() => instance.destroy(resolve));
      });
      return cleanupPromise;
    }

    http.once('listening', () => {
      const { port } = http.address();
      const report = error => server.config.logger.error(`[mDNS] ${error.message}; check UDP 5353 and your local network.`);
      try {
        bonjour = new Bonjour({}, report);
        const service = bonjour.publish({
          name: `SmileWiki ${port}`,
          type: 'http',
          host: hostname,
          port,
        });
        service.on('error', report);
        service.once('up', () => server.config.logger.info(`[mDNS] http://${hostname}:${port}/smilewikihtml/`));
        process.once('SIGINT', cleanup);
        process.once('SIGTERM', cleanup);
      } catch (error) {
        report(error);
        void cleanup();
      }
    });
    http.once('close', cleanup);
    // Vite awaits this on close/restart, including before process shutdown.
    const close = server.close.bind(server);
    server.close = async () => {
      await cleanup();
      return close();
    };
  }

  return { name: 'lan-host', configureServer: attach, configurePreviewServer: attach };
}
