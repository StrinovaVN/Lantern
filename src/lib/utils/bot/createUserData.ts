import * as Discord from 'discord.js';
import * as dateFns from 'date-fns';
import type { UserData, ClientPresenceStatus, ClientPresenceStatusData } from '@/src/types';
import 'dotenv/config';

/**
 * Creates a user data object for a given user ID and key-value storage.
 *
 * @param {string} user_id - The ID of the user to create data for.
 * @param {Map<string, string> | {}} kv - A key-value storage object or map.
 * @returns {UserData} The user data object containing metadata, status, active platforms, activities, and storage.
 * @throws {Error} If the base guild or member is not found.
 */
function createUserData(user_id: string, kv: Map<string, string> | {}): UserData {
  const GUILD_ID = process.env.GUILD_ID;
  if (!GUILD_ID) throw new Error('GUILD_ID environment variable is not set.');

  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) throw new Error('Base guild not found.');

  const member = guild.members.cache.get(user_id);
  if (!member) throw new Error('Member not found.');

  const activePlatforms = {
    desktop: member.presence?.clientStatus?.desktop as ClientPresenceStatus || 'offline',
    mobile: member.presence?.clientStatus?.mobile as ClientPresenceStatus || 'offline',
    web: member.presence?.clientStatus?.web as ClientPresenceStatus || 'offline',
    spotify: null
  } as ClientPresenceStatusData;

  const spotifyActivity = member.presence?.activities.find(activity => activity.name === 'Spotify');

  if (spotifyActivity) {
    // Calculate current human-readable time relative to start time
    const currentTime = new Date();
    const startTime = spotifyActivity.timestamps?.start || new Date();
    const endTime = spotifyActivity.timestamps?.end || new Date();

    const elapsedTime = dateFns.differenceInSeconds(currentTime, startTime as Date);
    const currentHumanReadable = dateFns.format(new Date(elapsedTime * 1000), 'mm:ss');

    // Calculate human-readable end time
    const totalDuration = dateFns.differenceInSeconds(endTime as Date, startTime as Date);
    const endHumanReadable = dateFns.format(new Date(totalDuration * 1000), 'mm:ss');

    const artistCount = spotifyActivity.state?.split('; ').length || 0;

    const startTimestamp = spotifyActivity.timestamps?.start;
    const endTimestamp = spotifyActivity.timestamps?.end;

    activePlatforms.spotify = {
      track_id: (spotifyActivity.syncId ?? '') as unknown as string,
      song: (spotifyActivity.details ?? '') as unknown as string,
      artist: (artistCount > 1 ? (spotifyActivity.state?.split('; ') ?? []) : (spotifyActivity.state ?? '')) as unknown as string | string[],
      album: (spotifyActivity.assets?.largeText ?? '') as unknown as string,
      album_cover: (spotifyActivity.assets?.largeImageURL() ?? '') as unknown as string,
      start_time: {
        unix: Math.floor((startTimestamp?.getTime() ?? 0) / 1000) as unknown as number,
        raw: (startTimestamp ?? null) as unknown as Date
      },
      end_time: {
        unix: Math.floor((endTimestamp?.getTime() ?? 0) / 1000) as unknown as number,
        raw: (endTimestamp ?? null) as unknown as Date
      },
      time: {
        current_human_readable: currentHumanReadable,
        end_human_readable: endHumanReadable
      }
    } as unknown as ClientPresenceStatusData['spotify'];
  }

  const parsedActivites = [];

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
        var activityData = {
          name: activity.name,
          type: activity.type as unknown as keyof typeof Discord.ActivityType,
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

        if (activity.timestamps) {
          Object.assign(activityData, {
            timestamps: {
              start_time: {
                unix: Math.floor((activity.timestamps?.start?.getTime() ?? 0) / 1000) as unknown as number,
                raw: (activity.timestamps?.start ?? null) as unknown as Date
              }
            }
          });
        }

        parsedActivites.push(activityData);

        break;
    }
  }

  const baseObject = {
    metadata: {
      id: user_id,
      username: member.user.username,
      discriminator: member.user.discriminator,
      global_name: member.user.globalName,
      avatar: member.user.avatar,
      avatar_url: member.user.avatarURL(),
      display_avatar_url: member.user.displayAvatarURL(),
      bot: member.user.bot,
      flags: {
        human_readable: new Discord.UserFlagsBitField(member.user.flags?.bitfield)
          .toArray(),
        bitfield: member.user.flags?.bitfield
      },
      monitoring_since: {
        unix: Math.floor((member.joinedTimestamp ?? 0) / 1000) as unknown as number,
        raw: (member.joinedAt ?? new Date(0)) as unknown as Date
      }
    },
    active_platforms: activePlatforms,
    activities: parsedActivites,
    storage: kv,
    server_tag: member.user.primaryGuild?.identityEnabled ? {
      guild_id: (member.user.primaryGuild?.identityGuildId ?? '') as unknown as string,
      name: (member.user.primaryGuild?.tag ?? '') as unknown as string,
      icon_url: (member.user.guildTagBadgeURL() ?? '') as unknown as string
    } : null
  };

  if ((!member.presence || member.presence.status === 'offline') && client.lastSeens.has(user_id)) {
    const lastSeen = client.lastSeens.get(user_id)!;
    const lastSeenDate = new Date(lastSeen as unknown as string | number | Date);

    return {
      ...baseObject,
      status: 'offline',
      last_seen_at: {
        unix: Math.floor(lastSeenDate.getTime() / 1000) as unknown as number,
        raw: lastSeenDate as unknown as Date
      }
    } as unknown as UserData;
  } else {
    return {
      ...baseObject,
      status: member.presence?.status as Exclude<string, 'offline'>,
      last_seen_at: {
        unix: (null as unknown as number),
        raw: (null as unknown as Date)
      }
    } as unknown as UserData;
  }
}

export default createUserData;
