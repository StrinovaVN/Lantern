/* eslint-disable @typescript-eslint/no-explicit-any */

import type * as Discord from 'discord.js';

type Restrictions = {
  guildOnly?: boolean;
  ownerOnly?: boolean;
  baseGuildOnly?: boolean;
  users?: {
    allow?: string[];
    deny?: string[];
  };
  roles?: {
    allow?: string[] | number[];
    deny?: string[] | number[];
  };
  permissions?: {
    allow?: Discord.PermissionResolvable[];
    deny?: Discord.PermissionResolvable[];
  };
} | null;

type CommandMetadata = {
  global?: boolean;
} | null;

type AutocompleteOption = {
  name: string,
  value: string | number
}

export type CommandType = {
  json: Discord.APIApplicationCommand | any,
  metadata?: CommandMetadata,
  data: {
    [key: string]: {
      restrictions: Restrictions,
      execute: {
        command: (interaction: Discord.ChatInputCommandInteraction, { subcommand, group }: { subcommand: string | null, group: string | null }) => Promise<any> | void,
        component?: {
          [key: string]: (interaction: Discord.MessageComponentInteraction, { args }: { args: string[] }) => Promise<any> | void
        },
        modal?: {
          [key: string]: (interaction: Discord.ModalSubmitInteraction, { args }: { args: string[] }) => Promise<any> | void
        },
        autocomplete?: (interaction: Discord.AutocompleteInteraction, { subcommand, group }: { subcommand: string | null, group: string | null }) => Promise<AutocompleteOption[]> | AutocompleteOption[]
      }
    }
  }
}

export type EventType = {
  [K in keyof Discord.ClientEvents]: {
    name: K;
    execute: (...args: [...Discord.ClientEvents[K]]) => Promise<void> | void;
  };
}[keyof Discord.ClientEvents];

declare module 'discord.js' {
  interface Client {
    commands: Discord.Collection<string, CommandType>;
    events: Discord.Collection<string, EventType>;
    lastSeens: Discord.Collection<string, Date>;
  }

  interface CommandInteraction {
    success: (content: string, options?: Discord.InteractionReplyOptions) => Promise<void>;
    error: (content: string, options?: Discord.InteractionReplyOptions) => Promise<void>;
  }

  interface MessageComponentInteraction {
    success: (content: string, options?: Discord.InteractionReplyOptions) => Promise<void>;
    error: (content: string, options?: Discord.InteractionReplyOptions) => Promise<void>;
  }
}

export type BaseUserType = {
  metadata: {
    id: string;
    username: string;
    discriminator: string;
    global_name: string | null;
    avatar: string | null;
    avatar_url: string | null;
    display_avatar_url: string;
    banner: string | null;
    bot: boolean;
    flags: {
      human_readable: string[];
      bitfield: number | null | undefined;
    };
    monitoring_since: {
      unix: number | null;
      raw: Date | null;
    };
  };
  active_platforms: ClientPresenceStatusData;
  activities: (CustomStatusActivity | OtherActivity)[];
  storage: Map<string, string> | {};
  server_tag: {
    guild_id: string;
    name: string;
    icon_url: string | null;
  } | null;
};

export type UserData = BaseUserType & {
  status: ClientPresenceStatus;
  last_seen_at: {
    unix: number;
    raw: Date;
  } | {
    unix: null;
    raw: null;
  };
};

export type ClientPresenceStatus = 'online' | 'idle' | 'dnd' | 'offline';

export type ClientPresenceStatusData = {
  web: ClientPresenceStatus;
  mobile: ClientPresenceStatus;
  desktop: ClientPresenceStatus;
  spotify: SpotifyActivity | null;
}

type SpotifyActivity = {
  track_id: string | null,
  song: string | null,
  artist: string | string[] | null,
  album: string | null,
  album_cover: string | null,
  start_time: {
    unix: number,
    raw: Date
  } | null,
  end_time: {
    unix: number,
    raw: Date
  } | null,
  time: {
    current_human_readable: string | null,
    end_human_readable: string | null
  }
}

export type CustomStatusActivity = {
  name: 'Custom Status',
  type: Discord.ActivityType.Custom,
  emoji: Discord.Emoji | null,
  text: string | null,
  start_time: {
    unix: number,
    raw: Date
  },
  end_time: {
    unix: number,
    raw: Date
  } | null
}

export type OtherActivity = {
  name: string,
  type: Discord.ActivityType,
  state: string | null,
  details: string | null,
  application_id: string | null,
  created_at: number,
  assets?: {
    large_image: {
      hash: string | null,
      image_url: string | null,
      text: string | null
    },
    small_image: {
      hash: string | null,
      image_url: string | null,
      text: string | null
    }
  },
  timestamps?: {
    start_time: {
      unix: number,
      raw: Date
    }
  }
}
