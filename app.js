const state = {
  token: null,
  user: null,
  privateKey: null,
  privateKeyBase64: null,
  chats: [],
  currentChat: null,
  currentMessages: [],
  chatKeys: new Map(),
  decryptedTextCache: new Map(),
  voiceUrls: new Map(),
  socket: null,
  modalMode: 'direct',
  selectedUsers: new Map(),
  pendingMessage: false,
  filter: '',
  groupAvatarDataUrl: '',
  currentGroupAvatarDataUrl: '',
  profileAvatarDataUrl: '',
  menuOpen: false,
  detailsOpen: false,
  detailsTarget: null,
  replyToMessageId: null,
  editingMessageId: null,
  forwardMessageId: null,
  activeMessageMenuId: null,
  mediaRecorder: null,
  recordingStream: null,
  recordingChunks: [],
  recordingStartedAt: 0,
  recordingTimerInterval: null,
  videoRecorder: null,
  videoRecordingStream: null,
  videoChunks: [],
  videoStartedAt: 0,
  mediaPanelOpen: false,
  mediaTab: 'emoji',
  activePackByTab: { emoji: 'default-emoji', stickers: 'default-stickers', gifs: 'default-gifs' },
  settingsSection: 'profile',
  settingsOverview: null,
  customEmojiPack: [],
  customStickerPack: [],
  premiumEmojiEnabled: true,
  packPreview: null,
  typingUsers: new Map(),     // chatId → Map(userId → {name, timer})
  myTypingTimer: null,        // debounce for own typing emit
  reactions: new Map(),       // messageId → [{emoji, userIds:[]}]
  mutedChats: new Set(),
  attachActionKind: '',
  attachMenuOpen: false,
  lastSocketErrorAt: 0,
  lastSocketErrorMessage: '',
};

