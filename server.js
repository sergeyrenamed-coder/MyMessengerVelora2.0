const express = require('express');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const http = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : ROOT_DIR;
const UPLOAD_DIR = process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : path.join(DATA_DIR, 'uploads');
const DB_PATH = process.env.DB_PATH ? path.resolve(process.env.DB_PATH) : path.join(DATA_DIR, 'messenger.db');
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30;

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function transaction(fn) {
  return db.transaction(fn);
}

function ensureColumn(table, name, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((column) => column.name === name)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
  }
}

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT '',
  avatar_data_url TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  public_key TEXT NOT NULL,
  encrypted_private_key TEXT NOT NULL,
  private_key_salt TEXT NOT NULL,
  private_key_iv TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('direct', 'group')),
  title TEXT,
  avatar_data_url TEXT NOT NULL DEFAULT '',
  subtype TEXT NOT NULL DEFAULT '',
  created_by INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS direct_pairs (
  chat_id INTEGER NOT NULL UNIQUE,
  user_low INTEGER NOT NULL,
  user_high INTEGER NOT NULL,
  UNIQUE(user_low, user_high),
  FOREIGN KEY(chat_id) REFERENCES chats(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chat_members (
  chat_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('owner', 'participant')),
  joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_read_message_id INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(chat_id, user_id),
  FOREIGN KEY(chat_id) REFERENCES chats(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chat_keys (
  chat_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  wrapped_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(chat_id, user_id),
  FOREIGN KEY(chat_id) REFERENCES chats(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL,
  uploader_id INTEGER NOT NULL,
  storage_name TEXT NOT NULL,
  encrypted_meta TEXT NOT NULL,
  meta_iv TEXT NOT NULL,
  blob_iv TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(chat_id) REFERENCES chats(id) ON DELETE CASCADE,
  FOREIGN KEY(uploader_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL,
  sender_id INTEGER,
  message_type TEXT NOT NULL CHECK (message_type IN ('text', 'file', 'system')),
  ciphertext TEXT,
  iv TEXT,
  attachment_id INTEGER,
  system_text TEXT,
  client_nonce TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(chat_id) REFERENCES chats(id) ON DELETE CASCADE,
  FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY(attachment_id) REFERENCES attachments(id) ON DELETE SET NULL,
  UNIQUE(sender_id, client_nonce)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  user_id INTEGER,
  meta TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auth_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL,
  user_agent TEXT NOT NULL DEFAULT '',
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
`);

ensureColumn('messages', 'meta_json', `TEXT NOT NULL DEFAULT '{}'`);
ensureColumn('messages', 'updated_at', 'TEXT');
ensureColumn('messages', 'reactions', `TEXT NOT NULL DEFAULT '[]'`);
ensureColumn('auth_tokens', 'last_seen_at', "TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP");
ensureColumn('chats', 'subtype', "TEXT NOT NULL DEFAULT ''");

// Repair legacy attachment MIME types so existing voice/video notes remain playable.
db.prepare(`
  UPDATE attachments
  SET mime_type = 'video/webm'
  WHERE mime_type NOT LIKE 'video/%'
    AND id IN (
      SELECT attachment_id
      FROM messages
      WHERE message_type = 'file'
        AND attachment_id IS NOT NULL
        AND meta_json LIKE '%"videoNote"%'
    )
`).run();

db.prepare(`
  UPDATE attachments
  SET mime_type = 'audio/webm'
  WHERE mime_type NOT LIKE 'audio/%'
    AND id IN (
      SELECT attachment_id
      FROM messages
      WHERE message_type = 'file'
        AND attachment_id IS NOT NULL
        AND meta_json LIKE '%"voice"%'
    )
`).run();

db.prepare(`UPDATE attachments SET mime_type = 'video/webm' WHERE mime_type LIKE 'video/webm;%'`).run();
db.prepare(`UPDATE attachments SET mime_type = 'audio/webm' WHERE mime_type LIKE 'audio/webm;%'`).run();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true, credentials: false },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
});

const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 15 * 1024 * 1024 },
});

if (process.env.TRUST_PROXY) {
  app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : process.env.TRUST_PROXY);
}

app.use(express.json({ limit: '4mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(ROOT_DIR, 'public')));

const userSockets = new Map();

function logAudit(kind, userId, meta = {}) {
  db.prepare('INSERT INTO audit_logs (kind, user_id, meta) VALUES (?, ?, ?)').run(kind, userId || null, JSON.stringify(meta));
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeUsername(value) {
  return String(value || '').trim().replace(/^@+/, '').toLowerCase();
}

function escapeLike(value) {
  return String(value || '').replace(/[%_]/g, (match) => `\\${match}`);
}

function nowIso() {
  return new Date().toISOString();
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function createAuthToken(userId, userAgent = '') {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();
  db.prepare(`
    INSERT INTO auth_tokens (user_id, token_hash, expires_at, user_agent, last_seen_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(userId, hashToken(token), expiresAt, String(userAgent || '').slice(0, 300));
  return token;
}


function getAuthTokenRecord(token) {
  if (!token) return null;
  return db.prepare('SELECT * FROM auth_tokens WHERE token_hash = ? LIMIT 1').get(hashToken(token)) || null;
}

function touchAuthToken(token) {
  if (!token) return;
  db.prepare('UPDATE auth_tokens SET last_seen_at = CURRENT_TIMESTAMP WHERE token_hash = ?').run(hashToken(token));
}

function describeUserAgent(userAgent = '') {
  const ua = String(userAgent || '');
  const lower = ua.toLowerCase();
  const os = lower.includes('windows') ? 'Windows'
    : lower.includes('android') ? 'Android'
    : lower.includes('iphone') || lower.includes('ipad') || lower.includes('ios') ? 'iOS'
    : lower.includes('mac os') || lower.includes('macintosh') ? 'macOS'
    : lower.includes('linux') ? 'Linux'
    : 'Unknown OS';
  const browser = lower.includes('yabrowser') ? 'Yandex Browser'
    : lower.includes('edg/') ? 'Microsoft Edge'
    : lower.includes('opr/') ? 'Opera'
    : lower.includes('chrome/') ? 'Chrome'
    : lower.includes('firefox/') ? 'Firefox'
    : lower.includes('safari/') ? 'Safari'
    : 'Browser';
  return `${browser} · ${os}`;
}

function listUserSessions(userId, currentToken = '') {
  const currentHash = currentToken ? hashToken(currentToken) : '';
  return db.prepare(`
    SELECT id, token_hash, created_at, expires_at, last_seen_at, user_agent
    FROM auth_tokens
    WHERE user_id = ?
    ORDER BY datetime(last_seen_at) DESC, datetime(created_at) DESC
  `).all(userId).map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    lastSeenAt: row.last_seen_at || row.created_at,
    userAgent: '',
    deviceLabel: describeUserAgent(row.user_agent),
    isCurrent: row.token_hash === currentHash,
  }));
}

function getUserDataStats(userId) {
  const chatCount = db.prepare('SELECT COUNT(*) AS total FROM chat_members WHERE user_id = ?').get(userId)?.total || 0;
  const directCount = db.prepare(`
    SELECT COUNT(*) AS total
    FROM chat_members cm
    JOIN chats c ON c.id = cm.chat_id
    WHERE cm.user_id = ? AND c.type = 'direct'
  `).get(userId)?.total || 0;
  const groupCount = db.prepare(`
    SELECT COUNT(*) AS total
    FROM chat_members cm
    JOIN chats c ON c.id = cm.chat_id
    WHERE cm.user_id = ? AND c.type = 'group' AND COALESCE(c.subtype, '') != 'channel'
  `).get(userId)?.total || 0;
  const channelCount = db.prepare(`
    SELECT COUNT(*) AS total
    FROM chat_members cm
    JOIN chats c ON c.id = cm.chat_id
    WHERE cm.user_id = ? AND c.type = 'group' AND COALESCE(c.subtype, '') = 'channel'
  `).get(userId)?.total || 0;
  const messageCount = db.prepare('SELECT COUNT(*) AS total FROM messages WHERE sender_id = ?').get(userId)?.total || 0;
  const attachmentCount = db.prepare('SELECT COUNT(*) AS total FROM attachments WHERE uploader_id = ?').get(userId)?.total || 0;
  const storageBytes = db.prepare('SELECT COALESCE(SUM(size), 0) AS total FROM attachments WHERE uploader_id = ?').get(userId)?.total || 0;
  return { chatCount, directCount, groupCount, channelCount, messageCount, attachmentCount, storageBytes };
}

function getUserFromToken(token) {
  if (!token) return null;
  const row = db.prepare(`
    SELECT u.*
    FROM auth_tokens t
    JOIN users u ON u.id = t.user_id
    WHERE t.token_hash = ?
      AND datetime(t.expires_at) > datetime('now')
    LIMIT 1
  `).get(hashToken(token));
  return row || null;
}

function deleteAuthToken(token) {
  if (!token) return;
  db.prepare('DELETE FROM auth_tokens WHERE token_hash = ?').run(hashToken(token));
}

function extractTokenFromRequest(req) {
  const header = String(req.headers.authorization || '');
  if (header.startsWith('Bearer ')) {
    return header.slice(7).trim();
  }
  return String(req.headers['x-auth-token'] || '').trim();
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
    bio: user.bio,
    avatarDataUrl: user.avatar_data_url,
    publicKey: user.public_key,
    encryptedPrivateKey: user.encrypted_private_key,
    privateKeySalt: user.private_key_salt,
    privateKeyIv: user.private_key_iv,
    createdAt: user.created_at,
  };
}

function authMiddleware(req, _res, next) {
  const token = extractTokenFromRequest(req);
  req.authToken = token || null;
  req.user = token ? getUserFromToken(token) : null;
  req.authSession = token ? getAuthTokenRecord(token) : null;
  if (req.user && token) touchAuthToken(token);
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Требуется авторизация.' });
  }
  next();
}

app.use(authMiddleware);

io.use((socket, next) => {
  const token = socket.handshake.auth?.token || (() => {
    const header = String(socket.handshake.headers.authorization || '');
    return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  })();
  const user = getUserFromToken(token);
  if (!user) {
    return next(new Error('unauthorized'));
  }
  socket.authToken = token;
  socket.user = user;
  next();
});

function getChatParticipants(chatId) {
  return db.prepare(`
    SELECT u.id, u.username, u.name, u.bio, u.avatar_data_url AS avatarDataUrl, u.public_key AS publicKey, cm.role
    FROM chat_members cm
    JOIN users u ON u.id = cm.user_id
    WHERE cm.chat_id = ?
    ORDER BY CASE WHEN cm.role = 'owner' THEN 0 ELSE 1 END, LOWER(u.name)
  `).all(chatId);
}

function ensureMember(chatId, userId) {
  return db.prepare('SELECT * FROM chat_members WHERE chat_id = ? AND user_id = ?').get(chatId, userId);
}

function getWrappedKey(chatId, userId) {
  const row = db.prepare('SELECT wrapped_key FROM chat_keys WHERE chat_id = ? AND user_id = ?').get(chatId, userId);
  return row ? row.wrapped_key : null;
}

function getMessageById(messageId) {
  return db.prepare(`
    SELECT m.*, a.encrypted_meta, a.meta_iv, a.blob_iv, a.mime_type, a.size,
           u.id AS sender_user_id, u.name AS sender_name, u.username AS sender_username, u.avatar_data_url AS sender_avatar
    FROM messages m
    LEFT JOIN attachments a ON a.id = m.attachment_id
    LEFT JOIN users u ON u.id = m.sender_id
    WHERE m.id = ?
    LIMIT 1
  `).get(messageId);
}

function buildChatTitle(chat, currentUserId) {
  if (chat.type === 'group') return chat.title || 'Новая группа';
  const other = db.prepare(`
    SELECT u.id, u.name, u.username
    FROM chat_members cm
    JOIN users u ON u.id = cm.user_id
    WHERE cm.chat_id = ? AND cm.user_id != ?
    LIMIT 1
  `).get(chat.id, currentUserId);
  if (!other) return 'Личный чат';
  return other.name || `@${other.username}`;
}

function buildChatAvatar(chat, currentUserId) {
  if (chat.type === 'group') return chat.avatar_data_url || '';
  const other = db.prepare(`
    SELECT u.avatar_data_url
    FROM chat_members cm
    JOIN users u ON u.id = cm.user_id
    WHERE cm.chat_id = ? AND cm.user_id != ?
    LIMIT 1
  `).get(chat.id, currentUserId);
  return other ? other.avatar_data_url : '';
}

function unreadCount(chatId, userId) {
  const membership = ensureMember(chatId, userId);
  if (!membership) return 0;
  const row = db.prepare(`
    SELECT COUNT(*) AS total
    FROM messages
    WHERE chat_id = ?
      AND id > ?
      AND COALESCE(sender_id, 0) != ?
      AND datetime(created_at) >= datetime(?)
  `).get(chatId, membership.last_read_message_id, userId, membership.joined_at);
  return row ? row.total : 0;
}

function getDirectPeerLastRead(chatId, currentUserId) {
  const row = db.prepare(`
    SELECT last_read_message_id
    FROM chat_members
    WHERE chat_id = ? AND user_id != ?
    LIMIT 1
  `).get(chatId, currentUserId);
  return row ? row.last_read_message_id : 0;
}

function parseMetaJson(value) {
  try {
    const parsed = JSON.parse(value || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeMessage(row, currentUserId = null, directPeerLastRead = null) {
  if (!row) return null;
  const meta = parseMetaJson(row.meta_json);
  return {
    id: row.id,
    chatId: row.chat_id,
    senderId: row.sender_id,
    messageType: row.message_type,
    ciphertext: row.ciphertext,
    iv: row.iv,
    attachmentId: row.attachment_id,
    systemText: row.system_text,
    clientNonce: row.client_nonce,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    meta,
    sender: row.sender_user_id ? {
      id: row.sender_user_id,
      name: row.sender_name,
      username: row.sender_username,
      avatarDataUrl: row.sender_avatar,
    } : null,
    attachment: row.attachment_id ? {
      id: row.attachment_id,
      encryptedMeta: row.encrypted_meta,
      metaIv: row.meta_iv,
      blobIv: row.blob_iv,
      mimeType: row.mime_type,
      size: row.size,
      downloadUrl: `/api/attachments/${row.attachment_id}/blob`,
    } : null,
    isOwn: currentUserId != null ? row.sender_id === currentUserId : false,
    readByPeer: directPeerLastRead != null ? row.id <= directPeerLastRead : null,
    reactions: (() => {
      try {
        const r = JSON.parse(row.reactions || '[]');
        return Array.isArray(r) ? r.map((item) => ({ ...item, count: item.userIds?.length || 0 })) : [];
      } catch { return []; }
    })(),
  };
}

function getLastMessage(chatId) {
  const message = db.prepare(`
    SELECT m.*, a.encrypted_meta, a.meta_iv, a.blob_iv, a.mime_type, a.size,
           u.id AS sender_user_id, u.name AS sender_name, u.username AS sender_username, u.avatar_data_url AS sender_avatar
    FROM messages m
    LEFT JOIN attachments a ON a.id = m.attachment_id
    LEFT JOIN users u ON u.id = m.sender_id
    WHERE m.chat_id = ?
    ORDER BY m.id DESC
    LIMIT 1
  `).get(chatId);
  return normalizeMessage(message, null, null);
}

function getChatDetails(chatId, currentUserId) {
  const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(chatId);
  if (!chat) return null;
  const membership = ensureMember(chatId, currentUserId);
  if (!membership) return null;
  const participants = getChatParticipants(chatId).map((participant) => ({
    ...participant,
    online: userSockets.has(String(participant.id)),
  }));
  return {
    id: chat.id,
    type: chat.type,
    subtype: chat.subtype || '',
    title: buildChatTitle(chat, currentUserId),
    rawTitle: chat.title,
    rawSubtype: chat.subtype || '',
    avatarDataUrl: buildChatAvatar(chat, currentUserId),
    rawAvatarDataUrl: chat.avatar_data_url,
    createdBy: chat.created_by,
    createdAt: chat.created_at,
    updatedAt: chat.updated_at,
    wrappedKey: getWrappedKey(chatId, currentUserId),
    currentUserRole: membership.role,
    participants,
    unreadCount: unreadCount(chatId, currentUserId),
    lastMessage: getLastMessage(chatId),
  };
}

function getUserChatSummaries(userId) {
  const chatIds = db.prepare('SELECT chat_id FROM chat_members WHERE user_id = ?').all(userId).map((row) => row.chat_id);
  return chatIds
    .map((chatId) => getChatDetails(chatId, userId))
    .filter(Boolean)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

function emitPresence(userId, online) {
  io.emit('presence:update', { userId: Number(userId), online });
}

function notifyUsers(userIds, event, payload) {
  [...new Set(userIds.map((id) => String(id)))].forEach((id) => {
    io.to(`user:${id}`).emit(event, payload);
  });
}

function refreshChatsForUsers(userIds) {
  [...new Set(userIds.map(Number))].forEach((userId) => {
    io.to(`user:${userId}`).emit('chat:list', { chats: getUserChatSummaries(userId) });
  });
}

function validateAvatarDataUrl(value) {
  if (!value) return '';
  const trimmed = String(value || '');
  if (!trimmed.startsWith('data:image/')) {
    throw new Error('Аватар должен быть изображением в data URL формате.');
  }
  if (trimmed.length > 1024 * 1024) {
    throw new Error('Аватар слишком большой.');
  }
  return trimmed;
}

function normalizeAttachmentMime(mime) {
  return String(mime || '').trim().toLowerCase().split(';')[0].trim();
}

function allowedAttachmentMime(mime) {
  const normalized = normalizeAttachmentMime(mime);
  return [
    'image/png', 'image/jpeg', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain', 'application/zip', 'application/x-zip-compressed',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel',
    'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav',
    'video/webm', 'video/mp4', 'video/quicktime'
  ].includes(normalized);
}

function sanitizePollMeta(poll) {
  if (!poll || typeof poll !== 'object') return null;
  const question = String(poll.question || '').trim().slice(0, 220);
  const rawOptions = Array.isArray(poll.options) ? poll.options : [];
  const options = rawOptions
    .map((option, index) => {
      const text = String(option?.text || '').trim().slice(0, 120);
      const id = String(option?.id || `option-${index + 1}`).trim().slice(0, 40) || `option-${index + 1}`;
      const voterIds = Array.isArray(option?.voterIds)
        ? [...new Set(option.voterIds.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0))]
        : [];
      if (!text) return null;
      return { id, text, voterIds };
    })
    .filter(Boolean)
    .slice(0, 10);
  if (!question || options.length < 2) return null;
  return {
    question,
    multiple: Boolean(poll.multiple),
    closed: Boolean(poll.closed),
    options,
  };
}

function sanitizeLocationMeta(location) {
  if (!location || typeof location !== 'object') return null;
  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const label = String(location.label || '').trim().slice(0, 120);
  const note = String(location.note || '').trim().slice(0, 180);
  return {
    label,
    note,
    latitude: Math.max(-90, Math.min(90, latitude)),
    longitude: Math.max(-180, Math.min(180, longitude)),
  };
}

function sanitizeWalletCardMeta(walletCard) {
  if (!walletCard || typeof walletCard !== 'object') return null;
  const title = String(walletCard.title || '').trim().slice(0, 120);
  const note = String(walletCard.note || '').trim().slice(0, 220);
  const recipient = String(walletCard.recipient || '').trim().slice(0, 120);
  const amount = Math.max(0, Math.min(999999999, Number(walletCard.amount || 0)));
  const currency = String(walletCard.currency || 'RUB').trim().slice(0, 12).toUpperCase() || 'RUB';
  if (!title || !amount) return null;
  return { title, note, recipient, amount, currency };
}

function sanitizeMeta(meta) {
  const input = meta && typeof meta === 'object' ? meta : {};
  const output = {};
  if (Number.isInteger(Number(input.replyToMessageId)) && Number(input.replyToMessageId) > 0) {
    output.replyToMessageId = Number(input.replyToMessageId);
  }
  if (input.forwardedFrom && typeof input.forwardedFrom === 'object') {
    output.forwardedFrom = {
      name: String(input.forwardedFrom.name || '').trim().slice(0, 80),
      chatTitle: String(input.forwardedFrom.chatTitle || '').trim().slice(0, 120),
    };
  }
  if (input.voice && typeof input.voice === 'object') {
    output.voice = {
      durationMs: Math.max(0, Math.min(60 * 60 * 1000, Number(input.voice.durationMs || 0))),
    };
  }
  if (input.videoNote && typeof input.videoNote === 'object') {
    output.videoNote = {
      durationMs: Math.max(0, Math.min(60 * 60 * 1000, Number(input.videoNote.durationMs || 0))),
    };
  }
  if (input.sticker && typeof input.sticker === 'object') {
    output.sticker = {
      packId: String(input.sticker.packId || '').trim().slice(0, 80),
      packTitle: String(input.sticker.packTitle || '').trim().slice(0, 120),
    };
  }
  const poll = sanitizePollMeta(input.poll);
  if (poll) {
    output.poll = poll;
  }
  const location = sanitizeLocationMeta(input.location);
  if (location) {
    output.location = location;
  }
  const walletCard = sanitizeWalletCardMeta(input.walletCard);
  if (walletCard) {
    output.walletCard = walletCard;
  }
  if (input.editedAt) {
    output.editedAt = String(input.editedAt);
  }
  if (input.deleted) {
    output.deleted = true;
  }
  return output;
}

function validateReplyReference(chatId, replyToMessageId) {
  if (!replyToMessageId) return;
  const row = db.prepare('SELECT id FROM messages WHERE id = ? AND chat_id = ?').get(replyToMessageId, chatId);
  if (!row) throw new Error('Сообщение для ответа не найдено в этом чате.');
}

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.post('/api/auth/register', authLimiter, (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const username = normalizeUsername(req.body.username);
    const name = String(req.body.name || '').trim();
    const password = String(req.body.password || '');
    const publicKey = String(req.body.publicKey || '').trim();
    const encryptedPrivateKey = String(req.body.encryptedPrivateKey || '').trim();
    const privateKeySalt = String(req.body.privateKeySalt || '').trim();
    const privateKeyIv = String(req.body.privateKeyIv || '').trim();

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ error: 'Введите корректный email.' });
    }
    if (!username || !/^[a-z0-9_]{3,32}$/.test(username)) {
      return res.status(400).json({ error: 'Username должен содержать 3-32 символа: латиница, цифры и _.' });
    }
    if (!name || name.length < 2 || name.length > 64) {
      return res.status(400).json({ error: 'Имя должно содержать от 2 до 64 символов.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Пароль должен содержать минимум 8 символов.' });
    }
    if (!publicKey || !encryptedPrivateKey || !privateKeySalt || !privateKeyIv) {
      return res.status(400).json({ error: 'Не удалось подготовить E2EE-ключи.' });
    }

    const passwordHash = bcrypt.hashSync(password, 12);
    const info = db.prepare(`
      INSERT INTO users (email, username, name, password_hash, public_key, encrypted_private_key, private_key_salt, private_key_iv)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(email, username, name, passwordHash, publicKey, encryptedPrivateKey, privateKeySalt, privateKeyIv);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
    const token = createAuthToken(user.id, req.headers['user-agent']);
    logAudit('register_success', user.id, { email, username });
    return res.json({ token, user: publicUser(user) });
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) {
      const message = String(error.message).includes('users.email')
        ? 'Этот email уже используется.'
        : 'Этот username уже занят.';
      return res.status(400).json({ error: message });
    }
    logAudit('register_error', null, { error: error.message });
    return res.status(500).json({ error: 'Не удалось зарегистрироваться.' });
  }
});

app.post('/api/auth/login', authLimiter, (req, res) => {
  const login = String(req.body.login || '').trim();
  const password = String(req.body.password || '');
  const identifier = login.includes('@') ? normalizeEmail(login) : normalizeUsername(login);
  const user = login.includes('@')
    ? db.prepare('SELECT * FROM users WHERE email = ?').get(identifier)
    : db.prepare('SELECT * FROM users WHERE username = ?').get(identifier);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    logAudit('login_error', user ? user.id : null, { login });
    return res.status(400).json({ error: 'Неверные учетные данные.' });
  }

  const token = createAuthToken(user.id, req.headers['user-agent']);
  logAudit('login_success', user.id, { login });
  return res.json({ token, user: publicUser(user) });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  deleteAuthToken(req.authToken);
  logAudit('logout', req.user.id, {});
  res.json({ ok: true });
});

app.get('/api/auth/session', (req, res) => {
  if (!req.user) {
    return res.json({ user: null });
  }
  return res.json({ user: publicUser(req.user) });
});

app.get('/api/settings/overview', requireAuth, (req, res) => {
  return res.json({
    sessions: listUserSessions(req.user.id, req.authToken),
    stats: getUserDataStats(req.user.id),
    e2ee: {
      mode: 'single_trusted_browser_session',
      title: 'Одна доверенная браузерная сессия',
      description: 'В этом MVP ключи E2EE локально привязаны к доверенной вкладке. Кэш дешифрования очищается при скрытии вкладки и выходе, а новые устройства требуют повторного входа и разблокировки ключа.'
    }
  });
});

app.post('/api/auth/sessions/logout-others', requireAuth, (req, res) => {
  db.prepare('DELETE FROM auth_tokens WHERE user_id = ? AND token_hash != ?').run(req.user.id, hashToken(req.authToken));
  logAudit('logout_other_sessions', req.user.id, {});
  return res.json({ ok: true, sessions: listUserSessions(req.user.id, req.authToken) });
});

app.delete('/api/auth/sessions/:sessionId', requireAuth, (req, res) => {
  const sessionId = Number(req.params.sessionId);
  const session = db.prepare('SELECT * FROM auth_tokens WHERE id = ? AND user_id = ?').get(sessionId, req.user.id);
  if (!session) return res.status(404).json({ error: 'Сессия не найдена.' });
  db.prepare('DELETE FROM auth_tokens WHERE id = ? AND user_id = ?').run(sessionId, req.user.id);
  const currentDeleted = session.token_hash === hashToken(req.authToken);
  logAudit('logout_session', req.user.id, { sessionId, currentDeleted });
  return res.json({ ok: true, currentDeleted, sessions: currentDeleted ? [] : listUserSessions(req.user.id, req.authToken) });
});

app.put('/api/profile', requireAuth, (req, res) => {
  try {
    const current = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!current) return res.status(404).json({ error: 'Пользователь не найден.' });

    const name = String(req.body.name || current.name).trim();
    const username = normalizeUsername(req.body.username || current.username);
    const bio = String(req.body.bio || '').trim().slice(0, 160);
    const avatarDataUrl = validateAvatarDataUrl(req.body.avatarDataUrl || current.avatar_data_url || '');

    if (!name || name.length < 2) {
      return res.status(400).json({ error: 'Имя слишком короткое.' });
    }
    if (!username || !/^[a-z0-9_]{3,32}$/.test(username)) {
      return res.status(400).json({ error: 'Некорректный username.' });
    }

    db.prepare('UPDATE users SET name = ?, username = ?, bio = ?, avatar_data_url = ? WHERE id = ?').run(name, username, bio, avatarDataUrl, req.user.id);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    const relatedUserIds = getUserChatSummaries(req.user.id).flatMap((chat) => chat.participants.map((participant) => participant.id));
    refreshChatsForUsers([...relatedUserIds, req.user.id]);
    return res.json({ user: publicUser(user) });
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) {
      return res.status(400).json({ error: 'Этот username уже занят.' });
    }
    return res.status(400).json({ error: error.message || 'Не удалось обновить профиль.' });
  }
});

app.get('/api/users/search', requireAuth, (req, res) => {
  const q = normalizeUsername(req.query.q || '');
  if (!q) return res.json({ users: [] });
  const users = db.prepare(`
    SELECT id, username, name, bio, avatar_data_url AS avatarDataUrl, public_key AS publicKey
    FROM users
    WHERE id != ?
      AND (
        LOWER(username) LIKE LOWER(?) ESCAPE '\\'
        OR LOWER(name) LIKE LOWER(?) ESCAPE '\\'
        OR username = ?
      )
    ORDER BY CASE WHEN username = ? THEN 0 ELSE 1 END, LOWER(name)
    LIMIT 20
  `).all(req.user.id, `%${escapeLike(q)}%`, `%${escapeLike(q)}%`, q, q);
  return res.json({ users });
});

app.get('/api/chats', requireAuth, (req, res) => {
  res.json({ chats: getUserChatSummaries(req.user.id) });
});

app.post('/api/chats/direct', requireAuth, (req, res) => {
  try {
    const currentUserId = req.user.id;
    const participantId = Number(req.body.participantId);
    const wrappedKeys = Array.isArray(req.body.wrappedKeys) ? req.body.wrappedKeys : [];
    const keysMap = new Map(wrappedKeys.map((item) => [Number(item.userId), String(item.wrappedKey || '')]));

    if (!participantId || participantId === currentUserId) {
      return res.status(400).json({ error: 'Некорректный участник.' });
    }

    const otherUser = db.prepare('SELECT * FROM users WHERE id = ?').get(participantId);
    if (!otherUser) return res.status(404).json({ error: 'Пользователь не найден.' });

    const userLow = Math.min(currentUserId, participantId);
    const userHigh = Math.max(currentUserId, participantId);
    const existingPair = db.prepare('SELECT chat_id FROM direct_pairs WHERE user_low = ? AND user_high = ?').get(userLow, userHigh);
    if (existingPair) {
      return res.json({ chat: getChatDetails(existingPair.chat_id, currentUserId) });
    }

    if (!keysMap.get(currentUserId) || !keysMap.get(participantId)) {
      return res.status(400).json({ error: 'Для личного чата нужны E2EE-ключи обоих участников.' });
    }

    const chatId = transaction(() => {
      const chat = db.prepare('INSERT INTO chats (type, created_by) VALUES (?, ?)').run('direct', currentUserId);
      db.prepare('INSERT INTO direct_pairs (chat_id, user_low, user_high) VALUES (?, ?, ?)').run(chat.lastInsertRowid, userLow, userHigh);
      db.prepare('INSERT INTO chat_members (chat_id, user_id, role) VALUES (?, ?, ?)').run(chat.lastInsertRowid, currentUserId, 'owner');
      db.prepare('INSERT INTO chat_members (chat_id, user_id, role) VALUES (?, ?, ?)').run(chat.lastInsertRowid, participantId, 'participant');
      db.prepare('INSERT INTO chat_keys (chat_id, user_id, wrapped_key) VALUES (?, ?, ?)').run(chat.lastInsertRowid, currentUserId, keysMap.get(currentUserId));
      db.prepare('INSERT INTO chat_keys (chat_id, user_id, wrapped_key) VALUES (?, ?, ?)').run(chat.lastInsertRowid, participantId, keysMap.get(participantId));
      return chat.lastInsertRowid;
    })();

    refreshChatsForUsers([currentUserId, participantId]);
    return res.json({ chat: getChatDetails(chatId, currentUserId) });
  } catch {
    return res.status(500).json({ error: 'Не удалось создать личный чат.' });
  }
});

app.post('/api/chats/group', requireAuth, (req, res) => {
  try {
    const currentUserId = req.user.id;
    const title = String(req.body.title || '').trim();
    const avatarDataUrl = validateAvatarDataUrl(req.body.avatarDataUrl || '');
    const memberIds = [...new Set((Array.isArray(req.body.memberIds) ? req.body.memberIds : []).map(Number).filter(Boolean))]
      .filter((id) => id !== currentUserId);
    const wrappedKeys = Array.isArray(req.body.wrappedKeys) ? req.body.wrappedKeys : [];
    const keysMap = new Map(wrappedKeys.map((item) => [Number(item.userId), String(item.wrappedKey || '')]));

    if (title.length < 2) {
      return res.status(400).json({ error: 'Название группы должно содержать минимум 2 символа.' });
    }
    if (memberIds.length < 1) {
      return res.status(400).json({ error: 'В группе должно быть минимум 2 участника: ты и ещё 1 человек.' });
    }
    const allIds = [currentUserId, ...memberIds];
    const missingKey = allIds.find((id) => !keysMap.get(id));
    if (missingKey) {
      return res.status(400).json({ error: 'Нужен завернутый ключ для каждого участника группы.' });
    }

    const chatId = transaction(() => {
      const info = db.prepare('INSERT INTO chats (type, title, avatar_data_url, created_by) VALUES (?, ?, ?, ?)').run('group', title, avatarDataUrl, currentUserId);
      const chatIdValue = info.lastInsertRowid;
      db.prepare('INSERT INTO chat_members (chat_id, user_id, role) VALUES (?, ?, ?)').run(chatIdValue, currentUserId, 'owner');
      db.prepare('INSERT INTO chat_keys (chat_id, user_id, wrapped_key) VALUES (?, ?, ?)').run(chatIdValue, currentUserId, keysMap.get(currentUserId));
      for (const memberId of memberIds) {
        db.prepare('INSERT INTO chat_members (chat_id, user_id, role) VALUES (?, ?, ?)').run(chatIdValue, memberId, 'participant');
        db.prepare('INSERT INTO chat_keys (chat_id, user_id, wrapped_key) VALUES (?, ?, ?)').run(chatIdValue, memberId, keysMap.get(memberId));
      }
      db.prepare(`INSERT INTO messages (chat_id, sender_id, message_type, system_text, meta_json) VALUES (?, NULL, 'system', ?, '{}')`).run(chatIdValue, `Группа «${title}» создана.`);
      return chatIdValue;
    })();

    refreshChatsForUsers([currentUserId, ...memberIds]);
    return res.json({ chat: getChatDetails(chatId, currentUserId) });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Не удалось создать группу.' });
  }
});


app.post('/api/chats/channel', requireAuth, (req, res) => {
  try {
    const currentUserId = req.user.id;
    const title = String(req.body.title || '').trim();
    const avatarDataUrl = validateAvatarDataUrl(req.body.avatarDataUrl || '');
    const memberIds = [...new Set((Array.isArray(req.body.memberIds) ? req.body.memberIds : []).map(Number).filter(Boolean))]
      .filter((id) => id !== currentUserId);
    const wrappedKeys = Array.isArray(req.body.wrappedKeys) ? req.body.wrappedKeys : [];
    const keysMap = new Map(wrappedKeys.map((item) => [Number(item.userId), String(item.wrappedKey || '')]));

    if (title.length < 2) {
      return res.status(400).json({ error: 'Название канала должно содержать минимум 2 символа.' });
    }
    const allIds = [currentUserId, ...memberIds];
    const missingKey = allIds.find((id) => !keysMap.get(id));
    if (missingKey) {
      return res.status(400).json({ error: 'Нужен завернутый ключ для каждого участника канала.' });
    }

    const chatId = transaction(() => {
      const info = db.prepare('INSERT INTO chats (type, subtype, title, avatar_data_url, created_by) VALUES (?, ?, ?, ?, ?)').run('group', 'channel', title, avatarDataUrl, currentUserId);
      const chatIdValue = info.lastInsertRowid;
      db.prepare('INSERT INTO chat_members (chat_id, user_id, role) VALUES (?, ?, ?)').run(chatIdValue, currentUserId, 'owner');
      db.prepare('INSERT INTO chat_keys (chat_id, user_id, wrapped_key) VALUES (?, ?, ?)').run(chatIdValue, currentUserId, keysMap.get(currentUserId));
      for (const memberId of memberIds) {
        db.prepare('INSERT INTO chat_members (chat_id, user_id, role) VALUES (?, ?, ?)').run(chatIdValue, memberId, 'participant');
        db.prepare('INSERT INTO chat_keys (chat_id, user_id, wrapped_key) VALUES (?, ?, ?)').run(chatIdValue, memberId, keysMap.get(memberId));
      }
      db.prepare(`INSERT INTO messages (chat_id, sender_id, message_type, system_text, meta_json) VALUES (?, NULL, 'system', ?, '{}')`).run(chatIdValue, `Канал «${title}» создан.`);
      return chatIdValue;
    })();

    refreshChatsForUsers([currentUserId, ...memberIds]);
    return res.json({ chat: getChatDetails(chatId, currentUserId) });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Не удалось создать канал.' });
  }
});

app.get('/api/chats/:chatId/messages', requireAuth, (req, res) => {
  const chatId = Number(req.params.chatId);
  const chat = getChatDetails(chatId, req.user.id);
  const membership = ensureMember(chatId, req.user.id);
  if (!chat || !membership) return res.status(404).json({ error: 'Чат не найден.' });

  const directPeerLastRead = chat.type === 'direct' ? getDirectPeerLastRead(chatId, req.user.id) : null;
  const rows = db.prepare(`
    SELECT m.*, a.encrypted_meta, a.meta_iv, a.blob_iv, a.mime_type, a.size,
           u.id AS sender_user_id, u.name AS sender_name, u.username AS sender_username, u.avatar_data_url AS sender_avatar
    FROM messages m
    LEFT JOIN attachments a ON a.id = m.attachment_id
    LEFT JOIN users u ON u.id = m.sender_id
    WHERE m.chat_id = ? AND datetime(m.created_at) >= datetime(?)
    ORDER BY m.id ASC
    LIMIT 250
  `).all(chatId, membership.joined_at);

  const messages = rows.map((row) => normalizeMessage(row, req.user.id, directPeerLastRead));
  return res.json({ chat, messages });
});

app.post('/api/chats/:chatId/messages/text', requireAuth, messageLimiter, (req, res) => {
  try {
    const chatId = Number(req.params.chatId);
    const membership = ensureMember(chatId, req.user.id);
    if (!membership) return res.status(404).json({ error: 'Чат не найден.' });
    const chatRow = db.prepare('SELECT subtype FROM chats WHERE id = ?').get(chatId);
    if (chatRow?.subtype === 'channel' && membership.role !== 'owner') return res.status(403).json({ error: 'Публиковать в канале может только владелец.' });

    const ciphertext = String(req.body.ciphertext || '').trim();
    const iv = String(req.body.iv || '').trim();
    const clientNonce = String(req.body.clientNonce || '').trim() || crypto.randomUUID();
    const meta = sanitizeMeta(req.body.metaJson);

    if (!ciphertext || !iv) {
      return res.status(400).json({ error: 'Пустое сообщение нельзя отправить.' });
    }
    validateReplyReference(chatId, meta.replyToMessageId);

    const info = db.prepare(`
      INSERT INTO messages (chat_id, sender_id, message_type, ciphertext, iv, client_nonce, meta_json)
      VALUES (?, ?, 'text', ?, ?, ?, ?)
    `).run(chatId, req.user.id, ciphertext, iv, clientNonce, JSON.stringify(meta));

    db.prepare('UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(chatId);
    const chat = getChatDetails(chatId, req.user.id);
    const directPeerLastRead = chat.type === 'direct' ? getDirectPeerLastRead(chatId, req.user.id) : null;
    const message = normalizeMessage(getMessageById(info.lastInsertRowid), req.user.id, directPeerLastRead);
    const userIds = getChatParticipants(chatId).map((participant) => participant.id);
    notifyUsers(userIds, 'message:new', { chatId, message });
    refreshChatsForUsers(userIds);
    return res.json({ message });
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) {
      return res.status(200).json({ ok: true });
    }
    logAudit('message_send_error', req.user.id, { error: error.message });
    return res.status(500).json({ error: error.message || 'Не удалось отправить сообщение.' });
  }
});

app.put('/api/chats/:chatId/messages/:messageId/text', requireAuth, messageLimiter, (req, res) => {
  try {
    const chatId = Number(req.params.chatId);
    const messageId = Number(req.params.messageId);
    const membership = ensureMember(chatId, req.user.id);
    if (!membership) return res.status(404).json({ error: 'Чат не найден.' });

    const existing = db.prepare('SELECT * FROM messages WHERE id = ? AND chat_id = ?').get(messageId, chatId);
    if (!existing) return res.status(404).json({ error: 'Сообщение не найдено.' });
    if (existing.sender_id !== req.user.id) return res.status(403).json({ error: 'Можно редактировать только свои сообщения.' });
    if (existing.message_type !== 'text') return res.status(400).json({ error: 'Редактировать можно только текстовые сообщения.' });

    const ciphertext = String(req.body.ciphertext || '').trim();
    const iv = String(req.body.iv || '').trim();
    if (!ciphertext || !iv) return res.status(400).json({ error: 'Сообщение не может быть пустым.' });

    const meta = sanitizeMeta(parseMetaJson(existing.meta_json));
    meta.editedAt = nowIso();
    db.prepare(`
      UPDATE messages
      SET ciphertext = ?, iv = ?, meta_json = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(ciphertext, iv, JSON.stringify(meta), messageId);
    db.prepare('UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(chatId);

    const chat = getChatDetails(chatId, req.user.id);
    const directPeerLastRead = chat.type === 'direct' ? getDirectPeerLastRead(chatId, req.user.id) : null;
    const message = normalizeMessage(getMessageById(messageId), req.user.id, directPeerLastRead);
    const userIds = getChatParticipants(chatId).map((participant) => participant.id);
    notifyUsers(userIds, 'message:update', { chatId, message });
    refreshChatsForUsers(userIds);
    return res.json({ message });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Не удалось отредактировать сообщение.' });
  }
});

app.delete('/api/chats/:chatId/messages/:messageId', requireAuth, (req, res) => {
  try {
    const chatId = Number(req.params.chatId);
    const messageId = Number(req.params.messageId);
    const membership = ensureMember(chatId, req.user.id);
    if (!membership) return res.status(404).json({ error: 'Чат не найден.' });

    const existing = db.prepare('SELECT * FROM messages WHERE id = ? AND chat_id = ?').get(messageId, chatId);
    if (!existing) return res.status(404).json({ error: 'Сообщение не найдено.' });
    if (existing.sender_id !== req.user.id) return res.status(403).json({ error: 'Можно удалить только свои сообщения.' });

    const meta = sanitizeMeta(parseMetaJson(existing.meta_json));
    meta.deleted = true;
    db.prepare(`
      UPDATE messages
      SET sender_id = NULL,
          message_type = 'system',
          ciphertext = NULL,
          iv = NULL,
          attachment_id = NULL,
          system_text = ?,
          meta_json = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run('Сообщение удалено.', JSON.stringify(meta), messageId);
    db.prepare('UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(chatId);

    const chat = getChatDetails(chatId, req.user.id);
    const directPeerLastRead = chat.type === 'direct' ? getDirectPeerLastRead(chatId, req.user.id) : null;
    const message = normalizeMessage(getMessageById(messageId), req.user.id, directPeerLastRead);
    const userIds = getChatParticipants(chatId).map((participant) => participant.id);
    notifyUsers(userIds, 'message:update', { chatId, message });
    refreshChatsForUsers(userIds);
    return res.json({ ok: true, message });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Не удалось удалить сообщение.' });
  }
});

app.post('/api/chats/:chatId/messages/:messageId/poll-vote', requireAuth, messageLimiter, (req, res) => {
  try {
    const chatId = Number(req.params.chatId);
    const messageId = Number(req.params.messageId);
    const membership = ensureMember(chatId, req.user.id);
    if (!membership) return res.status(404).json({ error: 'Чат не найден.' });

    const existing = db.prepare('SELECT * FROM messages WHERE id = ? AND chat_id = ?').get(messageId, chatId);
    if (!existing) return res.status(404).json({ error: 'Сообщение не найдено.' });

    const meta = sanitizeMeta(parseMetaJson(existing.meta_json));
    if (!meta.poll || meta.poll.closed) {
      return res.status(400).json({ error: 'Голосование в этом опросе недоступно.' });
    }

    const optionId = String(req.body.optionId || '').trim();
    const nextOptions = meta.poll.options.map((option) => ({
      ...option,
      voterIds: [...new Set((option.voterIds || []).map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0))],
    }));
    const optionIndex = nextOptions.findIndex((option) => option.id === optionId);
    if (optionIndex === -1) {
      return res.status(400).json({ error: 'Вариант ответа не найден.' });
    }

    const currentUserId = Number(req.user.id);
    const targetOption = nextOptions[optionIndex];
    const alreadySelected = targetOption.voterIds.includes(currentUserId);

    if (!meta.poll.multiple) {
      nextOptions.forEach((option, index) => {
        if (index !== optionIndex) {
          option.voterIds = option.voterIds.filter((value) => value !== currentUserId);
        }
      });
    }

    targetOption.voterIds = alreadySelected
      ? targetOption.voterIds.filter((value) => value !== currentUserId)
      : [...targetOption.voterIds, currentUserId];

    meta.poll.options = nextOptions;
    db.prepare(`
      UPDATE messages
      SET meta_json = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND chat_id = ?
    `).run(JSON.stringify(meta), messageId, chatId);

    const chat = getChatDetails(chatId, req.user.id);
    const directPeerLastRead = chat.type === 'direct' ? getDirectPeerLastRead(chatId, req.user.id) : null;
    const message = normalizeMessage(getMessageById(messageId), req.user.id, directPeerLastRead);
    const userIds = getChatParticipants(chatId).map((participant) => participant.id);
    notifyUsers(userIds, 'message:update', { chatId, message });
    refreshChatsForUsers(userIds);
    return res.json({ message });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Не удалось обновить опрос.' });
  }
});

app.post('/api/chats/:chatId/messages/file', requireAuth, messageLimiter, upload.single('file'), (req, res) => {
  try {
    const chatId = Number(req.params.chatId);
    const membership = ensureMember(chatId, req.user.id);
    if (!membership) return res.status(404).json({ error: 'Чат не найден.' });
    const chatRow = db.prepare('SELECT subtype FROM chats WHERE id = ?').get(chatId);
    if (chatRow?.subtype === 'channel' && membership.role !== 'owner') return res.status(403).json({ error: 'Публиковать в канале может только владелец.' });
    if (!req.file) return res.status(400).json({ error: 'Файл не передан.' });

    const encryptedMeta = String(req.body.encryptedMeta || '').trim();
    const metaIv = String(req.body.metaIv || '').trim();
    const blobIv = String(req.body.blobIv || '').trim();
    const sourceMimeType = normalizeAttachmentMime(req.body.sourceMimeType);
    const clientNonce = String(req.body.clientNonce || '').trim() || crypto.randomUUID();
    const meta = sanitizeMeta(req.body.metaJson ? JSON.parse(String(req.body.metaJson)) : {});

    validateReplyReference(chatId, meta.replyToMessageId);

    if (!encryptedMeta || !metaIv || !blobIv) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Отсутствуют данные шифрования файла.' });
    }
    const uploadedMimeType = normalizeAttachmentMime(req.file.mimetype);
    const storedMimeType = allowedAttachmentMime(sourceMimeType) ? sourceMimeType : uploadedMimeType;
    if (!allowedAttachmentMime(storedMimeType)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Этот тип файла не поддерживается.' });
    }

    const info = transaction(() => {
      const attachment = db.prepare(`
        INSERT INTO attachments (chat_id, uploader_id, storage_name, encrypted_meta, meta_iv, blob_iv, mime_type, size)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(chatId, req.user.id, req.file.filename, encryptedMeta, metaIv, blobIv, storedMimeType, req.file.size);
      const message = db.prepare(`
        INSERT INTO messages (chat_id, sender_id, message_type, attachment_id, client_nonce, meta_json)
        VALUES (?, ?, 'file', ?, ?, ?)
      `).run(chatId, req.user.id, attachment.lastInsertRowid, clientNonce, JSON.stringify(meta));
      db.prepare('UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(chatId);
      return { messageId: message.lastInsertRowid };
    })();

    const chat = getChatDetails(chatId, req.user.id);
    const directPeerLastRead = chat.type === 'direct' ? getDirectPeerLastRead(chatId, req.user.id) : null;
    const message = normalizeMessage(getMessageById(info.messageId), req.user.id, directPeerLastRead);
    const userIds = getChatParticipants(chatId).map((participant) => participant.id);
    notifyUsers(userIds, 'message:new', { chatId, message });
    refreshChatsForUsers(userIds);
    return res.json({ message });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    logAudit('file_upload_error', req.user.id, { error: error.message });
    return res.status(500).json({ error: error.message || 'Не удалось отправить файл.' });
  }
});

app.post('/api/chats/:chatId/read', requireAuth, (req, res) => {
  const chatId = Number(req.params.chatId);
  const messageId = Number(req.body.messageId || 0);
  const membership = ensureMember(chatId, req.user.id);
  if (!membership) return res.status(404).json({ error: 'Чат не найден.' });

  const safeMessageId = Math.max(messageId, membership.last_read_message_id || 0);
  db.prepare('UPDATE chat_members SET last_read_message_id = ? WHERE chat_id = ? AND user_id = ?').run(safeMessageId, chatId, req.user.id);
  const participantIds = getChatParticipants(chatId).map((participant) => participant.id);
  notifyUsers(participantIds, 'chat:read', { chatId, userId: req.user.id, messageId: safeMessageId });
  refreshChatsForUsers(participantIds);
  return res.json({ ok: true });
});

app.put('/api/chats/:chatId/group', requireAuth, (req, res) => {
  try {
    const chatId = Number(req.params.chatId);
    const chat = db.prepare('SELECT * FROM chats WHERE id = ? AND type = ?').get(chatId, 'group');
    const membership = ensureMember(chatId, req.user.id);
    if (!chat || !membership) return res.status(404).json({ error: 'Группа не найдена.' });
    if (membership.role !== 'owner') return res.status(403).json({ error: 'Только владелец может менять группу.' });

    const title = String(req.body.title || chat.title || '').trim();
    const avatarDataUrl = validateAvatarDataUrl(req.body.avatarDataUrl || chat.avatar_data_url || '');
    if (!title || title.length < 2) return res.status(400).json({ error: 'Название слишком короткое.' });

    db.prepare('UPDATE chats SET title = ?, avatar_data_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(title, avatarDataUrl, chatId);
    const label = chat.subtype === 'channel' ? 'Канал' : 'Группа';
    db.prepare(`INSERT INTO messages (chat_id, sender_id, message_type, system_text, meta_json) VALUES (?, NULL, 'system', ?, '{}')`).run(chatId, `${label} переименован${chat.subtype === 'channel' ? '' : 'а'} в «${title}».`);
    const userIds = getChatParticipants(chatId).map((participant) => participant.id);
    refreshChatsForUsers(userIds);
    notifyUsers(userIds, 'chat:updated', { chatId, chat: getChatDetails(chatId, req.user.id) });
    return res.json({ chat: getChatDetails(chatId, req.user.id) });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Не удалось обновить группу.' });
  }
});

app.post('/api/chats/:chatId/group/members', requireAuth, (req, res) => {
  try {
    const chatId = Number(req.params.chatId);
    const chat = db.prepare('SELECT * FROM chats WHERE id = ? AND type = ?').get(chatId, 'group');
    const membership = ensureMember(chatId, req.user.id);
    if (!chat || !membership) return res.status(404).json({ error: 'Группа не найдена.' });
    if (membership.role !== 'owner') return res.status(403).json({ error: 'Только владелец может добавлять участников.' });

    const userIds = [...new Set((Array.isArray(req.body.userIds) ? req.body.userIds : []).map(Number).filter(Boolean))];
    const wrappedKeys = Array.isArray(req.body.wrappedKeys) ? req.body.wrappedKeys : [];
    const keysMap = new Map(wrappedKeys.map((item) => [Number(item.userId), String(item.wrappedKey || '')]));
    if (!userIds.length) return res.status(400).json({ error: 'Нет пользователей для добавления.' });

    const existingIds = new Set(getChatParticipants(chatId).map((participant) => participant.id));
    const targetIds = userIds.filter((id) => !existingIds.has(id));
    if (!targetIds.length) return res.status(400).json({ error: 'Все выбранные пользователи уже в группе.' });
    const missingKey = targetIds.find((id) => !keysMap.get(id));
    if (missingKey) return res.status(400).json({ error: 'Нужен завернутый ключ для каждого нового участника.' });

    transaction(() => {
      targetIds.forEach((id) => {
        db.prepare('INSERT INTO chat_members (chat_id, user_id, role) VALUES (?, ?, ?)').run(chatId, id, 'participant');
        db.prepare('INSERT INTO chat_keys (chat_id, user_id, wrapped_key) VALUES (?, ?, ?)').run(chatId, id, keysMap.get(id));
        const user = db.prepare('SELECT name, username FROM users WHERE id = ?').get(id);
        db.prepare(`INSERT INTO messages (chat_id, sender_id, message_type, system_text, meta_json) VALUES (?, NULL, 'system', ?, '{}')`).run(chatId, `${user.name || '@' + user.username} добавлен в группу.`);
      });
      db.prepare('UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(chatId);
    })();

    refreshChatsForUsers([...existingIds, ...targetIds]);
    return res.json({ chat: getChatDetails(chatId, req.user.id) });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Не удалось добавить участников.' });
  }
});

app.delete('/api/chats/:chatId/group/members/:userId', requireAuth, (req, res) => {
  try {
    const chatId = Number(req.params.chatId);
    const targetUserId = Number(req.params.userId);
    const chat = db.prepare('SELECT * FROM chats WHERE id = ? AND type = ?').get(chatId, 'group');
    const membership = ensureMember(chatId, req.user.id);
    if (!chat || !membership) return res.status(404).json({ error: 'Группа не найдена.' });
    if (membership.role !== 'owner') return res.status(403).json({ error: 'Только владелец может удалять участников.' });
    if (targetUserId === req.user.id) return res.status(400).json({ error: 'Владелец не может удалить себя в этом MVP.' });

    const target = db.prepare('SELECT name, username FROM users WHERE id = ?').get(targetUserId);
    if (!target) return res.status(404).json({ error: 'Пользователь не найден.' });

    transaction(() => {
      db.prepare('DELETE FROM chat_members WHERE chat_id = ? AND user_id = ?').run(chatId, targetUserId);
      db.prepare('DELETE FROM chat_keys WHERE chat_id = ? AND user_id = ?').run(chatId, targetUserId);
      db.prepare(`INSERT INTO messages (chat_id, sender_id, message_type, system_text, meta_json) VALUES (?, NULL, 'system', ?, '{}')`).run(chatId, `${target.name || '@' + target.username} удалён из группы.`);
      db.prepare('UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(chatId);
    })();

    const participantIds = getChatParticipants(chatId).map((participant) => participant.id);
    refreshChatsForUsers([...participantIds, targetUserId]);
    return res.json({ ok: true, chat: getChatDetails(chatId, req.user.id) });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Не удалось удалить участника.' });
  }
});

app.get('/api/attachments/:attachmentId/blob', requireAuth, (req, res) => {
  const attachmentId = Number(req.params.attachmentId);
  const attachment = db.prepare('SELECT * FROM attachments WHERE id = ?').get(attachmentId);
  if (!attachment) return res.status(404).json({ error: 'Файл не найден.' });
  const membership = ensureMember(attachment.chat_id, req.user.id);
  if (!membership) return res.status(403).json({ error: 'Нет доступа к файлу.' });

  const filePath = path.join(UPLOAD_DIR, attachment.storage_name);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Файл не найден на диске.' });
  res.setHeader('Content-Type', attachment.mime_type || 'application/octet-stream');
  res.setHeader('Content-Length', attachment.size);
  return res.sendFile(filePath);
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'public', 'index.html'));
});

io.on('connection', (socket) => {
  const userId = String(socket.user.id);
  socket.join(`user:${userId}`);
  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set());
  }
  userSockets.get(userId).add(socket.id);
  emitPresence(userId, true);
  socket.emit('chat:list', { chats: getUserChatSummaries(Number(userId)) });

  socket.on('call:start', ({ chatId, mode = 'audio', withVideo = false } = {}) => {
    const safeChatId = Number(chatId);
    if (!ensureMember(safeChatId, Number(userId))) return;
    const participants = getChatParticipants(safeChatId).filter((participant) => participant.id !== Number(userId));
    participants.forEach((participant) => {
      io.to(`user:${participant.id}`).emit('call:incoming', {
        chatId: safeChatId,
        fromUserId: Number(userId),
        fromName: socket.user.name,
        mode: String(mode || 'audio'),
        withVideo: Boolean(withVideo),
      });
    });
  });

  socket.on('call:signal', ({ chatId, toUserId, data } = {}) => {
    const safeChatId = Number(chatId);
    const safeToUserId = Number(toUserId);
    if (!ensureMember(safeChatId, Number(userId))) return;
    if (!ensureMember(safeChatId, safeToUserId)) return;
    io.to(`user:${safeToUserId}`).emit('call:signal', {
      chatId: safeChatId,
      fromUserId: Number(userId),
      data: data || null,
    });
  });

  socket.on('call:end', ({ chatId } = {}) => {
    const safeChatId = Number(chatId);
    if (!ensureMember(safeChatId, Number(userId))) return;
    const participants = getChatParticipants(safeChatId).filter((participant) => participant.id !== Number(userId));
    participants.forEach((participant) => {
      io.to(`user:${participant.id}`).emit('call:end', {
        chatId: safeChatId,
        fromUserId: Number(userId),
      });
    });
  });

  // ===== TYPING EVENTS =====
  socket.on('typing:start', ({ chatId } = {}) => {
    const safeChatId = Number(chatId);
    if (!ensureMember(safeChatId, Number(userId))) return;
    const participants = getChatParticipants(safeChatId).filter((p) => p.id !== Number(userId));
    participants.forEach((p) => {
      io.to(`user:${p.id}`).emit('typing:start', {
        chatId: safeChatId,
        userId: Number(userId),
        name: socket.user.name,
      });
    });
  });

  socket.on('typing:stop', ({ chatId } = {}) => {
    const safeChatId = Number(chatId);
    if (!ensureMember(safeChatId, Number(userId))) return;
    const participants = getChatParticipants(safeChatId).filter((p) => p.id !== Number(userId));
    participants.forEach((p) => {
      io.to(`user:${p.id}`).emit('typing:stop', {
        chatId: safeChatId,
        userId: Number(userId),
      });
    });
  });

  // ===== REACTIONS =====
  socket.on('reaction:toggle', ({ chatId, messageId, emoji } = {}) => {
    const safeChatId = Number(chatId);
    const safeMessageId = Number(messageId);
    const safeEmoji = String(emoji || '').trim().slice(0, 8);
    if (!safeEmoji || !ensureMember(safeChatId, Number(userId))) return;

    // Check message belongs to this chat
    const msg = db.prepare('SELECT id FROM messages WHERE id = ? AND chat_id = ?').get(safeMessageId, safeChatId);
    if (!msg) return;

    // Get or init reactions for this message
    const existing = db.prepare('SELECT reactions FROM messages WHERE id = ?').get(safeMessageId);
    let reactions = [];
    try { reactions = JSON.parse(existing?.reactions || '[]'); } catch { reactions = []; }

    const uidNum = Number(userId);
    const idx = reactions.findIndex((r) => r.emoji === safeEmoji);
    if (idx >= 0) {
      const uidIdx = reactions[idx].userIds.indexOf(uidNum);
      if (uidIdx >= 0) {
        reactions[idx].userIds.splice(uidIdx, 1);
        if (!reactions[idx].userIds.length) reactions.splice(idx, 1);
      } else {
        reactions[idx].userIds.push(uidNum);
      }
    } else {
      reactions.push({ emoji: safeEmoji, userIds: [uidNum] });
    }

    // Limit to 8 distinct emojis
    if (reactions.length > 8) reactions = reactions.slice(-8);

    // Add count field for clients
    const withCount = reactions.map((r) => ({ ...r, count: r.userIds.length }));

    db.prepare('UPDATE messages SET reactions = ? WHERE id = ?').run(JSON.stringify(reactions), safeMessageId);

    // Broadcast to all chat members
    const participants = getChatParticipants(safeChatId);
    participants.forEach((p) => {
      io.to(`user:${p.id}`).emit('reaction:update', {
        chatId: safeChatId,
        messageId: safeMessageId,
        reactions: withCount,
      });
    });
  });

  socket.on('disconnect', () => {
    const set = userSockets.get(userId);
    if (!set) return;
    set.delete(socket.id);
    if (!set.size) {
      userSockets.delete(userId);
      emitPresence(userId, false);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Hybrid messenger running on http://localhost:${PORT}`);
});
