import type { Request, Response } from 'express';
import morgan from 'morgan';

const customMorgan: morgan.FormatFn<Request, Response> = (tokens, request, response) => {
  return [
    tokens.status(request, response),
    tokens.method(request, response),
    tokens.url(request, response),
    'from ip',
    request.clientIp,
    tokens['response-time'](request, response),
    'ms'
  ].join(' ');
};

const morganMiddleware = morgan<Request, Response>(customMorgan, {
  stream: {
    write: (message: string) => logger.log('http', message.trim())
  },
  skip: request => request.method === 'OPTIONS'
});

export default morganMiddleware;