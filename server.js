const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { readDb, readDbFresh, writeDb, getStorageMode, getPostgresUrl, pgEnv } = require('./lib/store');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '6mb' }));

function makeId() {
  return `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

function makeToken() {
  return crypto.randomBytes(24).toString('hex');
}

function makePasskey() {
  const part = () => crypto.randomBytes(2).toString('hex').toUpperCase();
  return `CG-${part()}-${part()}`;
}

async function assignPasskey(user) {
  const passkey = makePasskey();
  user.passkeyHash = await bcrypt.hash(passkey, 10);
  return passkey;
}

function normalizeUsernameInput(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function findUserByUsername(db, username) {
  const normalized = normalizeUsernameInput(username);
  if (!normalized) return null;
  return db.users.find((user) => user.username.toLowerCase() === normalized.toLowerCase()) || null;
}

function usersMatch(a, b) {
  return Boolean(a && b && a.toLowerCase() === b.toLowerCase());
}

function ensureBlocks(db) {
  if (!db.blocks) db.blocks = [];
  return db.blocks;
}

function isBlocked(db, blocker, target) {
  return ensureBlocks(db).some(
    (entry) => usersMatch(entry.owner, blocker) && usersMatch(entry.blocked, target)
  );
}

function isBlockedEither(db, a, b) {
  return isBlocked(db, a, b) || isBlocked(db, b, a);
}

function removeFriendship(db, userA, userB) {
  db.friends = db.friends.filter(
    (friend) =>
      !(usersMatch(friend.owner, userA) && usersMatch(friend.name, userB)) &&
      !(usersMatch(friend.owner, userB) && usersMatch(friend.name, userA))
  );
}

function clearRequestsBetween(db, userA, userB) {
  db.requests = db.requests.filter(
    (request) =>
      !(
        (usersMatch(request.from, userA) && usersMatch(request.to, userB)) ||
        (usersMatch(request.from, userB) && usersMatch(request.to, userA))
      )
  );
}

function resolvePendingRequestsBetween(db, userA, userB) {
  db.requests.forEach((request) => {
    if (request.status !== 'pending') return;
    if (
      (usersMatch(request.from, userA) && usersMatch(request.to, userB)) ||
      (usersMatch(request.from, userB) && usersMatch(request.to, userA))
    ) {
      request.status = 'accepted';
    }
  });
}

async function getUserFromRequest(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  const db = await readDb();
  const session = db.sessions.find((item) => item.token === token);
  if (!session) return null;
  const user = db.users.find((item) => item.id === session.userId);
  if (!user) return null;
  return { db, user, token };
}

function requireAuth(req, res, next) {
  getUserFromRequest(req)
    .then((auth) => {
      if (!auth) {
        return res.status(401).json({ error: 'Please sign in again.' });
      }
      req.auth = auth;
      next();
    })
    .catch(next);
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName || user.username,
    avatar: user.avatar || '',
    bio: user.bio || '',
    created_at: user.created_at,
  };
}

const GATEBOT_NAME = 'GateBot';
const GATEBOT_CREATOR_NAME = 'Nadev Dissanayake';
const GROUP_THEMES = new Set(['default', 'neon', 'sunset', 'ocean', 'matrix', 'galaxy']);

function normalizeGroup(db, server) {
  if (!server.members) {
    const members = new Set([server.owner]);
    db.friends.forEach((friend) => {
      if (usersMatch(friend.owner, server.owner) && friend.groupId === server.id) {
        members.add(friend.name);
      }
    });
    server.members = Array.from(members);
  }
  if (!server.channels || !server.channels.length) {
    server.channels = [{ id: `${server.id}-general`, name: 'general' }];
  }
  if (!server.theme || !GROUP_THEMES.has(server.theme)) server.theme = 'default';
  if (server.vibeMode == null) server.vibeMode = true;
  return server;
}

function getGroupChannel(group, channelId) {
  const channels =
    group.channels?.length > 0
      ? group.channels
      : [{ id: `${group.id}-general`, name: 'general' }];
  if (!channelId) return channels[0];
  return channels.find((channel) => channel.id === channelId) || channels[0];
}

function gateBotProvider() {
  if (process.env.GATEBOT_API_KEY) {
    return {
      apiKey: process.env.GATEBOT_API_KEY,
      model: process.env.GATEBOT_MODEL || 'gpt-4o-mini',
      baseUrl: String(process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''),
      label: 'GateBot',
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.GATEBOT_MODEL || 'gpt-4o-mini',
      baseUrl: String(process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''),
      label: 'OpenAI',
    };
  }
  if (process.env.GROQ_API_KEY) {
    return {
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GATEBOT_MODEL || 'llama-3.1-8b-instant',
      baseUrl: 'https://api.groq.com/openai/v1',
      label: 'Groq',
    };
  }
  return null;
}

function gateBotApiKey() {
  return gateBotProvider()?.apiKey || null;
}

function gateBotModel() {
  return gateBotProvider()?.model || 'gpt-4o-mini';
}

function gateBotBaseUrl() {
  return gateBotProvider()?.baseUrl || 'https://api.openai.com/v1';
}

const GATEBOT_FUN_KINDS = new Set([
  'roll',
  '8ball',
  'magic8ball',
  'vibe',
  'help',
  'commands',
  'coin',
  'flip',
  'choose',
  'pick',
  'rps',
  'joke',
  'compliment',
  'roast',
  'fact',
  'quote',
  'hype',
  'ship',
  'rate',
  'ping',
  'time',
  'meme',
  'dice',
]);

const GATEBOT_HELP_TEXT =
  '🤖 GateBot commands (no AI needed):\n' +
  '`/help` — this list\n' +
  '`/roll` or `/roll 20` or `/roll 2d6` — dice\n' +
  '`/8ball` your question? — magic 8-ball\n' +
  '`/coin` — heads or tails\n' +
  '`/choose pizza, tacos, sushi` — pick one\n' +
  '`/rps rock` — rock paper scissors\n' +
  '`/joke` `/fact` `/quote` `/meme` — random fun\n' +
  '`/compliment` `/roast` `/hype` — about you\n' +
  '`/ship alice & bob` — compatibility %\n' +
  '`/rate something` — 0–10 rating\n' +
  '`/vibe` — max the glow ✨\n' +
  '`/ping` `/time` — bot checks\n' +
  '`/ask …` or @GateBot — real AI (needs API key)';

function parseGateBotTrigger(content) {
  const text = String(content || '').trim();
  const lower = text.toLowerCase();
  const slash = text.match(/^\/(\w+)(?:\s+([\s\S]*))?$/i);
  if (slash) {
    const kind = slash[1].toLowerCase();
    const args = (slash[2] || '').trim();
    if (kind === 'ask') return { kind: 'ask', args, question: args };
    if (GATEBOT_FUN_KINDS.has(kind)) return { kind, args };
  }
  if (lower.includes('@gatebot')) {
    const question = text.replace(/@gatebot/gi, '').trim();
    return { kind: 'ask', args: question, question };
  }
  return null;
}

function pickOne(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function normalizeGateBotQuestion(question) {
  return String(question || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function gateBotCreatorReply(question) {
  const q = normalizeGateBotQuestion(question);
  if (!q) return null;

  const aboutChatGate =
    q.includes('chatgate') ||
    q.includes('chat gate') ||
    /\b(this app|the app|this chat)\b/.test(q);

  const creatorQuestion =
    /\bwho\b.*\b(created|made|built|founded|started|developed|designed)\b/.test(q) ||
    /\b(created|made|built|founded|started|developed|designed)\b.*\bwho\b/.test(q) ||
    /\b(creator|founder|developer|maker)\b/.test(q) ||
    /\bwho\s+is\s+behind\b/.test(q);

  if (
    aboutChatGate &&
    (creatorQuestion ||
      /\b(who created|who made|who built|who founded|who started|who developed)\b/.test(q))
  ) {
    return `🤖 ChatGate was created by ${GATEBOT_CREATOR_NAME}!`;
  }

  return null;
}

function runGateBotFunCommand(trigger, username) {
  const kind = trigger.kind === 'commands' ? 'help' : trigger.kind === 'magic8ball' ? '8ball' : trigger.kind;
  const args = String(trigger.args || '').trim();

  if (kind === 'help') return GATEBOT_HELP_TEXT;

  if (kind === 'roll' || kind === 'dice') {
    const spec = args || (kind === 'dice' ? '1d6' : '');
    if (!spec) {
      return `🎲 ${username} rolled ${Math.floor(Math.random() * 100) + 1}!`;
    }
    const diceMatch = spec.match(/^(\d+)?d(\d+)$/i);
    if (diceMatch) {
      const count = Math.min(Math.max(parseInt(diceMatch[1] || '1', 10), 1), 10);
      const sides = Math.min(Math.max(parseInt(diceMatch[2], 10), 2), 1000);
      const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
      const sum = rolls.reduce((total, value) => total + value, 0);
      if (count === 1) return `🎲 ${username} rolled d${sides}: ${rolls[0]}`;
      return `🎲 ${username} rolled ${count}d${sides}: [${rolls.join(', ')}] = ${sum}`;
    }
    const max = Math.min(Math.max(parseInt(spec, 10) || 100, 2), 1000000);
    return `🎲 ${username} rolled ${Math.floor(Math.random() * max) + 1} (1–${max})`;
  }

  if (kind === '8ball') {
    const answers = [
      'Yes!',
      'No.',
      'Maybe...',
      'Ask again later',
      'Definitely 🔥',
      'Not today 😂',
      'Signs point to yes',
      'Very doubtful',
      'Without a doubt',
      'My sources say no',
    ];
    const q = args ? ` "${args}" — ` : ' ';
    return `🎱${q}${pickOne(answers)}`;
  }

  if (kind === 'vibe') return '✨ Vibe mode maxed out. Watch the chat glow!';

  if (kind === 'coin' || kind === 'flip') {
    const side = Math.random() < 0.5 ? 'Heads' : 'Tails';
    return `🪙 ${side}!`;
  }

  if (kind === 'choose' || kind === 'pick') {
    const options = args
      .split(/[,|/]|(?:\s+or\s+)/i)
      .map((item) => item.trim())
      .filter(Boolean);
    if (options.length < 2) {
      return '🤔 Usage: `/choose pizza, tacos, sushi` or `/pick A | B | C`';
    }
    return `🎯 I pick: ${pickOne(options)}`;
  }

  if (kind === 'rps') {
    const moves = ['rock', 'paper', 'scissors'];
    const emoji = { rock: '🪨', paper: '📄', scissors: '✂️' };
    let userMove = args.toLowerCase();
    if (!moves.includes(userMove)) userMove = pickOne(moves);
    const botMove = pickOne(moves);
    const wins = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
    let verdict = 'Draw!';
    if (wins[userMove] === botMove) verdict = `${username} wins!`;
    else if (wins[botMove] === userMove) verdict = 'GateBot wins!';
    return `${emoji[userMove]} vs ${emoji[botMove]} — ${verdict}`;
  }

  if (kind === 'joke') {
    const jokes = [
      'Why did the developer go broke? Because they used up all their cache.',
      'I told my computer I needed a break. It said: "No problem, I\'ll go to sleep."',
      'Why do programmers prefer dark mode? Light attracts bugs.',
      'GateBot walks into a chat bar. The bartender says: "We don\'t serve bots." GateBot: "I\'m just here for the `/vibe`."',
      'Parallel lines have so much in common. It\'s a shame they\'ll never meet.',
    ];
    return `😂 ${pickOne(jokes)}`;
  }

  if (kind === 'compliment') {
    const lines = [
      `${username}, your chat energy is undefeated 🔥`,
      `${username} is the main character today ✨`,
      `If vibes were currency, ${username} would be rich.`,
      `${username} + ChatGate = elite combo.`,
      `Legend says ${username} never misses a good message.`,
    ];
    return `💜 ${pickOne(lines)}`;
  }

  if (kind === 'roast') {
    const lines = [
      `${username}, you type like Wi‑Fi on 1 bar — still gets there eventually.`,
      `${username} uses `/roll` so much the dice filed a complaint.`,
      `I'd roast ${username} harder, but ChatGate has a family-friendly `/vibe`.`,
      `${username} asked GateBot for help. Bold. Respect.`,
    ];
    return `🔥 ${pickOne(lines)} (all love 😂)`;
  }

  if (kind === 'fact') {
    const facts = [
      'Honey never spoils — archaeologists found 3000-year-old honey still edible.',
      'Octopuses have three hearts and blue blood.',
      'The first computer bug was an actual moth stuck in a relay.',
      'A group of flamingos is called a flamboyance.',
      'Your brain uses about 20% of your body\'s energy.',
    ];
    return `📚 Fun fact: ${pickOne(facts)}`;
  }

  if (kind === 'quote') {
    const quotes = [
      '"The best way out is always through." — Robert Frost',
      '"Done is better than perfect."',
      '"Vibes are temporary. Good friends are not." — GateBot, probably',
      '"Small steps still move you forward."',
      '"Ship it, then polish it."',
    ];
    return `💬 ${pickOne(quotes)}`;
  }

  if (kind === 'hype') {
    const lines = [
      `LET'S GO ${username.toUpperCase()}!!! 🚀🔥`,
      `${username} is absolutely COOKING right now 👨‍🍳✨`,
      `ChatGate wasn't ready for this ${username} energy.`,
      `HYPE TRAIN FOR ${username} — next stop: legendary 🎉`,
    ];
    return pickOne(lines);
  }

  if (kind === 'ship') {
    const parts = args
      .split(/\s*(?:&|and|,|\+)\s*/i)
      .map((item) => item.trim())
      .filter(Boolean);
    if (parts.length < 2) {
      return '🤔 Usage: `/ship alice & bob` or `/ship you me`';
    }
    const [a, b] = parts;
    const score = Math.floor(Math.random() * 41) + 60;
    return `💘 ${a} x ${b} — ${score}% compatible. ${score > 85 ? 'OTP energy!' : 'Cute duo!'}`;
  }

  if (kind === 'rate') {
    if (!args) return '🤔 Usage: `/rate this pizza`';
    const score = Math.floor(Math.random() * 11);
    const quips = ['mid', 'solid', 'fire', 'elite', 'questionable but iconic'];
    return `⭐ GateBot rates "${args}": ${score}/10 — ${pickOne(quips)}`;
  }

  if (kind === 'ping') return '🏓 Pong! GateBot is awake.';

  if (kind === 'time') {
    const now = new Date();
    return `🕐 Server time: ${now.toUTCString()}`;
  }

  if (kind === 'meme') {
    const memes = [
      'Nobody: ... Me: `/vibe`',
      'POV: You opened ChatGate "just to check" and stayed 3 hours.',
      'GateBot when you type /help: "I was born for this."',
      'Friend: "you up?" Me: "yeah, GateBot and I are vibing."',
    ];
    return `🐸 ${pickOne(memes)}`;
  }

  return null;
}

