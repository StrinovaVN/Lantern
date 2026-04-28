import * as Discord from 'discord.js';
import type { CommandType } from '@/src/types';
import User from '@/models/User';

export default {
  metadata: {
    global: false
  },
  json: new Discord.SlashCommandBuilder()
    .setName('unban')
    .setDescription('Allow a user to customize their profile again.')
    .addUserOption(option => option.setName('user').setDescription('The user to unban from custom profile.').setRequired(true)),
  data: {
    unban: {
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

          await User.findOneAndUpdate(
            { id: user.id },
            { customProfileBanned: false },
            { upsert: true }
          );

          return interaction.success(`\`${user.tag}\` can customize their profile again.`);
        }
      }
    }
  }
} satisfies CommandType;