const els = {
  authView: document.getElementById('auth-view'),
  appView: document.getElementById('app-view'),
  loginForm: document.getElementById('login-form'),
  registerForm: document.getElementById('register-form'),
  authTabLogin: document.getElementById('auth-tab-login'),
  authTabRegister: document.getElementById('auth-tab-register'),
  loginSubmit: document.getElementById('login-submit'),
  registerSubmit: document.getElementById('register-submit'),
  loginTabs: [...document.querySelectorAll('[data-auth-tab]')],
  loginError: document.getElementById('login-error'),
  registerError: document.getElementById('register-error'),
  menuToggle: document.getElementById('menu-toggle'),
  sidebar: document.getElementById('sidebar'),
  sidebarOverlay: document.getElementById('sidebar-overlay'),
  chatList: document.getElementById('chat-list'),
  chatFilter: document.getElementById('chat-filter'),
  chatEmpty: document.getElementById('chat-empty'),
  searchNewChat: document.getElementById('search-new-chat'),
  chatPlaceholder: document.getElementById('chat-placeholder'),
  chatPanel: document.getElementById('chat-panel'),
  chatHeaderMain: document.getElementById('chat-header-main'),
  currentChatAvatar: document.getElementById('current-chat-avatar'),
  currentChatTitle: document.getElementById('current-chat-title'),
  currentChatSubtitle: document.getElementById('current-chat-subtitle'),
  headerAudioCall: document.getElementById('header-audio-call'),
  headerVideoCall: document.getElementById('header-video-call'),
  messageList: document.getElementById('message-list'),
  composerForm: document.getElementById('composer-form'),
  composerInput: document.getElementById('composer-input'),
  attachButton: document.getElementById('attach-button'),
  attachAnchor: document.querySelector('.attach-anchor'),
  attachHoverMenu: document.getElementById('attach-hover-menu'),
  videoNoteButton: document.getElementById('video-note-button'),
  voiceButton: document.getElementById('voice-button'),
  fileInput: document.getElementById('file-input'),
  sendButton: document.getElementById('send-button'),
  askNotification: document.getElementById('ask-notification'),
  menuDrawer: document.getElementById('menu-drawer'),
  menuDrawerOverlay: document.getElementById('menu-drawer-overlay'),
  logoutButton: document.getElementById('logout-button'),
  openProfileSettings: document.getElementById('open-profile-settings'),
  openNotificationSettings: document.getElementById('open-notification-settings'),
  meName: document.getElementById('me-name'),
  meUsername: document.getElementById('me-username'),
  profileOpen: document.getElementById('profile-open'),
  settingsModal: document.getElementById('settings-modal'),
  settingsClose: document.getElementById('settings-close'),
  settingsNavButtons: [...document.querySelectorAll('[data-settings-section]')],
  settingsName: document.getElementById('settings-name'),
  settingsUsername: document.getElementById('settings-username'),
  settingsBio: document.getElementById('settings-bio'),
  settingsEmail: document.getElementById('settings-email'),
  settingsCreated: document.getElementById('settings-created'),
  settingsAvatar: document.getElementById('settings-avatar'),
  settingsE2eeTitle: document.getElementById('settings-e2ee-title'),
  settingsE2eeText: document.getElementById('settings-e2ee-text'),
  settingsEditProfile: document.getElementById('settings-edit-profile'),
  sessionsList: document.getElementById('sessions-list'),
  terminateOtherSessions: document.getElementById('terminate-other-sessions'),
  statsChats: document.getElementById('stats-chats'),
  statsDirects: document.getElementById('stats-directs'),
  statsGroups: document.getElementById('stats-groups'),
  statsChannels: document.getElementById('stats-channels'),
  statsMessages: document.getElementById('stats-messages'),
  statsFiles: document.getElementById('stats-files'),
  statsStorage: document.getElementById('stats-storage'),
  premiumEmojiToggle: document.getElementById('premium-emoji-toggle'),
  customEmojiCount: document.getElementById('custom-emoji-count'),
  customStickerCount: document.getElementById('custom-sticker-count'),
  createCustomEmoji: document.getElementById('create-custom-emoji'),
  uploadCustomEmoji: document.getElementById('upload-custom-emoji'),
  uploadCustomSticker: document.getElementById('upload-custom-sticker'),
  createEmojiPack: document.getElementById('create-emoji-pack'),
  createStickerPack: document.getElementById('create-sticker-pack'),
  settingsEmojiPacks: document.getElementById('settings-emoji-packs'),
  settingsStickerPacks: document.getElementById('settings-sticker-packs'),
  openMediaPanelFromSettings: document.getElementById('open-media-panel-from-settings'),
  premiumFreeBadge: document.getElementById('premium-free-badge'),
  createPackButton: document.getElementById('create-pack-button'),
  mediaPackStrip: document.getElementById('media-pack-strip'),
  mediaPanelToggle: document.getElementById('media-panel-toggle'),
  mediaPanel: document.getElementById('media-panel'),
  mediaPanelOverlay: document.getElementById('media-panel-overlay'),
  mediaPanelClose: document.getElementById('media-panel-close'),
  mediaPanelBody: document.getElementById('media-panel-body'),
  mediaTabButtons: [...document.querySelectorAll('[data-media-tab]')],
  customStickerInput: document.getElementById('custom-sticker-input'),
  customEmojiImageInput: document.getElementById('custom-emoji-image-input'),
  recordingIndicator: document.getElementById('recording-indicator'),
  recordingTimer: document.getElementById('recording-timer'),
  newGroupChat: document.getElementById('new-group-chat'),
  newChannelChat: document.getElementById('new-channel-chat'),
  mobileBack: document.getElementById('mobile-back'),
  detailsOverlay: document.getElementById('details-overlay'),
  detailsPanel: document.getElementById('details-panel'),
  detailsToggle: document.getElementById('details-toggle'),
  detailsClose: document.getElementById('details-close'),
  detailsEmpty: document.getElementById('details-empty'),
  detailsContent: document.getElementById('details-content'),
  detailsAvatar: document.getElementById('details-avatar'),
  detailsTitle: document.getElementById('details-title'),
  detailsSubtitle: document.getElementById('details-subtitle'),
  detailsBio: document.getElementById('details-bio'),
  detailsHandle: document.getElementById('details-handle'),
  detailsExtraInfo: document.getElementById('details-extra-info'),
  detailsStats: document.getElementById('details-stats'),
  detailsActionChat: document.getElementById('details-action-chat'),
  detailsActionSound: document.getElementById('details-action-sound'),
  detailsActionCall: document.getElementById('details-action-call'),
  detailsActionMore: document.getElementById('details-action-more'),
  participantList: document.getElementById('participant-list'),
  participantsCard: document.getElementById('participants-card'),
  groupOwnerControls: document.getElementById('group-owner-controls'),
  groupSettingsForm: document.getElementById('group-settings-form'),
  groupTitleInput: document.getElementById('group-title-input'),
  groupAvatarInput: document.getElementById('group-avatar-input'),
  groupAddMembers: document.getElementById('group-add-members'),
  groupOwnerTitle: document.getElementById('group-owner-title'),
  participantsTitle: document.getElementById('participants-title'),
  searchModal: document.getElementById('search-modal'),
  searchModalTitle: document.getElementById('search-modal-title'),
  searchModalForm: document.getElementById('search-modal-form'),
  searchUsersInput: document.getElementById('search-users-input'),
  searchResults: document.getElementById('search-results'),
  searchModalHelper: document.getElementById('search-modal-helper'),
  searchModalError: document.getElementById('search-modal-error'),
  selectedCounter: document.getElementById('selected-counter'),
  selectionHint: document.getElementById('selection-hint'),
  selectedUsers: document.getElementById('selected-users'),
  groupTitleField: document.getElementById('group-title-field'),
  newGroupTitle: document.getElementById('new-group-title'),
  newChatTitleLabel: document.getElementById('new-chat-title-label'),
  modalSubmit: document.getElementById('modal-submit'),
  attachActionModal: document.getElementById('attach-action-modal'),
  attachActionForm: document.getElementById('attach-action-form'),
  attachActionTitle: document.getElementById('attach-action-title'),
  attachActionHelper: document.getElementById('attach-action-helper'),
  attachActionFields: document.getElementById('attach-action-fields'),
  attachActionSubmit: document.getElementById('attach-action-submit'),
  profileModal: document.getElementById('profile-modal'),
  profileForm: document.getElementById('profile-form'),
  profileName: document.getElementById('profile-name'),
  profileUsername: document.getElementById('profile-username'),
  profileBio: document.getElementById('profile-bio'),
  profileAvatar: document.getElementById('profile-avatar'),
  toastRoot: document.getElementById('toast-root'),
  messageMenu: document.getElementById('message-menu'),
  replyBanner: document.getElementById('reply-banner'),
  replyBannerTitle: document.getElementById('reply-banner-title'),
  replyBannerText: document.getElementById('reply-banner-text'),
  replyClear: document.getElementById('reply-clear'),
  forwardModal: document.getElementById('forward-modal'),
  forwardList: document.getElementById('forward-list'),
  forwardFilter: document.getElementById('forward-filter'),
  packPreviewModal: document.getElementById('pack-preview-modal'),
  packPreviewTitle: document.getElementById('pack-preview-title'),
  packPreviewSubtitle: document.getElementById('pack-preview-subtitle'),
  packPreviewGrid: document.getElementById('pack-preview-grid'),
  packPreviewClose: document.getElementById('pack-preview-close'),
  packPreviewCancel: document.getElementById('pack-preview-cancel'),
  packPreviewAdd: document.getElementById('pack-preview-add'),
  packEditorModal: document.getElementById('pack-editor-modal'),
  packEditorForm: document.getElementById('pack-editor-form'),
  imagePreviewModal: document.getElementById('image-preview-modal'),
  imagePreviewImg: document.getElementById('image-preview-img'),
  imagePreviewTitle: document.getElementById('image-preview-title'),
  imagePreviewClose: document.getElementById('image-preview-close'),
  packNameInput: document.getElementById('pack-name-input'),
  packKindInput: document.getElementById('pack-kind-input'),
  packEditorTitle: document.getElementById('pack-editor-title'),
  packEditorSubmit: document.getElementById('pack-editor-submit'),
  attachHoverButtons: [...document.querySelectorAll('[data-attach-kind]')],
  typingIndicator: document.getElementById('typing-indicator'),
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const TOKEN_KEY = 'hm-auth-token';
const MUTED_CHATS_STORAGE_KEY = 'hm-muted-chats';


const GIF_PREFIX = '__GIF__:';
const PREMIUM_EMOJI_STORAGE_KEY = 'hm-premium-emoji-enabled';
const PACK_PREVIEW_LABELS = { emoji: 'Эмодзи-пак', stickers: 'Стикер-пак' };
const EMOJI_PRESETS = [
  { value: '😀', label: 'Smile', packId: 'default-emoji', packTitle: 'Основные' },
  { value: '😂', label: 'Laugh', packId: 'default-emoji', packTitle: 'Основные' },
  { value: '😍', label: 'Love', packId: 'default-emoji', packTitle: 'Основные' },
  { value: '😎', label: 'Cool', packId: 'default-emoji', packTitle: 'Основные' },
  { value: '🤝', label: 'Team', packId: 'default-emoji', packTitle: 'Основные' },
  { value: '🔥', label: 'Fire', packId: 'default-emoji', packTitle: 'Основные' },
  { value: '🎉', label: 'Party', packId: 'default-emoji', packTitle: 'Основные' },
  { value: '🫡', label: 'Respect', packId: 'default-emoji', packTitle: 'Основные' },
  { value: '✨', label: 'Spark', packId: 'default-emoji', packTitle: 'Основные' },
  { value: '🚀', label: 'Launch', packId: 'default-emoji', packTitle: 'Основные' },
  { value: '👀', label: 'Look', packId: 'default-emoji', packTitle: 'Основные' },
  { value: '❤️', label: 'Heart', packId: 'default-emoji', packTitle: 'Основные' },
];
const PREMIUM_EMOJI_PRESETS = [
  { value: '🪩', label: 'Disco', premium: true, packId: 'premium-emoji', packTitle: 'Premium' },
  { value: '🪽', label: 'Wings', premium: true, packId: 'premium-emoji', packTitle: 'Premium' },
  { value: '🫧', label: 'Bubbles', premium: true, packId: 'premium-emoji', packTitle: 'Premium' },
  { value: '🛸', label: 'UFO', premium: true, packId: 'premium-emoji', packTitle: 'Premium' },
  { value: '💎', label: 'Gem', premium: true, packId: 'premium-emoji', packTitle: 'Premium' },
  { value: '👑', label: 'Crown', premium: true, packId: 'premium-emoji', packTitle: 'Premium' },
];
const GIF_PRESETS = [
  { id: 'celebrate', label: 'Celebrate', url: 'https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif' },
  { id: 'wow', label: 'Wow', url: 'https://media.giphy.com/media/5VKbvrjxpVJCM/giphy.gif' },
  { id: 'cat', label: 'Cat', url: 'https://media.giphy.com/media/mlvseq9yvZhba/giphy.gif' },
  { id: 'dance', label: 'Dance', url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif' },
];

function svgToDataUrl(svg) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const STICKER_PRESETS = [
  {
    id: 'hello',
    packId: 'default-stickers',
    packTitle: 'Основные',
    name: 'Hello sticker',
    dataUrl: svgToDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#8C77FF"/><stop offset="1" stop-color="#4FD0FF"/></linearGradient></defs><rect width="240" height="240" rx="60" fill="url(#g)"/><text x="120" y="120" text-anchor="middle" dominant-baseline="middle" font-size="96">👋</text><text x="120" y="192" text-anchor="middle" font-size="34" fill="white" font-family="Arial">HELLO</text></svg>`)
  },
  {
    id: 'rocket',
    packId: 'default-stickers',
    packTitle: 'Основные',
    name: 'Rocket sticker',
    dataUrl: svgToDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><rect width="240" height="240" rx="60" fill="#1E2440"/><circle cx="120" cy="120" r="84" fill="#2E3764"/><text x="120" y="120" text-anchor="middle" dominant-baseline="middle" font-size="96">🚀</text><text x="120" y="196" text-anchor="middle" font-size="30" fill="#B8C0E8" font-family="Arial">BOOST</text></svg>`)
  },
  {
    id: 'love',
    packId: 'default-stickers',
    packTitle: 'Основные',
    name: 'Love sticker',
    dataUrl: svgToDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><rect width="240" height="240" rx="60" fill="#2B1531"/><rect x="24" y="24" width="192" height="192" rx="48" fill="#5F2B6F"/><text x="120" y="116" text-anchor="middle" dominant-baseline="middle" font-size="96">💜</text><text x="120" y="192" text-anchor="middle" font-size="30" fill="white" font-family="Arial">LOVE</text></svg>`)
  },
  {
    id: 'ok',
    packId: 'default-stickers',
    packTitle: 'Основные',
    name: 'Okay sticker',
    dataUrl: svgToDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><rect width="240" height="240" rx="60" fill="#183E30"/><circle cx="120" cy="120" r="86" fill="#1F5C44"/><text x="120" y="118" text-anchor="middle" dominant-baseline="middle" font-size="96">👌</text><text x="120" y="194" text-anchor="middle" font-size="30" fill="white" font-family="Arial">OK</text></svg>`)
  },
];

function getEmojiStorageKey() {
  return `hm-custom-emoji-${state.user?.id || 'guest'}`;
}

function getStickerStorageKey() {
  return `hm-custom-sticker-${state.user?.id || 'guest'}`;
}

function formatStorageSize(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(durationMs) {
  const totalSeconds = Math.max(0, Math.round(Number(durationMs || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function sanitizeGifUrl(url) {
  const value = String(url || '').trim();
  if (!/^https?:\/\//i.test(value)) return '';
  return value;
}

function sanitizeCustomShortcode(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9_\-]/g, '').slice(0, 24);
}

function getMutedChatsStorageKey() {
  return state.user ? `${MUTED_CHATS_STORAGE_KEY}-${state.user.id}` : MUTED_CHATS_STORAGE_KEY;
}

function loadMutedChats() {
  try {
    const stored = JSON.parse(localStorage.getItem(getMutedChatsStorageKey()) || '[]');
    state.mutedChats = new Set(Array.isArray(stored) ? stored.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0) : []);
  } catch {
    state.mutedChats = new Set();
  }
}

function persistMutedChats() {
  localStorage.setItem(getMutedChatsStorageKey(), JSON.stringify([...state.mutedChats]));
}

function isChatMuted(chatId) {
  return state.mutedChats.has(Number(chatId));
}

function toggleChatMute(chatId) {
  const safeChatId = Number(chatId);
  if (!safeChatId) return false;
  if (state.mutedChats.has(safeChatId)) {
    state.mutedChats.delete(safeChatId);
  } else {
    state.mutedChats.add(safeChatId);
  }
  persistMutedChats();
  return state.mutedChats.has(safeChatId);
}

async function copyText(text, successMessage = 'Скопировано.') {
  const value = String(text || '').trim();
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
    toast(successMessage, 'success');
  } catch {
    toast(value, 'info');
  }
}

function insertTextAtCursor(text) {
  const textarea = els.composerInput;
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;
  const current = textarea.value;
  textarea.value = `${current.slice(0, start)}${text}${current.slice(end)}`;
  const cursor = start + text.length;
  textarea.focus();
  textarea.setSelectionRange(cursor, cursor);
  autoResizeComposer();
}

function normalizeEmojiItem(item = {}) {
  return {
    id: item.id || crypto.randomUUID(),
    shortcode: sanitizeCustomShortcode(item.shortcode || item.label || 'emoji'),
    type: item.type || (item.dataUrl ? 'image' : 'unicode'),
    value: item.value || '',
    dataUrl: item.dataUrl || '',
    label: item.label || item.shortcode || 'emoji',
    packId: item.packId || 'my-emoji-pack',
    packTitle: item.packTitle || 'Мои emoji',
    premium: !!item.premium,
    placeholder: !!item.placeholder,
  };
}

function normalizeStickerItem(item = {}) {
  return {
    id: item.id || crypto.randomUUID(),
    name: item.name || 'Sticker',
    dataUrl: item.dataUrl || '',
    packId: item.packId || 'my-stickers-pack',
    packTitle: item.packTitle || 'Мои стикеры',
    placeholder: !!item.placeholder,
  };
}

function loadUserCollections() {
  try {
    state.customEmojiPack = JSON.parse(localStorage.getItem(getEmojiStorageKey()) || '[]').map(normalizeEmojiItem);
  } catch {
    state.customEmojiPack = [];
  }
  try {
    state.customStickerPack = JSON.parse(localStorage.getItem(getStickerStorageKey()) || '[]').map(normalizeStickerItem);
  } catch {
    state.customStickerPack = [];
  }
  state.premiumEmojiEnabled = localStorage.getItem(PREMIUM_EMOJI_STORAGE_KEY) !== '0';
  ensureActivePack('emoji');
  ensureActivePack('stickers');
  ensureActivePack('gifs');
}

function persistEmojiPack() {
  localStorage.setItem(getEmojiStorageKey(), JSON.stringify(state.customEmojiPack));
}

function persistStickerPack() {
  localStorage.setItem(getStickerStorageKey(), JSON.stringify(state.customStickerPack));
}

function updatePremiumEmojiButton() {
  if (!els.premiumEmojiToggle) return;
  els.premiumEmojiToggle.textContent = state.premiumEmojiEnabled ? 'Free beta' : 'Выкл';
  els.premiumEmojiToggle.classList.toggle('primary-button', state.premiumEmojiEnabled);
  els.premiumEmojiToggle.classList.toggle('secondary-button', !state.premiumEmojiEnabled);
}

function getPackItems(tab) {
  if (tab === 'emoji') {
    return [
      ...EMOJI_PRESETS,
      ...PREMIUM_EMOJI_PRESETS.map((item) => ({ ...item, locked: item.premium && !state.premiumEmojiEnabled, packTitle: 'Premium' })),
      ...state.customEmojiPack,
    ];
  }
  if (tab === 'stickers') {
    return [...STICKER_PRESETS, ...state.customStickerPack];
  }
  return GIF_PRESETS.map((item) => ({ ...item, packId: 'default-gifs', packTitle: 'GIF' }));
}

function getPackList(tab) {
  const map = new Map();
  getPackItems(tab).forEach((item) => {
    const packId = item.packId || `default-${tab}`;
    if (!map.has(packId)) {
      map.set(packId, { id: packId, title: item.packTitle || item.label || 'Пак' });
    }
  });
  return [...map.values()];
}

function ensureActivePack(tab) {
  const packs = getPackList(tab);
  if (!packs.length) return;
  if (!state.activePackByTab[tab] || !packs.some((pack) => pack.id === state.activePackByTab[tab])) {
    state.activePackByTab[tab] = packs[0].id;
  }
}

function setActivePack(tab, packId) {
  state.activePackByTab[tab] = packId;
  renderMediaPanel();
  if (els.settingsModal?.open) renderSettingsOverview();
}

function isManagedPackId(packId = '') {
  const value = String(packId || '');
  return !value.startsWith('default-') && !value.startsWith('premium-');
}

function getPackItemCount(tab, packId) {
  return getPackItems(tab).filter((item) => (item.packId || `default-${tab}`) === packId && !item.placeholder).length;
}

function getPackTypeLabel(packId = '') {
  const value = String(packId || '');
  if (value.startsWith('premium-')) return 'Premium';
  if (value.startsWith('default-')) return 'Базовый';
  return 'Мой пак';
}

function buildSettingsPackListHtml(tab) {
  const packs = getPackList(tab);
  if (!packs.length) {
    return '<div class="media-empty">Пока нет доступных паков.</div>';
  }
  return packs.map((pack) => {
    const active = state.activePackByTab[tab] === pack.id;
    const count = getPackItemCount(tab, pack.id);
    const symbol = tab === 'emoji' ? '🙂' : '🗂️';
    return `
      <div class="settings-pack-item ${active ? 'active' : ''}">
        <div class="settings-pack-main">
          <div class="settings-pack-cover">${symbol}</div>
          <div class="settings-pack-meta">
            <strong>${escapeHtml(pack.title)}</strong>
            <span class="muted-line">${count} ${tab === 'emoji' ? 'emoji' : 'стикеров'} · ${getPackTypeLabel(pack.id)}</span>
          </div>
        </div>
        <div class="settings-pack-actions">
          ${active ? '<span class="selection-pill">Активен</span>' : `<button type="button" class="secondary-button small" data-pack-activate-tab="${tab}" data-pack-activate-id="${escapeHtml(pack.id)}">Активировать</button>`}
          <button type="button" class="ghost-button small" data-pack-preview-tab="${tab}" data-pack-preview-id="${escapeHtml(pack.id)}" data-pack-preview-title="${escapeHtml(pack.title)}">Открыть</button>
          ${isManagedPackId(pack.id) ? `<button type="button" class="ghost-button small" data-pack-compose-tab="${tab}" data-pack-compose-id="${escapeHtml(pack.id)}">Пополнить</button>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function bindSettingsPackActions() {
  const root = els.settingsModal;
  if (!root) return;
  [...root.querySelectorAll('[data-pack-activate-id]')].forEach((button) => {
    button.addEventListener('click', () => {
      const tab = button.dataset.packActivateTab;
      const packId = button.dataset.packActivateId;
      if (!tab || !packId) return;
      setActivePack(tab, packId);
      toast(`Пак «${getPackMeta(tab, packId).title}» активирован.`, 'success');
    });
  });
  [...root.querySelectorAll('[data-pack-preview-id]')].forEach((button) => {
    button.addEventListener('click', () => {
      const tab = button.dataset.packPreviewTab;
      const packId = button.dataset.packPreviewId;
      const title = button.dataset.packPreviewTitle || '';
      if (!tab || !packId) return;
      openPackPreview(tab, packId, title);
    });
  });
  [...root.querySelectorAll('[data-pack-compose-id]')].forEach((button) => {
    button.addEventListener('click', () => {
      const tab = button.dataset.packComposeTab;
      const packId = button.dataset.packComposeId;
      if (!tab || !packId) return;
      setActivePack(tab, packId);
      setMediaTab(tab);
      els.settingsModal?.close();
      setMediaPanelOpen(true);
    });
  });
}

function initializeUserLocalState() {
  loadUserCollections();
  loadMutedChats();
  renderMediaPanel();
  renderSettingsOverview();
}


if (new URLSearchParams(window.location.search).get('fresh') === '1') {
  sessionStorage.removeItem(TOKEN_KEY);
}

function toast(message, type = 'info') {
  const node = document.createElement('div');
  node.className = `toast ${type}`;
  node.textContent = message;
  els.toastRoot.appendChild(node);
  setTimeout(() => node.remove(), 3200);
}

async function apiFetch(url, options = {}) {
  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(url, { ...options, headers });
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();
  if (!response.ok) throw new Error(payload?.error || payload || 'Ошибка запроса.');
  return payload;
}

function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).slice(0, 2);
  return (parts.map((part) => part[0] || '').join('').toUpperCase() || BRAND_INITIALS).slice(0, 2);
}

function applyAvatar(el, name, avatarDataUrl) {
  if (!el) return;
  el.textContent = '';
  el.style.backgroundImage = avatarDataUrl ? `url(${avatarDataUrl})` : '';
  if (!avatarDataUrl) el.textContent = initials(name);
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(date);
}

function formatRelativeChatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  const now = new Date();
  return date.toDateString() === now.toDateString()
    ? new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(date)
    : new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' }).format(date);
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function randomBase64(size = 16) {
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  return arrayBufferToBase64(bytes.buffer);
}

async function derivePasswordKey(password, saltBase64) {
  const baseKey = await crypto.subtle.importKey('raw', textEncoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: base64ToArrayBuffer(saltBase64), iterations: 600000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

async function generateUserKeyBundle(password) {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['encrypt', 'decrypt']
  );
  const publicKeyBuffer = await crypto.subtle.exportKey('spki', keyPair.publicKey);
  const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
  const salt = randomBase64(16);
  const iv = randomBase64(12);
  const passwordKey = await derivePasswordKey(password, salt);
  const encryptedPrivateKey = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: base64ToArrayBuffer(iv) },
    passwordKey,
    privateKeyBuffer
  );
  return {
    publicKey: arrayBufferToBase64(publicKeyBuffer),
    encryptedPrivateKey: arrayBufferToBase64(encryptedPrivateKey),
    privateKeySalt: salt,
    privateKeyIv: iv,
    privateKeyBase64: arrayBufferToBase64(privateKeyBuffer),
  };
}

async function importPrivateKey(privateKeyBase64) {
  return crypto.subtle.importKey('pkcs8', base64ToArrayBuffer(privateKeyBase64), { name: 'RSA-OAEP', hash: 'SHA-256' }, true, ['decrypt']);
}

async function importPublicKey(publicKeyBase64) {
  return crypto.subtle.importKey('spki', base64ToArrayBuffer(publicKeyBase64), { name: 'RSA-OAEP', hash: 'SHA-256' }, true, ['encrypt']);
}

async function unlockPrivateKeyFromUser(user, password) {
  const passwordKey = await derivePasswordKey(password, user.privateKeySalt);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToArrayBuffer(user.privateKeyIv) },
    passwordKey,
    base64ToArrayBuffer(user.encryptedPrivateKey)
  );
  const privateKeyBase64 = arrayBufferToBase64(decrypted);
  state.privateKeyBase64 = privateKeyBase64;
  state.privateKey = await importPrivateKey(privateKeyBase64);
  localStorage.setItem(`hm-private-key-${user.id}`, privateKeyBase64);
}

async function loadStoredPrivateKeyForUser(userId) {
  const value = localStorage.getItem(`hm-private-key-${userId}`);
  if (!value) return null;
  try {
    state.privateKeyBase64 = value;
    state.privateKey = await importPrivateKey(value);
    return state.privateKey;
  } catch {
    localStorage.removeItem(`hm-private-key-${userId}`);
    state.privateKeyBase64 = null;
    state.privateKey = null;
    return null;
  }
}

function clearStoredSecrets(userId) {
  if (userId) localStorage.removeItem(`hm-private-key-${userId}`);
  state.privateKey = null;
  state.privateKeyBase64 = null;
  state.chatKeys.clear();
  state.decryptedTextCache.clear();
  sessionStorage.removeItem(TOKEN_KEY);
  state.token = null;
}

async function generateChatKeyPackage(publicUsers) {
  const chatKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const rawBuffer = await crypto.subtle.exportKey('raw', chatKey);
  const wrappedKeys = [];
  for (const user of publicUsers) {
    const publicKey = await importPublicKey(user.publicKey);
    const encrypted = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, rawBuffer);
    wrappedKeys.push({ userId: user.id, wrappedKey: arrayBufferToBase64(encrypted) });
  }
  return { chatKey, wrappedKeys };
}

async function unwrapChatKey(wrappedKeyBase64) {
  const raw = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, state.privateKey, base64ToArrayBuffer(wrappedKeyBase64));
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
}

async function getOrLoadChatKey(chat) {
  if (state.chatKeys.has(chat.id)) return state.chatKeys.get(chat.id);
  if (!chat.wrappedKey) throw new Error('Не найден ключ чата для этой сессии.');
  const chatKey = await unwrapChatKey(chat.wrappedKey);
  state.chatKeys.set(chat.id, chatKey);
  return chatKey;
}

async function wrapExistingChatKeyForUsers(chatKey, users) {
  const rawBuffer = await crypto.subtle.exportKey('raw', chatKey);
  const wrappedKeys = [];
  for (const user of users) {
    const publicKey = await importPublicKey(user.publicKey);
    const encrypted = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, rawBuffer);
    wrappedKeys.push({ userId: user.id, wrappedKey: arrayBufferToBase64(encrypted) });
  }
  return wrappedKeys;
}

async function encryptTextForChat(chatKey, text) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, chatKey, textEncoder.encode(text));
  return { ciphertext: arrayBufferToBase64(ciphertext), iv: arrayBufferToBase64(iv.buffer) };
}

async function decryptTextForChat(chatKey, ciphertextBase64, ivBase64) {
  const cacheKey = `${ciphertextBase64}:${ivBase64}`;
  if (state.decryptedTextCache.has(cacheKey)) return state.decryptedTextCache.get(cacheKey);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToArrayBuffer(ivBase64) },
    chatKey,
    base64ToArrayBuffer(ciphertextBase64)
  );
  const text = textDecoder.decode(plaintext);
  state.decryptedTextCache.set(cacheKey, text);
  return text;
}

async function encryptAttachmentMeta(chatKey, payload) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    chatKey,
    textEncoder.encode(JSON.stringify(payload))
  );
  return { encryptedMeta: arrayBufferToBase64(encrypted), metaIv: arrayBufferToBase64(iv.buffer) };
}

async function decryptAttachmentMeta(chatKey, attachment) {
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToArrayBuffer(attachment.metaIv) },
    chatKey,
    base64ToArrayBuffer(attachment.encryptedMeta)
  );
  return JSON.parse(textDecoder.decode(decrypted));
}

async function encryptFileBlob(chatKey, fileBlob) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const arrayBuffer = await fileBlob.arrayBuffer();
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, chatKey, arrayBuffer);
  return { encryptedBlob: new Blob([encrypted], { type: fileBlob.type || 'application/octet-stream' }), blobIv: arrayBufferToBase64(iv.buffer) };
}

async function decryptDownloadedBlob(chatKey, encryptedBlob, blobIvBase64, mimeType) {
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToArrayBuffer(blobIvBase64) },
    chatKey,
    await encryptedBlob.arrayBuffer()
  );
  return new Blob([decrypted], { type: mimeType || 'application/octet-stream' });
}

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Не удалось прочитать файл.'));
    reader.readAsDataURL(file);
  });
}

function clearAuthErrors() {
  [els.loginError, els.registerError].forEach((node) => {
    if (!node) return;
    node.textContent = '';
    node.classList.add('hidden');
  });
}

function showAuthError(target, message) {
  const node = target === 'register' ? els.registerError : els.loginError;
  if (!node) return toast(message, 'error');
  node.textContent = message;
  node.classList.remove('hidden');
}

function setAuthTab(tab) {
  clearAuthErrors();
  els.loginTabs.forEach((button) => button.classList.toggle('active', button.dataset.authTab === tab));
  els.loginForm.classList.toggle('hidden', tab !== 'login');
  els.registerForm.classList.toggle('hidden', tab !== 'register');
  const targetInput = tab === 'register'
    ? els.registerForm.querySelector('input[name="name"]')
    : els.loginForm.querySelector('input[name="login"]');
  setTimeout(() => targetInput?.focus(), 0);
}

function showAuth() {
  clearAuthErrors();
  els.authView.classList.remove('hidden');
  els.appView.classList.add('hidden');
}

function showApp() {
  els.authView.classList.add('hidden');
  els.appView.classList.remove('hidden');
}

function resetCurrentChatState({ toastMessage = '' } = {}) {
  closeMessageMenu();
  state.currentChat = null;
  state.currentMessages = [];
  state.replyToMessageId = null;
  state.editingMessageId = null;
  state.forwardMessageId = null;
  state.detailsTarget = null;
  if (state.typingUsers instanceof Map) state.typingUsers.clear();
  if (els.messageList) els.messageList.innerHTML = '';
  if (els.typingIndicator) els.typingIndicator.classList.add('hidden');
  els.chatPanel?.classList.add('hidden');
  els.chatPlaceholder?.classList.remove('hidden');
  document.querySelector('.app-shell')?.classList.remove('chat-open');
  renderReplyBanner();
  setDetailsOpen(false);
  renderCurrentChatHeader();
  if (toastMessage) toast(toastMessage, 'info');
}

function syncCurrentChatFromList(chats, options = {}) {
  if (!state.currentChat) return null;
  const current = chats.find((item) => item.id === state.currentChat.id);
  if (current) {
    state.currentChat = current;
    return current;
  }
  if (options.clearIfMissing !== false) {
    resetCurrentChatState({ toastMessage: options.toastMessage || '' });
  }
  return null;
}

function renderMe() {
  if (!state.user) return;
  els.meName.textContent = state.user.name;
  els.meUsername.textContent = `@${state.user.username}`;
  applyAvatar(els.profileOpen, state.user.name, state.user.avatarDataUrl);
  renderSettingsOverview();
}

function getSpecialMessageKind(message) {
  if (message?.meta?.poll) return 'poll';
  if (message?.meta?.location) return 'location';
  if (message?.meta?.walletCard) return 'wallet';
  return '';
}

function clonePollMeta(poll = {}, { keepVotes = false } = {}) {
  const options = Array.isArray(poll.options)
    ? poll.options
      .map((option, index) => {
        const text = String(option?.text || '').trim();
        if (!text) return null;
        return {
          id: String(option?.id || `option-${index + 1}`),
          text,
          voterIds: keepVotes ? [...new Set((option?.voterIds || []).map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0))] : [],
        };
      })
      .filter(Boolean)
    : [];
  if (!String(poll.question || '').trim() || options.length < 2) return null;
  return {
    question: String(poll.question || '').trim(),
    multiple: Boolean(poll.multiple),
    closed: Boolean(poll.closed),
    options,
  };
}

function cloneLocationMeta(location = {}) {
  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    label: String(location.label || '').trim(),
    note: String(location.note || '').trim(),
    latitude,
    longitude,
  };
}

function cloneWalletCardMeta(walletCard = {}) {
  const amount = Number(walletCard.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return {
    title: String(walletCard.title || '').trim(),
    note: String(walletCard.note || '').trim(),
    recipient: String(walletCard.recipient || '').trim(),
    amount,
    currency: String(walletCard.currency || 'RUB').trim().toUpperCase(),
  };
}

function buildForwardMeta(sourceMessage) {
  const forwardedFrom = {
    name: sourceMessage.sender?.name || state.user.name,
    chatTitle: state.currentChat?.title || 'Чат',
  };
  const meta = { forwardedFrom };
  const kind = getSpecialMessageKind(sourceMessage);
  if (kind === 'poll') {
    meta.poll = clonePollMeta(sourceMessage.meta.poll, { keepVotes: false });
  } else if (kind === 'location') {
    meta.location = cloneLocationMeta(sourceMessage.meta.location);
  } else if (kind === 'wallet') {
    meta.walletCard = cloneWalletCardMeta(sourceMessage.meta.walletCard);
  }
  return meta;
}

function formatCurrencyAmount(amount, currency = 'RUB') {
  try {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: String(currency || 'RUB').toUpperCase(),
      maximumFractionDigits: 2,
    }).format(Number(amount || 0));
  } catch {
    return `${Number(amount || 0).toFixed(2)} ${String(currency || 'RUB').toUpperCase()}`;
  }
}

function getMessageSummaryText(message) {
  if (!message) return 'Сообщение';
  const kind = getSpecialMessageKind(message);
  if (kind === 'poll') return `Опрос: ${message.meta.poll.question}`;
  if (kind === 'location') return `Геопозиция${message.meta.location.label ? `: ${message.meta.location.label}` : ''}`;
  if (kind === 'wallet') return `Счёт: ${message.meta.walletCard.title}`;
  if (message.messageType === 'system') return message.systemText || 'Сообщение';
  if (message.messageType === 'file') {
    if (message.meta?.voice) return 'Голосовое сообщение';
    if (message.meta?.videoNote) return 'Кружок';
    if (message.meta?.sticker) return 'Стикер';
    return 'Файл';
  }
  if (message.messageType === 'text') return 'Зашифрованное сообщение';
  return 'Сообщение';
}

function lastMessagePreview(lastMessage) {
  if (!lastMessage) return 'Нет сообщений';
  return getMessageSummaryText(lastMessage);
}

async function renderChats() {
  const filter = state.filter.trim().toLowerCase();
  const filtered = state.chats.filter((chat) => !filter || chat.title.toLowerCase().includes(filter) || (chat.participants || []).some((p) => p.username.toLowerCase().includes(filter) || p.name.toLowerCase().includes(filter)));
  els.chatEmpty.classList.toggle('hidden', filtered.length > 0);
  const sidebarTitle = els.chatEmpty?.querySelector('h3');
  const sidebarText = els.chatEmpty?.querySelector('p');
  const showDirectSearch = filter.length >= 2;
  if (sidebarTitle) sidebarTitle.textContent = showDirectSearch ? 'Ничего не найдено' : 'Чатов пока нет';
  if (sidebarText) {
    sidebarText.textContent = showDirectSearch
      ? 'Такого чата нет в списке. Можно сразу найти пользователя и открыть новый личный диалог.'
      : 'Ищи диалоги через строку поиска. Для группы и канала меню останется слева.';
  }
  if (els.searchNewChat) {
    els.searchNewChat.classList.toggle('hidden', !showDirectSearch);
    els.searchNewChat.textContent = showDirectSearch ? `Найти "${state.filter.trim()}"` : 'Найти пользователя';
  }
  if (!filtered.length) {
    els.chatList.innerHTML = '';
    return;
  }
  els.chatList.innerHTML = filtered.map((chat) => {
    const directParticipant = chat.type === 'direct' ? chat.participants.find((item) => item.id !== state.user.id) : null;
    const unread = chat.unreadCount ? `<div class="unread-badge">${chat.unreadCount}</div>` : '';
    const onlineDot = directParticipant ? `<div class="status-dot ${directParticipant.online ? '' : 'offline'}"></div>` : '';
    const kindBadge = chat.subtype === 'channel' ? '<span class="channel-badge chat-kind-badge">Канал</span>' : '';
    const mutedBadge = isChatMuted(chat.id) ? '<span class="chat-muted-badge" title="Без звука">🔕</span>' : '';
    return `
      <button class="chat-item ${state.currentChat?.id === chat.id ? 'active' : ''}" data-chat-id="${chat.id}">
        <div class="avatar-chip" data-chat-avatar="${chat.id}"></div>
        <div>
          <div class="chat-item-title">
            <strong>${escapeHtml(chat.title)}</strong>${kindBadge}${mutedBadge}
            ${onlineDot}
          </div>
          <div class="chat-preview">${escapeHtml(lastMessagePreview(chat.lastMessage))}</div>
        </div>
        <div class="chat-meta">
          <div class="chat-time">${formatRelativeChatTime(chat.updatedAt)}</div>
          ${unread}
        </div>
      </button>
    `;
  }).join('');
  [...els.chatList.querySelectorAll('[data-chat-id]')].forEach((button) => {
    button.addEventListener('click', async () => {
      await selectChat(Number(button.dataset.chatId));
    });
  });
  filtered.forEach((chat) => {
    const el = els.chatList.querySelector(`[data-chat-avatar="${chat.id}"]`);
    if (el) applyAvatar(el, chat.title, chat.avatarDataUrl);
  });
}

async function getMessagePlainText(message, chat = state.currentChat) {
  if (!message || message.messageType !== 'text') return '';
  const chatKey = await getOrLoadChatKey(chat);
  return decryptTextForChat(chatKey, message.ciphertext, message.iv);
}

function normalizeMimeType(value = '') {
  return String(value || '').trim().toLowerCase();
}

function getBaseMimeType(value = '') {
  return normalizeMimeType(value).split(';')[0].trim();
}

function inferMimeTypeFromFileName(fileName = '') {
  const normalized = String(fileName || '').trim().toLowerCase();
  if (!normalized) return '';
  if (normalized.endsWith('.webm')) return normalized.startsWith('voice-') ? 'audio/webm' : 'video/webm';
  if (normalized.endsWith('.ogg') || normalized.endsWith('.oga')) return 'audio/ogg';
  if (normalized.endsWith('.mp3')) return 'audio/mpeg';
  if (normalized.endsWith('.wav')) return 'audio/wav';
  if (normalized.endsWith('.m4a')) return 'audio/mp4';
  if (normalized.endsWith('.mp4')) return 'video/mp4';
  if (normalized.endsWith('.mov')) return 'video/quicktime';
  if (normalized.endsWith('.webp')) return 'image/webp';
  if (normalized.endsWith('.png')) return 'image/png';
  if (normalized.endsWith('.jpg') || normalized.endsWith('.jpeg')) return 'image/jpeg';
  if (normalized.endsWith('.gif')) return 'image/gif';
  if (normalized.endsWith('.pdf')) return 'application/pdf';
  if (normalized.endsWith('.zip')) return 'application/zip';
  if (normalized.endsWith('.txt')) return 'text/plain';
  return '';
}

function resolveAttachmentMime(message, meta = {}, preferredMime = '') {
  const normalizedPreferred = getBaseMimeType(preferredMime);
  const fileName = String(meta.fileName || message.attachment?.fileName || '').trim().toLowerCase();
  const normalizedMetaMime = getBaseMimeType(meta.mimeType);
  const normalizedAttachmentMime = getBaseMimeType(message.attachment?.mimeType);
  const inferredMime = inferMimeTypeFromFileName(fileName);
  if (meta.videoNote || message.meta?.videoNote || fileName.startsWith('circle-')) {
    return (normalizedMetaMime.startsWith('video/') ? normalizedMetaMime : '')
      || (normalizedAttachmentMime.startsWith('video/') ? normalizedAttachmentMime : '')
      || normalizedPreferred
      || inferredMime
      || 'video/webm';
  }
  if (meta.isVoice || message.meta?.voice || fileName.startsWith('voice-')) {
    return (normalizedMetaMime.startsWith('audio/') ? normalizedMetaMime : '')
      || (normalizedAttachmentMime.startsWith('audio/') ? normalizedAttachmentMime : '')
      || normalizedPreferred
      || inferredMime
      || 'audio/webm';
  }
  if (meta.sticker || message.meta?.sticker) {
    return (normalizedMetaMime.startsWith('image/') ? normalizedMetaMime : '')
      || (normalizedAttachmentMime.startsWith('image/') ? normalizedAttachmentMime : '')
      || inferredMime
      || normalizedPreferred
      || 'image/webp';
  }
  if (normalizedMetaMime.startsWith('image/') || normalizedAttachmentMime.startsWith('image/')) {
    return normalizedMetaMime || normalizedAttachmentMime || inferredMime || normalizedPreferred || 'image/png';
  }
  return normalizedMetaMime || normalizedAttachmentMime || inferredMime || normalizedPreferred || 'application/octet-stream';
}

async function getReplyPreviewHtml(message) {
  const replyId = message.meta?.replyToMessageId;
  if (!replyId) return '';
  const source = state.currentMessages.find((item) => item.id === replyId);
  if (!source) return '';
  let previewText = getMessageSummaryText(source);
  if (source.messageType === 'text' && !getSpecialMessageKind(source)) {
    previewText = (await getMessagePlainText(source)).slice(0, 100) || 'Сообщение';
  }
  const title = source.sender?.name || (source.isOwn ? 'Ты' : 'Сообщение');
  return `
    <div class="reply-preview">
      <span class="reply-preview-title">${escapeHtml(title)}</span>
      <span>${escapeHtml(previewText)}</span>
    </div>
  `;
}

async function getVoiceUrl(message, mimeTypeHint = '') {
  const attachmentId = message.attachment?.id;
  if (!attachmentId) return null;
  const resolvedMime = resolveAttachmentMime(message, message.meta || {}, mimeTypeHint);
  const cacheKey = `${attachmentId}:${resolvedMime}`;
  if (state.voiceUrls.has(cacheKey)) return state.voiceUrls.get(cacheKey);
  const chatKey = await getOrLoadChatKey(state.currentChat);
  const response = await fetch(message.attachment.downloadUrl, { headers: { Authorization: `Bearer ${state.token}` } });
  if (!response.ok) throw new Error('Не удалось скачать голосовое сообщение.');
  const encryptedBlob = await response.blob();
  const decryptedBlob = await decryptDownloadedBlob(chatKey, encryptedBlob, message.attachment.blobIv, resolvedMime);
  const url = URL.createObjectURL(decryptedBlob);
  state.voiceUrls.set(cacheKey, url);
  return url;
}


function replaceCustomEmojiShortcodes(escapedText) {
  let html = escapedText;
  for (const item of state.customEmojiPack) {
    const shortcode = sanitizeCustomShortcode(item.shortcode);
    if (!shortcode) continue;
    const token = `:${shortcode}:`;
    if (item.type === 'unicode') {
      html = html.split(token).join(item.value);
    } else if (item.type === 'image' && item.dataUrl) {
      html = html.split(token).join(`<img class="inline-custom-emoji" data-emoji-pack-id="${escapeHtml(item.packId || 'my-emoji-pack')}" data-emoji-pack-title="${escapeHtml(item.packTitle || 'Emoji pack')}" src="${escapeHtml(item.dataUrl)}" alt=":${shortcode}:" />`);
    }
  }
  return html;
}

function renderMessageTextHtml(text) {
  const value = String(text || '');
  if (value.startsWith(GIF_PREFIX)) {
    const gifUrl = sanitizeGifUrl(value.slice(GIF_PREFIX.length));
    if (gifUrl) {
      return `<div class="gif-message"><img src="${escapeHtml(gifUrl)}" alt="GIF" loading="lazy" /></div>`;
    }
  }
  const escaped = escapeHtml(value).replace(/\n/g, '<br>');
  return `<div class="message-content">${replaceCustomEmojiShortcodes(escaped)}</div>`;
}

function getPollTotalVotes(poll = {}) {
  return (poll.options || []).reduce((sum, option) => sum + (option.voterIds?.length || 0), 0);
}

function buildLocationUrl(location = {}) {
  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return '#';
  return `https://maps.google.com/?q=${latitude},${longitude}`;
}

function renderPollMessageHtml(message) {
  const poll = clonePollMeta(message.meta?.poll, { keepVotes: true });
  if (!poll) return '';
  const totalVotes = getPollTotalVotes(poll);
  const optionsHtml = poll.options.map((option) => {
    const own = option.voterIds.includes(state.user?.id);
    const count = option.voterIds.length;
    const percent = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
    return `
      <button type="button" class="poll-option${own ? ' own' : ''}" data-poll-vote="${message.id}" data-poll-option="${escapeHtml(option.id)}">
        <span class="poll-option-bar" style="width:${percent}%"></span>
        <span class="poll-option-label">${escapeHtml(option.text)}</span>
        <span class="poll-option-meta">${count} · ${percent}%</span>
      </button>
    `;
  }).join('');
  return `
    <div class="message-special-card poll-card">
      <div class="special-card-badge">Опрос</div>
      <strong>${escapeHtml(poll.question)}</strong>
      <div class="poll-options">${optionsHtml}</div>
      <div class="special-card-foot">${totalVotes} голос${totalVotes === 1 ? '' : totalVotes >= 2 && totalVotes <= 4 ? 'а' : 'ов'}${poll.multiple ? ' · можно выбрать несколько вариантов' : ''}</div>
    </div>
  `;
}

function renderLocationMessageHtml(message) {
  const location = cloneLocationMeta(message.meta?.location);
  if (!location) return '';
  return `
    <div class="message-special-card location-card">
      <div class="special-card-badge">Геопозиция</div>
      <strong>${escapeHtml(location.label || 'Точка на карте')}</strong>
      <div class="special-card-text">${escapeHtml(location.note || `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`)}</div>
      <div class="special-card-foot">${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}</div>
      <a class="secondary-button small" href="${escapeHtml(buildLocationUrl(location))}" target="_blank" rel="noreferrer">Открыть карту</a>
    </div>
  `;
}

function renderWalletMessageHtml(message) {
  const walletCard = cloneWalletCardMeta(message.meta?.walletCard);
  if (!walletCard) return '';
  return `
    <div class="message-special-card wallet-card" data-wallet-card="${message.id}">
      <div class="special-card-badge">Счёт</div>
      <strong>${escapeHtml(walletCard.title)}</strong>
      <div class="wallet-amount">${escapeHtml(formatCurrencyAmount(walletCard.amount, walletCard.currency))}</div>
      <div class="special-card-text">${escapeHtml(walletCard.note || 'Перевод или запрос оплаты.')}</div>
      <div class="special-card-foot">${escapeHtml(walletCard.recipient || message.sender?.name || '')}</div>
      <button type="button" class="secondary-button small" data-wallet-copy="${message.id}">Скопировать реквизиты</button>
    </div>
  `;
}

function renderSpecialMessageHtml(message) {
  const kind = getSpecialMessageKind(message);
  if (kind === 'poll') return renderPollMessageHtml(message);
  if (kind === 'location') return renderLocationMessageHtml(message);
  if (kind === 'wallet') return renderWalletMessageHtml(message);
  return '';
}

async function voteOnPoll(messageId, optionId) {
  if (!state.currentChat || !messageId || !optionId) return;
  try {
    await apiFetch(`/api/chats/${state.currentChat.id}/messages/${messageId}/poll-vote`, {
      method: 'POST',
      body: JSON.stringify({ optionId }),
    });
  } catch (error) {
    if (/чат/i.test(error.message) && /найден/i.test(error.message)) {
      resetCurrentChatState({ toastMessage: 'Чат больше недоступен. Список обновлён.' });
      try {
        await refreshChatsFromApi({ suppressErrors: true });
      } catch {}
      return;
    }
    toast(error.message, 'error');
  }
}


function wireVoicePlayers() {
  const players = [...els.messageList.querySelectorAll('[data-voice-audio]')];
  players.forEach((audio) => {
    const messageId = audio.dataset.voiceAudio;
    const wrapper = els.messageList.querySelector(`[data-voice-note="${messageId}"]`);
    const toggle = els.messageList.querySelector(`[data-voice-toggle="${messageId}"]`);
    const progress = els.messageList.querySelector(`[data-voice-progress="${messageId}"]`);
    const timeLabel = els.messageList.querySelector(`[data-voice-time="${messageId}"]`);
    if (!wrapper || !toggle || !progress || !timeLabel) return;

    const updateUi = () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      const current = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
      const remainingMs = Math.max(0, (duration - current) * 1000);
      timeLabel.textContent = formatDuration(remainingMs || duration * 1000);
      progress.style.width = `${duration ? (current / duration) * 100 : 0}%`;
    };

    toggle.addEventListener('click', () => {
      players.forEach((other) => {
        if (other !== audio) {
          other.pause();
          const otherWrap = els.messageList.querySelector(`[data-voice-note="${other.dataset.voiceAudio}"]`);
          const otherToggle = els.messageList.querySelector(`[data-voice-toggle="${other.dataset.voiceAudio}"]`);
          if (otherWrap) otherWrap.classList.remove('playing');
          if (otherToggle) otherToggle.textContent = '▶';
        }
      });
      if (audio.paused) {
        audio.play();
      } else {
        audio.pause();
      }
    });

    audio.addEventListener('play', () => {
      wrapper.classList.add('playing');
      toggle.textContent = '❚❚';
      updateUi();
    });
    audio.addEventListener('pause', () => {
      wrapper.classList.remove('playing');
      toggle.textContent = '▶';
      updateUi();
    });
    audio.addEventListener('timeupdate', updateUi);
    audio.addEventListener('loadedmetadata', updateUi);
    audio.addEventListener('ended', () => {
      wrapper.classList.remove('playing');
      toggle.textContent = '▶';
      progress.style.width = '0%';
      timeLabel.textContent = formatDuration(audio.duration * 1000);
    });
  });
}


async function downloadAttachment(message) {
  try {
    const chatKey = await getOrLoadChatKey(state.currentChat);
    const meta = await decryptAttachmentMeta(chatKey, message.attachment);
    const response = await fetch(message.attachment.downloadUrl, { headers: { Authorization: `Bearer ${state.token}` } });
    if (!response.ok) throw new Error('Не удалось скачать файл.');
    const encryptedBlob = await response.blob();
    const decryptedBlob = await decryptDownloadedBlob(chatKey, encryptedBlob, message.attachment.blobIv, resolveAttachmentMime(message, meta));
    const url = URL.createObjectURL(decryptedBlob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = meta.fileName || 'download';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch (error) {
    if (/чат/i.test(error.message) && /найден/i.test(error.message)) {
      resetCurrentChatState({ toastMessage: 'Чат больше недоступен. Список обновлён.' });
      try {
        await refreshChatsFromApi({ suppressErrors: true });
      } catch {}
      return;
    }
    toast(error.message, 'error');
  }
}

function setMenuOpen(value) {
  state.menuOpen = value;
  els.menuDrawer.classList.toggle('open', value);
  els.menuDrawerOverlay.classList.toggle('hidden', !value);
}

function setDetailsOpen(value) {
  state.detailsOpen = value;
  els.detailsPanel.classList.toggle('open', value);
  els.detailsOverlay.classList.toggle('hidden', !value);
}

function resetDetailsScroll() {
  if (els.detailsPanel) els.detailsPanel.scrollTop = 0;
  if (els.detailsContent) {
    els.detailsContent.scrollTop = 0;
    requestAnimationFrame(() => {
      if (els.detailsPanel) els.detailsPanel.scrollTop = 0;
      if (els.detailsContent) els.detailsContent.scrollTop = 0;
    });
  }
}

function openChatDetails() {
  if (!state.currentChat) return;
  state.detailsTarget = { type: 'chat', chatId: state.currentChat.id };
  resetDetailsScroll();
  renderDetails();
  setDetailsOpen(true);
  resetDetailsScroll();
}

function openUserDetails(userId) {
  if (!state.currentChat) return;
  const participant = state.currentChat.participants.find((item) => item.id === userId);
  if (!participant) return;
  state.detailsTarget = { type: 'user', userId };
  resetDetailsScroll();
  renderDetails();
  setDetailsOpen(true);
  resetDetailsScroll();
}

function getDetailsShareText() {
  if (!state.currentChat) return '';
  if (state.detailsTarget?.type === 'user') {
    const participant = state.currentChat.participants.find((item) => item.id === state.detailsTarget.userId);
    if (!participant) return '';
    return `Контакт ${participant.name}\n@${participant.username || ''}`;
  }
  const directPeer = state.currentChat.participants?.find((item) => item.id !== state.user?.id);
  if (state.currentChat.subtype === 'channel') {
    return `Канал ${state.currentChat.title}\n${els.detailsHandle?.textContent || ''}`;
  }
  if (state.currentChat.type === 'group') {
    return `Группа ${state.currentChat.title}\n${els.detailsHandle?.textContent || ''}`;
  }
  return `Контакт ${directPeer?.name || state.currentChat.title}\n@${directPeer?.username || ''}`;
}

function buildDetailsStats() {
  const stats = { gifts: 0, photos: 0, files: 0, links: 0, voices: 0 };
  for (const message of state.currentMessages) {
    if (message.messageType === 'text') {
      const cached = state.decryptedTextCache.get(message.id) || '';
      const matches = String(cached).match(/https?:\/\//g);
      if (matches) stats.links += matches.length;
    }
    if (message.messageType === 'file') {
      if (message.meta?.voice) stats.voices += 1;
      else if (message.meta?.videoNote) stats.files += 1;
      else if ((message.attachment?.mimeType || '').startsWith('image/')) stats.photos += 1;
      else stats.files += 1;
      if (message.meta?.sticker) stats.gifts += 1;
    }
  }
  return stats;
}


function renderParticipants() {
  if (!state.currentChat) return;
  els.participantList.innerHTML = state.currentChat.participants.map((participant) => `
    <div class="participant-item">
      <div class="avatar-chip" data-participant-avatar="${participant.id}"></div>
      <button type="button" class="participant-meta ghost-button" data-open-user="${participant.id}">
        <strong>${escapeHtml(participant.name)}</strong>
        <span class="muted-line">@${escapeHtml(participant.username)}</span>
      </button>
      <div class="role-chip">${participant.role === 'owner' ? 'owner' : state.currentChat?.subtype === 'channel' ? 'subscriber' : participant.online ? 'online' : 'offline'}</div>
      ${state.currentChat.currentUserRole === 'owner' && participant.id !== state.user.id ? `<button type="button" class="ghost-button small" data-remove-user="${participant.id}">Удалить</button>` : ''}
    </div>
  `).join('');
  state.currentChat.participants.forEach((participant) => {
    const el = els.participantList.querySelector(`[data-participant-avatar="${participant.id}"]`);
    if (el) applyAvatar(el, participant.name, participant.avatarDataUrl);
  });
  [...els.participantList.querySelectorAll('[data-open-user]')].forEach((button) => {
    button.addEventListener('click', () => openUserDetails(Number(button.dataset.openUser)));
  });
  [...els.participantList.querySelectorAll('[data-remove-user]')].forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        await apiFetch(`/api/chats/${state.currentChat.id}/group/members/${button.dataset.removeUser}`, { method: 'DELETE' });
        toast('Участник удалён.', 'success');
        await selectChat(state.currentChat.id, { preserveMobile: true });
      } catch (error) {
        toast(error.message, 'error');
      }
    });
  });
}

