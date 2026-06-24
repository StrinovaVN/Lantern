import { Elysia } from 'elysia';
import { cron } from '@elysia/cron';
import createMongoBackup from '@/scripts/createMongoBackup';

const name = 'databaseBackup';

function createDatabaseBackupCron() {
  const app = new Elysia({ name: `cron:${name}` });
  if (!config.database.backup.enabled) return app;

  const pattern = config.database.backup.cron_pattern;

  return app
    .use(cron({
      name,
      pattern,
      protect: true,
      catch(error) {
        logger.error(`Cron ${name} failed:`);
        logger.error(error);
      },
      run: createMongoBackup
    }))
    .onStart(() => {
      logger.log('database', 'Database backup enabled.');
      logger.info(`Cron ${name} scheduled with pattern ${pattern}.`);
    });
}

export default createDatabaseBackupCron();
