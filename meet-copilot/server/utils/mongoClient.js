import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGO_URI || 'mongodb://mongo:password@localhost:27017/meetcopilotdb';
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

export async function initMongo() {
  try {
    await client.connect();
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection failed', err);
  }
  return client.db();
}

export default client; 