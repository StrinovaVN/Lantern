import { Elysia } from 'elysia';
import type { ElysiaWS } from 'elysia/ws';
import * as Discord from 'discord.js';
import User from '@/models/User';
import getZodError from '@/utils/getZodError';
import createUserData from '@/utils/bot/createUserData';
import { disconnect, send } from '@/elysia/routes/socket/utils';
import Storage from '@/models/Storage';
import { InitSchema } from '@/elysia/routes/socket/schemas';

type Socket = ElysiaWS<Record<string, unknown>>;

type InitData = {
  user_id?: string;
  user_ids?: string[];
};

type SocketPayload = {
  op?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  d?: any;
};

global.ActiveSockets = new Discord.Collection();

const Opcodes = config.server.socket.opcodes;
const initTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

async function subscribeToUsers(
  socket: Socket,
  socketId: string,
  { user_id, user_ids }: InitData
): Promise<void> {
  const subscribedToAll = user_id === 'ALL';

  if (user_id && !subscribedToAll) {
    const user = await User.findOne({ id: user_id });
    if (!user) return send(socket, Opcodes.ERROR, `User ${user_id} not found.`);
  }

  if (user_ids) {
    const users = await User.find({ id: { $in: user_ids } });
    if (users.length !== user_ids.length) {
      const missingUserIds = user_ids.filter(id => !users.map(user => user.id).includes(id));

      return send(socket, Opcodes.ERROR, `User(s) ${missingUserIds.join(', ')} not found.`);
    }
  }

  if (ActiveSockets.has(socketId)) {
    const activeSocket = ActiveSockets.get(socketId);
    if (!activeSocket) return disconnect(socket, socketId, 'Invalid websocket connection.');

    const usersToSubscribe = user_ids || (user_id ? [user_id] : []);
    const { subscribed } = activeSocket;

    if (subscribed === 'ALL') {
      return send(socket, Opcodes.ERROR, 'You are already subscribed to all users.');
    }

    if (typeof subscribed === 'string') {
      if (!user_id) return send(socket, Opcodes.ERROR, 'user_id is required.');
      if (subscribed.includes(user_id)) {
        return send(socket, Opcodes.ERROR, `You are already subscribed to user ${user_id}.`);
      }
    }

    if (Array.isArray(subscribed) && user_ids) {
      const alreadySubscribed = subscribed.filter(subscribedUserId => user_ids.includes(subscribedUserId));
      if (alreadySubscribed.length) {
        return send(
          socket,
          Opcodes.ERROR,
          `You are already subscribed to user(s) ${alreadySubscribed.join(', ')}.`
        );
      }
    }

    ActiveSockets.set(socketId, {
      instance: socket,
      lastHeartbeat: Date.now(),
      subscribed: subscribedToAll ? 'ALL' : [...subscribed, ...usersToSubscribe]
    });

    send(socket, Opcodes.SUBSCRIBE_ACK);

    logger.log(
      'socket',
      `Websocket connection ${socketId} subscribed to ${subscribedToAll ? 'all users' : usersToSubscribe.join(', ')}.`
    );
  } else {
    const usersToSubscribe = user_ids || (user_id ? [user_id] : []);

    ActiveSockets.set(socketId, {
      instance: socket,
      lastHeartbeat: Date.now(),
      subscribed: subscribedToAll ? 'ALL' : usersToSubscribe
    });
  }
}

function parsePayload(message: unknown): SocketPayload | null {
  if (message && typeof message === 'object') return message as SocketPayload;

  if (typeof message !== 'string') return null;

  try {
    const payload = JSON.parse(message);

    return payload && typeof payload === 'object' ? payload as SocketPayload : null;
  } catch {
    return null;
  }
}

