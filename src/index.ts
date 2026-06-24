import 'dotenv/config';

import '@/scripts/loadConfig';
import '@/scripts/loadLogger';
import '@/scripts/validateEnvironmentVariables';
import '@/scripts/handleUncaughtExceptions';

import connectDatabase from '@/scripts/connectDatabase';
import createClient from '@/bot/createClient';

await connectDatabase();
await createClient();
