import type { ServerSocketOpcodes } from '@/src/types/global';

type Socket = {
  send: (data: string) => unknown;
  close: (code?: number, reason?: string) => unknown;
};

const Opcodes = config.server.socket.opcodes;

interface Payload {
  t: string | undefined;
  op?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  d?: any;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function send(socket: Socket, op: ServerSocketOpcodes, d?: any): void {
  const payloadName = Object.entries(Opcodes).find(([, value]) => value === op)?.[0];

  const payload: Payload = {
    t: payloadName,
    op
  };

  if (d) payload.d = d;

  socket.send(JSON.stringify(payload));
}

function disconnect(socket: Socket, id: string | null, error: string): void {
  if (id) {
    ActiveSockets.delete(id);
    logger.log('socket', `Websocket connection closed: ${id}`);
  }

  send(socket, Opcodes.DISCONNECT, { error });
  socket.close();
}

export {
  disconnect,
  send
};
