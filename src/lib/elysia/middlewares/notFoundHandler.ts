import { status } from 'elysia';

function notFoundHandler() {
  return status(404, { error: 'Resource not found.' });
}

export default notFoundHandler;
