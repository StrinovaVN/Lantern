import * as Discord from 'discord.js';
import * as dateFns from 'date-fns';
import type {
  ClientPresenceStatus,
  ClientPresenceStatusData,
  CustomStatusActivity,
  OtherActivity,
  UserData
} from '@/src/types';

const userProfileRequests = new Map<string, Promise<Discord.User>>();

async function fetchUserProfile(user: Discord.User): Promise<Discord.User> {
  if (user.banner !== undefined && user.accentColor !== undefined) return user;

  const pendingRequest = userProfileRequests.get(user.id);
  if (pendingRequest) return pendingRequest;

  const request = user.fetch()
    .catch(error => {
      logger.warn(`Failed to fetch Discord profile for user ${user.id}.`);
      logger.warn(error);

      return user;
    })
    .finally(() => userProfileRequests.delete(user.id));

  userProfileRequests.set(user.id, request);

  return request;
}

/**
 * Creates a user data object for a given user ID and key-value storage.
 *
 * @param {string} user_id - The ID of the user to create data for.
 * @param {Map<string, string> | {}} kv - A key-value storage object or map.
 * @returns {Promise<UserData>} The user data object containing metadata, status, active platforms, activities, and storage.
 * @throws {Error} If the base guild or member is not found.
 */
async function createUserData(user_id: string, kv: Map<string, string> | {}): Promise<UserData> {
  const guild = client.guilds.cache.get(config.base_guild_id);
  if (!guild) throw new Error('Base guild not found.');

  const member = guild.members.cache.get(user_id);
  if (!member) throw new Error('Member not found.');

  const user = await fetchUserProfile(member.user);
  const activePlatforms = {
    desktop: member.presence?.clientStatus?.desktop as ClientPresenceStatus || 'offline',
    mobile: member.presence?.clientStatus?.mobile as ClientPresenceStatus || 'offline',
    web: member.presence?.clientStatus?.web as ClientPresenceStatus || 'offline',
    spotify: null
  } as ClientPresenceStatusData;

  const spotifyActivity = member.presence?.activities.find(activity => activity.name === 'Spotify');

  if (spotifyActivity) {
    const currentTime = new Date();
    const startTime = spotifyActivity.timestamps?.start;
    const endTime = spotifyActivity.timestamps?.end;
    const artist = spotifyActivity.state;
    const artistCount = artist?.split('; ').length || 0;
    const currentHumanReadable = startTime
      ? dateFns.format(
        new Date(dateFns.differenceInSeconds(currentTime, startTime) * 1000),
        'mm:ss'
      )
      : null;
    const endHumanReadable = startTime && endTime
      ? dateFns.format(
        new Date(dateFns.differenceInSeconds(endTime, startTime) * 1000),
        'mm:ss'
      )
      : null;

    activePlatforms.spotify = {
      track_id: spotifyActivity.syncId ?? null,
      song: spotifyActivity.details,
      artist: artistCount > 1 ? artist?.split('; ') ?? null : artist,
      album: spotifyActivity.assets?.largeText ?? null,
      album_cover: spotifyActivity.assets?.largeImageURL() ?? null,
      start_time: startTime ? {
        unix: Math.floor(startTime.getTime() / 1000),
        raw: startTime
      } : null,
      end_time: endTime ? {
        unix: Math.floor(endTime.getTime() / 1000),
        raw: endTime
      } : null,
      time: {
        current_human_readable: currentHumanReadable,
        end_human_readable: endHumanReadable
      }
    };
  }

  const parsedActivites: (CustomStatusActivity | OtherActivity)[] = [];

  for (const activity of member.presence?.activities || []) {
    switch (activity.name) {
      case 'Custom Status':
        parsedActivites.push({
          name: activity.name,
          type: 4,
          emoji: activity.emoji,
          text: activity.state,
          start_time: {
            unix: Math.floor(activity.createdTimestamp / 1000),
            raw: activity.createdAt
          },
          end_time: activity.timestamps?.end ? {
            unix: Math.floor(activity.timestamps.end.getTime() / 1000),
            raw: activity.timestamps.end
          } : null
        });
        break;
      default:
        var activityData: OtherActivity = {
          name: activity.name,
          type: activity.type,
          state: activity.state,
          details: activity.details,
          application_id: activity.applicationId,
          created_at: activity.createdTimestamp
        };

        if (activity.assets) {
          Object.assign(activityData, {
            assets: {
              large_image: {
                hash: activity.assets.largeImage,
                image_url: activity.assets.largeImageURL(),
                text: activity.assets.largeText
              },
              small_image: {
                hash: activity.assets.smallImage,
                image_url: activity.assets.smallImageURL(),
                text: activity.assets.smallText
              }
            }
          });
        }

        if (activity.timestamps?.start) {
          Object.assign(activityData, {
            timestamps: {
              start_time: {
                unix: Math.floor(activity.timestamps.start.getTime() / 1000),
                raw: activity.timestamps.start
              }
            }
          });
        }

        parsedActivites.push(activityData);

        break;
    }
  }

  const joinedAt = member.joinedAt;
  const primaryGuild = user.primaryGuild;
  const serverTag = primaryGuild?.identityEnabled &&
    primaryGuild.identityGuildId &&
    primaryGuild.tag
    ? {
      guild_id: primaryGuild.identityGuildId,
      name: primaryGuild.tag,
      icon_url: user.guildTagBadgeURL()
    }
    : null;

  const baseObject = {
    metadata: {
      id: user_id,
      username: user.username,
      discriminator: user.discriminator,
      global_name: user.globalName,
      avatar: user.avatar,
      avatar_url: user.avatarURL(),
      display_avatar_url: user.displayAvatarURL(),
      banner: user.bannerURL() ?? user.hexAccentColor ?? null,
      bot: user.bot,
      flags: {
        human_readable: new Discord.UserFlagsBitField(user.flags?.bitfield)
          .toArray(),
        bitfield: user.flags?.bitfield
      },
      monitoring_since: {
        unix: joinedAt ? Math.floor(joinedAt.getTime() / 1000) : null,
        raw: joinedAt
      }
    },
    active_platforms: activePlatforms,
    activities: parsedActivites,
    storage: kv,
    server_tag: serverTag
  };

  const presenceStatus = member.presence?.status;
  const status: ClientPresenceStatus = presenceStatus === 'invisible'
    ? 'offline'
    : presenceStatus ?? 'offline';
  const lastSeen = client.lastSeens.get(user_id);

  if (status === 'offline' && lastSeen) {
    return {
      ...baseObject,
      status,
      last_seen_at: {
        unix: Math.floor(lastSeen.getTime() / 1000),
        raw: lastSeen
      }
    };
  }

  return {
    ...baseObject,
    status,
    last_seen_at: {
      unix: null,
      raw: null
    }
  };
}

export default createUserData;