function renderReplyBanner() {
  if (state.editingMessageId) {
    const message = state.currentMessages.find((item) => item.id === state.editingMessageId);
    els.replyBanner.classList.remove('hidden');
    els.replyBannerTitle.textContent = 'Редактирование';
    els.replyBannerText.textContent = message ? 'Изменяешь своё сообщение' : 'Редактирование сообщения';
    return;
  }
  if (!state.replyToMessageId) {
    els.replyBanner.classList.add('hidden');
    return;
  }
  const message = state.currentMessages.find((item) => item.id === state.replyToMessageId);
  if (!message) {
    state.replyToMessageId = null;
    els.replyBanner.classList.add('hidden');
    return;
  }
  els.replyBanner.classList.remove('hidden');
  els.replyBannerTitle.textContent = `Ответ ${message.sender?.name || 'на сообщение'}`;
  els.replyBannerText.textContent = getMessageSummaryText(message);
}

function renderCurrentChatHeader() {
  if (!state.currentChat) {
    applyAvatar(els.currentChatAvatar, BRAND_NAME, '');
    els.currentChatTitle.textContent = 'Выбери чат';
    els.currentChatSubtitle.textContent = 'Открой диалог из списка';
    els.headerAudioCall?.classList.add('hidden');
    els.headerVideoCall?.classList.add('hidden');
    if (els.detailsToggle) els.detailsToggle.disabled = true;
    updateComposerAvailability();
    if (els.composerInput) els.composerInput.placeholder = 'Сначала выбери чат';
    return;
  }
  const isChannelChat = state.currentChat.subtype === 'channel';
  applyAvatar(els.currentChatAvatar, state.currentChat.title, state.currentChat.avatarDataUrl);
  els.currentChatTitle.textContent = state.currentChat.title;
  resetDetailsScroll();

  if (state.currentChat.type === 'group' || isChannelChat) {
    els.currentChatSubtitle.textContent = state.currentChat.subtype === 'channel' ? `${state.currentChat.participants.length} подписчиков` : `${state.currentChat.participants.length} участников`;
  } else {
    const peer = state.currentChat.participants.find((item) => item.id !== state.user.id);
    els.currentChatSubtitle.textContent = peer?.online ? 'онлайн' : `@${peer?.username || ''}`;
  }
  els.headerAudioCall?.classList.toggle('hidden', isChannelChat);
  els.headerVideoCall?.classList.toggle('hidden', isChannelChat);
  els.detailsToggle.disabled = false;
  updateComposerAvailability();
}

function updateComposerAvailability() {
  const noChatSelected = !state.currentChat;
  const blocked = !!(state.currentChat && state.currentChat.subtype === 'channel' && state.currentChat.currentUserRole !== 'owner');
  const disabled = noChatSelected || blocked || state.pendingMessage;
  let placeholder = 'Сообщение';
  if (noChatSelected) placeholder = 'Сначала выбери чат';
  else if (blocked) placeholder = 'Это канал: публиковать может только владелец';
  els.composerInput.disabled = disabled;
  els.attachButton.disabled = disabled;
  if (els.videoNoteButton) els.videoNoteButton.disabled = disabled;
  els.voiceButton.disabled = disabled;
  els.mediaPanelToggle.disabled = disabled;
  els.sendButton.disabled = disabled;
  els.composerInput.placeholder = placeholder;
  els.composerInput.placeholder = blocked ? 'Это канал: публиковать может только владелец' : 'Сообщение';
}

async function selectChat(chatId, options = {}) {
  try {
    closeMessageMenu();
    const { chat, messages } = await apiFetch(`/api/chats/${chatId}/messages`);
    state.currentChat = chat;
    state.currentMessages = messages;
    state.replyToMessageId = null;
    state.editingMessageId = null;
    state.forwardMessageId = null;
    renderReplyBanner();
    els.chatPlaceholder.classList.add('hidden');
    els.chatPanel.classList.remove('hidden');
    renderCurrentChatHeader();
    if (els.typingIndicator) els.typingIndicator.classList.add('hidden');
    await renderMessages();
    renderDetails();
    await markChatRead();
    await refreshChatsFromApi({ suppressErrors: true });
    if (!options.preserveMobile) document.querySelector('.app-shell')?.classList.add('chat-open');
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function markChatRead() {
  if (!state.currentChat) return;
  const incoming = [...state.currentMessages].reverse().find((message) => !message.isOwn && message.messageType !== 'system');
  if (!incoming) return;
  try {
    await apiFetch(`/api/chats/${state.currentChat.id}/read`, { method: 'POST', body: JSON.stringify({ messageId: incoming.id }) });
  } catch {}
}

async function refreshChatsFromApi(options = {}) {
  try {
    const { chats } = await apiFetch('/api/chats');
    state.chats = chats;
    syncCurrentChatFromList(chats, options);
    await renderChats();
    renderCurrentChatHeader();
    if (state.detailsOpen && state.currentChat) renderDetails();
  } catch (error) {
    if (!options.suppressErrors) toast(error.message, 'error');
    throw error;
  }
}

async function searchUsers(query) {
  const q = String(query || '').trim();
  els.searchResults.innerHTML = '';
  if (!q) return;
  try {
    const { users } = await apiFetch(`/api/users/search?q=${encodeURIComponent(q)}`);
    els.searchResults.innerHTML = users.map((user) => `
      <div class="search-item">
        <div class="avatar-chip" data-search-avatar="${user.id}"></div>
        <div class="participant-meta">
          <strong>${escapeHtml(user.name)}</strong>
          <span class="muted-line">@${escapeHtml(user.username)}</span>
        </div>
        <button type="button" class="secondary-button small" data-select-user="${user.id}">Выбрать</button>
      </div>
    `).join('');
    users.forEach((user) => {
      const el = els.searchResults.querySelector(`[data-search-avatar="${user.id}"]`);
      if (el) applyAvatar(el, user.name, user.avatarDataUrl);
    });
    [...els.searchResults.querySelectorAll('[data-select-user]')].forEach((button) => {
      button.addEventListener('click', () => {
        const user = users.find((item) => item.id === Number(button.dataset.selectUser));
        if (!user) return;
        if (state.modalMode === 'direct') state.selectedUsers.clear();
        state.selectedUsers.set(user.id, user);
        setModalError('');
        renderSelectedUsers();
      });
    });
  } catch (error) {
    toast(error.message, 'error');
  }
}

function updateSearchModalState() {
  const selected = [...state.selectedUsers.values()];
  els.selectedCounter.textContent = `${selected.length} ${selected.length === 1 ? 'пользователь' : selected.length >= 2 && selected.length <= 4 ? 'пользователя' : 'пользователей'}`;
  if (!selected.length) {
    els.selectionHint.textContent = ['group','channel'].includes(state.modalMode) ? 'Нужно выбрать участников' : 'Выбор пуст';
  } else if (['group','channel'].includes(state.modalMode)) {
    els.selectionHint.textContent = `Ты + ${selected.length}`;
  } else {
    els.selectionHint.textContent = selected[0].username ? `@${selected[0].username}` : `${selected.length} выбрано`;
  }
  els.searchModalHelper.textContent = state.modalMode === 'group'
    ? 'Найди участников по username. Группа создаётся минимум с одним человеком помимо тебя.'
    : state.modalMode === 'channel'
      ? 'Канал можно создать сразу, а подписчиков добавить позже.'
      : state.modalMode === 'add-members'
        ? 'Выбери пользователей, которых нужно добавить в группу или канал.'
        : 'Найди пользователя по username и создай личный чат.';
}

function setModalError(text) {
  els.searchModalError.textContent = text;
  els.searchModalError.classList.toggle('hidden', !text);
}

function renderSelectedUsers() {
  const selected = [...state.selectedUsers.values()];
  els.selectedUsers.innerHTML = selected.map((user) => `
    <div class="selected-chip">
      <div class="participant-meta">
        <strong>${escapeHtml(user.name)}</strong>
        <span class="muted-line">@${escapeHtml(user.username)}</span>
      </div>
      <button type="button" class="ghost-button small" data-unselect-user="${user.id}">Убрать</button>
    </div>
  `).join('');
  [...els.selectedUsers.querySelectorAll('[data-unselect-user]')].forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedUsers.delete(Number(button.dataset.unselectUser));
      renderSelectedUsers();
    });
  });
  updateSearchModalState();
}

function openSearchModal(mode) {
  state.modalMode = mode;
  state.selectedUsers.clear();
  renderSelectedUsers();
  els.searchUsersInput.value = '';
  els.searchResults.innerHTML = '';
  els.newGroupTitle.value = '';
  state.groupAvatarDataUrl = '';
  setModalError('');
  els.groupTitleField.classList.toggle('hidden', !['group','channel'].includes(mode));
  if (els.newChatTitleLabel) els.newChatTitleLabel.textContent = mode === 'channel' ? 'Название канала' : 'Название группы';
  if (els.newGroupTitle) els.newGroupTitle.placeholder = mode === 'channel' ? 'Новый канал' : 'Новая группа';
  els.searchModalTitle.textContent = mode === 'direct' ? 'Новый личный чат' : mode === 'group' ? 'Новая группа' : mode === 'channel' ? 'Новый канал' : 'Добавить участников';
  els.modalSubmit.textContent = mode === 'direct' ? 'Создать чат' : mode === 'group' ? 'Создать группу' : mode === 'channel' ? 'Создать канал' : 'Добавить';
  updateSearchModalState();
  els.searchModal.showModal();
  els.searchUsersInput.focus();
}

async function openDirectSearchFromSidebar(query = '') {
  const value = String(query || '').trim();
  setMenuOpen(false);
  openSearchModal('direct');
  els.searchUsersInput.value = value;
  if (value) {
    await searchUsers(value);
  }
}

async function submitSearchModal() {
  const selected = [...state.selectedUsers.values()];
  if (state.modalMode === 'direct') {
    if (selected.length !== 1) {
      setModalError('Выбери одного пользователя.');
      return;
    }
    try {
      const participants = [{ id: state.user.id, publicKey: state.user.publicKey }, selected[0]];
      const { wrappedKeys } = await generateChatKeyPackage(participants);
      const { chat } = await apiFetch('/api/chats/direct', {
        method: 'POST',
        body: JSON.stringify({ participantId: selected[0].id, wrappedKeys }),
      });
      els.searchModal.close();
      await refreshChatsFromApi();
      await selectChat(chat.id);
    } catch (error) {
      toast(error.message, 'error');
    }
    return;
  }
  if (state.modalMode === 'group' || state.modalMode === 'channel') {
    if (state.modalMode === 'group' && selected.length < 1) {
      setModalError('В группе должно быть минимум 2 участника: ты и ещё 1 человек.');
      return;
    }
    const title = els.newGroupTitle.value.trim();
    if (title.length < 2) {
      setModalError(state.modalMode === 'channel' ? 'Укажи название канала минимум из 2 символов.' : 'Укажи название группы минимум из 2 символов.');
      return;
    }
    try {
      const participants = [{ id: state.user.id, publicKey: state.user.publicKey }, ...selected];
      const { wrappedKeys } = await generateChatKeyPackage(participants);
      const endpoint = state.modalMode === 'channel' ? '/api/chats/channel' : '/api/chats/group';
      const { chat } = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({ title, memberIds: selected.map((user) => user.id), wrappedKeys, avatarDataUrl: state.groupAvatarDataUrl || '' }),
      });
      els.searchModal.close();
      await refreshChatsFromApi();
      await selectChat(chat.id);
    } catch (error) {
      toast(error.message, 'error');
    }
    return;
  }
  if (state.modalMode === 'add-members') {
    if (!state.currentChat || !selected.length) {
      setModalError('Выбери хотя бы одного пользователя.');
      return;
    }
    try {
      const chatKey = await getOrLoadChatKey(state.currentChat);
      const wrappedKeys = await wrapExistingChatKeyForUsers(chatKey, selected);
      await apiFetch(`/api/chats/${state.currentChat.id}/group/members`, {
        method: 'POST',
        body: JSON.stringify({ userIds: selected.map((user) => user.id), wrappedKeys }),
      });
      els.searchModal.close();
      toast('Участники добавлены.', 'success');
      await selectChat(state.currentChat.id, { preserveMobile: true });
    } catch (error) {
      toast(error.message, 'error');
    }
  }
}


function setMediaPanelOpen(value) {
  state.mediaPanelOpen = value;
  if (value) renderMediaPanel();
  els.mediaPanel.classList.toggle('open', value);
  els.mediaPanelOverlay.classList.toggle('hidden', !value);
}

function setMediaTab(tab) {
  state.mediaTab = tab;
  ensureActivePack(tab);
  els.mediaTabButtons.forEach((button) => button.classList.toggle('active', button.dataset.mediaTab === tab));
  renderMediaPanel();
}

function setSettingsSection(section) {
  state.settingsSection = section;
  els.settingsNavButtons.forEach((button) => button.classList.toggle('active', button.dataset.settingsSection === section));
  document.querySelectorAll('[data-settings-content]').forEach((sectionNode) => {
    sectionNode.classList.toggle('active', sectionNode.dataset.settingsContent === section);
  });
}


