import { Elysia } from 'elysia';
import { cron } from '@elysia/cron';
import * as Discord from 'discord.js';
import User from '@/models/User';

const name = 'updateClientActivityState';
const pattern = '0 */3 * * *';

async function updateClientActivityState(): Promise<void> {
  const currentlyMonitoringUsers = await User.countDocuments();
  const state = `Monitoring ${currentlyMonitoringUsers} users`;

  client.user!.setActivity({
    type: Discord.ActivityType.Custom,
    name: state,
    state
  });

  logger.log('bot', `Updated activity to "${state}".`);
}

const updateClientActivityStateCron = new Elysia({ name: `cron:${name}` })
  .use(cron({
    name,
    pattern,
    protect: true,
    catch(error) {
      logger.error(`Cron ${name} failed:`);
      logger.error(error);
    },
    run: updateClientActivityState
  }))
  .onStart(async () => {
    logger.info(`Cron ${name} scheduled with pattern ${pattern}.`);
    await updateClientActivityState();
  });

export default updateClientActivityStateCron;
