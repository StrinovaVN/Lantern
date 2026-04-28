import * as fs from 'node:fs';
import * as toml from '@iarna/toml';
import type { Config } from '@/src/types/global';

const config = toml.parse(fs.readFileSync('./src/config.toml', 'utf-8')) as Config;

const Port = Number(process.env.PORT);

if (Number.isFinite(Port) && Port > 0) {
  config.server.port = Port;
}

global.config = config;