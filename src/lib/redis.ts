import IORedis from "ioredis";
import { config } from "../config/env";

export const createRedisConnection = (): IORedis => {
  return new IORedis(config.redisUrl, {
    maxRetriesPerRequest: null
  });
};

export const redisConnectionOptions = {
  url: config.redisUrl,
  maxRetriesPerRequest: null
};

