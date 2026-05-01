import type { Response } from 'express';
import User from '@/models/User';

export const get = [
  async (_: unknown, response: Response) => {
    const currentlyMonitoringUsers = await User.countDocuments();

    return response.json({
      data: {
        info: `Hello! Navigator my name is ${client.user?.tag}`,
        discord: 'https://discord.strinovavn.com',
        currently_monitoring_users: currentlyMonitoringUsers
      }
    });
  }
];