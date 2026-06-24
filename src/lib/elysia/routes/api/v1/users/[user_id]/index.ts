import { Elysia } from 'elysia';
import User from '@/models/User';
import createUserData from '@/utils/bot/createUserData';
import Storage from '@/models/Storage';
import { validateUserId } from '@/elysia/middlewares/validateRequest';

const userRoute = new Elysia({ name: 'user-route' })
  .get('/api/v1/users/:user_id', async ({ params, status }) => {
    const userIdValidation = validateUserId(params.user_id);
    if (!userIdValidation.success) return status(400, { errors: userIdValidation.error });

    const userId = userIdValidation.data;

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

    const userStorage = await Storage.findOne({ userId });
    const createdUserData = await createUserData(userId, userStorage?.kv || {});

    return createdUserData;
  });

export default userRoute;
