import 'dotenv/config';

import '@/scripts/loadConfig';
import '@/scripts/loadLogger';
import '@/scripts/validateEnvironmentVariables';
import connectDatabase from '@/scripts/connectDatabase';
import '@/scripts/handleUncaughtExceptions';

import createClient from '@/bot/createClient';

async function main() {
  await connectDatabase;
  createClient();
}

main();