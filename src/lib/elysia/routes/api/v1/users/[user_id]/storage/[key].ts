import { Elysia } from 'elysia';
import User from '@/models/User';
import Storage from '@/models/Storage';
import { decrypt } from '@/utils/encryption';
import getValidationError from '@/utils/getValidationError';
import {
  validateStorageKey,
  validateStorageValue,
  validateUserId
} from '@/elysia/middlewares/validateRequest';

type StorageRouteParams = {
  user_id: string;
  key: string;
};

function validateParams(params: StorageRouteParams): {
  userId?: string;
  key?: string;
  error?: string;
} {
  const userIdValidation = validateUserId(params.user_id);
  if (!userIdValidation.success) return { error: userIdValidation.error };

  const keyValidation = validateStorageKey(params.key);
  if (!keyValidation.success) return { error: keyValidation.error };

  return {
    userId: userIdValidation.data,
    key: keyValidation.data
  };
}

async function findStorage(userId: string) {
  const guild = client.guilds.cache.get(config.base_guild_id);
  if (!guild) {
    return {
      success: false as const,
      statusCode: 503,
      error: 'Base guild is not available.'
    };
  }

  const member = guild.members.cache.get(userId);
  if (!member) {
    return {
      success: false as const,
      statusCode: 404,
      error: `User ${userId} is not being monitored by Lantern.`
    };
  }

  const user = await User.findOne({ id: userId }).lean();
  if (!user) {
    return {
      success: false as const,
      statusCode: 404,
      error: `User ${userId} is not being monitored by Lantern.`
    };
  }

  const storage = await Storage.findOne({ userId });
  if (!storage) {
    return {
      success: false as const,
      statusCode: 404,
      error: `User ${userId} does not have any storage.`
    };
  }

  return {
    success: true as const,
    storage
  };
}

type StorageDocument = Extract<
  Awaited<ReturnType<typeof findStorage>>,
  { success: true }
>['storage'];

function authorizeStorage(
  storage: StorageDocument,
  authorizationHeader: string | undefined
): string | null {
  if (!storage.token || !authorizationHeader) {
    return 'Unauthorized.';
  }

  const decryptedToken = decrypt(storage.token, process.env.KV_TOKEN_ENCRYPTION_SECRET);
  if (authorizationHeader !== decryptedToken) {
    return 'Unauthorized.';
  }

  return null;
}

const storageKeyRoute = new Elysia({ name: 'storage-key-route' })
  .put('/api/v1/users/:user_id/storage/:key', async ({ params, body, headers, status }) => {
    const validatedParams = validateParams(params);
    if (validatedParams.error) return status(400, { errors: validatedParams.error });

    const valueValidation = validateStorageValue(body);
    if (!valueValidation.success) return status(400, { errors: valueValidation.error });

    const { userId, key } = validatedParams as { userId: string; key: string };
    const result = await findStorage(userId);
    if (!result.success) return status(result.statusCode, { error: result.error });

    const { storage } = result;
    const authorizationError = authorizeStorage(storage, headers.authorization);
    if (authorizationError) return status(401, { error: authorizationError });

    if (!storage.kv) storage.kv = new Map();
    storage.kv.set(key, valueValidation.data.value);

    const validationError = getValidationError(storage);
    if (validationError) return status(400, { error: validationError });

    await storage.save();

    return { success: true };
  })
  .get('/api/v1/users/:user_id/storage/:key', async ({ params, status }) => {
    const validatedParams = validateParams(params);
    if (validatedParams.error) return status(400, { errors: validatedParams.error });

    const { userId, key } = validatedParams as { userId: string; key: string };
    const result = await findStorage(userId);
    if (!result.success) return status(result.statusCode, { error: result.error });

    const { storage } = result;
    if (!storage.kv) storage.kv = new Map();

    const value = storage.kv.get(key);
    if (!value) {
      return status(404, { error: `Key ${key} does not exist in the storage.` });
    }

    return { value };
  })
  .patch('/api/v1/users/:user_id/storage/:key', async ({ params, body, headers, status }) => {
    const validatedParams = validateParams(params);
    if (validatedParams.error) return status(400, { errors: validatedParams.error });

    const valueValidation = validateStorageValue(body);
    if (!valueValidation.success) return status(400, { errors: valueValidation.error });

    const { userId, key } = validatedParams as { userId: string; key: string };
    const result = await findStorage(userId);
    if (!result.success) return status(result.statusCode, { error: result.error });

    const { storage } = result;
    const authorizationError = authorizeStorage(storage, headers.authorization);
    if (authorizationError) return status(401, { error: authorizationError });

    if (!storage.kv) storage.kv = new Map();
    if (!storage.kv.has(key)) {
      return status(404, { error: `Key ${key} does not exist in the storage.` });
    }

    storage.kv.set(key, valueValidation.data.value);

    const validationError = getValidationError(storage);
    if (validationError) return status(400, { error: validationError });

    await storage.save();

    return { success: true };
  })
  .delete('/api/v1/users/:user_id/storage/:key', async ({ params, headers, status }) => {
    const validatedParams = validateParams(params);
    if (validatedParams.error) return status(400, { errors: validatedParams.error });

    const { userId, key } = validatedParams as { userId: string; key: string };
    const result = await findStorage(userId);
    if (!result.success) return status(result.statusCode, { error: result.error });

    const { storage } = result;
    const authorizationError = authorizeStorage(storage, headers.authorization);
    if (authorizationError) return status(401, { error: authorizationError });

    if (!storage.kv) storage.kv = new Map();
    if (!storage.kv.has(key)) {
      return status(404, { error: `Key ${key} does not exist in the storage.` });
    }

    storage.kv.delete(key);
    if (storage.kv.size === 0) delete storage.kv;

    await storage.save();

    return { success: true };
  });

export default storageKeyRoute;
