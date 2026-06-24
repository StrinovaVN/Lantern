type RequestLog = {
  clientIp: string;
  startedAt: number;
};

const requestLogs = new WeakMap<Request, RequestLog>();

function startRequestLog(request: Request, clientIp: string): void {
  if (request.method === 'OPTIONS') return;

  requestLogs.set(request, {
    clientIp,
    startedAt: performance.now()
  });
}

function finishRequestLog(request: Request, statusCode: number = 200): void {
  const requestLog = requestLogs.get(request);
  if (!requestLog) return;

  requestLogs.delete(request);

  const url = new URL(request.url);
  const responseTime = (performance.now() - requestLog.startedAt).toFixed(3);

  logger.log(
    'http',
    `${statusCode} ${request.method} ${url.pathname}${url.search} from ip ${requestLog.clientIp} ${responseTime} ms`
  );
}

export {
  finishRequestLog,
  startRequestLog
};