async function refreshSettingsOverview() {
  if (!state.user) return;
  try {
    state.settingsOverview = await apiFetch('/api/settings/overview');
    renderSettingsOverview();
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function openSettingsModal(section = 'profile') {
  setMenuOpen(false);
  setSettingsSection(section);
  renderSettingsOverview();
  await refreshSettingsOverview();
  els.settingsModal.showModal();
}

function getFilteredPackItems(tab) {
  ensureActivePack(tab);
  const activePack = state.activePackByTab[tab];
  return getPackItems(tab).filter((item) => (item.packId || `default-${tab}`) === activePack);
}

function getPackMeta(tab, packId) {
  return getPackList(tab).find((pack) => pack.id === packId) || { id: packId, title: PACK_PREVIEW_LABELS[tab] || 'Пак' };
}

function resolveWritablePack(tab) {
  const activePackId = state.activePackByTab[tab];
  const activePack = getPackMeta(tab, activePackId);
  if (activePackId && !String(activePackId).startsWith('default-') && !String(activePackId).startsWith('premium-')) {
    return activePack;
  }
  const fallbackId = tab === 'emoji' ? 'my-emoji-pack' : 'my-stickers-pack';
  const fallbackTitle = tab === 'emoji' ? 'Приватные' : 'Мои стикеры';
  return { id: fallbackId, title: fallbackTitle };
}

function renderPackStrip() {
  if (!els.mediaPackStrip) return;
  const packs = getPackList(state.mediaTab);
  if (!packs.length) {
    els.mediaPackStrip.innerHTML = '';
    return;
  }
  ensureActivePack(state.mediaTab);
  els.mediaPackStrip.innerHTML = packs.map((pack) => `
    <button type="button" class="media-pack-chip ${state.activePackByTab[state.mediaTab] === pack.id ? 'active' : ''}" data-pack-id="${escapeHtml(pack.id)}">${escapeHtml(pack.title)}</button>
  `).join('');
  [...els.mediaPackStrip.querySelectorAll('[data-pack-id]')].forEach((button) => {
    button.addEventListener('click', () => setActivePack(state.mediaTab, button.dataset.packId));
  });
}

function renderEmojiTab() {
  const catalog = getFilteredPackItems('emoji').filter((item) => !item.placeholder);
  if (!catalog.length) {
    return `<div class="media-actions-row"><button type="button" class="secondary-button small" data-media-action="add-custom-emoji-text">Новый emoji</button><button type="button" class="secondary-button small" data-media-action="add-custom-emoji-image">Emoji-изображение</button></div><div class="media-empty">Пак создан. Добавь в него emoji.</div>`;
  }
  return `
    <div class="media-actions-row">
      <button type="button" class="secondary-button small" data-media-action="add-custom-emoji-text">Новый emoji</button>
      <button type="button" class="secondary-button small" data-media-action="add-custom-emoji-image">Emoji-изображение</button>
    </div>
    <div class="emoji-grid">
      ${catalog.map((item) => {
        const isImage = item.type === 'image' && item.dataUrl;
        const content = isImage ? `<img src="${escapeHtml(item.dataUrl)}" alt="${escapeHtml(item.shortcode || item.label || 'emoji')}" />` : `${escapeHtml(item.value || '')}`;
        const payload = item.type === 'image' ? `:${sanitizeCustomShortcode(item.shortcode)}:` : (item.value || '');
        return `<button type="button" class="emoji-item ${item.locked ? 'locked' : ''}" data-emoji-value="${escapeHtml(payload)}" data-pack-preview-kind="emoji" data-pack-preview-id="${escapeHtml(item.packId || 'default-emoji')}" data-pack-preview-title="${escapeHtml(item.packTitle || 'Emoji pack')}" ${item.locked ? 'disabled' : ''}>${content}<small>${escapeHtml(item.shortcode || item.label || '')}</small></button>`;
      }).join('')}
    </div>
  `;
}

function renderStickerTab() {
  const catalog = getFilteredPackItems('stickers').filter((item) => !item.placeholder);
  if (!catalog.length) return '<div class="media-empty">Добавь свой первый стикер в пак.</div>';
  return `
    <div class="media-actions-row">
      <button type="button" class="secondary-button small" data-media-action="upload-sticker">Добавить стикер</button>
    </div>
    <div class="sticker-grid">
      ${catalog.map((item) => `<button type="button" class="sticker-item" data-sticker-src="${escapeHtml(item.dataUrl)}" data-sticker-name="${escapeHtml(item.name || 'sticker')}" data-sticker-pack-id="${escapeHtml(item.packId || 'default-stickers')}" data-sticker-pack-title="${escapeHtml(item.packTitle || 'Sticker pack')}"><img src="${escapeHtml(item.dataUrl)}" alt="${escapeHtml(item.name || 'Sticker')}" /><small>${escapeHtml(item.name || 'Sticker')}</small></button>`).join('')}
    </div>
  `;
}

function renderGifTab() {
  const catalog = getFilteredPackItems('gifs');
  return `
    <div class="media-actions-row">
      <button type="button" class="secondary-button small" data-media-action="custom-gif-url">Вставить свой GIF URL</button>
    </div>
    <div class="gif-grid">
      ${catalog.map((item) => `<button type="button" class="gif-item" data-gif-url="${escapeHtml(item.url)}"><img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.label)}" loading="lazy" /><small>${escapeHtml(item.label)}</small></button>`).join('')}
    </div>
  `;
}

function renderMediaPanel() {
  if (!els.mediaPanelBody) return;
  renderPackStrip();
  if (state.mediaTab === 'stickers') {
    els.mediaPanelBody.innerHTML = renderStickerTab();
  } else if (state.mediaTab === 'gifs') {
    els.mediaPanelBody.innerHTML = renderGifTab();
  } else {
    els.mediaPanelBody.innerHTML = renderEmojiTab();
  }

  [...els.mediaPanelBody.querySelectorAll('[data-emoji-value]')].forEach((button) => {
    button.addEventListener('click', () => {
      insertTextAtCursor(button.dataset.emojiValue);
      els.composerInput.focus();
    });
    button.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      openPackPreview(button.dataset.packPreviewKind, button.dataset.packPreviewId, button.dataset.packPreviewTitle);
    });
  });
  [...els.mediaPanelBody.querySelectorAll('[data-sticker-src]')].forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        await sendStickerFromDataUrl(button.dataset.stickerSrc, button.dataset.stickerName || 'sticker', { packId: button.dataset.stickerPackId, packTitle: button.dataset.stickerPackTitle });
        setMediaPanelOpen(false);
      } catch (error) {
        toast(error.message, 'error');
      }
    });
    button.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      openPackPreview('stickers', button.dataset.stickerPackId, button.dataset.stickerPackTitle);
    });
  });
  [...els.mediaPanelBody.querySelectorAll('[data-gif-url]')].forEach((button) => {
    button.addEventListener('click', async () => {
      await sendGifMessage(button.dataset.gifUrl);
      setMediaPanelOpen(false);
    });
  });
  [...els.mediaPanelBody.querySelectorAll('[data-media-action]')].forEach((button) => {
    button.addEventListener('click', async () => {
      const action = button.dataset.mediaAction;
      if (action === 'add-custom-emoji-text') {
        const targetPack = resolveWritablePack('emoji');
        const shortcode = sanitizeCustomShortcode(window.prompt('Короткое имя для emoji, например party_blob') || '');
        if (!shortcode) return;
        const value = String(window.prompt('Введите emoji символ или короткий текст, например 😎') || '').trim().slice(0, 4);
        if (!value) return;
        state.customEmojiPack.push(normalizeEmojiItem({ id: crypto.randomUUID(), shortcode, type: 'unicode', value, label: shortcode, packId: targetPack.id, packTitle: targetPack.title }));
        persistEmojiPack();
        ensureActivePack('emoji');
        renderMediaPanel();
        renderSettingsOverview();
        toast('Custom emoji добавлен в пак.', 'success');
      }
      if (action === 'add-custom-emoji-image') {
        els.customEmojiImageInput.click();
      }
      if (action === 'upload-sticker') {
        els.customStickerInput.click();
      }
      if (action === 'custom-gif-url') {
        const gifUrl = sanitizeGifUrl(window.prompt('Вставь ссылку на GIF') || '');
        if (!gifUrl) return;
        await sendGifMessage(gifUrl);
        setMediaPanelOpen(false);
      }
    });
  });
}

function openPackPreview(kind, packId, packTitle = '') {
  if (!els.packPreviewModal) return;
  const items = getPackItems(kind).filter((item) => (item.packId || `default-${kind}`) === packId && !item.placeholder);
  state.packPreview = { kind, packId, packTitle: packTitle || getPackMeta(kind, packId).title };
  els.packPreviewTitle.textContent = state.packPreview.packTitle;
  els.packPreviewSubtitle.textContent = PACK_PREVIEW_LABELS[kind] || 'Пак';
  const isEmoji = kind === 'emoji';
  els.packPreviewGrid.classList.toggle('emoji-grid', isEmoji);
  els.packPreviewGrid.classList.toggle('sticker-grid', !isEmoji);
  els.packPreviewGrid.classList.toggle('large-grid', true);
  els.packPreviewGrid.innerHTML = items.map((item) => {
    if (kind === 'emoji') {
      const isImage = item.type === 'image' && item.dataUrl;
      return `<div class="emoji-item ${item.locked ? 'locked' : ''}">${isImage ? `<img src="${escapeHtml(item.dataUrl)}" alt="${escapeHtml(item.shortcode || item.label || 'emoji')}" />` : escapeHtml(item.value || '')}<small>${escapeHtml(item.shortcode || item.label || '')}</small></div>`;
    }
    return `<div class="sticker-item"><img src="${escapeHtml(item.dataUrl)}" alt="${escapeHtml(item.name || 'Sticker')}" /><small>${escapeHtml(item.name || 'Sticker')}</small></div>`;
  }).join('');
  els.packPreviewModal.showModal();
}

function openPackEditor(defaultKind = state.mediaTab === 'stickers' ? 'stickers' : 'emoji') {
  if (!els.packEditorModal) return;
  const normalizedKind = defaultKind === 'stickers' ? 'stickers' : 'emoji';
  els.packNameInput.value = '';
  els.packKindInput.value = normalizedKind;
  if (els.packEditorTitle) els.packEditorTitle.textContent = normalizedKind === 'stickers' ? 'Новый sticker-пак' : 'Новый emoji-пак';
  if (els.packEditorSubmit) els.packEditorSubmit.textContent = 'Создать пак';
  els.packEditorModal.showModal();
}

async function sendStickerFromDataUrl(dataUrl, name, packMeta = {}) {
  if (!state.currentChat) {
    toast('Сначала открой чат.', 'error');
    return;
  }
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const ext = blob.type.includes('webp') ? 'webp' : blob.type.includes('jpeg') ? 'jpg' : 'png';
  const file = new File([blob], `${sanitizeCustomShortcode(name) || 'sticker'}.${ext}`, { type: blob.type || 'image/png' });
  await submitFile(file, { sticker: true, stickerName: name, stickerPackId: packMeta.packId || 'default-stickers', stickerPackTitle: packMeta.packTitle || 'Sticker pack' });
}

async function sendGifMessage(url) {
  const gifUrl = sanitizeGifUrl(url);
  if (!gifUrl) {
    toast('Некорректная ссылка на GIF.', 'error');
    return;
  }
  if (!state.currentChat) {
    toast('Сначала открой чат.', 'error');
    return;
  }
  const chatKey = await getOrLoadChatKey(state.currentChat);
  const encrypted = await encryptTextForChat(chatKey, `${GIF_PREFIX}${gifUrl}`);
  await apiFetch(`/api/chats/${state.currentChat.id}/messages/text`, {
    method: 'POST',
    body: JSON.stringify({ ...encrypted, clientNonce: crypto.randomUUID(), metaJson: state.replyToMessageId ? { replyToMessageId: state.replyToMessageId } : {} }),
  });
  state.replyToMessageId = null;
  renderReplyBanner();
}

function setRecordingUi(active, mode = 'voice') {
  els.composerForm.classList.toggle('recording', active);
  els.recordingIndicator.classList.toggle('hidden', !active);
  els.composerInput.classList.toggle('hidden', active);
  const label = els.recordingIndicator?.querySelector('strong');
  const hint = els.recordingIndicator?.querySelector('em');
  if (label) label.textContent = mode === 'video' ? 'Запись кружка' : 'Запись голосового';
  if (hint) hint.textContent = mode === 'video' ? 'Отпусти, чтобы отправить кружок' : 'Отпусти, чтобы отправить';
  if (!active) {
    if (state.recordingTimerInterval) {
      clearInterval(state.recordingTimerInterval);
      state.recordingTimerInterval = null;
    }
    els.recordingTimer.textContent = '0:00';
  }
}


async function saveProfile(event) {
  event.preventDefault();
  try {
    const payload = {
      name: els.profileName.value.trim(),
      username: els.profileUsername.value.trim(),
      bio: els.profileBio.value.trim(),
      avatarDataUrl: state.profileAvatarDataUrl || state.user.avatarDataUrl || '',
    };
    const { user } = await apiFetch('/api/profile', { method: 'PUT', body: JSON.stringify(payload) });
    state.user = user;
    renderMe();
    els.profileModal.close();
    renderSettingsOverview();
    await refreshChatsFromApi({ suppressErrors: true });
    toast('Профиль обновлён.', 'success');
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function saveGroupSettings(event) {
  event.preventDefault();
  if (!state.currentChat) return;
  try {
    await apiFetch(`/api/chats/${state.currentChat.id}/group`, {
      method: 'PUT',
      body: JSON.stringify({ title: els.groupTitleInput.value.trim(), avatarDataUrl: state.currentGroupAvatarDataUrl || state.currentChat.rawAvatarDataUrl || '' }),
    });
    toast(state.currentChat?.subtype === 'channel' ? 'Канал обновлён.' : 'Группа обновлена.', 'success');
    await selectChat(state.currentChat.id, { preserveMobile: true });
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function handleLogout() {
  try { await apiFetch('/api/auth/logout', { method: 'POST' }); } catch {}
  if (state.user) clearStoredSecrets(state.user.id);
  if (state.socket) {
    state.socket.disconnect();
    state.socket = null;
  }
  state.user = null;
  state.chats = [];
  state.currentChat = null;
  state.currentMessages = [];
  state.chatKeys.clear();
  state.decryptedTextCache.clear();
  state.voiceUrls.forEach((url) => URL.revokeObjectURL(url));
  state.voiceUrls.clear();
  state.customEmojiPack = [];
  state.customStickerPack = [];
  state.mutedChats = new Set();
  state.settingsOverview = null;
  setMediaPanelOpen(false);
  if (els.settingsModal?.open) els.settingsModal.close();
  showAuth();
}


async function requestNotifications() {
  if (!('Notification' in window)) {
    toast('Браузерные уведомления не поддерживаются.', 'error');
    return;
  }
  const result = await Notification.requestPermission();
  toast(result === 'granted' ? 'Уведомления включены.' : 'Разрешение не выдано.', result === 'granted' ? 'success' : 'error');
}

function setSessionToken(token) {
  state.token = token;
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

async function restoreSession() {
  try {
    state.token = sessionStorage.getItem(TOKEN_KEY);
    const { user } = await apiFetch('/api/auth/session');
    if (!user || !state.token) {
      showAuth();
      return;
    }
    state.user = user;
    initializeUserLocalState();
    const privateKey = await loadStoredPrivateKeyForUser(user.id);
    if (!privateKey) {
      setSessionToken(null);
      toast('Для разблокировки E2EE войди заново в этой вкладке.', 'error');
      showAuth();
      return;
    }
    showApp();
    renderMe();
    bindSocket();
    await refreshChatsFromApi({ suppressErrors: true });
  } catch {
    showAuth();
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const formData = new FormData(els.loginForm);
  const login = String(formData.get('login') || '').trim();
  const password = String(formData.get('password') || '');
  try {
    const { token, user } = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login, password }),
    });
    await unlockPrivateKeyFromUser(user, password);
    setSessionToken(token);
    state.user = user;
    initializeUserLocalState();
    showApp();
    renderMe();
    bindSocket();
    await refreshChatsFromApi();
    els.loginForm.reset();
  } catch (error) {
    showAuthError('login', error.message);
    toast(error.message, 'error');
  }
}

async function handleRegister(event) {
  event.preventDefault();
  clearAuthErrors();
  const formData = new FormData(els.registerForm);
  const name = String(formData.get('name') || '').trim();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const username = String(formData.get('username') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  const submitButton = els.registerForm.querySelector('button[type="submit"]');

  if (!name || name.length < 2) {
    return showAuthError('register', 'Введите имя не короче 2 символов.');
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return showAuthError('register', 'Введите корректный email.');
  }
  if (!/^[a-z0-9_]{3,32}$/.test(username)) {
    return showAuthError('register', 'Username должен содержать 3–32 символа: латиница, цифры и _.');
  }
  if (password.length < 8) {
    return showAuthError('register', 'Пароль должен содержать минимум 8 символов.');
  }

  try {
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Создаём аккаунт…';
    }
    const keyBundle = await generateUserKeyBundle(password);
    const { token, user } = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, username, password, ...keyBundle }),
    });
    await unlockPrivateKeyFromUser(user, password);
    setSessionToken(token);
    state.user = user;
    initializeUserLocalState();
    showApp();
    renderMe();
    bindSocket();
    await refreshChatsFromApi();
    els.registerForm.reset();
  } catch (error) {
    showAuthError('register', error.message);
    toast(error.message, 'error');
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = 'Создать аккаунт';
    }
  }
}

async function sendTextToChat(chat, text, metaJson = {}, messageId = null) {
  const targetChat = chat && typeof chat === 'object' ? chat : state.chats.find((item) => item.id === Number(chat));
  if (!targetChat) throw new Error('Чат не найден.');
  const chatKey = await getOrLoadChatKey(targetChat);
  const encrypted = await encryptTextForChat(chatKey, String(text || ''));
  if (messageId) {
    return apiFetch(`/api/chats/${targetChat.id}/messages/${messageId}/text`, {
      method: 'PUT',
      body: JSON.stringify({ ...encrypted }),
    });
  }
  return apiFetch(`/api/chats/${targetChat.id}/messages/text`, {
    method: 'POST',
    body: JSON.stringify({ ...encrypted, clientNonce: crypto.randomUUID(), metaJson }),
  });
}

async function submitTextMessage(event) {
  event.preventDefault();
  if (!state.currentChat || state.pendingMessage) return;
  const rawText = els.composerInput.value;
  const text = rawText.trim();
  if (!text) return;
  // Stop typing indicator immediately on send
  clearTimeout(state.myTypingTimer);
  emitTypingStop();
  try {
    state.pendingMessage = true;
    const metaJson = state.replyToMessageId ? { replyToMessageId: state.replyToMessageId } : {};

    if (state.editingMessageId) {
      await sendTextToChat(state.currentChat, text, metaJson, state.editingMessageId);
      toast('Сообщение изменено.', 'success');
      state.editingMessageId = null;
    } else {
      await sendTextToChat(state.currentChat, text, metaJson);
    }
    els.composerInput.value = '';
    autoResizeComposer();
    state.replyToMessageId = null;
    renderReplyBanner();
  } catch (error) {
    toast(error.message, 'error');
  } finally {
    state.pendingMessage = false;
  }
}

async function submitFile(file, extraMeta = {}) {
  if (!state.currentChat || !file) return;
  try {
    const chatKey = await getOrLoadChatKey(state.currentChat);
    const sourceMimeType = getBaseMimeType(file.type) || (extraMeta.isVideoNote ? 'video/webm' : extraMeta.isVoice ? 'audio/webm' : '');
    const encryptedMeta = await encryptAttachmentMeta(chatKey, {
      fileName: file.name,
      mimeType: sourceMimeType || 'application/octet-stream',
      fileSize: file.size,
      ...extraMeta,
    });
    const encryptedFile = await encryptFileBlob(chatKey, file);
    const formData = new FormData();
    formData.append('file', encryptedFile.encryptedBlob, file.name);
    formData.append('encryptedMeta', encryptedMeta.encryptedMeta);
    formData.append('metaIv', encryptedMeta.metaIv);
    formData.append('blobIv', encryptedFile.blobIv);
    formData.append('sourceMimeType', sourceMimeType);
    formData.append('clientNonce', crypto.randomUUID());
    const metaJson = state.replyToMessageId ? { replyToMessageId: state.replyToMessageId } : {};
    if (extraMeta.isVoice && extraMeta.durationMs) metaJson.voice = { durationMs: extraMeta.durationMs };
    if (extraMeta.isVideoNote && extraMeta.durationMs) metaJson.videoNote = { durationMs: extraMeta.durationMs };
    if (extraMeta.sticker) metaJson.sticker = { packId: extraMeta.stickerPackId || '', packTitle: extraMeta.stickerPackTitle || '' };
    formData.append('metaJson', JSON.stringify(metaJson));
    await apiFetch(`/api/chats/${state.currentChat.id}/messages/file`, { method: 'POST', body: formData });
    state.replyToMessageId = null;
    renderReplyBanner();
  } catch (error) {
    toast(error.message, 'error');
  }
}

function openAttachActionModal(kind) {
  if (!state.currentChat) {
    toast('Сначала открой чат.', 'error');
    return;
  }
  setAttachMenuOpen(false);
  state.attachActionKind = kind;
  const isReply = state.replyToMessageId ? { replyToMessageId: state.replyToMessageId } : {};
  const config = {
    poll: {
      title: 'Создать опрос',
      helper: 'Добавь вопрос и варианты ответов. Голосование синхронизируется в чате.',
      submit: 'Отправить опрос',
      fields: `
        <label class="inline-input">
          <span>Вопрос</span>
          <input id="attach-poll-question" type="text" maxlength="220" placeholder="Например, во сколько созвон?" required />
        </label>
        <label class="inline-input">
          <span>Варианты</span>
          <textarea id="attach-poll-options" rows="5" placeholder="Один вариант на строку" required></textarea>
        </label>
        <label class="attach-checkbox">
          <input id="attach-poll-multiple" type="checkbox" />
          <span>Разрешить несколько ответов</span>
        </label>
      `,
      meta: isReply,
    },
    geo: {
      title: 'Поделиться геопозицией',
      helper: 'Можно подставить текущие координаты браузера или ввести их вручную.',
      submit: 'Отправить геопозицию',
      fields: `
        <label class="inline-input">
          <span>Название места</span>
          <input id="attach-geo-label" type="text" maxlength="120" placeholder="Например, офис или встреча" />
        </label>
        <label class="inline-input">
          <span>Комментарий</span>
          <input id="attach-geo-note" type="text" maxlength="180" placeholder="Подъезд 2, 3 этаж" />
        </label>
        <div class="attach-inline-grid">
          <label class="inline-input">
            <span>Широта</span>
            <input id="attach-geo-lat" type="number" step="0.000001" min="-90" max="90" placeholder="52.286974" required />
          </label>
          <label class="inline-input">
            <span>Долгота</span>
            <input id="attach-geo-lng" type="number" step="0.000001" min="-180" max="180" placeholder="104.305018" required />
          </label>
        </div>
        <div class="attach-inline-actions">
          <button id="attach-geo-detect" type="button" class="secondary-button small">Определить автоматически</button>
        </div>
      `,
      meta: isReply,
    },
    wallet: {
      title: 'Отправить счёт',
      helper: 'Сформируй карточку перевода или запроса оплаты, как быстрый запрос в Telegram.',
      submit: 'Отправить счёт',
      fields: `
        <label class="inline-input">
          <span>Заголовок</span>
          <input id="attach-wallet-title" type="text" maxlength="120" placeholder="Например, такси до офиса" required />
        </label>
        <div class="attach-inline-grid">
          <label class="inline-input">
            <span>Сумма</span>
            <input id="attach-wallet-amount" type="number" min="0" step="0.01" placeholder="500" required />
          </label>
          <label class="inline-input">
            <span>Валюта</span>
            <input id="attach-wallet-currency" type="text" maxlength="12" value="RUB" />
          </label>
        </div>
        <label class="inline-input">
          <span>Получатель</span>
          <input id="attach-wallet-recipient" type="text" maxlength="120" value="${escapeHtml(state.user?.name || '')}" />
        </label>
        <label class="inline-input">
          <span>Комментарий</span>
          <textarea id="attach-wallet-note" rows="4" placeholder="За что нужен перевод"></textarea>
        </label>
      `,
      meta: isReply,
    },
  }[kind];
  if (!config || !els.attachActionModal || !els.attachActionFields) return;
  els.attachActionTitle.textContent = config.title;
  els.attachActionHelper.textContent = config.helper;
  els.attachActionSubmit.textContent = config.submit;
  els.attachActionFields.innerHTML = config.fields;
  els.attachActionModal.showModal();
  setTimeout(() => els.attachActionFields.querySelector('input, textarea')?.focus(), 0);
}

async function detectAttachGeo() {
  if (!navigator.geolocation) {
    toast('Браузер не умеет определять геопозицию.', 'error');
    return;
  }
  try {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
    });
    const lat = Number(position.coords?.latitude || 0);
    const lng = Number(position.coords?.longitude || 0);
    const latInput = document.getElementById('attach-geo-lat');
    const lngInput = document.getElementById('attach-geo-lng');
    if (latInput) latInput.value = lat.toFixed(6);
    if (lngInput) lngInput.value = lng.toFixed(6);
    toast('Координаты подставлены.', 'success');
  } catch (error) {
    toast(error.message || 'Не удалось определить геопозицию.', 'error');
  }
}

async function submitAttachAction(event) {
  event.preventDefault();
  if (!state.currentChat || state.pendingMessage) return;
  try {
    state.pendingMessage = true;
    const baseMeta = state.replyToMessageId ? { replyToMessageId: state.replyToMessageId } : {};
    if (state.attachActionKind === 'poll') {
      const question = String(document.getElementById('attach-poll-question')?.value || '').trim();
      const options = String(document.getElementById('attach-poll-options')?.value || '')
        .split('\n')
        .map((value) => value.trim())
        .filter(Boolean)
        .slice(0, 10);
      if (question.length < 3 || options.length < 2) {
        throw new Error('Для опроса нужны вопрос и минимум два варианта.');
      }
      await sendTextToChat(state.currentChat, question, {
        ...baseMeta,
        poll: {
          question,
          multiple: Boolean(document.getElementById('attach-poll-multiple')?.checked),
          options: options.map((text, index) => ({ id: `option-${index + 1}-${Date.now()}`, text, voterIds: [] })),
        },
      });
      toast('Опрос отправлен.', 'success');
    } else if (state.attachActionKind === 'geo') {
      const latitude = Number(document.getElementById('attach-geo-lat')?.value || 0);
      const longitude = Number(document.getElementById('attach-geo-lng')?.value || 0);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new Error('Укажи корректные координаты.');
      }
      const label = String(document.getElementById('attach-geo-label')?.value || '').trim();
      const note = String(document.getElementById('attach-geo-note')?.value || '').trim();
      await sendTextToChat(state.currentChat, label || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`, {
        ...baseMeta,
        location: { label, note, latitude, longitude },
      });
      toast('Геопозиция отправлена.', 'success');
    } else if (state.attachActionKind === 'wallet') {
      const title = String(document.getElementById('attach-wallet-title')?.value || '').trim();
      const amount = Number(document.getElementById('attach-wallet-amount')?.value || 0);
      const currency = String(document.getElementById('attach-wallet-currency')?.value || 'RUB').trim().toUpperCase() || 'RUB';
      const recipient = String(document.getElementById('attach-wallet-recipient')?.value || '').trim();
      const note = String(document.getElementById('attach-wallet-note')?.value || '').trim();
      if (title.length < 2 || !Number.isFinite(amount) || amount <= 0) {
        throw new Error('Для счёта укажи название и сумму больше нуля.');
      }
      await sendTextToChat(state.currentChat, title, {
        ...baseMeta,
        walletCard: { title, amount, currency, recipient, note },
      });
      toast('Счёт отправлен.', 'success');
    }
    state.replyToMessageId = null;
    renderReplyBanner();
    els.attachActionModal?.close();
  } catch (error) {
    toast(error.message, 'error');
  } finally {
    state.pendingMessage = false;
  }
}



