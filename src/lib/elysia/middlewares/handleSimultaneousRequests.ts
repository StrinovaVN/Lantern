import crypto from 'node:crypto';

type RequestLock = {
  current: Promise<void>;
  release: () => void;
};

const requestQueues = new Map<string, Promise<void>>();
const activeLocks = new WeakMap<Request, RequestLock>();

function generateRequestKey(request: Request, body: unknown, clientIp: string): string {
  const bodyString = JSON.stringify(body);

  return crypto
    .createHash('md5')
    .update(`${request.method}${request.url}${bodyString}${clientIp}`)
    .digest('hex');
}

async function acquireRequestLock(request: Request, body: unknown, clientIp: string): Promise<void> {
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) return;

  const requestKey = generateRequestKey(request, body, clientIp);
  const previous = requestQueues.get(requestKey) || Promise.resolve();

  let releaseLock: (() => void) | undefined;
  const pending = new Promise<void>(resolve => {
    releaseLock = resolve;
  });
  const current = previous.then(() => pending);

  requestQueues.set(requestKey, current);
  await previous;

  const release = () => {
    releaseLock?.();

    void current.then(() => {
      if (requestQueues.get(requestKey) === current) requestQueues.delete(requestKey);
    });
  };

  activeLocks.set(request, { current, release });
}

function releaseRequestLock(request: Request): void {
  const lock = activeLocks.get(request);
  if (!lock) return;

  activeLocks.delete(request);
  lock.release();
}

export {
  acquireRequestLock,
  generateRequestKey,
  releaseRequestLock
};
