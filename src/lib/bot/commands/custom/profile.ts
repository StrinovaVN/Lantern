import * as Discord from 'discord.js';
import User from '@/models/User';
import Storage from '@/models/Storage';
import type { CommandType } from '@/src/types';
import getValidationError from '@/utils/getValidationError';

export default {
  metadata: {
    global: true
  },
  json: new Discord.SlashCommandBuilder()
    .setName('custom')
    .setDescription('Custom your profile')
    .addSubcommand(subcommand => subcommand.setName('avatar').setDescription('Set your avatar URL.').addStringOption(option => option.setName('value').setDescription('The avatar URL.').setRequired(true)))
    .addSubcommand(subcommand => subcommand.setName('banner').setDescription('Set your banner URL.').addStringOption(option => option.setName('value').setDescription('The banner URL.').setRequired(true)))
    .addSubcommand(subcommand => subcommand.setName('displayname').setDescription('Set your display name.').addStringOption(option => option.setName('value').setDescription('The display name.').setMaxLength(12).setRequired(true))),
  data: {
    'custom avatar': {
      restrictions: {},
      execute: {
        command: async interaction => {
          await interaction.deferReply({ ephemeral: !!interaction.guild });

          const user = await User.findOne({ id: interaction.user.id });
          if (user?.customProfileBanned) return interaction.error('You are not allowed to customize your profile.');

          const storage = await Storage.findOne({ userId: interaction.user.id });
          if (!storage?.token) return interaction.error('Please create a token first with `/storage create token`.');

          const value = interaction.options.getString('value', true);

          if (!storage.kv) storage.kv = new Map();
          storage.kv.set('avatar', value);

          const validationError = getValidationError(storage);
          if (validationError) return interaction.error(validationError);

          await storage.save();

          return interaction.success(`Your avatar has been set to \`${value}\`.`);
        }
      }
    },
    'custom banner': {
      restrictions: {},
      execute: {
        command: async interaction => {
          await interaction.deferReply({ ephemeral: !!interaction.guild });

          const user = await User.findOne({ id: interaction.user.id });
          if (user?.customProfileBanned) return interaction.error('You are not allowed to customize your profile.');

          const storage = await Storage.findOne({ userId: interaction.user.id });
          if (!storage?.token) return interaction.error('Please create a token first with `/storage create token`.');

          const value = interaction.options.getString('value', true);

          if (!storage.kv) storage.kv = new Map();
          storage.kv.set('banner', value);

          const validationError = getValidationError(storage);
          if (validationError) return interaction.error(validationError);

          await storage.save();

          return interaction.success(`Your banner has been set to \`${value}\`.`);
        }
      }
    },
    'custom displayname': {
      restrictions: {},
      execute: {
        command: async interaction => {
          await interaction.deferReply({ ephemeral: !!interaction.guild });

          const user = await User.findOne({ id: interaction.user.id });
          if (user?.customProfileBanned) return interaction.error('You are not allowed to customize your profile.');

          const storage = await Storage.findOne({ userId: interaction.user.id });
          if (!storage?.token) return interaction.error('Please create a token first with `/storage create token`.');

          const value = interaction.options.getString('value', true);

          if (value.length > 12) return interaction.error('Display name must not exceed 12 characters.');

          if (!storage.kv) storage.kv = new Map();
          storage.kv.set('displayname', value);

          const validationError = getValidationError(storage);
          if (validationError) return interaction.error(validationError);

          await storage.save();

          return interaction.success(`Your display name has been set to \`${value}\`.`);
        }
      }
    }
  }
} satisfies CommandType;