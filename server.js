const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { readDb, writeDb, getStorageMode, getPostgresUrl } = require('./lib/store');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

function makeId() {
  return `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

function makeToken() {
  return crypto.randomBytes(24).toString('hex');
}

function findUserByUsername(db, username) {
  return db.users.find((user) => user.username.toLowerCase() === username.toLowerCase());
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
  return { id: user.id, username: user.username, created_at: user.created_at };
}

function ensureDefaultServer(db, username) {
  const hasServer = db.servers.some((server) => server.owner === username);
  if (!hasServer) {
    db.servers.push({
      id: makeId(),
      name: 'Home',
      owner: username,
      created_at: new Date().toISOString(),
    });
  }
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
    const token = makeToken();

    db.users.push(user);
    db.sessions.push({ token, userId: user.id, created_at: new Date().toISOString() });
    ensureDefaultServer(db, username);
    await writeDb(db);

    res.json({ token, user: publicUser(user) });
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
      return res.status(401).json({ error: 'Incorrect password.' });
    }

    const token = makeToken();
    db.sessions.push({ token, userId: user.id, created_at: new Date().toISOString() });
    ensureDefaultServer(db, user.username);
    await writeDb(db);

    res.json({ token, user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ error: 'Server error. Try again.' });
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.auth.user) });
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    if (!ensureStorageReady(res)) return;
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');

    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters.' });
    }

    const db = await readDb();
    const user = findUserByUsername(db, username);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
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

app.get('/api/users/exists', requireAuth, async (req, res) => {
  try {
    const username = String(req.query.username || '').trim();
    const db = await readDb();
    const user = findUserByUsername(db, username);
    res.json({ exists: Boolean(user) });
  } catch (error) {
    res.status(500).json({ error: 'Server error. Try again.' });
  }
});

app.get('/api/servers', requireAuth, (req, res) => {
  const { db, user } = req.auth;
  const servers = db.servers.filter((server) => server.owner === user.username);
  res.json({ servers });
});

app.post('/api/servers', requireAuth, async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    if (!name) {
      return res.status(400).json({ error: 'Server name is required.' });
    }

    const { db, user } = req.auth;
    const server = {
      id: makeId(),
      name,
      owner: user.username,
      created_at: new Date().toISOString(),
    };
    db.servers.push(server);
    await writeDb(db);
    res.json({ server });
  } catch (error) {
    res.status(500).json({ error: 'Server error. Try again.' });
  }
});

app.get('/api/friends', requireAuth, (req, res) => {
  const { db, user } = req.auth;
  const friends = db.friends.filter((friend) => friend.owner === user.username);
  res.json({ friends });
});

app.get('/api/requests', requireAuth, (req, res) => {
  const { db, user } = req.auth;
  const requests = db.requests.filter(
    (request) => request.to === user.username && request.status === 'pending'
  );
  res.json({ requests });
});

app.post('/api/requests', requireAuth, async (req, res) => {
  try {
    const to = String(req.body.to || '').trim();
    const { db, user } = req.auth;

    if (!to) {
      return res.status(400).json({ error: 'Username is required.' });
    }
    if (to.toLowerCase() === user.username.toLowerCase()) {
      return res.status(400).json({ error: 'You cannot send a friend request to yourself.' });
    }
    if (!findUserByUsername(db, to)) {
      return res.status(404).json({ error: 'No user found with that username.' });
    }

    const alreadyFriend = db.friends.some(
      (friend) =>
        friend.owner === user.username && friend.name.toLowerCase() === to.toLowerCase()
    );
    if (alreadyFriend) {
      return res.status(409).json({ error: 'That user is already in your friends list.' });
    }

    const duplicate = db.requests.some(
      (request) =>
        request.status === 'pending' &&
        request.from.toLowerCase() === user.username.toLowerCase() &&
        request.to.toLowerCase() === to.toLowerCase()
    );
    if (duplicate) {
      return res.status(409).json({ error: 'You already sent a friend request to this user.' });
    }

    const incoming = db.requests.find(
      (request) =>
        request.status === 'pending' &&
        request.from.toLowerCase() === to.toLowerCase() &&
        request.to.toLowerCase() === user.username.toLowerCase()
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
    const { db, user } = req.auth;
    const request = db.requests.find((item) => item.id === req.params.id);
    if (!request || request.to !== user.username || request.status !== 'pending') {
      return res.status(404).json({ error: 'Request not found.' });
    }

    const groupId =
      req.body.groupId ||
      db.servers.find((server) => server.owner === user.username)?.id ||
      null;

    const alreadyFriend = db.friends.some(
      (friend) =>
        friend.owner === user.username &&
        friend.name.toLowerCase() === request.from.toLowerCase()
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
        groupId: db.servers.find((server) => server.owner === request.from)?.id || null,
      });
    }

    request.status = 'accepted';
    await writeDb(db);

    const friends = db.friends.filter((friend) => friend.owner === user.username);
    res.json({ friends, request });
  } catch (error) {
    res.status(500).json({ error: 'Server error. Try again.' });
  }
});

app.post('/api/requests/:id/decline', requireAuth, async (req, res) => {
  try {
    const { db, user } = req.auth;
    const request = db.requests.find((item) => item.id === req.params.id);
    if (!request || request.to !== user.username) {
      return res.status(404).json({ error: 'Request not found.' });
    }
    request.status = 'declined';
    await writeDb(db);
    res.json({ request });
  } catch (error) {
    res.status(500).json({ error: 'Server error. Try again.' });
  }
});

app.get('/api/messages', requireAuth, (req, res) => {
  const friend = String(req.query.friend || '').trim();
  const { db, user } = req.auth;

  if (!friend) {
    return res.status(400).json({ error: 'friend is required.' });
  }

  const messages = db.messages.filter((message) => {
    return (
      (message.sender === user.username && message.recipient === friend) ||
      (message.sender === friend && message.recipient === user.username)
    );
  });

  res.json({ messages });
});

app.post('/api/messages', requireAuth, async (req, res) => {
  try {
    const content = String(req.body.content || '').trim();
    const groupId = String(req.body.groupId || '') || null;
    const recipient = String(req.body.recipient || '').trim();
    const { db, user } = req.auth;

    if (!content) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }
    if (!recipient) {
      return res.status(400).json({ error: 'Select a friend before sending a message.' });
    }
    if (!findUserByUsername(db, recipient)) {
      return res.status(404).json({ error: 'Recipient not found.' });
    }

    const message = {
      id: makeId(),
      sender: user.username,
      recipient,
      content,
      groupId,
      sent_at: new Date().toISOString(),
    };
    db.messages.push(message);
    await writeDb(db);
    res.json({ message });
  } catch (error) {
    res.status(500).json({ error: 'Server error. Try again.' });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const db = await readDb();
    res.json({ users: db.users.length, onlineReady: getStorageMode() !== 'missing', storage: getStorageMode() });
  } catch (error) {
    res.status(500).json({ error: 'Server error. Try again.' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'chatgate',
    storage: getStorageMode(),
    hasPostgresUrl: Boolean(getPostgresUrl()),
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
    }, null, 2));
  }

  app.use(express.static(__dirname));

  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'Not found.' });
    }
    res.sendFile(path.join(__dirname, 'index.html'));
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ChatGate server running on port ${PORT}`);
  });
}

module.exports = app;
