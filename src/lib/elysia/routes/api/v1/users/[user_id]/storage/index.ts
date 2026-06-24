import { Elysia } from 'elysia';
import User from '@/models/User';
import Storage from '@/models/Storage';
import { decrypt } from '@/utils/encryption';
import { validateUserId } from '@/elysia/middlewares/validateRequest';

const storageRoute = new Elysia({ name: 'storage-route' })
  .get('/api/v1/users/:user_id/storage', async ({ params, status }) => {
    const validation = validateUserId(params.user_id);
    if (!validation.success) return status(400, { errors: validation.error });

    const userId = validation.data;
    const guild = client.guilds.cache.get(config.base_guild_id);
    if (!guild) return status(503, { error: 'Base guild is not available.' });

    const member = guild.members.cache.get(userId);
    if (!member) {
      return status(404, { error: `User ${userId} is not being monitored by Lantern.` });
    }

    const user = await User.findOne({ id: userId }).lean();
    if (!user) {
      return status(404, { error: `User ${userId} is not being monitored by Lantern.` });
    }

    const storage = await Storage.findOne({ userId });
    if (!storage) {
      return status(404, { error: `User ${userId} does not have any storage.` });
    }

    return storage.kv || {};
  })
  .delete('/api/v1/users/:user_id/storage', async ({ params, headers, status }) => {
    const validation = validateUserId(params.user_id);
    if (!validation.success) return status(400, { errors: validation.error });

    const userId = validation.data;
    const guild = client.guilds.cache.get(config.base_guild_id);
    if (!guild) return status(503, { error: 'Base guild is not available.' });

    const member = guild.members.cache.get(userId);
    if (!member) {
      return status(404, { error: `User ${userId} is not being monitored by Lantern.` });
    }

    const user = await User.findOne({ id: userId }).lean();
    if (!user) {
      return status(404, { error: `User ${userId} is not being monitored by Lantern.` });
    }

    const storage = await Storage.findOne({ userId });
    if (!storage) {
      return status(404, { error: `User ${userId} does not have any storage.` });
    }
    if (!storage.token) return status(401, { error: 'Unauthorized.' });
    if (!headers.authorization) return status(401, { error: 'Unauthorized.' });

    const decryptedToken = decrypt(storage.token, process.env.KV_TOKEN_ENCRYPTION_SECRET);
    if (headers.authorization !== decryptedToken) return status(401, { error: 'Unauthorized.' });

    delete storage.kv;

    await storage.save();

    return { success: true };
  });

export default storageRoute;
