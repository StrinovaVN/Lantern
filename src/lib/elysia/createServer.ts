import { Elysia } from 'elysia';
import { openapi } from '@elysia/openapi';
import { cors } from '@elysia/cors';
import fs from 'node:fs';
import path from 'node:path';
import routes from '@/elysia/routes';
import crons from '@/elysia/crons';
import { getClientIp } from '@/elysia/middlewares/addCustomMethods';
import handleErrors from '@/elysia/middlewares/handleErrors';
import {
  acquireRequestLock,
  releaseRequestLock
} from '@/elysia/middlewares/handleSimultaneousRequests';
import {
  finishRequestLog,
  startRequestLog
} from '@/elysia/middlewares/requestLogger';

async function createServer() {
  const swaggerSpec = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'openapi.json'), 'utf-8')
  );

  const app = new Elysia({
    websocket: {
      maxPayloadLength: config.server.socket.maxpayload,
      idleTimeout: config.server.socket.keepalive ? 0 : 120
    }
  })
    .use(cors({
      origin: true,
      credentials: false
    }))
    .onRequest(({ request, server }) => {
      startRequestLog(request, getClientIp(request, server));
    })
    .onBeforeHandle(async ({ request, body, server }) => {
      await acquireRequestLock(request, body, getClientIp(request, server));
    })
    .onAfterResponse(({ request, set }) => {
      releaseRequestLock(request);
      finishRequestLog(request, typeof set.status === 'number' ? set.status : 200);
    })
    .onError(({ code, error, request }) => {
      releaseRequestLock(request);

      const response = handleErrors(code, error);
      finishRequestLog(request, response.code);

      return response;
    })
    .use(openapi({
      path: '/docs',
      provider: 'scalar',
      exclude: {
        paths: [
          '/',
          '/socket',
          '/api/v1/users',
          '/api/v1/users/:user_id',
          '/api/v1/users/:user_id/storage',
          '/api/v1/users/:user_id/storage/:key'
        ]
      },
      documentation: swaggerSpec
    }))
    .use(crons)
    .use(routes)
    .listen(config.server.port, () => {
      logger.log('http', `Server is listening on port ${config.server.port}.`);
    });

  return app;
}

export default createServer;