function closeMessageMenu() {
  state.activeMessageMenuId = null;
  els.messageMenu.classList.add('hidden');
  els.messageMenu.innerHTML = '';
  [...els.messageList.querySelectorAll('.message-row.context-active')].forEach((item) => item.classList.remove('context-active'));
}

function openMessageMenu(messageId, point) {
  const message = state.currentMessages.find((item) => item.id === messageId);
  if (!message) return;
  state.activeMessageMenuId = messageId;
  const isSpecialText = Boolean(getSpecialMessageKind(message));
  const canEdit = message.senderId === state.user.id && message.messageType === 'text' && !isSpecialText;
  const canDelete = message.senderId === state.user.id;
  const canForward = message.messageType === 'text';

  els.messageMenu.innerHTML = `
    <button type="button" data-menu-action="reply">Ответить</button>
    ${canEdit ? '<button type="button" data-menu-action="edit">Редактировать</button>' : ''}
    ${canForward ? '<button type="button" data-menu-action="forward">Переслать</button>' : ''}
    ${canDelete ? '<button type="button" data-menu-action="delete" class="danger">Удалить</button>' : ''}
  `;
  const x = Math.max(8, Math.min(window.innerWidth - 210, point?.x || 24));
  const y = Math.max(8, Math.min(window.innerHeight - 220, point?.y || 24));
  els.messageMenu.style.top = `${y}px`;
  els.messageMenu.style.left = `${x}px`;
  els.messageMenu.classList.remove('hidden');

  [...els.messageMenu.querySelectorAll('[data-menu-action]')].forEach((button) => {
    button.addEventListener('click', async () => {
      const action = button.dataset.menuAction;
      closeMessageMenu();
      if (action === 'reply') {
        state.replyToMessageId = messageId;
        state.editingMessageId = null;
        renderReplyBanner();
        els.composerInput.focus();
        return;
      }
      if (action === 'edit') {
        state.editingMessageId = messageId;
        state.replyToMessageId = null;
        els.composerInput.value = await getMessagePlainText(message);
        autoResizeComposer();
        renderReplyBanner();
        els.composerInput.focus();
        return;
      }
      if (action === 'forward') {
        state.forwardMessageId = messageId;
        openForwardModal();
        return;
      }
      if (action === 'delete') {
        try {
          await apiFetch(`/api/chats/${state.currentChat.id}/messages/${messageId}`, { method: 'DELETE' });
          toast('Сообщение удалено.', 'success');
        } catch (error) {
          toast(error.message, 'error');
        }
      }
    });
  });
}

function renderForwardList() {
  const filter = els.forwardFilter.value.trim().toLowerCase();
  const chats = state.chats.filter((chat) => !filter || chat.title.toLowerCase().includes(filter));
  els.forwardList.innerHTML = chats.map((chat) => `
    <div class="forward-item">
      <div class="avatar-chip" data-forward-avatar="${chat.id}"></div>
      <div class="participant-meta">
        <strong>${escapeHtml(chat.title)}</strong>
        <span class="muted-line">${chat.subtype === 'channel' ? 'Канал' : chat.type === 'group' ? 'Группа' : 'Личный чат'}</span>
      </div>
      <button type="button" class="primary-button small" data-forward-chat="${chat.id}">Отправить</button>
    </div>
  `).join('');
  chats.forEach((chat) => {
    const el = els.forwardList.querySelector(`[data-forward-avatar="${chat.id}"]`);
    if (el) applyAvatar(el, chat.title, chat.avatarDataUrl);
  });
  [...els.forwardList.querySelectorAll('[data-forward-chat]')].forEach((button) => {
    button.addEventListener('click', async () => {
      await forwardMessageToChat(Number(button.dataset.forwardChat));
    });
  });
}

function openForwardModal() {
  els.forwardFilter.value = '';
  renderForwardList();
  els.forwardModal.showModal();
}

async function forwardMessageToChat(targetChatId) {
  const sourceMessage = state.currentMessages.find((item) => item.id === state.forwardMessageId);
  if (!sourceMessage) return;
  try {
    if (sourceMessage.messageType !== 'text') {
      throw new Error('В этой версии пересылка файлов и голосовых ещё не включена.');
    }
    const sourceText = await getMessagePlainText(sourceMessage);
    const targetChat = state.chats.find((item) => item.id === targetChatId);
    if (!targetChat) throw new Error('Целевой чат не найден.');
    await sendTextToChat(targetChat, sourceText, buildForwardMeta(sourceMessage));
    els.forwardModal.close();
    state.forwardMessageId = null;
    toast('Сообщение переслано.', 'success');
  } catch (error) {
    toast(error.message, 'error');
  }
}

function autoResizeComposer() {
  els.composerInput.style.height = 'auto';
  els.composerInput.style.height = `${Math.min(180, els.composerInput.scrollHeight)}px`;
}

async function startVoiceRecording() {
  if (!navigator.mediaDevices?.getUserMedia) {
    toast('Браузер не поддерживает запись голоса.', 'error');
    return;
  }
  try {
    state.recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
    state.mediaRecorder = new MediaRecorder(state.recordingStream, mimeType ? { mimeType } : undefined);
    state.recordingChunks = [];
    state.recordingStartedAt = Date.now();
    setRecordingUi(true, 'voice');
    els.voiceButton.classList.add('recording');
    state.recordingTimerInterval = window.setInterval(() => {
      els.recordingTimer.textContent = formatDuration(Date.now() - state.recordingStartedAt);
    }, 250);
    state.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) state.recordingChunks.push(event.data);
    };
    state.mediaRecorder.onstop = async () => {
      const durationMs = Date.now() - state.recordingStartedAt;
      const mime = state.mediaRecorder?.mimeType || 'audio/webm';
      const blob = new Blob(state.recordingChunks, { type: mime });
      if (blob.size > 0) {
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: mime });
        await submitFile(file, { isVoice: true, durationMs });
      }
      state.recordingChunks = [];
      state.mediaRecorder = null;
      if (state.recordingStream) {
        state.recordingStream.getTracks().forEach((track) => track.stop());
        state.recordingStream = null;
      }
      els.voiceButton.classList.remove('recording');
      setRecordingUi(false);
    };
    state.mediaRecorder.start();
  } catch (error) {
    setRecordingUi(false);
    toast(error.message || 'Не удалось получить доступ к микрофону.', 'error');
  }
}

function stopVoiceRecording() {
  if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
    state.mediaRecorder.stop();
  }
}

async function startVideoNoteRecording() {
  if (!navigator.mediaDevices?.getUserMedia) {
    toast('Браузер не поддерживает запись видео.', 'error');
    return;
  }
  try {
    state.videoRecordingStream = await navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 480, facingMode: 'user' }, audio: true });
    const mimeType = [
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=h264,opus',
      'video/webm',
    ].find((value) => MediaRecorder.isTypeSupported(value)) || '';
    state.videoRecorder = new MediaRecorder(state.videoRecordingStream, mimeType ? { mimeType } : undefined);
    state.videoChunks = [];
    state.videoStartedAt = Date.now();
    setRecordingUi(true, 'video');
    els.videoNoteButton.classList.add('recording');
    state.recordingTimerInterval = window.setInterval(() => {
      els.recordingTimer.textContent = formatDuration(Date.now() - state.videoStartedAt);
    }, 250);
    state.videoRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) state.videoChunks.push(event.data);
    };
    state.videoRecorder.onstop = async () => {
      const durationMs = Date.now() - state.videoStartedAt;
      const mime = state.videoRecorder?.mimeType || 'video/webm';
      const blob = new Blob(state.videoChunks, { type: mime });
      if (blob.size > 0) {
        const file = new File([blob], `circle-${Date.now()}.webm`, { type: mime });
        await submitFile(file, { isVideoNote: true, durationMs, videoNote: true });
      }
      state.videoChunks = [];
      state.videoRecorder = null;
      if (state.videoRecordingStream) {
        state.videoRecordingStream.getTracks().forEach((track) => track.stop());
        state.videoRecordingStream = null;
      }
      els.videoNoteButton.classList.remove('recording');
      setRecordingUi(false);
    };
    state.videoRecorder.start();
  } catch (error) {
    setRecordingUi(false);
    toast(error.message || 'Не удалось получить доступ к камере.', 'error');
  }
}

function stopVideoNoteRecording() {
  if (state.videoRecorder && state.videoRecorder.state !== 'inactive') {
    state.videoRecorder.stop();
  }
}


function chooseFileForKind(kind = 'all') {
  if (!els.fileInput) return;
  if (kind === 'media') els.fileInput.accept = 'image/*,video/*';
  else if (kind === 'document') els.fileInput.accept = '*/*';
  else els.fileInput.accept = '';
  els.fileInput.click();
}

function setAttachMenuOpen(open) {
  state.attachMenuOpen = Boolean(open);
  els.attachAnchor?.classList.toggle('menu-open', state.attachMenuOpen);
}

function bindEvents() {
  els.loginTabs.forEach((button) => button.addEventListener('click', (event) => { event.preventDefault(); setAuthTab(button.dataset.authTab); }));
  els.authTabLogin?.addEventListener('pointerup', (event) => { event.preventDefault(); setAuthTab('login'); });
  els.authTabRegister?.addEventListener('pointerup', (event) => { event.preventDefault(); setAuthTab('register'); });
  els.loginForm.addEventListener('submit', handleLogin);
  els.registerForm.addEventListener('submit', handleRegister);
  els.loginSubmit?.addEventListener('click', (event) => {
    event.preventDefault();
    handleLogin(event);
  });
  els.registerSubmit?.addEventListener('click', (event) => {
    event.preventDefault();
    if (els.registerForm.classList.contains('hidden')) setAuthTab('register');
    handleRegister(event);
  });
  els.registerForm.querySelector('[name="username"]')?.addEventListener('input', (event) => { event.target.value = String(event.target.value || '').toLowerCase().replace(/[^a-z0-9_]/g, ''); });
  els.registerForm.querySelector('[name="email"]')?.addEventListener('input', (event) => { event.target.value = String(event.target.value || '').toLowerCase(); });
  els.composerForm.addEventListener('submit', submitTextMessage);
  els.attachButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    setAttachMenuOpen(!state.attachMenuOpen);
  });
  els.attachHoverButtons.forEach((button) => button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    setAttachMenuOpen(false);
    const kind = button.dataset.attachKind;
    if (kind === 'media') return chooseFileForKind('media');
    if (kind === 'document') return chooseFileForKind('document');
    openAttachActionModal(kind);
  }));
  els.fileInput.addEventListener('change', async () => {
    const [file] = els.fileInput.files;
    if (file) await submitFile(file);
    els.fileInput.value = '';
    els.fileInput.accept = '';
    setAttachMenuOpen(false);
  });
  els.attachHoverMenu?.addEventListener('click', (event) => event.stopPropagation());
  document.addEventListener('click', (event) => {
    if (!els.attachAnchor?.contains(event.target)) setAttachMenuOpen(false);
  });
  els.attachAnchor?.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setAttachMenuOpen(false);
  });
  els.voiceButton.addEventListener('pointerdown', async (event) => {
    event.preventDefault();
    if (!state.currentChat) {
      toast('Сначала открой чат.', 'error');
      return;
    }
    await startVoiceRecording();
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((eventName) => {
    els.voiceButton.addEventListener(eventName, stopVoiceRecording);
  });
  els.videoNoteButton?.addEventListener('pointerdown', async (event) => {
    event.preventDefault();
    if (!state.currentChat) {
      toast('Сначала открой чат.', 'error');
      return;
    }
    await startVideoNoteRecording();
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((eventName) => {
    els.videoNoteButton?.addEventListener(eventName, stopVideoNoteRecording);
  });
  els.chatFilter.addEventListener('input', async () => { state.filter = els.chatFilter.value; await renderChats(); });
  els.chatFilter.addEventListener('keydown', async (event) => {
    if (event.key !== 'Enter' || !els.searchNewChat || els.searchNewChat.classList.contains('hidden')) return;
    event.preventDefault();
    await openDirectSearchFromSidebar(els.chatFilter.value);
  });
  els.logoutButton.addEventListener('click', handleLogout);
  els.newGroupChat.addEventListener('click', () => { setMenuOpen(false); openSearchModal('group'); });
  els.newChannelChat?.addEventListener('click', () => { setMenuOpen(false); openSearchModal('channel'); });
  els.searchNewChat?.addEventListener('click', async () => openDirectSearchFromSidebar(els.chatFilter.value));
  els.searchUsersInput.addEventListener('input', () => searchUsers(els.searchUsersInput.value));
  els.modalSubmit.addEventListener('click', submitSearchModal);
  els.attachActionForm?.addEventListener('submit', submitAttachAction);
  els.attachActionFields?.addEventListener('click', (event) => {
    if (event.target.closest('#attach-geo-detect')) {
      event.preventDefault();
      detectAttachGeo();
    }
  });
  els.attachActionModal?.addEventListener('close', () => {
    state.attachActionKind = '';
    if (els.attachActionFields) els.attachActionFields.innerHTML = '';
  });
  els.profileOpen.addEventListener('click', () => openSettingsModal('profile'));
  els.openProfileSettings.addEventListener('click', () => openSettingsModal('profile'));
  els.settingsEditProfile?.addEventListener('click', () => openProfileModal());
  els.profileForm.addEventListener('submit', saveProfile);
  els.askNotification.addEventListener('click', requestNotifications);
  els.openNotificationSettings.addEventListener('click', () => { setMenuOpen(false); requestNotifications(); });
  els.detailsToggle.addEventListener('click', openChatDetails);
  els.chatHeaderMain.addEventListener('click', openChatDetails);
  els.detailsClose.addEventListener('click', () => setDetailsOpen(false));
  els.detailsOverlay.addEventListener('click', () => setDetailsOpen(false));
  els.detailsActionChat?.addEventListener('click', () => setDetailsOpen(false));
  els.detailsActionSound?.addEventListener('click', async () => {
    if (!state.currentChat) return;
    const muted = toggleChatMute(state.currentChat.id);
    await renderChats();
    renderDetails();
    toast(muted ? 'Чат переведён в беззвучный режим.' : 'Звук для чата снова включён.', 'success');
  });
  els.detailsActionMore?.addEventListener('click', async () => {
    if (!state.currentChat) return;
    const shareText = getDetailsShareText();
    await copyText(shareText, 'Ссылка или контакт скопированы.');
  });
  els.headerAudioCall?.addEventListener('click', async () => {
    if (!state.currentChat || state.currentChat.subtype === 'channel') return;
    try {
      await startCall('audio');
    } catch (error) {
      toast(error.message || 'Не удалось начать звонок.', 'error');
    }
  });
  els.headerVideoCall?.addEventListener('click', async () => {
    if (!state.currentChat || state.currentChat.subtype === 'channel') return;
    try {
      await startCall('video');
    } catch (error) {
      toast(error.message || 'Не удалось начать видеозвонок.', 'error');
    }
  });
  els.menuToggle.addEventListener('click', () => setMenuOpen(!state.menuOpen));
  els.menuDrawerOverlay.addEventListener('click', () => setMenuOpen(false));
  els.mobileBack.addEventListener('click', () => {
    document.querySelector('.app-shell')?.classList.remove('chat-open');
    setDetailsOpen(false);
  });
  els.groupAddMembers.addEventListener('click', () => openSearchModal('add-members'));
  els.groupSettingsForm.addEventListener('submit', saveGroupSettings);
  els.profileAvatar.addEventListener('change', async () => {
    const [file] = els.profileAvatar.files;
    if (!file) return;
    state.profileAvatarDataUrl = await fileToDataUrl(file);
    toast('Аватар загружен в форму профиля.', 'success');
  });
  els.groupAvatarInput.addEventListener('change', async () => {
    const [file] = els.groupAvatarInput.files;
    if (!file) return;
    state.currentGroupAvatarDataUrl = await fileToDataUrl(file);
    toast('Новый аватар группы готов к сохранению.', 'success');
  });
  els.newGroupTitle.addEventListener('input', () => { setModalError(''); updateSearchModalState(); });
  els.searchModal.addEventListener('close', () => {
    state.selectedUsers.clear();
    setModalError('');
    renderSelectedUsers();
  });
  els.replyClear.addEventListener('click', () => {
    state.replyToMessageId = null;
    state.editingMessageId = null;
    els.composerInput.value = '';
    autoResizeComposer();
    renderReplyBanner();
  });
  els.composerInput.addEventListener('input', autoResizeComposer);
  els.composerInput.addEventListener('input', () => {
    if (!state.currentChat) return;
    emitTypingStart();
    clearTimeout(state.myTypingTimer);
    state.myTypingTimer = setTimeout(emitTypingStop, 2500);
  });
  els.composerInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      els.composerForm.requestSubmit();
    }
  });
  els.forwardFilter.addEventListener('input', renderForwardList);

  els.mediaPanelToggle?.addEventListener('click', () => {
    if (!state.currentChat) {
      toast('Сначала открой чат.', 'error');
      return;
    }
    setMediaPanelOpen(!state.mediaPanelOpen);
  });
  els.mediaPanelClose?.addEventListener('click', () => setMediaPanelOpen(false));
  els.mediaPanelOverlay?.addEventListener('click', () => setMediaPanelOpen(false));
  els.mediaTabButtons.forEach((button) => button.addEventListener('click', () => setMediaTab(button.dataset.mediaTab)));
  els.customStickerInput?.addEventListener('change', async () => {
    const [file] = els.customStickerInput.files;
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    const targetPack = resolveWritablePack('stickers');
    state.customStickerPack.push(normalizeStickerItem({ id: crypto.randomUUID(), name: file.name.replace(/\.[^.]+$/, ''), dataUrl, packId: targetPack.id, packTitle: targetPack.title }));
    persistStickerPack();
    renderMediaPanel();
    renderSettingsOverview();
    toast('Стикер добавлен.', 'success');
    els.customStickerInput.value = '';
  });
  els.customEmojiImageInput?.addEventListener('change', async () => {
    const [file] = els.customEmojiImageInput.files;
    if (!file) return;
    const shortcode = sanitizeCustomShortcode(window.prompt('Имя для custom emoji, например galaxy_cat') || file.name);
    if (!shortcode) {
      els.customEmojiImageInput.value = '';
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    const targetPack = resolveWritablePack('emoji');
    state.customEmojiPack.push(normalizeEmojiItem({ id: crypto.randomUUID(), shortcode, type: 'image', dataUrl, packId: targetPack.id, packTitle: targetPack.title }));
    persistEmojiPack();
    renderMediaPanel();
    renderSettingsOverview();
    toast('Emoji-изображение добавлено.', 'success');
    els.customEmojiImageInput.value = '';
  });
  els.createCustomEmoji?.addEventListener('click', () => {
    const targetPack = resolveWritablePack('emoji');
    const shortcode = sanitizeCustomShortcode(window.prompt('Короткое имя для emoji, например wow_face') || '');
    if (!shortcode) return;
    const value = String(window.prompt('Символ emoji или короткий текст') || '').trim().slice(0, 4);
    if (!value) return;
    state.customEmojiPack.push(normalizeEmojiItem({ id: crypto.randomUUID(), shortcode, type: 'unicode', value, packId: targetPack.id, packTitle: targetPack.title }));
    persistEmojiPack();
    renderMediaPanel();
    renderSettingsOverview();
    toast('Custom emoji добавлен.', 'success');
  });
  els.uploadCustomEmoji?.addEventListener('click', () => els.customEmojiImageInput.click());
  els.uploadCustomSticker?.addEventListener('click', () => els.customStickerInput.click());
  els.openMediaPanelFromSettings?.addEventListener('click', () => {
    els.settingsModal.close();
    setMediaPanelOpen(true);
  });
  els.premiumFreeBadge?.addEventListener('click', () => toast('Наш premium-пак сейчас открыт бесплатно.', 'success'));
  els.createPackButton?.addEventListener('click', () => openPackEditor(state.mediaTab === 'stickers' ? 'stickers' : 'emoji'));
  els.createEmojiPack?.addEventListener('click', () => openPackEditor('emoji'));
  els.createStickerPack?.addEventListener('click', () => openPackEditor('stickers'));
  els.premiumEmojiToggle?.addEventListener('click', () => {
    state.premiumEmojiEnabled = !state.premiumEmojiEnabled;
    localStorage.setItem(PREMIUM_EMOJI_STORAGE_KEY, state.premiumEmojiEnabled ? '1' : '0');
    updatePremiumEmojiButton();
    renderMediaPanel();
    toast(state.premiumEmojiEnabled ? 'Premium emoji включены бесплатно.' : 'Premium emoji скрыты.', 'success');
  });

  els.settingsClose?.addEventListener('click', () => els.settingsModal.close());
  els.settingsNavButtons.forEach((button) => button.addEventListener('click', () => setSettingsSection(button.dataset.settingsSection)));
  els.settingsModal?.addEventListener('close', () => setSettingsSection('profile'));

  els.packPreviewClose?.addEventListener('click', () => els.packPreviewModal.close());
  els.packPreviewCancel?.addEventListener('click', () => els.packPreviewModal.close());
  els.packPreviewAdd?.addEventListener('click', () => {
    toast('Пак уже доступен локально в этой версии.', 'success');
    els.packPreviewModal.close();
  });
  els.packEditorForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = els.packNameInput.value.trim();
    const kind = els.packKindInput.value;
    if (!name) return;
    const packId = `${kind}-${sanitizeCustomShortcode(name)}-${Date.now()}`;
    state.activePackByTab[kind] = packId;
    if (kind === 'emoji') {
      state.customEmojiPack.push(normalizeEmojiItem({ packId, packTitle: name, placeholder: true, shortcode: `pack_${Date.now()}`, value: '✨', label: name }));
      persistEmojiPack();
    } else {
      state.customStickerPack.push(normalizeStickerItem({ packId, packTitle: name, placeholder: true, name }));
      persistStickerPack();
    }
    renderMediaPanel();
    renderSettingsOverview();
    els.packEditorModal.close();
    toast(`Пак «${name}» создан. Теперь добавь в него элементы.`, 'success');
  });

  els.terminateOtherSessions?.addEventListener('click', async () => {
    try {
      const result = await apiFetch('/api/auth/sessions/logout-others', { method: 'POST' });
      state.settingsOverview = { ...(state.settingsOverview || {}), sessions: result.sessions || [] };
      renderSettingsOverview();
      toast('Остальные сессии завершены.', 'success');
    } catch (error) {
      toast(error.message, 'error');
    }
  });

  document.addEventListener('click', (event) => {
    if (!els.messageMenu.classList.contains('hidden') && !els.messageMenu.contains(event.target)) {
      closeMessageMenu();
    }
  });
  document.addEventListener('scroll', () => closeMessageMenu(), true);
    document.addEventListener('visibilitychange', () => {
    if (document.hidden) state.decryptedTextCache.clear();
  });

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMessageMenu();
      if (state.mediaPanelOpen) setMediaPanelOpen(false);
      if (els.packPreviewModal?.open) els.packPreviewModal.close();
      if (els.packEditorModal?.open) els.packEditorModal.close();
    }
  });
}


Object.assign(state, {
  themes: [],
  activeThemeId: 'default',
  call: {
    active: false,
    chatId: null,
    mode: 'audio',
    connections: new Map(),
    remoteStreams: new Map(),
    pendingMode: 'audio',
    pendingSignals: [],
    declinedChatId: null,
    closingUi: false,
  },
  localCallStream: null,
  screenStream: null,
});

