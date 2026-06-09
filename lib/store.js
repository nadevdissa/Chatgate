const fs = require('fs');
const path = require('path');

const EMPTY_DB = {
  users: [],
  sessions: [],
  messages: [],
  friends: [],
  servers: [],
  requests: [],
};

const DB_KEY = 'chatgate:db';
const STORE_ID = 'main';
const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

let redisClient = null;
let pgPool = null;
let tableReady = false;

function cloneEmptyDb() {
  return {
    users: [],
    sessions: [],
    messages: [],
    friends: [],
    servers: [],
    requests: [],
  };
}

function pgEnv(name) {
  return process.env[name] || process.env[`Chatgate_${name}`] || null;
}

function getPostgresUrl() {
  const direct =
    pgEnv('POSTGRES_URL_NON_POOLING') ||
    pgEnv('POSTGRES_URL') ||
    process.env.SUPABASE_DB_URL ||
    process.env.DATABASE_URL;
  if (direct) return direct;

  const host = pgEnv('POSTGRES_HOST');
  const user = pgEnv('POSTGRES_USER');
  const password = pgEnv('POSTGRES_PASSWORD');
  const database = pgEnv('POSTGRES_DATABASE') || 'postgres';
  const port = pgEnv('POSTGRES_PORT') || '5432';
  if (host && user && password) {
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}?sslmode=require`;
  }
  return null;
}

function getRedis() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  if (!redisClient) {
    const { Redis } = require('@upstash/redis');
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return redisClient;
}

function getPgPool() {
  const connectionString = getPostgresUrl();
  if (!connectionString) return null;
  if (!pgPool) {
    const { Pool } = require('pg');
    pgPool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 1,
    });
  }
  return pgPool;
}

async function ensurePgTable() {
  const pool = getPgPool();
  if (!pool || tableReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS chatgate_store (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  tableReady = true;
}

async function readDbFromPostgres() {
  const pool = getPgPool();
  if (!pool) return null;
  await ensurePgTable();
  const result = await pool.query('SELECT data FROM chatgate_store WHERE id = $1', [STORE_ID]);
  if (!result.rows.length) return cloneEmptyDb();
  return result.rows[0].data;
}

async function writeDbToPostgres(db) {
  const pool = getPgPool();
  if (!pool) return;
  await ensurePgTable();
  await pool.query(
    `INSERT INTO chatgate_store (id, data, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (id)
     DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
    [STORE_ID, db]
  );
}

async function readDb() {
  const pool = getPgPool();
  if (pool) {
    return readDbFromPostgres();
  }

  const redis = getRedis();
  if (redis) {
    const data = await redis.get(DB_KEY);
    return data || cloneEmptyDb();
  }

  if (!fs.existsSync(DB_PATH)) {
    return cloneEmptyDb();
  }

  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

async function writeDb(db) {
  const pool = getPgPool();
  if (pool) {
    await writeDbToPostgres(db);
    return;
  }

  const redis = getRedis();
  if (redis) {
    await redis.set(DB_KEY, db);
    return;
  }

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function getStorageMode() {
  if (getPostgresUrl()) return 'supabase';
  if (getRedis()) return 'redis';
  if (process.env.VERCEL) return 'missing';
  return 'file';
}

module.exports = { readDb, writeDb, EMPTY_DB, getStorageMode, getRedis, getPgPool, getPostgresUrl, pgEnv };
