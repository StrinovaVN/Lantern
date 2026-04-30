import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import getApplicationIdFromToken from '@/utils/bot/getApplicationIdFromToken';

(async () => {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.error('DISCORD_BOT_TOKEN is not set.');
    process.exit(1);
  }

  const clientId = getApplicationIdFromToken(token);
  if (!clientId) {
    console.error('Failed to determine application ID from token.');
    process.exit(1);
  }

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    // Delete all global (application) commands
    await rest.put(Routes.applicationCommands(clientId), { body: [] });
    console.log('Successfully deleted all application commands.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to delete application commands:', error);
    process.exit(1);
  }
})();