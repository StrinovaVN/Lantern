import { status } from 'elysia';
import type { Server } from 'elysia/universal/server';

function cleanIp(ip: string | null): string {
  if (!ip) return 'unknown';
  if (ip.includes(',')) return ip.split(',')[0].trim();

  return ip;
}

function getClientIp(request: Request, server: Server | null): string {
  if (process.env.NODE_ENV === 'production') {
    const headersToCheck = ['cf-connecting-ip', 'x-forwarded-for'];

    for (const header of headersToCheck) {
      const headerValue = request.headers.get(header);
      if (headerValue) return cleanIp(headerValue);
    }
  }

  return cleanIp(server?.requestIP(request)?.address || null);
}

function sendError(message: string, statusCode: number = 500) {
  return status(statusCode, {
    success: false,
    error: message
  });
}

export {
  cleanIp,
  getClientIp,
  sendError
};
