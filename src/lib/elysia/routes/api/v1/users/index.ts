import { Elysia } from 'elysia';
import User from '@/models/User';
import createUserData from '@/utils/bot/createUserData';
import Storage from '@/models/Storage';
import { validateBulkUserIds } from '@/elysia/middlewares/validateRequest';

const usersRoute = new Elysia({ name: 'users-route' })
  .get('/api/v1/users', async ({ request, status }) => {
    const validation = validateBulkUserIds(request);
    if (!validation.success) return status(400, { errors: validation.error });

    const userIds = validation.data;

    if (userIds.length === config.max_bulk_get_users_size) {
      return status(400, {
        error: `You can only request up to ${config.max_bulk_get_users_size} users at once.`
      });
    }

    const users = await User.find({ id: { $in: userIds } }).lean();

    const notMonitoredUsers = userIds.filter(id => !users.some(({ id: userId }) => userId === id));
    if (notMonitoredUsers.length === userIds.length) {
      return status(404, { error: 'Users you requested are not monitored by Lantern.' });
    }

    const usersStorages = await Storage.find({ userId: { $in: userIds } });

    return Promise.all(users.map(user => {
      const userStorage = usersStorages.find(({ userId }) => userId === user.id);

      return createUserData(user.id, userStorage?.kv || {});
    }));
  });

export default usersRoute;
