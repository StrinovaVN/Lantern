import * as Discord from 'discord.js';
import type { EventType } from '@/src/types';

function listenEvents(events: Discord.Collection<string, EventType>) {
  for (const [, event] of events) {
    (client.on as unknown as (event: keyof Discord.ClientEvents, listener: (...args: unknown[]) => void) => Discord.Client)(
      event.name as keyof Discord.ClientEvents,
      event.execute as unknown as (...args: unknown[]) => void
    );
  }
}

export default listenEvents;