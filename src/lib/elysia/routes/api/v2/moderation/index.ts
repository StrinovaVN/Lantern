import type { User } from 'discord.js';
import { Elysia } from 'elysia';

function createUserData(user: User) {
  return {
    id: user.id,
    username: user.username,
    global_name: user.globalName,
    avatar_url: user.avatarURL(),
    display_avatar_url: user.displayAvatarURL(),
    bot: user.bot
  };
}

const moderationRoute = new Elysia({ name: 'moderation-route' })
  .onBeforeHandle(({ request, status }) => {
    if (request.headers.get('x-api-key') !== process.env.API_KEY) {
      return status(401, { error: 'Unauthorized.' });
    }
  })
  .get('/api/v2/bans', async ({ status }) => {
    const guild = client.guilds.cache.get(config.base_guild_id);
    if (!guild) return status(503, { error: 'Base guild is not available.' });

    const bans = await guild.bans.fetch();

    return bans.map(ban => ({
      user: createUserData(ban.user),
      reason: ban.reason
    }));
  })
  .get('/api/v2/timeouts', ({ status }) => {
    const guild = client.guilds.cache.get(config.base_guild_id);
    if (!guild) return status(503, { error: 'Base guild is not available.' });

    return guild.members.cache
      .filter(member => member.isCommunicationDisabled())
      .map(member => {
        const timeoutUntil = member.communicationDisabledUntil;

        return {
          user: createUserData(member.user),
          timeout_until: timeoutUntil ? {
            unix: Math.floor(timeoutUntil.getTime() / 1000),
            raw: timeoutUntil
          } : null
        };
      });
  });

export default moderationRoute;
