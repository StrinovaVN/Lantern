import notFoundHandler from '@/elysia/middlewares/notFoundHandler';
import { sendError } from '@/elysia/middlewares/addCustomMethods';

function handleErrors(code: string | number, error: unknown) {
  if (code === 'NOT_FOUND') return notFoundHandler();

  logger.error(error);

  return sendError('Internal Server Error', 500);
}

export default handleErrors;