const socketRoute = new Elysia({ name: 'socket-route' })
  .ws('/socket', {
    open(socket) {
      send(socket, Opcodes.HELLO, {
        heartbeat_interval: config.server.socket.heartbeat_interval
      });

      initTimeouts.set(socket.id, setTimeout(() => socket.close(), 5000));
    },
    async message(socket, message) {
      const payload = parsePayload(message);
      if (!payload || typeof payload.op !== 'number') {
        return disconnect(socket, null, 'Invalid opcode.');
      }

      const { op, d: data } = payload;
      if (!Object.values(Opcodes).includes(op)) {
        return disconnect(socket, null, 'Invalid opcode.');
      }
      if (!config.server.socket.client_allowed_opcodes.includes(op)) {
        return disconnect(socket, null, 'You are not allowed to send this opcode to the server.');
      }

      switch (op) {
        case Opcodes.INIT: {
          const initTimeout = initTimeouts.get(socket.id);
          if (initTimeout) clearTimeout(initTimeout);
          initTimeouts.delete(socket.id);

          const error = getZodError(data, InitSchema);
          if (error) return disconnect(socket, null, error);

          const subscribedToAll = data.user_id === 'ALL';

          await subscribeToUsers(socket, socket.id, {
            user_id: data.user_id,
            user_ids: data.user_ids
          });

          logger.log('socket', `New websocket connection: ${socket.id}`);

          if (subscribedToAll) {
            const users = await User.find();
            const storages = await Storage.find({ userId: { $in: users.map(user => user.id) } });
            const userData = await Promise.all(users.map(user => createUserData(
              user.id,
              storages.find(storage => storage.userId === user.id)?.kv || {}
            )));

            send(socket, Opcodes.INIT_ACK, userData);

            logger.log('socket', `Websocket connection ${socket.id} subscribed to all users.`);
          } else if (data.user_id) {
            const userStorage = await Storage.findOne({ userId: data.user_id });

            send(
              socket,
              Opcodes.INIT_ACK,
              await createUserData(data.user_id, userStorage?.kv || {})
            );

            logger.log('socket', `Websocket connection ${socket.id} subscribed to user ${data.user_id}.`);
          } else {
            const users = await User.find({ id: { $in: data.user_ids } });
            const storages = await Storage.find({ userId: { $in: users.map(user => user.id) } });
            const userData = await Promise.all(users.map(user => createUserData(
              user.id,
              storages.find(storage => storage.userId === user.id)?.kv || {}
            )));

            send(socket, Opcodes.INIT_ACK, userData);

            logger.log(
              'socket',
              `Websocket connection ${socket.id} subscribed to users ${data.user_ids.join(', ')}.`
            );
          }

          break;
        }
        case Opcodes.HEARTBEAT: {
          if (!ActiveSockets.has(socket.id)) {
            return disconnect(socket, null, 'Invalid websocket connection.');
          }

          const heartbeatSocket = ActiveSockets.get(socket.id);
          if (!heartbeatSocket) {
            return disconnect(socket, null, 'Invalid websocket connection.');
          }

          ActiveSockets.set(socket.id, {
            instance: socket,
            lastHeartbeat: Date.now(),
            subscribed: heartbeatSocket.subscribed
          });

          send(socket, Opcodes.HEARTBEAT_ACK);

          break;
        }
        case Opcodes.SUBSCRIBE: {
          if (!ActiveSockets.has(socket.id)) {
            return disconnect(socket, null, 'Invalid websocket connection.');
          }

          const subscribedSocket = ActiveSockets.get(socket.id);
          if (!subscribedSocket) {
            return disconnect(socket, null, 'Invalid websocket connection.');
          }

          const error = getZodError(data, InitSchema);
          if (error) return send(socket, Opcodes.ERROR, error);

          if (subscribedSocket.subscribed === 'ALL') {
            return send(socket, Opcodes.ERROR, 'You are already subscribed to all users.');
          }

          await subscribeToUsers(socket, socket.id, {
            user_id: data.user_id,
            user_ids: data.user_ids
          });

          break;
        }
        case Opcodes.UNSUBSCRIBE: {
          if (!ActiveSockets.has(socket.id)) {
            return disconnect(socket, null, 'Invalid websocket connection.');
          }

          const unsubscribedSocket = ActiveSockets.get(socket.id);
          if (!unsubscribedSocket) {
            return disconnect(socket, null, 'Invalid websocket connection.');
          }

          const error = getZodError(data, InitSchema);
          if (error) return send(socket, Opcodes.ERROR, error);

          const { user_id, user_ids } = data;
          const { subscribed } = unsubscribedSocket;

          if (typeof subscribed === 'string') {
            return send(socket, Opcodes.ERROR, 'You are subscribed to all users.');
          }

          if (user_id && !subscribed.includes(user_id)) {
            return send(socket, Opcodes.ERROR, `You are not subscribed to user ${user_id}.`);
          }

          if (user_ids) {
            const notSubscribed = user_ids.filter((userId: string) => !subscribed.includes(userId));
            if (notSubscribed.length) {
              return send(
                socket,
                Opcodes.ERROR,
                `You are not subscribed to user(s) ${notSubscribed.join(', ')}.`
              );
            }
          }

          const newSubscribed = subscribed.filter((subscribedUserId: string) => {
            if (user_id) return subscribedUserId !== user_id;
            if (user_ids) return !user_ids.includes(subscribedUserId);

            return true;
          });

          if (!newSubscribed.length) {
            return disconnect(
              socket,
              socket.id,
              'You require at least one user to be subscribed. Connection closed.'
            );
          }

          ActiveSockets.set(socket.id, {
            instance: socket,
            lastHeartbeat: Date.now(),
            subscribed: newSubscribed
          });

          send(socket, Opcodes.UNSUBSCRIBE_ACK);

          logger.log(
            'socket',
            `Websocket connection ${socket.id} unsubscribed from ${user_id ? `user ${user_id}` : user_ids.join(', ')}.`
          );

          break;
        }
      }
    },
    close(socket) {
      const initTimeout = initTimeouts.get(socket.id);
      if (initTimeout) clearTimeout(initTimeout);
      initTimeouts.delete(socket.id);

      if (ActiveSockets.delete(socket.id)) {
        logger.log('socket', `Websocket connection closed: ${socket.id}`);
      }
    }
  });

export default socketRoute;