Object.assign(els, {
  profileAvatarTrigger: document.getElementById('profile-avatar-trigger'),
  profileAvatarPreview: document.getElementById('profile-avatar-preview'),
  themeBg: document.getElementById('theme-bg'),
  themeSurface: document.getElementById('theme-surface'),
  themePrimary: document.getElementById('theme-primary'),
  themePrimary2: document.getElementById('theme-primary-2'),
  themeText: document.getElementById('theme-text'),
  themeMuted: document.getElementById('theme-muted'),
  saveThemeButton: document.getElementById('save-theme-button'),
  resetThemeButton: document.getElementById('reset-theme-button'),
  exportThemeButton: document.getElementById('export-theme-button'),
  importThemeButton: document.getElementById('import-theme-button'),
  themeImportInput: document.getElementById('theme-import-input'),
  themeList: document.getElementById('theme-list'),
  callModal: document.getElementById('call-modal'),
  callTitle: document.getElementById('call-title'),
  callSubtitle: document.getElementById('call-subtitle'),
  callClose: document.getElementById('call-close'),
  localCallFallback: document.getElementById('local-call-fallback'),
  localVideo: document.getElementById('local-video'),
  remoteVideos: document.getElementById('remote-videos'),
  startAudioCall: document.getElementById('start-audio-call'),
  startVideoCall: document.getElementById('start-video-call'),
  toggleMic: document.getElementById('toggle-mic'),
  toggleCamera: document.getElementById('toggle-camera'),
  shareScreen: document.getElementById('share-screen'),
  leaveCall: document.getElementById('leave-call'),
});