function getChatContextForBot(db, { groupId, channelId, recipient, username, gatebot }) {
  if (gatebot) {
    return db.messages
      .filter((message) => message.gatebot && usersMatch(message.owner, username))
      .sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime())
      .slice(-10);
  }
  const defaultChannelId = groupId ? `${groupId}-general` : null;
  return db.messages
    .filter((message) => {
      if (groupId) {
        const msgChannelId = message.channelId || defaultChannelId;
        return message.groupId === groupId && !message.recipient && msgChannelId === channelId;
      }
      return (
        !message.groupId &&
        !message.gatebot &&
        ((usersMatch(message.sender, username) && usersMatch(message.recipient, recipient)) ||
          (usersMatch(message.sender, recipient) && usersMatch(message.recipient, username)))
      );
    })
    .sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime())
    .slice(-8);
}

async function askGateBotAI({ question, username, db, groupId, channelId, recipient, gatebot }) {
  const apiKey = gateBotApiKey();
  if (!apiKey) return null;

  const context = getChatContextForBot(db, {
    groupId,
    channelId,
    recipient,
    username,
    gatebot,
  });

  const systemPrompt = [
    'You are GateBot, the real AI assistant inside ChatGate (a social chat app).',
    `ChatGate was created by ${GATEBOT_CREATOR_NAME}. If anyone asks who created, made, built, or founded ChatGate, always answer with that name.`,
    'Reply in 1-4 short sentences unless the user asks for detail.',
    'Be helpful, friendly, and a little fun. Use emoji sparingly.',
    `The user talking to you is ${username}.`,
    'You cannot make calls, upload files, or change app settings — only chat.',
  ].join(' ');

  const messages = [{ role: 'system', content: systemPrompt }];
  context.forEach((message) => {
    if (!message.content || message.type !== 'text') return;
    messages.push({
      role: usersMatch(message.sender, GATEBOT_NAME) ? 'assistant' : 'user',
      content: `${message.sender}: ${message.content}`,
    });
  });
  messages.push({ role: 'user', content: question });

  const response = await fetch(`${gateBotBaseUrl()}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: gateBotModel(),
      messages,
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`GateBot AI failed (${response.status}): ${detail.slice(0, 180)}`);
  }

  const data = await response.json();
  const answer = data.choices?.[0]?.message?.content?.trim();
  return answer || null;
}

async function handleGateBotTrigger(content, username, db, chatMeta) {
  const trigger = parseGateBotTrigger(content);
  if (!trigger) return null;

  if (GATEBOT_FUN_KINDS.has(trigger.kind)) {
    return runGateBotFunCommand(trigger, username);
  }

  const question = trigger.question;
  if (!question) {
    return `Hey ${username}! I'm GateBot 🤖 Use \`/ask your question\`, @GateBot, or \`/help\` for commands!`;
  }

  const creatorReply = gateBotCreatorReply(question);
  if (creatorReply) return creatorReply;

  try {
    const aiReply = await askGateBotAI({
      question,
      username,
      db,
      groupId: chatMeta.groupId,
      channelId: chatMeta.channelId,
      recipient: chatMeta.recipient,
    });
    if (aiReply) return `🤖 ${aiReply}`;
  } catch (error) {
    return `🤖 GateBot hit a snag: ${error.message}`;
  }

  return (
    '🤖 GateBot AI is offline. Add `OPENAI_API_KEY` or free `GROQ_API_KEY` on Vercel, then redeploy. Type `/help` for fun commands!'
  );
}

