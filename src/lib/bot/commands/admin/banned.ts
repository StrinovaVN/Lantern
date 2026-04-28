import * as Discord from 'discord.js';
import type { CommandType } from '@/src/types';
import User from '@/models/User';
import Storage from '@/models/Storage';

const PROFILE_KEYS = ['avatar', 'banner', 'displayname'] as const;

export default {
  metadata: {
    global: false
  },
  json: new Discord.SlashCommandBuilder()
    .setName('banned')
    .setDescription('Ban a user from custom profile.')
    .addUserOption(option => option.setName('user').setDescription('The user to ban from custom profile.').setRequired(true)),
  data: {
    'banned': {
      restrictions: {
        baseGuildOnly: true,
        permissions: {
          allow: [Discord.PermissionFlagsBits.Administrator]
        }
      },
      execute: {
        command: async interaction => {
          await interaction.deferReply({ ephemeral: true });

          const user = interaction.options.getUser('user', true);

          const storage = await Storage.findOne({ userId: user.id });
          if (storage?.kv) {
            for (const key of PROFILE_KEYS) storage.kv.delete(key);

            if (!storage.kv.size) delete storage.kv;

            await storage.save();
          }

          await User.findOneAndUpdate(
            { id: user.id },
            { customProfileBanned: true },
            { upsert: true }
          );

          return interaction.success(`\`${user.tag}\` can no longer customize their profile, and their custom values were reset.`);
        }
      }
    }
  }
} satisfies CommandType;