const DEFAULT_THEME = {
  id: 'default',
  name: 'Default',
  bg: '#09122a',
  surface: '#121b35',
  primary: '#8c77ff',
  primary2: '#b092ff',
  text: '#f5f7ff',
  muted: '#9aa6c9',
};
const THEME_STORAGE_KEY = 'hm-themes';
const ACTIVE_THEME_STORAGE_KEY = 'hm-active-theme';
const BRAND_NAME = 'Velora';
const BRAND_INITIALS = 'VL';

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeHexColor(value, fallback) {
  const source = String(value || '').trim();
  if (/^#[0-9a-f]{6}$/i.test(source)) return source;
  return fallback;
}

function hexToRgb(value) {
  const hex = normalizeHexColor(value, '#000000').slice(1);
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')).join('')}`;
}

function mixHexColors(colorA, colorB, ratio = 0.5) {
  const safeRatio = Math.max(0, Math.min(1, Number(ratio || 0)));
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  return rgbToHex({
    r: a.r + (b.r - a.r) * safeRatio,
    g: a.g + (b.g - a.g) * safeRatio,
    b: a.b + (b.b - a.b) * safeRatio,
  });
}

function alphaHex(color, alpha = 1) {
  const { r, g, b } = hexToRgb(color);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, Number(alpha || 0)))})`;
}

function normalizeTheme(theme = {}) {
  return {
    id: String(theme.id || crypto.randomUUID()),
    name: String(theme.name || 'Моя тема').trim().slice(0, 60) || 'Моя тема',
    bg: normalizeHexColor(theme.bg, DEFAULT_THEME.bg),
    surface: normalizeHexColor(theme.surface, DEFAULT_THEME.surface),
    primary: normalizeHexColor(theme.primary, DEFAULT_THEME.primary),
    primary2: normalizeHexColor(theme.primary2, DEFAULT_THEME.primary2),
    text: normalizeHexColor(theme.text, DEFAULT_THEME.text),
    muted: normalizeHexColor(theme.muted, DEFAULT_THEME.muted),
  };
}

function getThemeById(themeId) {
  return state.themes.find((item) => item.id === themeId) || state.themes[0] || cloneData(DEFAULT_THEME);
}

function persistThemes() {
  localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(state.themes));
  localStorage.setItem(ACTIVE_THEME_STORAGE_KEY, state.activeThemeId || DEFAULT_THEME.id);
}

function applyTheme(themeInput) {
  const theme = normalizeTheme(themeInput);
  state.activeThemeId = theme.id;
  const root = document.documentElement;
  const bg2 = mixHexColors(theme.bg, '#000000', 0.22);
  const panel = mixHexColors(theme.surface, theme.bg, 0.16);
  const panel2 = mixHexColors(theme.surface, theme.primary2, 0.12);
  const panel3 = mixHexColors(theme.surface, '#ffffff', 0.18);
  const border = alphaHex(mixHexColors(theme.surface, theme.text, 0.32), 0.2);
  root.style.setProperty('--bg', theme.bg);
  root.style.setProperty('--bg-2', bg2);
  root.style.setProperty('--panel', alphaHex(panel, 0.94));
  root.style.setProperty('--panel-2', alphaHex(panel2, 0.96));
  root.style.setProperty('--panel-3', alphaHex(panel3, 0.38));
  root.style.setProperty('--border', border);
  root.style.setProperty('--surface', theme.surface);
  root.style.setProperty('--surface-alt', panel2);
  root.style.setProperty('--primary', theme.primary);
  root.style.setProperty('--primary-2', theme.primary2);
  root.style.setProperty('--primary-soft', alphaHex(theme.primary, 0.18));
  root.style.setProperty('--text', theme.text);
  root.style.setProperty('--muted', theme.muted);
  root.style.setProperty('--theme-bg', theme.bg);
  root.style.setProperty('--theme-bg-2', bg2);
  root.style.setProperty('--theme-surface', theme.surface);
  root.style.setProperty('--theme-surface-2', panel2);
  root.style.setProperty('--theme-primary', theme.primary);
  root.style.setProperty('--theme-primary-2', theme.primary2);
  root.style.setProperty('--theme-text', theme.text);
  root.style.setProperty('--theme-muted', theme.muted);
  root.style.setProperty('--theme-glow-1', alphaHex(theme.primary2, 0.18));
  root.style.setProperty('--theme-glow-2', alphaHex(mixHexColors(theme.primary, theme.surface, 0.5), 0.14));
  root.style.setProperty('--surface-elevated', alphaHex(mixHexColors(theme.surface, '#ffffff', 0.08), 0.98));
  root.style.setProperty('--surface-soft', alphaHex(mixHexColors(theme.surface, theme.bg, 0.26), 0.82));
  root.style.setProperty('--panel-solid', alphaHex(mixHexColors(theme.surface, theme.bg, 0.1), 0.98));
  root.style.setProperty('--bubble-incoming', alphaHex(mixHexColors(theme.surface, theme.bg, 0.2), 0.94));
  root.style.setProperty('--bubble-outgoing', alphaHex(mixHexColors(theme.primary, theme.surface, 0.26), 0.96));
  if (els.themeBg) {
    els.themeBg.value = theme.bg;
    els.themeSurface.value = theme.surface;
    els.themePrimary.value = theme.primary;
    els.themePrimary2.value = theme.primary2;
    els.themeText.value = theme.text;
    els.themeMuted.value = theme.muted;
  }
  renderThemeList();
}

function loadThemes() {
  try {
    const stored = JSON.parse(localStorage.getItem(THEME_STORAGE_KEY) || '[]');
    const normalized = Array.isArray(stored) ? stored.map(normalizeTheme) : [];
    state.themes = [cloneData(DEFAULT_THEME), ...normalized.filter((item) => item.id !== DEFAULT_THEME.id)];
  } catch {
    state.themes = [cloneData(DEFAULT_THEME)];
  }
  const active = localStorage.getItem(ACTIVE_THEME_STORAGE_KEY) || DEFAULT_THEME.id;
  applyTheme(getThemeById(active));
}

function readThemeFromInputs() {
  return normalizeTheme({
    id: crypto.randomUUID(),
    name: 'Моя тема',
    bg: els.themeBg?.value || DEFAULT_THEME.bg,
    surface: els.themeSurface?.value || DEFAULT_THEME.surface,
    primary: els.themePrimary?.value || DEFAULT_THEME.primary,
    primary2: els.themePrimary2?.value || DEFAULT_THEME.primary2,
    text: els.themeText?.value || DEFAULT_THEME.text,
    muted: els.themeMuted?.value || DEFAULT_THEME.muted,
  });
}

function renderThemeList() {
  if (!els.themeList) return;
  els.themeList.innerHTML = state.themes.map((theme) => `
    <div class="theme-item">
      <div>
        <strong>${escapeHtml(theme.name)}</strong>
        <div class="theme-item-preview">
          <span style="background:${escapeHtml(theme.bg)}"></span>
          <span style="background:${escapeHtml(theme.surface)}"></span>
          <span style="background:${escapeHtml(theme.primary)}"></span>
          <span style="background:${escapeHtml(theme.primary2)}"></span>
        </div>
      </div>
      <div class="settings-inline-actions">
        <button type="button" class="secondary-button small" data-theme-use="${escapeHtml(theme.id)}">Применить</button>
        ${theme.id !== DEFAULT_THEME.id ? `<button type="button" class="ghost-button small" data-theme-delete="${escapeHtml(theme.id)}">Удалить</button>` : ''}
      </div>
    </div>
  `).join('');
  [...els.themeList.querySelectorAll('[data-theme-use]')].forEach((button) => {
    button.addEventListener('click', () => {
      const theme = getThemeById(button.dataset.themeUse);
      applyTheme(theme);
      persistThemes();
      toast(`Тема «${theme.name}» применена.`, 'success');
    });
  });
  [...els.themeList.querySelectorAll('[data-theme-delete]')].forEach((button) => {
    button.addEventListener('click', () => {
      state.themes = state.themes.filter((item) => item.id !== button.dataset.themeDelete);
      if (!state.themes.length) state.themes = [cloneData(DEFAULT_THEME)];
      if (!state.themes.some((item) => item.id === state.activeThemeId)) applyTheme(state.themes[0]);
      persistThemes();
      renderThemeList();
    });
  });
}

function saveThemeFromInputs() {
  const theme = readThemeFromInputs();
  const name = String(window.prompt('Название темы', `Тема ${state.themes.length}`) || '').trim();
  if (!name) return;
  theme.name = name.slice(0, 60);
  state.themes = [...state.themes.filter((item) => item.id !== theme.id), theme];
  applyTheme(theme);
  persistThemes();
  toast('Тема сохранена.', 'success');
}

function exportActiveTheme() {
  const theme = getThemeById(state.activeThemeId);
  const blob = new Blob([JSON.stringify(theme, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitizeCustomShortcode(theme.name) || 'theme'}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function importThemeFile(file) {
  const text = await file.text();
  const parsed = normalizeTheme(JSON.parse(text));
  state.themes = [...state.themes.filter((item) => item.id !== parsed.id), parsed];
  applyTheme(parsed);
  persistThemes();
  toast(`Тема «${parsed.name}» импортирована.`, 'success');
}

function syncProfileAvatarPreview() {
  if (!els.profileAvatarPreview || !state.user) return;
  applyAvatar(els.profileAvatarPreview, els.profileName?.value || state.user.name, state.profileAvatarDataUrl || state.user.avatarDataUrl || '');
}

async function openProfileModal() {
  if (!state.user) return;
  els.profileName.value = state.user.name || '';
  els.profileUsername.value = state.user.username || '';
  els.profileBio.value = state.user.bio || '';
  state.profileAvatarDataUrl = state.user.avatarDataUrl || '';
  syncProfileAvatarPreview();
  els.profileModal.showModal();
}

function renderSettingsOverview() {
  if (!state.user || !els.settingsName) return;
  applyAvatar(els.settingsAvatar, state.user.name, state.user.avatarDataUrl);
  els.settingsName.textContent = state.user.name;
  els.settingsUsername.textContent = `@${state.user.username}`;
  els.settingsBio.textContent = state.user.bio || 'Описание не заполнено.';
  els.settingsEmail.textContent = state.user.email;
  els.settingsCreated.textContent = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(state.user.createdAt));
  if (state.settingsOverview?.e2ee) {
    els.settingsE2eeTitle.textContent = state.settingsOverview.e2ee.title;
    els.settingsE2eeText.textContent = state.settingsOverview.e2ee.description;
  }
  const stats = state.settingsOverview?.stats || {};
  if (els.statsChats) {
    els.statsChats.textContent = stats.chatCount ?? 0;
    els.statsDirects.textContent = stats.directCount ?? 0;
    els.statsGroups.textContent = stats.groupCount ?? 0;
    if (els.statsChannels) els.statsChannels.textContent = stats.channelCount ?? 0;
    els.statsMessages.textContent = stats.messageCount ?? 0;
    els.statsFiles.textContent = stats.attachmentCount ?? 0;
    els.statsStorage.textContent = formatStorageSize(stats.storageBytes ?? 0);
  }
  if (els.customEmojiCount) els.customEmojiCount.textContent = `${getPackList('emoji').length} пак(ов), ${state.customEmojiPack.length} элементов`;
  if (els.customStickerCount) els.customStickerCount.textContent = `${getPackList('stickers').length} пак(ов), ${state.customStickerPack.length} элементов`;
  if (els.settingsEmojiPacks) els.settingsEmojiPacks.innerHTML = buildSettingsPackListHtml('emoji');
  if (els.settingsStickerPacks) els.settingsStickerPacks.innerHTML = buildSettingsPackListHtml('stickers');
  updatePremiumEmojiButton();
  renderThemeList();
  bindSettingsPackActions();

  const sessions = state.settingsOverview?.sessions || [];
  if (els.sessionsList) {
    if (!sessions.length) {
      els.sessionsList.innerHTML = '<div class="media-empty">Активные сессии ещё не найдены.</div>';
    } else {
      els.sessionsList.innerHTML = sessions.map((session) => `
        <div class="details-card session-item ${session.isCurrent ? 'current' : 'other'}">
          <div class="session-dot"></div>
          <div class="session-meta">
            <strong>${escapeHtml(session.deviceLabel || 'Устройство')}</strong>
            <span class="muted-line">Последняя активность: ${new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(session.lastSeenAt || session.createdAt))}</span>
            ${session.isCurrent ? '<span class="role-chip">Текущая сессия</span>' : ''}
          </div>
          <div class="session-actions">
            <button type="button" class="ghost-button small" data-session-revoke="${session.id}">${session.isCurrent ? 'Выйти' : 'Завершить'}</button>
          </div>
        </div>
      `).join('');
      [...els.sessionsList.querySelectorAll('[data-session-revoke]')].forEach((button) => {
        button.addEventListener('click', async () => {
          try {
            const result = await apiFetch(`/api/auth/sessions/${button.dataset.sessionRevoke}`, { method: 'DELETE' });
            if (result.currentDeleted) {
              toast('Текущая сессия завершена.', 'success');
              await handleLogout();
              return;
            }
            state.settingsOverview = { ...(state.settingsOverview || {}), sessions: result.sessions || [] };
            renderSettingsOverview();
            toast('Сессия завершена.', 'success');
          } catch (error) {
            toast(error.message, 'error');
          }
        });
      });
    }
  }
}

function buildVoiceNoteHtml(messageId, voiceUrl, durationMs) {
  const bars = Array.from({ length: 16 }, (_, index) => `<span style="animation-delay:${index * 0.06}s"></span>`).join('');
  return `
    <div class="voice-note" data-voice-note="${messageId}">
      <button type="button" class="voice-play" data-voice-toggle="${messageId}" aria-label="Play voice"></button>
      <div class="voice-wave">${bars}</div>
      <div class="voice-meta">
        <strong data-voice-time="${messageId}">${formatDuration(durationMs)}</strong>
        <div class="voice-progress"><div class="voice-progress-fill" data-voice-progress="${messageId}"></div></div>
      </div>
      <audio class="hidden" data-voice-audio="${messageId}" src="${voiceUrl}"></audio>
    </div>
  `;
}

function buildVideoNoteHtmlLegacy(messageId, videoUrl, durationMs) {
  return `
    <div class="video-note" data-video-note="${messageId}">
      <video src="${videoUrl}" playsinline preload="metadata"></video>
      <button type="button" class="video-note-play" data-video-note-toggle="${messageId}" aria-label="Play video note"></button>
      <div class="video-note-meta">${formatDuration(durationMs)}</div>
      <div class="video-note-eye">◉</div>
    </div>
  `;
}

function openImagePreview({ src, title = 'Фото' }) {
  if (!els.imagePreviewModal || !els.imagePreviewImg) return;
  els.imagePreviewImg.src = src;
  if (els.imagePreviewTitle) els.imagePreviewTitle.textContent = title;
  els.imagePreviewModal.showModal();
}


function wireVideoNotesLegacy() {
  [...els.messageList.querySelectorAll('[data-video-note]')].forEach((wrapper) => {
    const noteId = wrapper.dataset.videoNote;
    const video = wrapper.querySelector('video');
    const button = wrapper.querySelector(`[data-video-note-toggle="${noteId}"]`);
    if (!video || !button) return;
    const toggle = () => {
      if (video.paused) video.play();
      else video.pause();
    };
    button.addEventListener('click', toggle);
    video.addEventListener('click', toggle);
    video.addEventListener('play', () => wrapper.classList.add('is-playing'));
    video.addEventListener('pause', () => wrapper.classList.remove('is-playing'));
    video.addEventListener('ended', () => wrapper.classList.remove('is-playing'));
  });
}

function buildVideoNoteHtml(messageId, videoUrl, durationMs) {
  return `
    <div class="video-note" data-video-note="${messageId}">
      <video src="${videoUrl}" playsinline webkit-playsinline="true" preload="auto" data-video-note-media="${messageId}"></video>
      <button type="button" class="video-note-play" data-video-note-toggle="${messageId}" aria-label="Play video note"></button>
      <div class="video-note-meta">
        <strong data-video-note-time="${messageId}">${formatDuration(durationMs)}</strong>
        <span>Кружок</span>
      </div>
      <div class="video-note-eye">◉</div>
    </div>
  `;
}

function wireVideoNotes() {
  [...els.messageList.querySelectorAll('[data-video-note]')].forEach((wrapper) => {
    const noteId = wrapper.dataset.videoNote;
    const video = wrapper.querySelector('video');
    const button = wrapper.querySelector(`[data-video-note-toggle="${noteId}"]`);
    const timeEl = wrapper.querySelector(`[data-video-note-time="${noteId}"]`);
    if (!video || !button) return;
    const toggle = async () => {
      if (!video.paused) {
        video.pause();
        return;
      }
      [...els.messageList.querySelectorAll('[data-video-note] video')].forEach((other) => {
        if (other === video) return;
        other.pause();
        other.currentTime = 0;
        other.closest('.video-note')?.classList.remove('is-playing', 'is-buffering', 'is-error');
      });
      wrapper.classList.add('is-buffering');
      try {
        video.muted = false;
        await video.play();
      } catch (error) {
        wrapper.classList.remove('is-buffering', 'is-playing');
        wrapper.classList.add('is-error');
        toast(error.message || 'Не удалось воспроизвести кружок.', 'error');
      }
    };
    button.addEventListener('click', toggle);
    video.addEventListener('click', toggle);
    video.addEventListener('waiting', () => wrapper.classList.add('is-buffering'));
    video.addEventListener('play', () => {
      wrapper.classList.add('is-playing');
      wrapper.classList.remove('is-buffering', 'is-error');
    });
    video.addEventListener('playing', () => {
      wrapper.classList.add('is-playing');
      wrapper.classList.remove('is-buffering', 'is-error');
    });
    video.addEventListener('pause', () => wrapper.classList.remove('is-playing', 'is-buffering'));
    video.addEventListener('ended', () => {
      wrapper.classList.remove('is-playing', 'is-buffering');
      video.currentTime = 0;
      if (timeEl && Number.isFinite(video.duration)) timeEl.textContent = formatDuration(video.duration * 1000);
    });
    video.addEventListener('loadedmetadata', () => {
      if (timeEl && Number.isFinite(video.duration)) timeEl.textContent = formatDuration(video.duration * 1000);
    });
    video.addEventListener('timeupdate', () => {
      if (!timeEl || !Number.isFinite(video.duration)) return;
      const remainingMs = Math.max(0, (video.duration - video.currentTime) * 1000);
      timeEl.textContent = video.paused ? formatDuration(video.duration * 1000) : formatDuration(remainingMs);
    });
    video.addEventListener('error', async () => {
      wrapper.classList.remove('is-buffering', 'is-playing');
      const message = state.currentMessages.find((item) => item.id === Number(noteId));
      if (message?.meta?.videoNote && wrapper.dataset.videoRetry !== '1') {
        wrapper.dataset.videoRetry = '1';
        try {
          const fallbackUrl = await getVoiceUrl(message, 'video/webm');
          if (fallbackUrl && video.src !== fallbackUrl) {
            video.src = fallbackUrl;
            video.load();
            wrapper.classList.remove('is-error');
            return;
          }
        } catch {
          // Fall through to the visible error state below.
        }
      }
      wrapper.classList.add('is-error');
      toast('Не удалось воспроизвести кружок.', 'error');
    });
  });
}

// ===== TYPING INDICATOR =====
function emitTypingStart() {
  if (!state.currentChat || !state.socket) return;
  state.socket.emit('typing:start', { chatId: state.currentChat.id });
}
function emitTypingStop() {
  if (!state.currentChat || !state.socket) return;
  state.socket.emit('typing:stop', { chatId: state.currentChat.id });
}
function renderTypingIndicator() {
  if (!els.typingIndicator) return;
  const chatId = state.currentChat?.id;
  if (!chatId) { els.typingIndicator.classList.add('hidden'); return; }
  const usersMap = state.typingUsers.get(chatId);
  const names = usersMap ? [...usersMap.values()].map((u) => u.name) : [];
  if (!names.length) {
    els.typingIndicator.classList.add('hidden');
    return;
  }
  const label = names.length === 1
    ? `${names[0]} печатает`
    : names.length === 2
      ? `${names[0]} и ${names[1]} печатают`
      : `${names.slice(0, 2).join(', ')} и ещё ${names.length - 2} печатают`;
  els.typingIndicator.innerHTML = `<div class="typing-dots"><span></span><span></span><span></span></div><span>${escapeHtml(label)}</span>`;
  els.typingIndicator.classList.remove('hidden');
}

// ===== REACTIONS =====
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👎', '🎉'];
let reactionPickerEl = null;
let activeReactionMessageId = null;

function closeReactionPicker() {
  if (activeReactionMessageId) {
    const row = els.messageList?.querySelector(`[data-message-id="${activeReactionMessageId}"]`);
    row?.classList.remove('reaction-active');
    if (row && !row.matches(':hover')) row.classList.remove('reaction-hover');
    activeReactionMessageId = null;
  }
  if (reactionPickerEl) {
    reactionPickerEl.remove();
    reactionPickerEl = null;
  }
}

function buildNextReactions(messageId, emoji) {
  const current = cloneData(state.reactions.get(messageId) || []);
  const currentUserId = Number(state.user?.id || 0);
  if (!currentUserId) return current;
  const index = current.findIndex((entry) => entry.emoji === emoji);
  if (index === -1) {
    return [...current, { emoji, userIds: [currentUserId], count: 1 }];
  }
  const userIds = [...new Set((current[index].userIds || []).map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0))];
  const nextUserIds = userIds.includes(currentUserId)
    ? userIds.filter((value) => value !== currentUserId)
    : [...userIds, currentUserId];
  if (!nextUserIds.length) {
    current.splice(index, 1);
    return current;
  }
  current[index] = { ...current[index], userIds: nextUserIds, count: nextUserIds.length };
  return current;
}

function buildReactionPill(messageId, { emoji, userIds, count }, entering = false) {
  const isOwn = (userIds || []).includes(state.user?.id);
  const pill = document.createElement('button');
  pill.type = 'button';
  pill.className = `reaction-pill${isOwn ? ' own' : ''}${entering ? ' entering' : ''}`;
  pill.dataset.reactionEmoji = emoji;
  pill.dataset.reactionMsgid = String(messageId);
  pill.innerHTML = `${emoji} <span>${count || userIds?.length || 0}</span>`;
  pill.title = isOwn ? 'Убрать реакцию' : 'Поставить реакцию';
  pill.addEventListener('click', () => toggleReaction(messageId, emoji));
  if (entering) requestAnimationFrame(() => pill.classList.remove('entering'));
  return pill;
}

function openReactionPicker(messageId, anchorEl) {
  closeReactionPicker();
  activeReactionMessageId = messageId;
  els.messageList?.querySelector(`[data-message-id="${messageId}"]`)?.classList.add('reaction-active');
  const picker = document.createElement('div');
  picker.className = 'reaction-picker';
  picker.addEventListener('click', (event) => event.stopPropagation());
  QUICK_REACTIONS.forEach((emoji) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = emoji;
    btn.addEventListener('click', () => {
      closeReactionPicker();
      toggleReaction(messageId, emoji);
    });
    picker.appendChild(btn);
  });
  document.body.appendChild(picker);
  reactionPickerEl = picker;
  const rect = anchorEl.getBoundingClientRect();
  const pickerRect = picker.getBoundingClientRect();
  let left = rect.left + rect.width / 2 - pickerRect.width / 2;
  if (left + pickerRect.width > window.innerWidth - 12) left = window.innerWidth - pickerRect.width - 12;
  if (left < 12) left = 12;
  const top = rect.top > pickerRect.height + 28 ? rect.top - pickerRect.height - 10 : rect.bottom + 8;
  picker.style.top = `${top}px`;
  picker.style.left = `${left}px`;
  setTimeout(() => {
    document.addEventListener('click', closeReactionPicker, { once: true });
  }, 0);
}

function toggleReaction(messageId, emoji) {
  if (!state.socket || !state.currentChat) return;
  applyReactionUpdate({ messageId, reactions: buildNextReactions(messageId, emoji) });
  state.socket.emit('reaction:toggle', { chatId: state.currentChat.id, messageId, emoji });
}

function applyReactionUpdate({ messageId, reactions }) {
  const normalized = Array.isArray(reactions) ? reactions.map((entry) => ({
    ...entry,
    userIds: Array.isArray(entry.userIds) ? entry.userIds.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0) : [],
    count: Array.isArray(entry.userIds) ? entry.userIds.length : Number(entry.count || 0),
  })) : [];
  state.reactions.set(messageId, normalized);
  state.currentMessages = state.currentMessages.map((message) => message.id === Number(messageId) ? { ...message, reactions: normalized } : message);
  const row = els.messageList?.querySelector(`[data-message-id="${messageId}"]`);
  if (!row) return;
  let reactionsEl = row.querySelector('.message-reactions');
  if (!normalized.length) {
    if (!reactionsEl) return;
    [...reactionsEl.querySelectorAll('.reaction-pill')].forEach((pill) => pill.classList.add('leaving'));
    window.setTimeout(() => {
      if (reactionsEl?.isConnected && !state.reactions.get(Number(messageId))?.length) reactionsEl.remove();
    }, 180);
    return;
  }
  if (!reactionsEl) {
    reactionsEl = document.createElement('div');
    reactionsEl.className = 'message-reactions';
    row.appendChild(reactionsEl);
  }
  renderReactionPills(reactionsEl, messageId, normalized);
}

function renderReactionPillsLegacy(container, messageId, reactions) {
  container.innerHTML = '';
  if (!reactions || !reactions.length) return;
  reactions.forEach(({ emoji, userIds, count }) => {
    const isOwn = userIds?.includes(state.user?.id);
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = `reaction-pill${isOwn ? ' own' : ''}`;
    pill.innerHTML = `${emoji} <span>${count || userIds?.length || 0}</span>`;
    pill.title = isOwn ? 'Убрать реакцию' : 'Поставить реакцию';
    pill.addEventListener('click', () => toggleReaction(messageId, emoji));
    container.appendChild(pill);
  });
}

function renderReactionPills(container, messageId, reactions) {
  if (!reactions || !reactions.length) return;
  const existing = new Map([...container.querySelectorAll('.reaction-pill')].map((pill) => [pill.dataset.reactionEmoji, pill]));
  const nextEmojis = new Set();
  reactions.forEach((reaction) => {
    const emoji = reaction.emoji;
    const count = reaction.count || reaction.userIds?.length || 0;
    const isOwn = (reaction.userIds || []).includes(state.user?.id);
    nextEmojis.add(emoji);
    const pill = existing.get(emoji);
    if (!pill) {
      container.appendChild(buildReactionPill(messageId, reaction, true));
      return;
    }
    const prevCount = Number(pill.querySelector('span')?.textContent || 0);
    pill.classList.toggle('own', isOwn);
    pill.title = isOwn ? 'Убрать реакцию' : 'Поставить реакцию';
    pill.innerHTML = `${emoji} <span>${count}</span>`;
    if (prevCount !== count) {
      pill.classList.remove('count-bump');
      void pill.offsetWidth;
      pill.classList.add('count-bump');
    }
    container.appendChild(pill);
  });
  existing.forEach((pill, emoji) => {
    if (nextEmojis.has(emoji)) return;
    pill.classList.add('leaving');
    window.setTimeout(() => {
      if (pill.isConnected && pill.classList.contains('leaving')) pill.remove();
      if (!container.children.length) container.remove();
    }, 180);
  });
}

function openReactionPickerLegacy(messageId, anchorEl) {
  closeReactionPicker();
  activeReactionMessageId = messageId;
  els.messageList?.querySelector(`[data-message-id="${messageId}"]`)?.classList.add('reaction-active');
  const picker = document.createElement('div');
  picker.className = 'reaction-picker';
  picker.addEventListener('click', (event) => event.stopPropagation());
  ['👍', '❤️', '😂', '😮', '😢', '🔥', '👎', '🎉'].forEach((emoji) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = emoji;
    btn.addEventListener('click', () => {
      closeReactionPicker();
      toggleReaction(messageId, emoji);
    });
    picker.appendChild(btn);
  });
  document.body.appendChild(picker);
  reactionPickerEl = picker;
  const rect = anchorEl.getBoundingClientRect();
  const pickerRect = picker.getBoundingClientRect();
  let left = rect.left + rect.width / 2 - pickerRect.width / 2;
  if (left + pickerRect.width > window.innerWidth - 12) left = window.innerWidth - pickerRect.width - 12;
  if (left < 12) left = 12;
  const top = rect.top > pickerRect.height + 28 ? rect.top - pickerRect.height - 10 : rect.bottom + 8;
  picker.style.top = `${top}px`;
  picker.style.left = `${left}px`;
  setTimeout(() => {
    document.addEventListener('click', closeReactionPicker, { once: true });
  }, 0);
}

function openReactionPickerLegacy2(messageId, anchorEl) {
  closeReactionPicker();
  activeReactionMessageId = messageId;
  els.messageList?.querySelector(`[data-message-id="${messageId}"]`)?.classList.add('reaction-active');
  const picker = document.createElement('div');
  picker.className = 'reaction-picker';
  picker.addEventListener('click', (event) => event.stopPropagation());
  [
    String.fromCodePoint(0x1F44D),
    String.fromCodePoint(0x2764, 0xFE0F),
    String.fromCodePoint(0x1F602),
    String.fromCodePoint(0x1F62E),
    String.fromCodePoint(0x1F622),
    String.fromCodePoint(0x1F525),
    String.fromCodePoint(0x1F44E),
    String.fromCodePoint(0x1F389),
  ].forEach((emoji) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = emoji;
    btn.addEventListener('click', () => {
      closeReactionPicker();
      toggleReaction(messageId, emoji);
    });
    picker.appendChild(btn);
  });
  document.body.appendChild(picker);
  reactionPickerEl = picker;
  const rect = anchorEl.getBoundingClientRect();
  const pickerRect = picker.getBoundingClientRect();
  let left = rect.left + rect.width / 2 - pickerRect.width / 2;
  if (left + pickerRect.width > window.innerWidth - 12) left = window.innerWidth - pickerRect.width - 12;
  if (left < 12) left = 12;
  const top = rect.top > pickerRect.height + 28 ? rect.top - pickerRect.height - 10 : rect.bottom + 8;
  picker.style.top = `${top}px`;
  picker.style.left = `${left}px`;
  setTimeout(() => {
    document.addEventListener('click', closeReactionPicker, { once: true });
  }, 0);
}

async function renderMessages() {
  // Pre-load reactions from fetched messages into state
  state.currentMessages.forEach((msg) => {
    if (msg.reactions && msg.reactions.length) state.reactions.set(msg.id, msg.reactions);
  });
  const items = await Promise.all(state.currentMessages.map(async (message) => {
    if (message.messageType === 'system') {
      return `<div class="message-row system"><div class="message-bubble">${escapeHtml(message.systemText)}</div></div>`;
    }
    const isOwn = message.senderId === state.user.id;
    const senderName = state.currentChat.type === 'group' && !isOwn && message.sender
      ? `<div class="message-sender clickable" data-open-user="${message.sender.id}">${escapeHtml(message.sender.name)}</div>`
      : '';

    const replyPreview = await getReplyPreviewHtml(message);
    const forwardedFrom = message.meta?.forwardedFrom?.name
      ? `<div class="message-forward"><strong>Переслано от ${escapeHtml(message.meta.forwardedFrom.name)}</strong><span>${escapeHtml(message.meta.forwardedFrom.chatTitle || '')}</span></div>`
      : '';

    let contentHtml = '';
    let bubbleVariantClass = '';
    if (message.messageType === 'text') {
      const specialContent = renderSpecialMessageHtml(message);
      contentHtml = specialContent || renderMessageTextHtml(await getMessagePlainText(message));
    } else if (message.messageType === 'file' && message.attachment) {
      const meta = await decryptAttachmentMeta(await getOrLoadChatKey(state.currentChat), message.attachment);
      const mime = resolveAttachmentMime(message, meta);
      const fileName = String(meta.fileName || '').toLowerCase();
      const isVoice = Boolean(meta.isVoice || message.meta?.voice);
      const isVideoNote = Boolean(meta.videoNote || message.meta?.videoNote || fileName.startsWith('circle-') || mime.startsWith('video/'));
      const isSticker = Boolean(meta.sticker || message.meta?.sticker) && mime.startsWith('image/');
      const isImage = mime.startsWith('image/') && !isSticker;
      if (isVoice) {
        const voiceUrl = await getVoiceUrl(message, resolveAttachmentMime(message, meta, 'audio/webm'));
        contentHtml = buildVoiceNoteHtml(message.id, voiceUrl, meta.durationMs || message.meta?.voice?.durationMs || 0);
      } else if (isVideoNote) {
        const videoUrl = await getVoiceUrl(message, resolveAttachmentMime(message, meta, 'video/webm'));
        const durationMs = Number(meta.durationMs || meta.videoNote?.durationMs || message.meta?.videoNote?.durationMs || 0);
        contentHtml = buildVideoNoteHtml(message.id, videoUrl, durationMs);
        bubbleVariantClass = 'media-bubble video-note-bubble';
      } else if (isSticker) {
        const stickerUrl = await getVoiceUrl(message, resolveAttachmentMime(message, meta, 'image/webp'));
        contentHtml = `<div class="sticker-message"><img src="${stickerUrl}" data-sticker-pack-id="${escapeHtml(meta.stickerPackId || meta.sticker?.packId || 'default-stickers')}" data-sticker-pack-title="${escapeHtml(meta.stickerPackTitle || meta.sticker?.packTitle || 'Sticker pack')}" alt="${escapeHtml(meta.fileName || 'Sticker')}" /></div>`;
        bubbleVariantClass = 'media-bubble';
      } else if (isImage) {
        const imageUrl = await getVoiceUrl(message, resolveAttachmentMime(message, meta, 'image/png'));
        contentHtml = `<button type="button" class="message-image-button" data-open-image="${message.id}"><img src="${imageUrl}" alt="${escapeHtml(meta.fileName || 'Фото')}" loading="lazy" /></button>`;
        bubbleVariantClass = 'media-bubble image-bubble';
      } else {
        contentHtml = `
          <div class="attachment-card">
            <div>
              <strong>${escapeHtml(meta.fileName || 'Файл')}</strong>
              <div class="muted-line">${escapeHtml(meta.mimeType || message.attachment.mimeType || '')}</div>
            </div>
            <button class="secondary-button small" data-download-attachment="${message.attachment.id}">Скачать</button>
          </div>
        `;
      }
    }

    const statusLabel = isOwn ? (message.readByPeer ? 'прочитано' : 'отправлено') : '';
    const editedLabel = message.meta?.editedAt ? 'изменено' : '';
    const avatarUser = !isOwn && message.sender ? `data-open-user="${message.sender.id}"` : '';
    const editableClass = isOwn && message.messageType === 'text' && !getSpecialMessageKind(message) ? 'editable-own' : '';
    const existingReactions = state.reactions.get(message.id) || [];
    const reactionsHtml = existingReactions.length
      ? `<div class="message-reactions">${existingReactions.map(({ emoji, userIds, count }) => {
          const isOwn2 = userIds?.includes(state.user?.id);
          return `<button type="button" class="reaction-pill${isOwn2 ? ' own' : ''}" data-reaction-emoji="${escapeHtml(emoji)}" data-reaction-msgid="${message.id}">${emoji} <span>${count || userIds?.length || 0}</span></button>`;
        }).join('')}</div>`
      : '';
    return `
      <div class="message-row ${isOwn ? 'own' : ''} ${editableClass}" data-message-id="${message.id}">
        <div class="message-shell">
          <div class="avatar-chip message-avatar ${isOwn ? 'hidden' : ''} clickable" data-message-avatar="${message.id}" ${avatarUser}></div>
          <div class="message-bubble ${bubbleVariantClass}">
            ${senderName}
            ${forwardedFrom}
            ${replyPreview}
            ${contentHtml}
            <div class="message-footer">
              <span>${formatDateTime(message.createdAt)}</span>
              ${editedLabel ? `<span>${editedLabel}</span>` : ''}
              ${statusLabel ? `<span>${statusLabel}</span>` : ''}
            </div>
          </div>
          <button type="button" class="reaction-add-btn" data-react-msg="${message.id}" title="Реакция" aria-label="Добавить реакцию">😊</button>
        </div>
        ${reactionsHtml}
      </div>
    `;
  }));
  els.messageList.innerHTML = items.join('');

  state.currentMessages.forEach((message) => {
    const avatarEl = els.messageList.querySelector(`[data-message-avatar="${message.id}"]`);
    if (avatarEl && message.sender) applyAvatar(avatarEl, message.sender.name, message.sender.avatarDataUrl);
  });

  [...els.messageList.querySelectorAll('[data-download-attachment]')].forEach((button) => {
    button.addEventListener('click', async () => {
      const attachmentId = Number(button.dataset.downloadAttachment);
      const message = state.currentMessages.find((item) => item.attachment?.id === attachmentId);
      if (!message) return;
      await downloadAttachment(message);
    });
  });

  [...els.messageList.querySelectorAll('[data-sticker-pack-id]')].forEach((image) => {
    image.addEventListener('click', () => openPackPreview('stickers', image.dataset.stickerPackId, image.dataset.stickerPackTitle));
  });

  [...els.messageList.querySelectorAll('[data-open-image]')].forEach((button) => {
      button.addEventListener('click', async () => {
        const message = state.currentMessages.find((item) => item.id === Number(button.dataset.openImage));
        if (!message) return;
        const meta = await decryptAttachmentMeta(await getOrLoadChatKey(state.currentChat), message.attachment);
        const imageUrl = await getVoiceUrl(message, resolveAttachmentMime(message, meta, 'image/png'));
        openImagePreview({ src: imageUrl, title: meta.fileName || 'Фото' });
      });
    });

  [...els.messageList.querySelectorAll('[data-emoji-pack-id]')].forEach((emoji) => {
    emoji.addEventListener('click', () => openPackPreview('emoji', emoji.dataset.emojiPackId, emoji.dataset.emojiPackTitle));
  });

  [...els.messageList.querySelectorAll('[data-open-user]')].forEach((el) => {
    el.addEventListener('click', () => openUserDetails(Number(el.dataset.openUser)));
  });

  [...els.messageList.querySelectorAll('[data-message-id]')].forEach((row) => {
    row.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      const targetRow = event.currentTarget;
      [...els.messageList.querySelectorAll('.message-row.context-active')].forEach((item) => item.classList.remove('context-active'));
      targetRow.classList.add('context-active');
      openMessageMenu(Number(targetRow.dataset.messageId), { x: event.clientX, y: event.clientY });
    });
    row.addEventListener('dblclick', async () => {
      const messageId = Number(row.dataset.messageId);
      const message = state.currentMessages.find((item) => item.id === messageId);
      if (!message || message.senderId !== state.user.id || message.messageType !== 'text' || getSpecialMessageKind(message)) return;
      state.editingMessageId = messageId;
      state.replyToMessageId = null;
      els.composerInput.value = await getMessagePlainText(message);
      autoResizeComposer();
      renderReplyBanner();
      els.composerInput.focus();
    });
  });

  wireVoicePlayers();
  wireVideoNotes();

  // Wire reaction add buttons
  [...els.messageList.querySelectorAll('[data-react-msg]')].forEach((btn) => {
    const row = btn.closest('[data-message-id]');
    btn.addEventListener('pointerenter', () => row?.classList.add('reaction-hover'));
    btn.addEventListener('pointerleave', () => {
      if (activeReactionMessageId !== Number(row?.dataset.messageId || 0) && !row?.matches(':hover')) row?.classList.remove('reaction-hover');
    });
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      openReactionPicker(Number(btn.dataset.reactMsg), btn);
    });
  });

  [...els.messageList.querySelectorAll('[data-message-id]')].forEach((row) => {
    row.addEventListener('pointerenter', () => row.classList.add('reaction-hover'));
    row.addEventListener('pointerleave', () => {
      if (activeReactionMessageId !== Number(row.dataset.messageId)) row.classList.remove('reaction-hover');
    });
  });

  // Wire existing reaction pills
  [...els.messageList.querySelectorAll('[data-reaction-emoji]')].forEach((pill) => {
    pill.addEventListener('click', () => {
      toggleReaction(Number(pill.dataset.reactionMsgid), pill.dataset.reactionEmoji);
    });
  });

  [...els.messageList.querySelectorAll('[data-poll-vote]')].forEach((button) => {
    button.addEventListener('click', () => {
      voteOnPoll(Number(button.dataset.pollVote), button.dataset.pollOption);
    });
  });

  [...els.messageList.querySelectorAll('[data-wallet-copy]')].forEach((button) => {
    button.addEventListener('click', async () => {
      const message = state.currentMessages.find((item) => item.id === Number(button.dataset.walletCopy));
      const walletCard = cloneWalletCardMeta(message?.meta?.walletCard);
      if (!walletCard) return;
      const summary = [
        walletCard.title,
        formatCurrencyAmount(walletCard.amount, walletCard.currency),
        walletCard.recipient ? `Получатель: ${walletCard.recipient}` : '',
        walletCard.note || '',
      ].filter(Boolean).join('\n');
      await copyText(summary, 'Реквизиты скопированы.');
    });
  });

  els.messageList.scrollTop = els.messageList.scrollHeight;
}

function renderDetails() {
  if (!state.currentChat || !state.detailsTarget) {
    els.detailsEmpty.classList.remove('hidden');
    els.detailsContent.classList.add('hidden');
    return;
  }
  const isChannelChat = state.currentChat.subtype === 'channel';
  els.detailsPanel.dataset.channelChat = isChannelChat ? 'true' : 'false';
  els.detailsActionCall?.classList.toggle('hidden', isChannelChat);
  const setActionLabel = (button, text) => {
    const label = button?.querySelector('span:last-child');
    if (label) label.textContent = text;
  };
  setActionLabel(els.detailsActionSound, isChatMuted(state.currentChat.id) ? 'Вкл звук' : 'Без звука');
  setActionLabel(els.detailsActionCall, 'Звонок');
  setActionLabel(els.detailsActionMore, 'Поделиться');
  els.detailsEmpty.classList.add('hidden');
  els.detailsContent.classList.remove('hidden');

  const setStats = (stats) => {
    if (!els.detailsStats) return;
    els.detailsStats.innerHTML = `
      <div class="details-stat-row"><span>🎁 Подарки/стикеры</span><span>${stats.gifts}</span></div>
      <div class="details-stat-row"><span>🖼 Фотографии</span><span>${stats.photos}</span></div>
      <div class="details-stat-row"><span>📄 Файлы</span><span>${stats.files}</span></div>
      <div class="details-stat-row"><span>🔗 Ссылки</span><span>${stats.links}</span></div>
      <div class="details-stat-row"><span>🎙 Голосовые</span><span>${stats.voices}</span></div>
    `;
  };

  const stats = buildDetailsStats();
  setStats(stats);

  if (state.detailsTarget.type === 'user') {
    const participant = state.currentChat.participants.find((item) => item.id === state.detailsTarget.userId);
    if (!participant) return;
    applyAvatar(els.detailsAvatar, participant.name, participant.avatarDataUrl);
    els.detailsTitle.textContent = participant.name;
    els.detailsSubtitle.textContent = `@${participant.username} · ${participant.online ? 'онлайн' : 'был(а) недавно'}`;
    els.detailsHandle.textContent = `@${participant.username}`;
    els.detailsBio.textContent = participant.bio || 'Описание не заполнено.';
    els.detailsBio.classList.remove('hidden');
    els.detailsExtraInfo.textContent = participant.bio || 'Описание не заполнено.';
    els.groupOwnerControls.classList.add('hidden');
    els.participantsCard.classList.add('hidden');
    resetDetailsScroll();
    return;
  }

  applyAvatar(els.detailsAvatar, state.currentChat.title, state.currentChat.avatarDataUrl);
  els.detailsTitle.textContent = state.currentChat.title;
  els.detailsSubtitle.textContent = isChannelChat
    ? `${state.currentChat.participants.length} подписчиков`
    : state.currentChat.type === 'group'
      ? `${state.currentChat.participants.length} участников`
      : (state.currentChat.participants.find((item) => item.id !== state.user.id)?.online ? 'онлайн' : 'личный чат');
  els.detailsHandle.textContent = isChannelChat ? `@${(state.currentChat.rawTitle || state.currentChat.title || 'channel').toLowerCase().replace(/[^a-z0-9_а-яё]/gi, '') || 'channel'}` : state.currentChat.type === 'group' ? '@group' : `@${state.currentChat.participants.find((item) => item.id !== state.user.id)?.username || ''}`;
  els.detailsExtraInfo.textContent = isChannelChat ? 'Канал для публикаций и чтения как в Telegram.' : 'Информация по текущему чату.';
  els.detailsBio.textContent = isChannelChat ? 'Публикации доступны только владельцу канала.' : '';
  els.detailsBio.classList.toggle('hidden', !els.detailsBio.textContent);

  resetDetailsScroll();

  if (state.currentChat.type === 'group' || isChannelChat) {
    els.participantsCard.classList.remove('hidden');
    els.groupOwnerControls.classList.toggle('hidden', state.currentChat.currentUserRole !== 'owner');
    els.groupOwnerTitle.textContent = isChannelChat ? 'Управление каналом' : 'Управление группой';
    els.participantsTitle.textContent = isChannelChat ? 'Подписчики' : 'Участники';
    if (els.groupAddMembers) els.groupAddMembers.textContent = isChannelChat ? 'Добавить подписчиков' : 'Добавить участников';
    els.groupTitleInput.value = state.currentChat.rawTitle || state.currentChat.title;
    renderParticipants();
  } else {
    if (els.groupAddMembers) els.groupAddMembers.textContent = 'Добавить участников';
    els.groupOwnerControls.classList.add('hidden');
    els.participantsCard.classList.add('hidden');
    const peer = state.currentChat.participants.find((item) => item.id !== state.user.id);
    if (peer) {
      els.detailsSubtitle.textContent = `@${peer.username} · ${peer.online ? 'онлайн' : 'офлайн'}`;
      els.detailsHandle.textContent = `@${peer.username}`;
      els.detailsBio.textContent = peer.bio || 'Описание не заполнено.';
      els.detailsExtraInfo.textContent = peer.bio || 'Описание не заполнено.';
      els.detailsBio.classList.remove('hidden');
    }
  }

  resetDetailsScroll();
}

async function requestCallMedia(mode = 'audio') {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error(mode === 'video' ? 'Браузер не поддерживает видеозвонки.' : 'Браузер не поддерживает звонки.');
  }
  const videoConstraints = {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: 'user',
  };
  const candidates = mode === 'video'
    ? [
        { audio: { echoCancellation: true, noiseSuppression: true }, video: videoConstraints },
        { audio: true, video: videoConstraints },
        { audio: false, video: videoConstraints },
        { audio: false, video: true },
      ]
    : [
        { audio: { echoCancellation: true, noiseSuppression: true }, video: false },
        { audio: true, video: false },
      ];
  let lastError = null;
  for (const constraints of candidates) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (mode !== 'video' || stream.getVideoTracks().length) return stream;
      stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error(mode === 'video' ? 'Не удалось получить доступ к камере.' : 'Не удалось получить доступ к микрофону.');
}

function getLiveTracks(stream, kind) {
  if (!stream) return [];
  const getter = kind === 'video' ? stream.getVideoTracks.bind(stream) : stream.getAudioTracks.bind(stream);
  return getter().filter((track) => track.readyState !== 'ended');
}

async function ensureLocalCallStream(mode = 'audio') {
  const wantsVideo = mode === 'video';
  if (!state.localCallStream) {
    state.localCallStream = await requestCallMedia(mode);
  } else if (wantsVideo && !getLiveTracks(state.localCallStream, 'video').length) {
    const extraStream = await requestCallMedia('video');
    const extraVideoTrack = getLiveTracks(extraStream, 'video')[0];
    if (!extraVideoTrack) {
      extraStream.getTracks().forEach((track) => track.stop());
      throw new Error('Не удалось получить доступ к камере.');
    }
    state.localCallStream.addTrack(extraVideoTrack);
    if (!getLiveTracks(state.localCallStream, 'audio').length) {
      getLiveTracks(extraStream, 'audio').forEach((track) => state.localCallStream.addTrack(track));
    } else {
      getLiveTracks(extraStream, 'audio').forEach((track) => track.stop());
    }
  }
  if (wantsVideo) {
    getLiveTracks(state.localCallStream, 'video').forEach((track) => { track.enabled = true; });
  }
  if (els.localVideo) {
    els.localVideo.srcObject = state.screenStream || state.localCallStream;
    els.localVideo.muted = true;
    els.localVideo.play().catch(() => {});
  }
  syncLocalCallPreview();
  return state.localCallStream;
}

function getCallParticipants(chatId) {
  const chat = state.chats.find((item) => item.id === chatId) || state.currentChat;
  return (chat?.participants || []).filter((item) => item.id !== state.user.id);
}

function ensureCallModalTitle(chatId) {
  const chat = state.chats.find((item) => item.id === chatId) || state.currentChat;
  if (els.callTitle) els.callTitle.textContent = chat ? `Звонок · ${chat.title}` : 'Звонок';
}

function syncLocalCallPreview() {
  const localCard = els.localVideo?.closest('.call-video-card');
  if (!localCard) return;
  const hasVideo = Boolean(getLiveTracks(state.screenStream, 'video').length)
    || getLiveTracks(state.localCallStream, 'video').some((track) => track.enabled);
  localCard.classList.toggle('has-video', hasVideo);
  localCard.classList.toggle('audio-only', !hasVideo);
  if (els.localVideo) {
    els.localVideo.classList.toggle('hidden', !hasVideo);
  }
  if (els.localCallFallback) {
    els.localCallFallback.textContent = initials(state.user?.name || 'Ты');
    els.localCallFallback.classList.toggle('hidden', hasVideo);
  }
}

function updateCallButtonsLegacy() {
  const localStream = state.localCallStream;
  const audioEnabled = localStream?.getAudioTracks().some((track) => track.enabled) ?? false;
  const videoEnabled = localStream?.getVideoTracks().some((track) => track.enabled) ?? false;
  if (els.toggleMic) els.toggleMic.textContent = audioEnabled ? 'Микрофон вкл' : 'Микрофон выкл';
  if (els.toggleCamera) els.toggleCamera.textContent = videoEnabled ? 'Камера вкл' : 'Камера выкл';
  if (els.toggleMic) els.toggleMic.disabled = !state.call.active;
  if (els.toggleCamera) els.toggleCamera.disabled = !state.call.active;
  if (els.shareScreen) els.shareScreen.disabled = !state.call.active;
  if (els.startAudioCall) els.startAudioCall.disabled = state.call.active;
  if (els.startVideoCall) els.startVideoCall.disabled = state.call.active;
  syncLocalCallPreview();
}

function renderRemoteVideosLegacy() {
  if (!els.remoteVideos) return;
  const participants = getCallParticipants(state.call.chatId || state.currentChat?.id || 0);
  els.remoteVideos.innerHTML = participants.map((participant) => `
    <div class="remote-video-card" data-remote-card="${participant.id}">
      <div class="call-avatar-fallback">${escapeHtml(initials(participant.name))}</div>
      <video autoplay playsinline></video>
      <span>${escapeHtml(participant.name)}</span>
    </div>
  `).join('');
  participants.forEach((participant) => {
    const stream = state.call.remoteStreams.get(participant.id);
    const card = els.remoteVideos.querySelector(`[data-remote-card="${participant.id}"]`);
    const video = card?.querySelector('video');
    const fallback = card?.querySelector('.call-avatar-fallback');
    const hasVideo = Boolean(stream?.getVideoTracks().length);
    if (video) {
      card?.classList.toggle('has-video', hasVideo);
      card?.classList.toggle('audio-only', !hasVideo);
      video.classList.toggle('hidden', !hasVideo);
      fallback?.classList.toggle('hidden', hasVideo);
    }
    if (video && stream) {
      video.classList.toggle('hidden', !hasVideo);
      video.srcObject = stream;
      video.play().catch(() => {});
    } else if (video) {
      video.srcObject = null;
    }
  });
}

function updateCallButtons() {
  const localStream = state.localCallStream;
  const audioEnabled = getLiveTracks(localStream, 'audio').some((track) => track.enabled);
  const videoEnabled = getLiveTracks(localStream, 'video').some((track) => track.enabled);
  if (els.toggleMic) {
    els.toggleMic.textContent = audioEnabled ? 'Микрофон' : 'Без звука';
    els.toggleMic.disabled = !state.call.active;
    els.toggleMic.classList.toggle('is-off', !audioEnabled);
    els.toggleMic.setAttribute('aria-pressed', String(audioEnabled));
  }
  if (els.toggleCamera) {
    els.toggleCamera.textContent = videoEnabled ? 'Камера' : 'Видео выкл';
    els.toggleCamera.disabled = !state.call.active;
    els.toggleCamera.classList.toggle('is-off', !videoEnabled);
    els.toggleCamera.setAttribute('aria-pressed', String(videoEnabled));
  }
  if (els.shareScreen) {
    els.shareScreen.textContent = state.screenStream ? 'Экран включён' : 'Экран';
    els.shareScreen.disabled = !state.call.active;
    els.shareScreen.classList.toggle('is-off', !state.screenStream);
  }
  if (els.startAudioCall) els.startAudioCall.disabled = state.call.active;
  if (els.startVideoCall) els.startVideoCall.disabled = state.call.active;
  if (els.callModal) {
    els.callModal.dataset.callMode = state.call.mode || 'audio';
    els.callModal.dataset.callActive = state.call.active ? 'true' : 'false';
  }
  syncLocalCallPreview();
}

function renderRemoteVideos() {
  if (!els.remoteVideos) return;
  const participants = getCallParticipants(state.call.chatId || state.currentChat?.id || 0);
  if (!participants.length) {
    els.remoteVideos.innerHTML = `
      <div class="call-waiting-card">
        <div class="call-waiting-orb"></div>
        <strong>Ждём подключение</strong>
        <p>Собеседник увидит приглашение и сможет войти в звонок.</p>
      </div>
    `;
    return;
  }
  els.remoteVideos.innerHTML = participants.map((participant) => `
    <div class="remote-video-card" data-remote-card="${participant.id}">
      <div class="call-avatar-fallback">${escapeHtml(initials(participant.name))}</div>
      <video autoplay playsinline></video>
      <span>${escapeHtml(participant.name)}</span>
    </div>
  `).join('');
  participants.forEach((participant) => {
    const stream = state.call.remoteStreams.get(participant.id);
    const card = els.remoteVideos.querySelector(`[data-remote-card="${participant.id}"]`);
    const video = card?.querySelector('video');
    const fallback = card?.querySelector('.call-avatar-fallback');
    const hasVideo = getLiveTracks(stream, 'video').length > 0;
    if (video) {
      card?.classList.toggle('has-video', hasVideo);
      card?.classList.toggle('audio-only', !hasVideo);
      video.classList.toggle('hidden', !hasVideo);
      fallback?.classList.toggle('hidden', hasVideo);
    }
    if (video && stream) {
      video.classList.toggle('hidden', !hasVideo);
      video.srcObject = stream;
      video.play().catch(() => {});
    } else if (video) {
      video.srcObject = null;
    }
  });
}

function closeCallModalUi() {
  state.call.closingUi = true;
  if (els.callModal?.open) els.callModal.close();
  if (els.remoteVideos) els.remoteVideos.innerHTML = '';
  if (els.localVideo) els.localVideo.srcObject = null;
  syncLocalCallPreview();
  window.setTimeout(() => { state.call.closingUi = false; }, 0);
}

async function renegotiateCallConnections() {
  if (!state.call.active || !state.socket || !state.call.chatId) return;
  for (const [remoteUserId, pc] of state.call.connections.entries()) {
    if (!pc || pc.connectionState === 'closed' || pc.signalingState !== 'stable') continue;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      state.socket.emit('call:signal', { chatId: state.call.chatId, toUserId: remoteUserId, data: { type: 'offer', sdp: offer } });
    } catch {
      // Ignore transient renegotiation failures; the next user action will retry.
    }
  }
}

async function leaveCall(sendEvent = true) {
  if (sendEvent && state.socket && state.call.chatId) {
    state.socket.emit('call:end', { chatId: state.call.chatId });
  }
  state.call.connections.forEach((pc) => {
    try { pc.close(); } catch {}
  });
  state.call.connections.clear();
  state.call.remoteStreams.clear();
  if (state.screenStream) {
    state.screenStream.getTracks().forEach((track) => track.stop());
    state.screenStream = null;
  }
  if (state.localCallStream) {
    state.localCallStream.getTracks().forEach((track) => track.stop());
    state.localCallStream = null;
  }
  state.call.active = false;
  state.call.chatId = null;
  state.call.mode = 'audio';
  closeCallModalUi();
  updateCallButtons();
}

async function createPeerConnection(remoteUserId, shouldCreateOffer = false) {
  if (state.call.connections.has(remoteUserId)) return state.call.connections.get(remoteUserId);
  const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
  state.call.connections.set(remoteUserId, pc);
  const stream = await ensureLocalCallStream(state.call.mode);
  stream.getTracks().forEach((track) => pc.addTrack(track, stream));
  pc.onicecandidate = (event) => {
    if (event.candidate && state.socket && state.call.chatId) {
      state.socket.emit('call:signal', { chatId: state.call.chatId, toUserId: remoteUserId, data: { type: 'candidate', candidate: event.candidate } });
    }
  };
  pc.ontrack = (event) => {
    const remoteStream = event.streams?.[0] || state.call.remoteStreams.get(remoteUserId) || new MediaStream();
    if (!event.streams?.[0] && event.track && !remoteStream.getTracks().some((track) => track.id === event.track.id)) {
      remoteStream.addTrack(event.track);
    }
    state.call.remoteStreams.set(remoteUserId, remoteStream);
    renderRemoteVideos();
  };
  if (shouldCreateOffer) {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    state.socket.emit('call:signal', { chatId: state.call.chatId, toUserId: remoteUserId, data: { type: 'offer', sdp: offer } });
  }
  return pc;
}

async function startCall(mode = 'audio', existingChatId = null, incoming = false) {
  if (!state.currentChat && !existingChatId) {
    toast('Сначала открой чат.', 'error');
    return;
  }
  const chatId = existingChatId || state.currentChat.id;
  const targetChat = state.chats.find((item) => item.id === chatId) || state.currentChat;
  if (targetChat?.subtype === 'channel') {
    toast('Для каналов звонки отключены.', 'error');
    return;
  }
  if (!state.socket) {
    toast('Сокет не подключён.', 'error');
    return;
  }
  try {
    ensureCallModalTitle(chatId);
    await ensureLocalCallStream(mode);
    state.call.active = true;
    state.call.chatId = chatId;
    state.call.mode = mode;
    state.call.pendingSignals = [];
    state.call.declinedChatId = null;
    renderRemoteVideos();
    updateCallButtons();
    els.callSubtitle.textContent = incoming ? 'Подключение к звонку…' : 'Идёт вызов…';
    if (!els.callModal?.open) {
      els.callModal.showModal();
    }
    if (!incoming) {
      state.socket.emit('call:start', { chatId, mode, withVideo: mode === 'video' });
      for (const participant of getCallParticipants(chatId)) {
        await createPeerConnection(participant.id, true);
      }
    }
  } catch (error) {
    state.call.active = false;
    state.call.chatId = null;
    state.call.mode = 'audio';
    updateCallButtons();
    throw error;
  }
}

async function acceptIncomingCall(chatId, mode = 'audio') {
  if (state.call.active && state.call.chatId === chatId) return;
  await startCall(mode, chatId, true);
  const queued = [...(state.call.pendingSignals || [])].filter((item) => item.chatId === chatId);
  state.call.pendingSignals = [];
  for (const item of queued) {
    await handleCallSignal(item.chatId, item.fromUserId, item.data);
  }
}

async function handleCallSignal(chatId, fromUserId, data = {}) {
  if (!state.call.active) {
    if (state.call.declinedChatId === chatId) return;
    state.call.pendingSignals.push({ chatId, fromUserId, data });
    return;
  }
  state.call.chatId = chatId;
  const pc = await createPeerConnection(fromUserId, false);
  if (data.type === 'offer' && data.sdp) {
    await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    state.socket.emit('call:signal', { chatId, toUserId: fromUserId, data: { type: 'answer', sdp: answer } });
    els.callSubtitle.textContent = 'В звонке';
  } else if (data.type === 'answer' && data.sdp) {
    await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
    els.callSubtitle.textContent = 'В звонке';
  } else if (data.type === 'candidate' && data.candidate) {
    try {
      await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch {}
  }
}

async function toggleMic() {
  if (!state.localCallStream) return;
  state.localCallStream.getAudioTracks().forEach((track) => { track.enabled = !track.enabled; });
  updateCallButtons();
}

async function toggleCamera() {
  if (!state.call.active) return;
  await ensureLocalCallStream('video');
  const videoTracks = getLiveTracks(state.localCallStream, 'video');
  if (!videoTracks.length) return;
  const primaryTrack = videoTracks[0];
  const hadVideoSender = [...state.call.connections.values()].some((pc) => pc.getSenders().some((sender) => sender.track?.kind === 'video'));
  const nextEnabled = !videoTracks.some((track) => track.enabled);
  videoTracks.forEach((track) => { track.enabled = nextEnabled; });
  let addedNewVideoTrack = false;
  state.call.connections.forEach(async (pc) => {
    const sender = pc.getSenders().find((item) => item.track && item.track.kind === 'video');
    if (sender) {
      if (nextEnabled && sender.track !== primaryTrack) {
        await sender.replaceTrack(primaryTrack);
      }
    } else if (nextEnabled) {
      pc.addTrack(primaryTrack, state.localCallStream);
      addedNewVideoTrack = true;
    }
  });
  state.call.mode = nextEnabled ? 'video' : 'audio';
  if (els.localVideo) els.localVideo.srcObject = state.screenStream || state.localCallStream;
  updateCallButtons();
  renderRemoteVideos();
  if (nextEnabled && (!hadVideoSender || addedNewVideoTrack)) {
    await renegotiateCallConnections();
  }
}

async function shareScreen() {
  if (!navigator.mediaDevices?.getDisplayMedia || !state.call.active) return;
  try {
    if (state.screenStream) {
      state.screenStream.getTracks().forEach((track) => track.stop());
      state.screenStream = null;
      if (els.localVideo) els.localVideo.srcObject = state.localCallStream;
      return;
    }
    state.screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    const screenTrack = state.screenStream.getVideoTracks()[0];
    let addedVideoTrack = false;
    state.call.connections.forEach(async (pc) => {
      const sender = pc.getSenders().find((item) => item.track && item.track.kind === 'video');
      if (sender) await sender.replaceTrack(screenTrack);
      else {
        pc.addTrack(screenTrack, state.screenStream);
        addedVideoTrack = true;
      }
    });
    if (els.localVideo) els.localVideo.srcObject = state.screenStream;
    screenTrack.addEventListener('ended', async () => {
      const cameraTrack = state.localCallStream?.getVideoTracks()?.[0] || null;
      state.call.connections.forEach(async (pc) => {
        const sender = pc.getSenders().find((item) => item.track && item.track.kind === 'video');
        if (sender) await sender.replaceTrack(cameraTrack);
      });
      if (els.localVideo) els.localVideo.srcObject = state.localCallStream;
      state.screenStream = null;
    });
    if (addedVideoTrack) await renegotiateCallConnections();
  } catch (error) {
    toast(error.message || 'Не удалось начать демонстрацию экрана.', 'error');
  }
}

function bindSocket() {
  if (state.socket) {
    state.socket.removeAllListeners();
    state.socket.disconnect();
  }
  if (typeof window.io !== 'function') {
    toast('Realtime-модуль не загрузился. Проверь локальный Socket.IO клиент.', 'error');
    return;
  }
  state.socket = window.io({ auth: { token: state.token }, transports: ['websocket', 'polling'] });

  state.socket.on('connect', () => {
    state.lastSocketErrorAt = 0;
    state.lastSocketErrorMessage = '';
  });

  state.socket.on('connect_error', (error) => {
    const message = error?.message || 'Не удалось подключиться к realtime-серверу.';
    const now = Date.now();
    if (state.lastSocketErrorMessage !== message || now - state.lastSocketErrorAt > 5000) {
      state.lastSocketErrorMessage = message;
      state.lastSocketErrorAt = now;
      toast(`Realtime: ${message}`, 'error');
    }
    console.error('Socket connect_error:', error);
  });

  state.socket.on('chat:list', async ({ chats }) => {
    state.chats = chats;
    syncCurrentChatFromList(chats);
    await renderChats();
    renderCurrentChatHeader();
    if (state.detailsOpen && state.currentChat) renderDetails();
  });

  state.socket.on('presence:update', ({ userId, online }) => {
    state.chats = state.chats.map((chat) => ({
      ...chat,
      participants: chat.participants?.map((participant) => participant.id === userId ? { ...participant, online } : participant),
    }));
    if (state.currentChat) {
      state.currentChat = {
        ...state.currentChat,
        participants: state.currentChat.participants.map((participant) => participant.id === userId ? { ...participant, online } : participant),
      };
      renderCurrentChatHeader();
      if (state.detailsOpen) renderDetails();
    }
    renderChats();
  });

  state.socket.on('message:new', async ({ chatId, message }) => {
    const knownChat = state.chats.find((item) => item.id === chatId);
    if (state.currentChat?.id === chatId) {
      if (!state.currentMessages.some((item) => item.id === message.id)) {
        state.currentMessages.push(message);
        await renderMessages();
        await markChatRead();
      }
    }
    await refreshChatsFromApi();
    if (message.senderId !== state.user.id && !isChatMuted(chatId) && document.hidden && 'Notification' in window && Notification.permission === 'granted') {
      try {
        let body = 'Новое сообщение';
        if (message.messageType === 'text') {
          const chat = state.currentChat?.id === chatId ? state.currentChat : knownChat;
          if (chat) {
            const chatKey = await getOrLoadChatKey(chat);
            body = await decryptTextForChat(chatKey, message.ciphertext, message.iv);
          }
        } else if (message.messageType === 'file') {
          body = message.meta?.voice ? 'Голосовое сообщение' : message.meta?.videoNote ? 'Кружок' : 'Файл';
        } else {
          body = message.systemText;
        }
        new Notification(knownChat?.title || BRAND_NAME, { body });
      } catch {
        new Notification(BRAND_NAME, { body: 'Новое сообщение' });
      }
    }
  });

  state.socket.on('message:update', async ({ chatId, message }) => {
    if (state.currentChat?.id === chatId) {
      const idx = state.currentMessages.findIndex((item) => item.id === message.id);
      if (idx >= 0) state.currentMessages[idx] = message;
      await renderMessages();
      renderReplyBanner();
    }
    await refreshChatsFromApi();
  });

  state.socket.on('chat:read', async ({ chatId, userId, messageId }) => {
    if (state.currentChat?.id === chatId && userId !== state.user.id) {
      state.currentMessages = state.currentMessages.map((message) => ({
        ...message,
        readByPeer: message.id <= messageId ? true : message.readByPeer,
      }));
      await renderMessages();
    }
    await refreshChatsFromApi();
  });

  state.socket.on('chat:updated', async ({ chat }) => {
    if (chat && state.currentChat?.id === chat.id) {
      state.currentChat = chat;
      renderCurrentChatHeader();
      renderDetails();
    }
    await refreshChatsFromApi();
  });

  state.socket.on('call:incoming', async ({ chatId, fromName, mode }) => {
    const accept = window.confirm(`${fromName || 'Пользователь'} звонит тебе (${mode === 'video' ? 'видео' : 'аудио'}). Принять?`);
    if (!accept) {
      state.call.declinedChatId = chatId;
      state.call.pendingSignals = [];
      return;
    }
    try {
      await acceptIncomingCall(chatId, mode === 'video' ? 'video' : 'audio');
      els.callSubtitle.textContent = 'Подключение к звонку…';
    } catch (error) {
      toast(error.message || 'Не удалось принять звонок.', 'error');
    }
  });

  state.socket.on('call:signal', async ({ chatId, fromUserId, data }) => {
    try {
      await handleCallSignal(chatId, fromUserId, data);
    } catch (error) {
      toast(error.message || 'Ошибка сигнального канала звонка.', 'error');
    }
  });

  state.socket.on('call:end', ({ chatId }) => {
    if (state.call.active && state.call.chatId === chatId) {
      toast('Звонок завершён.', 'success');
      leaveCall(false);
    }
  });

  // ===== TYPING EVENTS =====
  state.socket.on('typing:start', ({ chatId, userId, name }) => {
    if (userId === state.user?.id) return;
    if (!state.typingUsers.has(chatId)) state.typingUsers.set(chatId, new Map());
    const map = state.typingUsers.get(chatId);
    if (map.has(userId)) clearTimeout(map.get(userId).timer);
    const timer = setTimeout(() => {
      map.delete(userId);
      if (state.currentChat?.id === chatId) renderTypingIndicator();
    }, 4000);
    map.set(userId, { name, timer });
    if (state.currentChat?.id === chatId) renderTypingIndicator();
  });

  state.socket.on('typing:stop', ({ chatId, userId }) => {
    const map = state.typingUsers.get(chatId);
    if (!map) return;
    if (map.has(userId)) clearTimeout(map.get(userId).timer);
    map.delete(userId);
    if (state.currentChat?.id === chatId) renderTypingIndicator();
  });

  // ===== REACTION EVENTS =====
  state.socket.on('reaction:update', ({ messageId, reactions }) => {
    applyReactionUpdate({ messageId, reactions });
  });
}

function bindV7Events() {
  loadThemes();
  renderThemeList();
  els.profileAvatarTrigger?.addEventListener('click', () => els.profileAvatar?.click());
  els.profileName?.addEventListener('input', syncProfileAvatarPreview);
  els.profileAvatar?.addEventListener('change', syncProfileAvatarPreview);
  [els.themeBg, els.themeSurface, els.themePrimary, els.themePrimary2, els.themeText, els.themeMuted].forEach((input) => {
    input?.addEventListener('input', () => applyTheme(readThemeFromInputs()));
  });
  els.saveThemeButton?.addEventListener('click', saveThemeFromInputs);
  els.resetThemeButton?.addEventListener('click', () => {
    applyTheme(cloneData(DEFAULT_THEME));
    state.activeThemeId = DEFAULT_THEME.id;
    persistThemes();
  });
  els.exportThemeButton?.addEventListener('click', exportActiveTheme);
  els.importThemeButton?.addEventListener('click', () => els.themeImportInput?.click());
  els.themeImportInput?.addEventListener('change', async () => {
    const file = els.themeImportInput.files?.[0];
    if (file) await importThemeFile(file);
    els.themeImportInput.value = '';
  });

  if (els.detailsActionCall) {
    const clone = els.detailsActionCall.cloneNode(true);
    els.detailsActionCall.replaceWith(clone);
    els.detailsActionCall = clone;
    clone.addEventListener('click', async () => {
      if (state.currentChat?.subtype === 'channel') return;
      ensureCallModalTitle(state.currentChat?.id);
      els.callSubtitle.textContent = 'Выбери тип звонка';
      els.callModal.showModal();
    });
  }
  els.startAudioCall?.addEventListener('click', async () => {
    try {
      await startCall('audio');
    } catch (error) {
      toast(error.message || 'Не удалось начать звонок.', 'error');
    }
  });
  els.startVideoCall?.addEventListener('click', async () => {
    try {
      await startCall('video');
    } catch (error) {
      toast(error.message || 'Не удалось начать видеозвонок.', 'error');
    }
  });
  els.toggleMic?.addEventListener('click', toggleMic);
  els.toggleCamera?.addEventListener('click', async () => {
    try {
      await toggleCamera();
    } catch (error) {
      toast(error.message || 'Не удалось переключить камеру.', 'error');
    }
  });
  els.shareScreen?.addEventListener('click', shareScreen);
  els.leaveCall?.addEventListener('click', () => leaveCall(true));
  els.callClose?.addEventListener('click', () => leaveCall(true));
  els.callModal?.addEventListener('close', () => {
    if (state.call.active && !state.call.closingUi) leaveCall(true);
  });
  els.imagePreviewClose?.addEventListener('click', () => els.imagePreviewModal?.close());
  els.imagePreviewModal?.addEventListener('click', (event) => {
    const card = els.imagePreviewModal.querySelector('.image-preview-card');
    if (card && !card.contains(event.target)) els.imagePreviewModal.close();
  });
}

bindEvents();
bindV7Events();
restoreSession();

// PWA: register service worker and basic install handlers
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js', { updateViaCache: 'none' })
      .then((reg) => {
        reg.update().catch(() => {});
        console.log('ServiceWorker registered:', reg.scope);
        if (typeof toast === 'function') toast('Service worker зарегистрирован.', 'success');
      })
      .catch((err) => console.warn('SW registration failed:', err));
  });
}

let deferredPwaPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPwaPrompt = e;
  if (typeof toast === 'function') toast('Готово: можно установить приложение через меню браузера.', 'info');
});

window.addEventListener('appinstalled', () => {
  if (typeof toast === 'function') toast('Приложение установлено.', 'success');
  console.log('PWA installed');
});
