const fs = require('fs');
const path = require('path');

const EMPTY_DB = {
  users: [],
  sessions: [],
  messages: [],
  friends: [],
  servers: [],
  requests: [],
  blocks: [],
  calls: [],
  presence: [],
  typing: [],
};

const DB_KEY = 'chatgate:db';
const STORE_ID = 'main';
const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

let redisClient = null;
let tableReady = false;
let memoryCache = null;
let memoryCacheAt = 0;
const MEMORY_CACHE_TTL_MS = 8000;

function cloneDb(db) {
  return JSON.parse(JSON.stringify(db));
}

function cloneEmptyDb() {
  return {
    users: [],
    sessions: [],
    messages: [],
    friends: [],
    servers: [],
    requests: [],
    blocks: [],
    calls: [],
    presence: [],
    typing: [],
  };
}

function pgEnv(name) {
  return process.env[name] || process.env[`Chatgate_${name}`] || null;
}

function getPostgresUrl() {
  const direct =
    pgEnv('POSTGRES_URL_NON_POOLING') ||
    pgEnv('POSTGRES_URL') ||
    pgEnv('POSTGRES_PRISMA_URL') ||
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

function getPgClientConfig() {
  let connectionString = getPostgresUrl();
  if (!connectionString) return null;
  connectionString = connectionString
    .replace(/[?&]sslmode=[^&]*/gi, '')
    .replace(/[?&]supa=[^&]*/gi, '')
    .replace(/\?$/, '');
  const separator = connectionString.includes('?') ? '&' : '?';
  connectionString = `${connectionString}${separator}sslmode=no-verify`;
  return {
    connectionString,
    ssl: { rejectUnauthorized: false },
  };
}

async function withPgClient(fn) {
  const config = getPgClientConfig();
  if (!config) return null;
  const { Client } = require('pg');
  const client = new Client(config);
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end().catch(() => {});
  }
}

async function ensurePgTable(client) {
  if (tableReady) return;
  await client.query(`
    CREATE TABLE IF NOT EXISTS chatgate_store (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  tableReady = true;
}

function parseDbRow(data) {
  if (!data) return cloneEmptyDb();
  if (typeof data === 'string') return JSON.parse(data);
  return data;
}

async function readDbFromPostgres() {
  return withPgClient(async (client) => {
    await ensurePgTable(client);
    const result = await client.query('SELECT data FROM chatgate_store WHERE id = $1', [STORE_ID]);
    if (!result.rows.length) return cloneEmptyDb();
    return parseDbRow(result.rows[0].data);
  });
}

async function writeDbToPostgres(db) {
  return withPgClient(async (client) => {
    await ensurePgTable(client);
    await client.query(
      `INSERT INTO chatgate_store (id, data, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (id)
       DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
      [STORE_ID, JSON.stringify(db)]
    );
  });
}

async function readDb() {
  if (getPostgresUrl()) {
    const now = Date.now();
    if (memoryCache && now - memoryCacheAt < MEMORY_CACHE_TTL_MS) {
      return cloneDb(memoryCache);
    }
    const data = await readDbFromPostgres();
    const normalized = data && typeof data === 'object' ? data : cloneEmptyDb();
    memoryCache = normalized;
    memoryCacheAt = now;
    return cloneDb(normalized);
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
  if (getPostgresUrl()) {
    memoryCache = cloneDb(db);
    memoryCacheAt = Date.now();
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

function getPgPool() {
  return getPostgresUrl() ? { configured: true, pooled: false } : null;
}

async function readDbFresh() {
  if (getPostgresUrl()) {
    return cloneDb(await readDbFromPostgres());
  }
  return readDb();
}

module.exports = {
  readDb,
  readDbFresh,
  writeDb,
  EMPTY_DB,
  getStorageMode,
  getRedis,
  getPgPool,
  getPostgresUrl,
  pgEnv,
};
