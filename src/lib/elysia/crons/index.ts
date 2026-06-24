import { Elysia } from 'elysia';
import checkInactiveWebsockets from '@/elysia/crons/checkInactiveWebsockets';
import updateClientActivityState from '@/elysia/crons/updateClientActivityState';
import databaseBackup from '@/elysia/crons/databaseBackup';

const crons = new Elysia({ name: 'crons' })
  .use(checkInactiveWebsockets)
  .use(updateClientActivityState)
  .use(databaseBackup);

export default crons;
