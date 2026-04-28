import type { Request, Response, NextFunction } from 'express';

function addCustomMethods(request: Request, response: Response, next: NextFunction): void {
  response.sendError = (message: string, statusCode: number = 500): void => {
    response.status(statusCode).json({
      success: false,
      error: message
    });
  };

  if (process.env.NODE_ENV === 'production') {
    const headersToCheck = ['cf-connecting-ip', 'x-forwarded-for'];

    let ip: string | string[] | null = null;
    for (const header of headersToCheck) {
      const headerValue = request.headers[header];
      if (headerValue) {
        ip = headerValue;
        break;
      }
    }

    request.clientIp = cleanIp(Array.isArray(ip) ? ip[0] : ip);
  } else {
    request.clientIp = request.ip || request.socket.remoteAddress || 'unknown';
  }

  function cleanIp(ip: string | null) {
    if (!ip) return 'unknown';
    if (ip.includes(',')) return ip.split(',')[0].trim();

    return ip;
  }

  next();
}

export default addCustomMethods;