import syncUsers from '@/utils/bot/syncUsers';
import { send as socket_send } from '@/elysia/routes/socket/utils';
import createUserData from '@/utils/bot/createUserData';
import type { EventType } from '@/src/types';

export default {
  name: 'guildMemberAdd',
  execute: async member => {
    logger.info(`User ${member.user.id} has joined the server and is now monitored.`);

    syncUsers();

    const subscribedSockets = [...ActiveSockets.values()]
      .filter(data => data.subscribed === 'ALL');
    if (!subscribedSockets.length) return;

    const userData = await createUserData(member.user.id, {});

    // Send a message to all active sockets that the user has joined the server
    for (const data of subscribedSockets) {
      socket_send(data.instance, config.server.socket.opcodes.USER_JOINED, userData);
    }
  }
} satisfies EventType;
