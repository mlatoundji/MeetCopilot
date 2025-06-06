import { createClient } from 'redis';

import dotenv from 'dotenv';
dotenv.config();

let REDIS_URL;
if (process.env.NODE_ENV !== 'production' || !process.env.REDIS_URL) {
  REDIS_URL = 'redis://127.0.0.1:6379';
}
else {
  REDIS_URL = process.env.REDIS_URL;
}
const MAX_REDIS_RETRIES = Number(process.env.REDIS_MAX_RETRIES) || 5;

const redis = createClient({
  url: REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > MAX_REDIS_RETRIES) {
        console.warn(`⚠️ Redis retry attempts exhausted (${retries}), stopping reconnect`);
        return new Error('Redis retry attempts exhausted');
      }
      return Math.min(retries * 100, 3000); // backoff
    }
  }
});
redis.on('error', (err) => console.error('Redis Client Error', err));

export const initRedis = async () => {
  if (!redis.isOpen) {
    try {
      await redis.connect();
      console.log('✅ Redis connected');
    } catch (err) {
      console.warn('⚠️ Redis connection failed, proceeding without Redis:', err.message);
    }
  }
  return redis;
};

// Ensure Redis is connected on import
export default await (async () => {
  await initRedis();
  return redis;
})(); 