// ポップアウトチャットの開閉状態を管理するサービスワーカー。
// popout.js (ポップアウトウィンドウ) が runtime.connect で接続してくる間は
// そのビデオIDを「ポップアウト中」として chrome.storage.local に記録し、
// watch.js (視聴ページ) は storage.onChanged でそれを監視する。

const STORAGE_KEY = 'ycw_popouts';

/** @type {Map<string, Set<chrome.runtime.Port>>} videoId -> ports */
const popouts = new Map();

function publish() {
  const obj = {};
  for (const [videoId, ports] of popouts) {
    if (ports.size > 0) obj[videoId] = ports.size;
  }
  chrome.storage.local.set({ [STORAGE_KEY]: obj });
}

// サービスワーカー起動時(再起動含む)は状態をリセットする。
// 生きているポップアウトは再接続してくるので、すぐに復元される。
popouts.clear();
publish();

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'ycw-popout') return;

  let videoId = null;

  port.onMessage.addListener((msg) => {
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'hello' && typeof msg.videoId === 'string' && msg.videoId) {
      if (videoId && videoId !== msg.videoId) detach();
      videoId = msg.videoId;
      if (!popouts.has(videoId)) popouts.set(videoId, new Set());
      popouts.get(videoId).add(port);
      publish();
    }
    // msg.type === 'ping' はサービスワーカーの idle タイマーをリセットするためだけのもの
  });

  function detach() {
    if (!videoId) return;
    const set = popouts.get(videoId);
    if (set) {
      set.delete(port);
      if (set.size === 0) popouts.delete(videoId);
    }
    publish();
  }

  port.onDisconnect.addListener(detach);
});
