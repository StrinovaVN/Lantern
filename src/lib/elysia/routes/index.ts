import { Elysia } from 'elysia';
import User from '@/models/User';
import usersRoute from '@/elysia/routes/api/v1/users';
import userRoute from '@/elysia/routes/api/v1/users/[user_id]';
import storageRoute from '@/elysia/routes/api/v1/users/[user_id]/storage';
import storageKeyRoute from '@/elysia/routes/api/v1/users/[user_id]/storage/[key]';
import socketRoute from '@/elysia/routes/socket';

const routes = new Elysia({ name: 'routes' })
  .get('/', async () => {
    const currentlyMonitoringUsers = await User.countDocuments();

    return {
      data: {
        info: `Hello! Navigator my name is ${client.user?.tag}`,
        discord: 'https://discord.gg/pfGHWWwcPT',
        currently_monitoring_users: currentlyMonitoringUsers
      }
    };
  })
  .use(usersRoute)
  .use(userRoute)
  .use(storageRoute)
  .use(storageKeyRoute)
  .use(socketRoute);

export default routes;