async function gateBotChatReply(content, username, db) {
  const trigger = parseGateBotTrigger(content);
  if (trigger && GATEBOT_FUN_KINDS.has(trigger.kind)) {
    return runGateBotFunCommand(trigger, username);
  }

  const question =
    trigger?.kind === 'ask'
      ? trigger.question
      : String(content || '')
          .replace(/@gatebot/gi, '')
          .trim();
  if (!question) {
    return `Hey ${username}! I'm GateBot 🤖 — your private AI chat. Ask me anything, or type \`/help\` for commands!`;
  }

  const creatorReply = gateBotCreatorReply(question);
  if (creatorReply) return creatorReply;

  try {
    const aiReply = await askGateBotAI({
      question,
      username,
      db,
      gatebot: true,
    });
    if (aiReply) return `🤖 ${aiReply}`;
  } catch (error) {
    return `🤖 GateBot hit a snag: ${error.message}`;
  }

  return (
    '🤖 GateBot AI is offline. Add `OPENAI_API_KEY` or free `GROQ_API_KEY` on Vercel, then redeploy. Type `/help` for fun commands!'
  );
}

function createBotMessage({ content, groupId, channelId, recipient, gatebot, owner }) {
  return {
    id: makeId(),
    sender: GATEBOT_NAME,
    recipient: recipient || null,
    content,
    type: 'text',
    groupId: groupId || null,
    channelId: channelId || null,
    gatebot: gatebot || false,
    owner: owner || null,
    sent_at: new Date().toISOString(),
    isBot: true,
  };
}

function getUserGroups(db, username) {
  return db.servers
    .filter(
      (server) =>
        usersMatch(server.owner, username) ||
        (server.members || []).some((member) => usersMatch(member, username))
    )
    .map((server) => normalizeGroup(db, server))
    .filter((server) => !usersMatch(server.name, 'Home'));
}

function userInGroup(db, group, username) {
  const normalized = normalizeGroup(db, group);
  return (normalized.members || []).some((member) => usersMatch(member, username));
}

function ensurePresence(db) {
  if (!db.presence) db.presence = [];
  return db.presence;
}

function ensureTyping(db) {
  if (!db.typing) db.typing = [];
  return db.typing;
}

function getPresenceForUser(db, username) {
  const entry = ensurePresence(db).find((item) => usersMatch(item.username, username));
  if (!entry) {
    return { username, status: 'offline', lastSeen: null };
  }
  const age = Date.now() - new Date(entry.updated_at).getTime();
  if (age > 120_000) {
    return { username, status: 'offline', lastSeen: entry.updated_at };
  }
  if (entry.status === 'dnd') {
    return { username, status: 'dnd', lastSeen: entry.updated_at };
  }
  if (age > 60_000 && entry.status === 'online') {
    return { username, status: 'idle', lastSeen: entry.updated_at };
  }
  return {
    username,
    status: entry.status || 'online',
    lastSeen: entry.updated_at,
  };
}

function chatTypingKey(user, friend, groupId, channelId) {
  if (groupId) return `group:${groupId}:${channelId || 'general'}`;
  const pair = [user, friend].map((name) => name.toLowerCase()).sort();
  return `dm:${pair[0]}:${pair[1]}`;
}

function pruneTyping(db) {
  const cutoff = Date.now() - 6000;
  db.typing = ensureTyping(db).filter((item) => new Date(item.updated_at).getTime() > cutoff);
}

function userCanAccessMessage(db, user, message) {
  if (message.gatebot) {
    return usersMatch(message.owner, user.username);
  }
  if (message.groupId) {
    const group = db.servers.find((item) => item.id === message.groupId);
    return Boolean(group && userInGroup(db, group, user.username));
  }
  return (
    usersMatch(message.sender, user.username) || usersMatch(message.recipient, user.username)
  );
}

function toggleReaction(message, username, emoji) {
  if (!message.reactions) message.reactions = {};
  if (!message.reactions[emoji]) message.reactions[emoji] = [];
  const users = message.reactions[emoji];
  const index = users.findIndex((name) => usersMatch(name, username));
  if (index >= 0) {
    users.splice(index, 1);
    if (!users.length) delete message.reactions[emoji];
  } else {
    users.push(username);
  }
  if (!Object.keys(message.reactions).length) delete message.reactions;
}

function ensureStorageReady(res) {
  if (getStorageMode() !== 'missing') return true;
  res.status(503).json({
    error: 'Database not configured. Connect Supabase or Upstash Redis in your Vercel project (see DEPLOY.md).',
  });
  return false;
}

