import { Elysia } from 'elysia';
import { cron } from '@elysia/cron';
import { disconnect } from '@/elysia/routes/socket/utils';

const name = 'checkInactiveWebsockets';
const pattern = '*/10 * * * * *';

const checkInactiveWebsockets = new Elysia({ name: `cron:${name}` })
  .use(cron({
    name,
    pattern,
    protect: true,
    catch(error) {
      logger.error(`Cron ${name} failed:`);
      logger.error(error);
    },
    run() {
      if (!global.ActiveSockets) return;

      for (const [id, { lastHeartbeat, instance }] of ActiveSockets.entries()) {
        if (Date.now() - lastHeartbeat > config.server.socket.heartbeat_interval) {
          disconnect(instance, id, 'Connection timed out.');
        }
      }
    }
  }))
  .onStart(() => {
    logger.info(`Cron ${name} scheduled with pattern ${pattern}.`);
  });

export default checkInactiveWebsockets;