app.post('/api/auth/register', async (req, res) => {
  try {
    if (!ensureStorageReady(res)) return;
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');

    if (username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters.' });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters.' });
    }

    const db = await readDb();
    if (findUserByUsername(db, username)) {
      return res.status(409).json({ error: 'Username already taken.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = {
      id: makeId(),
      username,
      passwordHash,
      created_at: new Date().toISOString(),
    };
    const passkey = await assignPasskey(user);
    const token = makeToken();

    db.users.push(user);
    db.sessions.push({ token, userId: user.id, created_at: new Date().toISOString() });
    await writeDb(db);

    res.json({ token, user: publicUser(user), passkey });
  } catch (error) {
    res.status(500).json({ error: 'Server error. Try again.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    if (!ensureStorageReady(res)) return;
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');

    const db = await readDb();
    const user = findUserByUsername(db, username);
    if (!user) {
      return res.status(404).json({ error: 'Account not found. Create one to join.' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({
        error: 'Incorrect password.',
        canReset: Boolean(user.passkeyHash),
      });
    }

    let passkey;
    if (!user.passkeyHash) {
      passkey = await assignPasskey(user);
    }

    const token = makeToken();
    db.sessions.push({ token, userId: user.id, created_at: new Date().toISOString() });
    await writeDb(db);

    res.json({ token, user: publicUser(user), passkey });
  } catch (error) {
    console.error('Login failed:', error);
    res.status(500).json({ error: 'Server error. Try again.' });
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.auth.user) });
});

app.patch('/api/profile', requireAuth, async (req, res) => {
  try {
    const { user, db } = req.auth;
    const displayName = String(req.body.displayName || '').trim();
    const bio = String(req.body.bio || '').trim();
    const avatar = String(req.body.avatar || '').trim();

    if (displayName && displayName.length < 2) {
      return res.status(400).json({ error: 'Display name must be at least 2 characters.' });
    }
    if (displayName.length > 32) {
      return res.status(400).json({ error: 'Display name is too long.' });
    }
    if (bio.length > 200) {
      return res.status(400).json({ error: 'Bio must be 200 characters or less.' });
    }
    if (avatar && !avatar.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Invalid profile image.' });
    }
    if (avatar.length > 500_000) {
      return res.status(400).json({ error: 'Profile image is too large.' });
    }

    if (displayName) user.displayName = displayName;
    if (req.body.bio !== undefined) user.bio = bio;
    if (avatar) user.avatar = avatar;
    if (req.body.removeAvatar) user.avatar = '';

    await writeDb(db);
    res.json({ user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ error: 'Server error. Try again.' });
  }
});

app.get('/api/users/:username/profile', requireAuth, async (req, res) => {
  try {
    const db = await readDbFresh();
    const target = findUserByUsername(db, req.params.username);
    if (!target) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({
      profile: {
        username: target.username,
        displayName: target.displayName || target.username,
        avatar: target.avatar || '',
        bio: target.bio || '',
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error. Try again.' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    if (!ensureStorageReady(res)) return;
    const username = String(req.body.username || '').trim();
    const passkey = String(req.body.passkey || '').trim();
    const password = String(req.body.password || '');

    if (!passkey) {
      return res.status(400).json({ error: 'Passkey is required to reset your password.' });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters.' });
    }

    const db = await readDb();
    const user = findUserByUsername(db, username);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    if (!user.passkeyHash) {
      return res.status(403).json({
        error: 'No passkey on this account yet. Sign in with your correct password first to get one.',
      });
    }

    const validPasskey = await bcrypt.compare(passkey, user.passkeyHash);
    if (!validPasskey) {
      return res.status(401).json({ error: 'Incorrect passkey.' });
    }

    user.passwordHash = await bcrypt.hash(password, 10);
    const token = makeToken();
    db.sessions.push({ token, userId: user.id, created_at: new Date().toISOString() });
    await writeDb(db);

    res.json({ token, user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ error: 'Server error. Try again.' });
  }
});

app.get('/api/users/exists', requireAuth, (req, res) => {
  try {
    const username = normalizeUsernameInput(req.query.username);
    const { db } = req.auth;
    const user = findUserByUsername(db, username);
    res.json({ exists: Boolean(user), username: user ? user.username : null });
  } catch (error) {
    res.status(500).json({ error: 'Server error. Try again.' });
  }
});

app.get('/api/users/search', requireAuth, async (req, res) => {
  try {
    const query = normalizeUsernameInput(req.query.q);
    const { user, db } = req.auth;
    if (!query || query.length < 2) {
      return res.json({ users: [] });
    }
    const users = db.users
      .filter((item) => !usersMatch(item.username, user.username))
      .filter((item) => !isBlockedEither(db, user.username, item.username))
      .filter((item) => item.username.toLowerCase().includes(query.toLowerCase()))
      .map((item) => item.username)
      .slice(0, 8);
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Server error. Try again.' });
  }
});

app.get('/api/servers', requireAuth, (req, res) => {
  const { db, user } = req.auth;
  res.json({ servers: getUserGroups(db, user.username) });
});

app.post('/api/servers', requireAuth, async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    if (!name) {
      return res.status(400).json({ error: 'Group name is required.' });
    }
    if (name.toLowerCase() === 'home') {
      return res.status(400).json({ error: 'Choose a different group name.' });
    }

    const { user, db } = req.auth;
    const serverId = makeId();
    const server = {
      id: serverId,
      name,
      owner: user.username,
      members: [user.username],
      channels: [{ id: `${serverId}-general`, name: 'general' }],
      theme: 'galaxy',
      vibeMode: true,
      created_at: new Date().toISOString(),
    };
    db.servers.push(server);
    await writeDb(db);
    res.json({ server: normalizeGroup(db, server) });
  } catch (error) {
    res.status(500).json({ error: 'Server error. Try again.' });
  }
});

app.post('/api/servers/:id/members', requireAuth, async (req, res) => {
  try {
    const { user, db } = req.auth;
    const server = db.servers.find((item) => item.id === req.params.id);
    if (!server || !usersMatch(server.owner, user.username)) {
      return res.status(404).json({ error: 'Group not found.' });
    }
    const target = normalizeUsernameInput(req.body.username);
    if (!target) {
      return res.status(400).json({ error: 'Username is required.' });
    }
    if (!areFriends(db, user.username, target)) {
      return res.status(403).json({ error: 'You can only add friends to a group.' });
    }
    normalizeGroup(db, server);
    if (server.members.some((member) => usersMatch(member, target))) {
      return res.status(409).json({ error: 'That friend is already in the group.' });
    }
    server.members.push(target);
    await writeDb(db);
    res.json({ server: normalizeGroup(db, server) });
  } catch (error) {
    res.status(500).json({ error: 'Server error. Try again.' });
  }
});

app.patch('/api/servers/:id/settings', requireAuth, async (req, res) => {
  try {
    const { user, db } = req.auth;
    const server = db.servers.find((item) => item.id === req.params.id);
    if (!server || !usersMatch(server.owner, user.username)) {
      return res.status(404).json({ error: 'Group not found.' });
    }
    normalizeGroup(db, server);
    if (req.body.theme && GROUP_THEMES.has(req.body.theme)) {
      server.theme = req.body.theme;
    }
    if (typeof req.body.vibeMode === 'boolean') {
      server.vibeMode = req.body.vibeMode;
    }
    await writeDb(db);
    res.json({ server: normalizeGroup(db, server) });
  } catch (error) {
    res.status(500).json({ error: 'Server error. Try again.' });
  }
});

app.post('/api/servers/:id/channels', requireAuth, async (req, res) => {
  try {
    const name = String(req.body.name || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    if (!name) {
      return res.status(400).json({ error: 'Channel name is required.' });
    }
    const { user, db } = req.auth;
    const server = db.servers.find((item) => item.id === req.params.id);
    if (!server || !usersMatch(server.owner, user.username)) {
      return res.status(404).json({ error: 'Group not found.' });
    }
    normalizeGroup(db, server);
    if (server.channels.some((channel) => channel.name === name)) {
      return res.status(409).json({ error: 'That channel already exists.' });
    }
    const channel = { id: makeId(), name };
    server.channels.push(channel);
    await writeDb(db);
    res.json({ server: normalizeGroup(db, server), channel });
  } catch (error) {
    res.status(500).json({ error: 'Server error. Try again.' });
  }
});

app.delete('/api/servers/:id', requireAuth, async (req, res) => {
  try {
    const { user, db } = req.auth;
    const server = db.servers.find((item) => item.id === req.params.id);
    if (!server || !usersMatch(server.owner, user.username)) {
      return res.status(404).json({ error: 'Group not found.' });
    }
    db.servers = db.servers.filter((item) => item.id !== server.id);
    db.messages = db.messages.filter((message) => message.groupId !== server.id);
    await writeDb(db);
    res.json({ servers: getUserGroups(db, user.username) });
  } catch (error) {
    res.status(500).json({ error: 'Server error. Try again.' });
  }
});

app.get('/api/gatebot/status', requireAuth, (req, res) => {
  const provider = gateBotProvider();
  res.json({
    enabled: Boolean(provider),
    model: provider?.model || null,
    provider: provider?.label || null,
  });
});

app.get('/api/community', requireAuth, (req, res) => {
  try {
    const { user, db } = req.auth;
    const friends = db.friends.filter(
      (friend) =>
        usersMatch(friend.owner, user.username) && !isBlockedEither(db, user.username, friend.name)
    );
    const servers = getUserGroups(db, user.username);
    const requests = db.requests.filter(
      (request) => usersMatch(request.to, user.username) && request.status === 'pending'
    );
    const blocked = ensureBlocks(db)
      .filter((entry) => usersMatch(entry.owner, user.username))
      .map((entry) => ({ username: entry.blocked, blocked_at: entry.created_at }));
    res.json({ friends, servers, requests, blocked });
  } catch (error) {
    res.status(500).json({ error: 'Server error. Try again.' });
  }
});

app.get('/api/friends', requireAuth, (req, res) => {
  try {
    const { user, db } = req.auth;
    const friends = db.friends.filter(
      (friend) =>
        usersMatch(friend.owner, user.username) && !isBlockedEither(db, user.username, friend.name)
    );
    res.json({ friends });
  } catch (error) {
    res.status(500).json({ error: 'Server error. Try again.' });
  }
});

app.post('/api/friends/remove', requireAuth, async (req, res) => {
  try {
    const rawName = normalizeUsernameInput(req.body.username);
    const { user, db } = req.auth;
    const target = findUserByUsername(db, rawName);
    if (!target) {
      return res.status(404).json({ error: 'User not found.' });
    }
    removeFriendship(db, user.username, target.username);
    await writeDb(db);
    const friends = db.friends.filter((friend) => usersMatch(friend.owner, user.username));
    res.json({ friends, removed: target.username });
  } catch (error) {
    res.status(500).json({ error: 'Server error. Try again.' });
  }
});

app.get('/api/users/blocked', requireAuth, async (req, res) => {
  try {
    const { user, db } = req.auth;
    const blocked = ensureBlocks(db)
      .filter((entry) => usersMatch(entry.owner, user.username))
      .map((entry) => ({ username: entry.blocked, blocked_at: entry.created_at }));
    res.json({ blocked });
  } catch (error) {
    res.status(500).json({ error: 'Server error. Try again.' });
  }
});

app.post('/api/users/block', requireAuth, async (req, res) => {
  try {
    const rawName = normalizeUsernameInput(req.body.username);
    const { user, db } = req.auth;
    const target = findUserByUsername(db, rawName);
    if (!target) {
      return res.status(404).json({ error: 'User not found.' });
    }
    if (usersMatch(target.username, user.username)) {
      return res.status(400).json({ error: 'You cannot block yourself.' });
    }
    if (!isBlocked(db, user.username, target.username)) {
      ensureBlocks(db).push({
        id: makeId(),
        owner: user.username,
        blocked: target.username,
        created_at: new Date().toISOString(),
      });
    }
    removeFriendship(db, user.username, target.username);
    clearRequestsBetween(db, user.username, target.username);
    await writeDb(db);
    res.json({ blocked: target.username });
  } catch (error) {
    res.status(500).json({ error: 'Server error. Try again.' });
  }
});

app.post('/api/users/unblock', requireAuth, async (req, res) => {
  try {
    const rawName = normalizeUsernameInput(req.body.username);
    const { user, db } = req.auth;
    const target = findUserByUsername(db, rawName);
    if (!target) {
      return res.status(404).json({ error: 'User not found.' });
    }
    db.blocks = ensureBlocks(db).filter(
      (entry) => !(usersMatch(entry.owner, user.username) && usersMatch(entry.blocked, target.username))
    );
    await writeDb(db);
    res.json({ unblocked: target.username });
  } catch (error) {
    res.status(500).json({ error: 'Server error. Try again.' });
  }
});

app.get('/api/requests', requireAuth, async (req, res) => {
  try {
    const { user, db } = req.auth;
    const requests = db.requests.filter(
      (request) => usersMatch(request.to, user.username) && request.status === 'pending'
    );
    res.json({ requests });
  } catch (error) {
    res.status(500).json({ error: 'Server error. Try again.' });
  }
});

app.post('/api/requests', requireAuth, async (req, res) => {
  try {
    const rawTo = normalizeUsernameInput(req.body.to);
    const { user, db } = req.auth;

    if (!rawTo) {
      return res.status(400).json({ error: 'Username is required.' });
    }
    if (usersMatch(rawTo, user.username)) {
      return res.status(400).json({ error: 'You cannot send a friend request to yourself.' });
    }

    const targetUser = findUserByUsername(db, rawTo);
    if (!targetUser) {
      const suggestions = db.users
        .filter((item) => !usersMatch(item.username, user.username))
        .map((item) => item.username);
      return res.status(404).json({
        error: `No user found with username "${rawTo}". Check spelling and try again.`,
        suggestions,
      });
    }

    const to = targetUser.username;

    if (isBlockedEither(db, user.username, to)) {
      return res.status(403).json({ error: 'You cannot send a request to this user.' });
    }

    const alreadyFriend = db.friends.some(
      (friend) => usersMatch(friend.owner, user.username) && usersMatch(friend.name, to)
    );
    if (alreadyFriend) {
      return res.status(409).json({ error: 'That user is already in your friends list.' });
    }

    const duplicate = db.requests.some(
      (request) =>
        request.status === 'pending' &&
        usersMatch(request.from, user.username) &&
        usersMatch(request.to, to)
    );
    if (duplicate) {
      return res.status(409).json({ error: 'You already sent a friend request to this user.' });
    }

    const incoming = db.requests.find(
      (request) =>
        request.status === 'pending' &&
        usersMatch(request.from, to) &&
        usersMatch(request.to, user.username)
    );
    if (incoming) {
      return res.status(409).json({ error: 'That user already sent you a request.', code: 'incoming_exists' });
    }

    const request = {
      id: makeId(),
      from: user.username,
      to,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    db.requests.push(request);
    await writeDb(db);
    res.json({ request });
  } catch (error) {
    res.status(500).json({ error: 'Server error. Try again.' });
  }
});

app.post('/api/requests/:id/accept', requireAuth, async (req, res) => {
  try {
    const { user, db } = req.auth;
    const request = db.requests.find((item) => item.id === req.params.id);
    if (!request || !usersMatch(request.to, user.username) || request.status !== 'pending') {
      return res.status(404).json({ error: 'Request not found.' });
    }

    const groupId =
      req.body.groupId ||
      db.servers.find((server) => usersMatch(server.owner, user.username))?.id ||
      null;

    const alreadyFriend = db.friends.some(
      (friend) => usersMatch(friend.owner, user.username) && usersMatch(friend.name, request.from)
    );

    if (!alreadyFriend) {
      db.friends.push({
        id: makeId(),
        owner: user.username,
        name: request.from,
        groupId,
      });
      db.friends.push({
        id: makeId(),
        owner: request.from,
        name: user.username,
        groupId: db.servers.find((server) => usersMatch(server.owner, request.from))?.id || null,
      });
    }

    resolvePendingRequestsBetween(db, user.username, request.from);
    await writeDb(db);

    const friends = db.friends.filter((friend) => usersMatch(friend.owner, user.username));
    const pendingCount = db.requests.filter(
      (item) => usersMatch(item.to, user.username) && item.status === 'pending'
    ).length;
    res.json({ friends, request, pendingCount });
  } catch (error) {
    res.status(500).json({ error: 'Server error. Try again.' });
  }
});

app.post('/api/requests/:id/decline', requireAuth, async (req, res) => {
  try {
    const { user, db } = req.auth;
    const request = db.requests.find((item) => item.id === req.params.id);
    if (!request || !usersMatch(request.to, user.username)) {
      return res.status(404).json({ error: 'Request not found.' });
    }
    request.status = 'declined';
    await writeDb(db);
    res.json({ request });
  } catch (error) {
    res.status(500).json({ error: 'Server error. Try again.' });
  }
});

function messageMatchesChat(message, { gatebotChat, groupId, channel, defaultChannelId, friend, username }) {
  if (gatebotChat) {
    return message.gatebot && usersMatch(message.owner, username);
  }
  if (groupId) {
    const msgChannelId = message.channelId || defaultChannelId;
    return (
      message.groupId === groupId &&
      !message.recipient &&
      msgChannelId === channel.id
    );
  }
  return (
    !message.groupId &&
    !message.gatebot &&
    ((usersMatch(message.sender, username) && usersMatch(message.recipient, friend)) ||
      (usersMatch(message.sender, friend) && usersMatch(message.recipient, username)))
  );
}

function collectChatMessages(db, matcher, { after, limit }) {
  const afterTime = after ? new Date(after).getTime() : NaN;
  const hasAfter = !Number.isNaN(afterTime);
  const maxItems = hasAfter ? Infinity : Math.min(Math.max(limit || 150, 1), 300);
  const collected = [];

  for (let index = db.messages.length - 1; index >= 0; index -= 1) {
    const message = db.messages[index];
    if (!matcher(message)) continue;
    const sentAt = new Date(message.sent_at).getTime();
    if (hasAfter) {
      if (sentAt > afterTime) collected.push(message);
      continue;
    }
    collected.push(message);
    if (collected.length >= maxItems) break;
  }

  collected.reverse();
  return collected;
}

app.get('/api/messages', requireAuth, async (req, res) => {
  try {
    const friend = normalizeUsernameInput(req.query.friend);
    const groupId = String(req.query.groupId || '').trim();
    const gatebotChat = req.query.gatebot === '1' || req.query.gatebot === 'true';
    const { user, db } = req.auth;
    const channelId = String(req.query.channelId || '').trim();
    let channel = null;
    let defaultChannelId = null;

    if (gatebotChat) {
      // ok
    } else if (groupId) {
      const group = db.servers.find((item) => item.id === groupId);
      if (!group || !userInGroup(db, group, user.username)) {
        return res.status(403).json({ error: 'You are not in this group.' });
      }
      channel = getGroupChannel(group, channelId);
      defaultChannelId = getGroupChannel(group, null).id;
    } else if (!friend) {
      return res.status(400).json({ error: 'friend, groupId, or gatebot is required.' });
    }

    const messages = collectChatMessages(
      db,
      (message) =>
        messageMatchesChat(message, {
          gatebotChat,
          groupId,
          channel,
          defaultChannelId,
          friend,
          username: user.username,
        }),
      {
        after: req.query.after,
        limit: parseInt(req.query.limit, 10) || 150,
      }
    );

    const lite = req.query.lite === '1' || req.query.lite === 'true';
    const payload = lite
      ? messages.map((message) => {
          if (message.type && message.type !== 'text') return message;
          const { image, video, audio, ...rest } = message;
          return rest;
        })
      : messages;

    res.json({ messages: payload });
  } catch (error) {
    res.status(500).json({ error: 'Server error. Try again.' });
  }
});

app.post('/api/messages', requireAuth, async (req, res) => {
  try {
    const type = ['text', 'image', 'sticker', 'video', 'voice'].includes(req.body.type)
      ? req.body.type
      : 'text';
    const content = String(req.body.content || '').trim();
    const image = String(req.body.image || '').trim();
    const video = String(req.body.video || '').trim();
    const audio = String(req.body.audio || '').trim();
    const rawRecipient = normalizeUsernameInput(req.body.recipient);
    const chatGroupId = String(req.body.groupId || '').trim() || null;
    const chatChannelId = String(req.body.channelId || '').trim() || null;
    const isGatebotChat = Boolean(req.body.gatebot);
    const { user, db } = req.auth;

    let recipientUser = null;
    let activeChannel = null;
    if (isGatebotChat) {
      // Private GateBot thread for this user.
    } else if (chatGroupId) {
      const group = db.servers.find((item) => item.id === chatGroupId);
      if (!group || !userInGroup(db, group, user.username)) {
        return res.status(403).json({ error: 'You are not in this group.' });
      }
      activeChannel = getGroupChannel(group, chatChannelId);
    } else {
      if (!rawRecipient) {
        return res.status(400).json({ error: 'Select a friend, group, or GateBot before sending a message.' });
      }
      recipientUser = findUserByUsername(db, rawRecipient);
      if (!recipientUser) {
        return res.status(404).json({ error: 'Recipient not found.' });
      }
      if (isBlockedEither(db, user.username, recipientUser.username)) {
        return res.status(403).json({ error: 'You cannot message this user.' });
      }
    }

    if (type === 'image') {
      if (!image.startsWith('data:image/')) {
        return res.status(400).json({ error: 'Invalid image data.' });
      }
      if (image.length > 1_800_000) {
        return res.status(400).json({ error: 'Image is too large. Try a smaller photo.' });
      }
    } else if (type === 'video') {
      if (!video.startsWith('data:video/')) {
        return res.status(400).json({ error: 'Invalid video data.' });
      }
      if (video.length > 3_200_000) {
        return res.status(400).json({ error: 'Video is too large. Record a shorter clip.' });
      }
    } else if (type === 'voice') {
      if (!audio.startsWith('data:audio/')) {
        return res.status(400).json({ error: 'Invalid voice message.' });
      }
      if (audio.length > 2_500_000) {
        return res.status(400).json({ error: 'Voice message is too long.' });
      }
    } else if (!content) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    const message = {
      id: makeId(),
      sender: user.username,
      recipient: isGatebotChat ? GATEBOT_NAME : recipientUser ? recipientUser.username : null,
      content:
        type === 'image'
          ? (content || '📷 Photo')
          : type === 'video'
            ? (content || '🎥 Video')
            : type === 'voice'
              ? (content || '🎤 Voice message')
              : content,
      type,
      groupId: chatGroupId || null,
      channelId: activeChannel?.id || null,
      gatebot: isGatebotChat || false,
      owner: isGatebotChat ? user.username : null,
      sent_at: new Date().toISOString(),
    };
    if (type === 'image') message.image = image;
    if (type === 'video') message.video = video;
    if (type === 'voice') message.audio = audio;
    db.messages.push(message);
    let botMessage = null;
    if (type === 'text' && content && isGatebotChat) {
      await writeDb(db);
      res.json({ message, botMessage: null });
      const reply = await gateBotChatReply(content, user.username, db);
      if (reply) {
        botMessage = createBotMessage({
          content: reply,
          groupId: chatGroupId,
          channelId: activeChannel?.id || null,
          recipient: user.username,
          gatebot: true,
          owner: user.username,
        });
        db.messages.push(botMessage);
        await writeDb(db);
      }
      return;
    }
    await writeDb(db);
    res.json({ message, botMessage });
  } catch (error) {
    res.status(500).json({ error: 'Server error. Try again.' });
  }
});

app.delete('/api/messages/:id', requireAuth, async (req, res) => {
  try {
    const { user, db } = req.auth;
    const message = db.messages.find((item) => item.id === req.params.id);
    if (!message) {
      return res.status(404).json({ error: 'Message not found.' });
    }
    if (!usersMatch(message.sender, user.username)) {
      return res.status(403).json({ error: 'You can only delete your own messages.' });
    }
    db.messages = db.messages.filter((item) => item.id !== req.params.id);
    await writeDb(db);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error. Try again.' });
  }
});

app.patch('/api/messages/:id', requireAuth, async (req, res) => {
  try {
    const { user, db } = req.auth;
    const message = db.messages.find((item) => item.id === req.params.id);
    if (!message) {
      return res.status(404).json({ error: 'Message not found.' });
    }
    if (!usersMatch(message.sender, user.username)) {
      return res.status(403).json({ error: 'You can only edit your own messages.' });
    }
    if (!userCanAccessMessage(db, user, message)) {
      return res.status(403).json({ error: 'You cannot edit this message.' });
    }
    if (message.type && message.type !== 'text') {
      return res.status(400).json({ error: 'Only text messages can be edited.' });
    }
    const content = String(req.body.content || '').trim();
    if (!content) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }
    message.content = content;
    message.edited_at = new Date().toISOString();
    await writeDb(db);
    res.json({ message });
  } catch (error) {
    res.status(500).json({ error: 'Server error. Try again.' });
  }
});

app.post('/api/messages/:id/reactions', requireAuth, async (req, res) => {
  try {
    const emoji = String(req.body.emoji || '').trim();
    if (!emoji) {
      return res.status(400).json({ error: 'Emoji is required.' });
    }
    const { user, db } = req.auth;
    const message = db.messages.find((item) => item.id === req.params.id);
    if (!message) {
      return res.status(404).json({ error: 'Message not found.' });
    }
    if (!userCanAccessMessage(db, user, message)) {
      return res.status(403).json({ error: 'You cannot react to this message.' });
    }
    toggleReaction(message, user.username, emoji);
    await writeDb(db);
    res.json({ message });
  } catch (error) {
    res.status(500).json({ error: 'Server error. Try again.' });
  }
});

app.post('/api/presence', requireAuth, async (req, res) => {
  try {
    const { user, db } = req.auth;
    const status = ['online', 'idle', 'dnd'].includes(req.body.status) ? req.body.status : 'online';
    const list = ensurePresence(db);
    const existing = list.find((item) => usersMatch(item.username, user.username));
    const entry = {
      username: user.username,
      status,
      updated_at: new Date().toISOString(),
    };
    if (existing) {
      Object.assign(existing, entry);
    } else {
      list.push(entry);
    }
    await writeDb(db);
    res.json({ presence: getPresenceForUser(db, user.username) });
  } catch (error) {
    res.status(500).json({ error: 'Server error. Try again.' });
  }
});

app.get('/api/presence', requireAuth, (req, res) => {
  try {
    const { user, db } = req.auth;
    const friends = db.friends
      .filter(
        (friend) =>
          usersMatch(friend.owner, user.username) &&
          !isBlockedEither(db, user.username, friend.name)
      )
      .map((friend) => getPresenceForUser(db, friend.name));
    res.json({
      self: getPresenceForUser(db, user.username),
      friends,
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error. Try again.' });
  }
});

app.post('/api/typing', requireAuth, async (req, res) => {
  try {
    const friend = normalizeUsernameInput(req.body.friend);
    const groupId = String(req.body.groupId || '').trim();
    const channelId = String(req.body.channelId || '').trim();
    const { user, db } = req.auth;
    if (!friend && !groupId) {
      return res.status(400).json({ error: 'friend or groupId is required.' });
    }
    if (groupId) {
      const group = db.servers.find((item) => item.id === groupId);
      if (!group || !userInGroup(db, group, user.username)) {
        return res.status(403).json({ error: 'You are not in this group.' });
      }
    } else if (!areFriends(db, user.username, friend)) {
      return res.status(403).json({ error: 'You can only type in friend chats.' });
    }
    pruneTyping(db);
    const key = chatTypingKey(user.username, friend, groupId || null, channelId || null);
    const list = ensureTyping(db);
    const existing = list.find(
      (item) => item.key === key && usersMatch(item.username, user.username)
    );
    const now = Date.now();
    if (existing) {
      const last = new Date(existing.updated_at).getTime();
      if (!Number.isNaN(last) && now - last < 2500) {
        return res.json({ ok: true });
      }
      existing.updated_at = new Date().toISOString();
    } else {
      list.push({ key, username: user.username, updated_at: new Date().toISOString() });
    }
    await writeDb(db);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error. Try again.' });
  }
});

app.get('/api/typing', requireAuth, (req, res) => {
  try {
    const friend = normalizeUsernameInput(req.query.friend);
    const groupId = String(req.query.groupId || '').trim();
    const channelId = String(req.query.channelId || '').trim();
    const { user, db } = req.auth;
    pruneTyping(db);
    let key = '';
    if (groupId) {
      const group = db.servers.find((item) => item.id === groupId);
      if (!group || !userInGroup(db, group, user.username)) {
        return res.status(403).json({ error: 'You are not in this group.' });
      }
      key = chatTypingKey(user.username, '', groupId, channelId || null);
    } else {
      if (!friend) {
        return res.status(400).json({ error: 'friend or groupId is required.' });
      }
      key = chatTypingKey(user.username, friend, null);
    }
    const typers = ensureTyping(db)
      .filter((item) => item.key === key && !usersMatch(item.username, user.username))
      .map((item) => item.username);
    res.json({ typers });
  } catch (error) {
    res.status(500).json({ error: 'Server error. Try again.' });
  }
});

function ensureCalls(db) {
  if (!db.calls) db.calls = [];
  return db.calls;
}

function areFriends(db, userA, userB) {
  return db.friends.some(
    (friend) => usersMatch(friend.owner, userA) && usersMatch(friend.name, userB)
  );
}

function findCallById(db, callId) {
  return ensureCalls(db).find((call) => call.id === callId) || null;
}

function isCallLive(call) {
  if (call.status === 'ringing') {
    const age = Date.now() - new Date(call.created_at).getTime();
    if (age > 45_000) return false;
  }
  return call.status === 'ringing' || call.status === 'active';
}

function expireRingingCalls(db) {
  ensureCalls(db).forEach((call) => {
    if (call.status !== 'ringing') return;
    const age = Date.now() - new Date(call.created_at).getTime();
    if (age > 45_000) call.status = 'missed';
  });
}

function getLiveCallsForUser(db, username) {
  return ensureCalls(db).filter(
    (call) =>
      (usersMatch(call.caller, username) || usersMatch(call.callee, username)) && isCallLive(call)
  );
}

function getCallSignalsForUser(call, username, afterId) {
  let signals = (call.signals || []).filter((signal) => !usersMatch(signal.from, username));
  if (afterId) {
    const index = signals.findIndex((signal) => signal.id === afterId);
    signals = index === -1 ? signals : signals.slice(index + 1);
  }
  return signals;
}

app.get('/api/calls', requireAuth, async (req, res) => {
  try {
    const { user, db } = req.auth;
    expireRingingCalls(db);
    res.json({ calls: getLiveCallsForUser(db, user.username) });
  } catch (error) {
    res.status(500).json({ error: 'Server error. Try again.' });
  }
});

app.get('/api/calls/sync', requireAuth, async (req, res) => {
  try {
    const { user, db } = req.auth;
    expireRingingCalls(db);
    const calls = getLiveCallsForUser(db, user.username);
    const callId = String(req.query.callId || '').trim();
    const afterId = String(req.query.afterId || '').trim();
    let signals = [];
    if (callId) {
      const call = findCallById(db, callId);
      if (
        call &&
        (usersMatch(call.caller, user.username) || usersMatch(call.callee, user.username))
      ) {
        signals = getCallSignalsForUser(call, user.username, afterId);
      }
    }
    res.json({ calls, signals });
  } catch (error) {
    res.status(500).json({ error: 'Server error. Try again.' });
  }
});

app.post('/api/calls', requireAuth, async (req, res) => {
  try {
    const { user } = req.auth;
    const db = await readDbFresh();
    const callee = normalizeUsernameInput(req.body.to);
    if (!callee) {
      return res.status(400).json({ error: 'Choose a friend to call.' });
    }
    if (usersMatch(callee, user.username)) {
      return res.status(400).json({ error: 'You cannot call yourself.' });
    }
    if (!areFriends(db, user.username, callee)) {
      return res.status(403).json({ error: 'You can only call friends.' });
    }
    if (isBlockedEither(db, user.username, callee)) {
      return res.status(403).json({ error: 'You cannot call this user.' });
    }

    expireRingingCalls(db);
    const existing = ensureCalls(db).find(
      (call) =>
        (call.status === 'ringing' || call.status === 'active') &&
        ((usersMatch(call.caller, user.username) && usersMatch(call.callee, callee)) ||
          (usersMatch(call.caller, callee) && usersMatch(call.callee, user.username)))
    );
    if (existing) {
      return res.json({ call: existing });
    }

    const call = {
      id: makeId(),
      caller: user.username,
      callee,
      status: 'ringing',
      created_at: new Date().toISOString(),
      accepted_at: null,
      ended_at: null,
      signals: [],
    };
    ensureCalls(db).push(call);
    await writeDb(db);
    res.json({ call });
  } catch (error) {
    res.status(500).json({ error: 'Server error. Try again.' });
  }
});

app.post('/api/calls/:id/accept', requireAuth, async (req, res) => {
  try {
    const db = await readDbFresh();
    const { user } = req.auth;
    const call = findCallById(db, req.params.id);
    if (!call || !usersMatch(call.callee, user.username) || call.status !== 'ringing') {
      return res.status(404).json({ error: 'Call not found.' });
    }
    call.status = 'active';
    call.accepted_at = new Date().toISOString();
    await writeDb(db);
    res.json({ call });
  } catch (error) {
    res.status(500).json({ error: 'Server error. Try again.' });
  }
});

app.post('/api/calls/:id/decline', requireAuth, async (req, res) => {
  try {
    const db = await readDbFresh();
    const { user } = req.auth;
    const call = findCallById(db, req.params.id);
    if (!call || !usersMatch(call.callee, user.username) || call.status !== 'ringing') {
      return res.status(404).json({ error: 'Call not found.' });
    }
    call.status = 'declined';
    call.ended_at = new Date().toISOString();
    await writeDb(db);
    res.json({ call });
  } catch (error) {
    res.status(500).json({ error: 'Server error. Try again.' });
  }
});

app.post('/api/calls/:id/end', requireAuth, async (req, res) => {
  try {
    const db = await readDbFresh();
    const { user } = req.auth;
    const call = findCallById(db, req.params.id);
    if (
      !call ||
      (!usersMatch(call.caller, user.username) && !usersMatch(call.callee, user.username)) ||
      call.status === 'ended' ||
      call.status === 'declined' ||
      call.status === 'missed'
    ) {
      return res.status(404).json({ error: 'Call not found.' });
    }
    call.status = 'ended';
    call.ended_at = new Date().toISOString();
    await writeDb(db);
    res.json({ call });
  } catch (error) {
    res.status(500).json({ error: 'Server error. Try again.' });
  }
});

app.get('/api/calls/:id/signals', requireAuth, async (req, res) => {
  try {
    const db = await readDbFresh();
    const { user } = req.auth;
    const call = findCallById(db, req.params.id);
    if (
      !call ||
      (!usersMatch(call.caller, user.username) && !usersMatch(call.callee, user.username))
    ) {
      return res.status(404).json({ error: 'Call not found.' });
    }
    const afterId = String(req.query.afterId || '').trim();
    const after = req.query.after;
    let signals = call.signals || [];
    if (afterId) {
      const index = signals.findIndex((signal) => signal.id === afterId);
      signals = index === -1 ? signals : signals.slice(index + 1);
    } else if (after) {
      const afterTime = new Date(after).getTime();
      if (!Number.isNaN(afterTime)) {
        signals = signals.filter((signal) => new Date(signal.created_at).getTime() > afterTime);
      }
    }
    signals = signals.filter((signal) => !usersMatch(signal.from, user.username));
    res.json({ signals });
  } catch (error) {
    res.status(500).json({ error: 'Server error. Try again.' });
  }
});

app.post('/api/calls/:id/signals', requireAuth, async (req, res) => {
  try {
    const db = await readDbFresh();
    const { user } = req.auth;
    const call = findCallById(db, req.params.id);
    if (
      !call ||
      (!usersMatch(call.caller, user.username) && !usersMatch(call.callee, user.username)) ||
      (call.status !== 'ringing' && call.status !== 'active')
    ) {
      return res.status(404).json({ error: 'Call not found.' });
    }
    const type = String(req.body.type || '').trim();
    if (!['offer', 'answer', 'ice'].includes(type)) {
      return res.status(400).json({ error: 'Invalid signal type.' });
    }
    const signal = {
      id: makeId(),
      from: user.username,
      type,
      data: req.body.data || null,
      created_at: new Date().toISOString(),
    };
    if (!call.signals) call.signals = [];
    call.signals.push(signal);
    await writeDb(db);
    res.json({ signal });
  } catch (error) {
    res.status(500).json({ error: 'Server error. Try again.' });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const db = await readDb();
    res.json({ users: db.users.length, onlineReady: getStorageMode() !== 'missing', storage: getStorageMode() });
  } catch (error) {
    console.error('Stats/db check failed:', error);
    res.status(500).json({ error: 'Database connection failed.', detail: error.message });
  }
});

app.get('/api/health', async (req, res) => {
  let dbOk = false;
  let dbError = null;
  try {
    const db = await readDb();
    dbOk = Array.isArray(db?.users);
  } catch (error) {
    dbError = error.message;
  }
  res.json({
    ok: dbOk,
    service: 'chatgate',
    storage: getStorageMode(),
    hasPostgresUrl: Boolean(getPostgresUrl()),
    dbOk,
    dbError,
    postgresVars: {
      POSTGRES_URL: Boolean(pgEnv('POSTGRES_URL')),
      POSTGRES_PASSWORD: Boolean(pgEnv('POSTGRES_PASSWORD')),
      Chatgate_POSTGRES_URL: Boolean(process.env.Chatgate_POSTGRES_URL),
      Chatgate_POSTGRES_PASSWORD: Boolean(process.env.Chatgate_POSTGRES_PASSWORD),
    },
  });
});

if (!process.env.VERCEL) {
  const fs = require('fs');
  const DB_PATH = path.join(__dirname, 'data', 'db.json');
  if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({
      users: [],
      sessions: [],
      messages: [],
      friends: [],
      servers: [],
      requests: [],
      blocks: [],
    }, null, 2));
  }

  const distPath = path.join(__dirname, 'dist');
  const staticRoot = fs.existsSync(path.join(distPath, 'index.html')) ? distPath : __dirname;
  app.use(express.static(staticRoot));

  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'Not found.' });
    }
    const indexPath = path.join(staticRoot, 'index.html');
    res.sendFile(indexPath);
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ChatGate server running on port ${PORT}`);
  });
}

module.exports = app;
