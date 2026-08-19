// YouTube 視聴ページ側。
//  1. チャット欄 (ytd-live-chat-frame#chat) の左端にドラッグハンドルを付け、横幅を可変にする。
//     幅は ytd-watch-flexy の CSS 変数 --ytd-watch-flexy-sidebar-width を上書きして反映する
//     (通常モード / シアターモードの両方でこの変数がチャット幅を決めている)。
//  2. チャットがポップアウトされている間は、ページ内のチャット領域を折りたたんで非表示にする。
(() => {
  const STYLE_ID = 'ycw-width-style';
  const HANDLE_ID = 'ycw-resize-handle';
  const POPOUT_KEY = 'ycw_popouts';
  const SETTINGS_KEY = 'ycw_settings';
  const MIN_WIDTH = 250;
  const RIGHT_RESERVE = 700; // プレーヤー側に最低限残す幅(px)

  const DEFAULT_SETTINGS = {
    width: null,          // null = YouTube 既定幅
    hideOnPopout: true,
  };
  let settings = { ...DEFAULT_SETTINGS };

  let currentVideoId = null;
  let popoutOpen = false;
  let collapsedByUs = false;
  let popoutCloseTimer = null;
  let resizeRaf = 0;

  // ---------- ユーティリティ ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const getChat = () => $('ytd-watch-flexy ytd-live-chat-frame#chat');
  const getVideoId = () => {
    try { return new URL(location.href).searchParams.get('v'); } catch (e) { return null; }
  };
  const clampWidth = (w) => {
    const max = Math.max(MIN_WIDTH, window.innerWidth - RIGHT_RESERVE);
    return Math.round(Math.min(max, Math.max(MIN_WIDTH, w)));
  };

  function notifyPlayerResize() {
    // プレーヤー(#movie_player)は window の resize を見てサイズを計算し直すため、
    // 幅を変えたら resize イベントを投げる
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = 0;
      window.dispatchEvent(new Event('resize'));
    });
  }

  // ---------- 幅の適用 ----------
  function applyWidth(width) {
    let st = document.getElementById(STYLE_ID);
    if (!width) {
      if (st) st.remove();
      notifyPlayerResize();
      return;
    }
    if (!st) {
      st = document.createElement('style');
      st.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(st);
    }
    // ライブチャットが表示されている時だけ上書きする
    // (通常動画の「関連動画」欄の幅は変えない)
    st.textContent =
      'ytd-watch-flexy[live-chat-present-and-expanded]{' +
      '--ytd-watch-flexy-sidebar-width:' + width + 'px !important;' +
      '--ytd-watch-flexy-sidebar-min-width:' + width + 'px !important;}';
    notifyPlayerResize();
  }

  function saveWidth(width) {
    settings.width = width;
    chrome.storage.sync.set({ [SETTINGS_KEY]: settings });
  }

  // ---------- ドラッグハンドル ----------
  function ensureHandle() {
    const chat = getChat();
    if (!chat) return;
    if (chat.querySelector('#' + HANDLE_ID)) return;

    const handle = document.createElement('div');
    handle.id = HANDLE_ID;
    handle.title = 'ドラッグでチャット幅を変更 / ダブルクリックで既定幅に戻す';
    chat.appendChild(handle);

    let dragging = false;
    let lastWidth = null;

    handle.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      dragging = true;
      lastWidth = null;
      handle.setPointerCapture(e.pointerId);
      handle.classList.add('ycw-dragging');
      document.documentElement.classList.add('ycw-dragging-active');
    });

    handle.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const rect = chat.getBoundingClientRect();
      // チャットの右端は固定。マウス位置との差が新しい幅
      const w = clampWidth(rect.right - e.clientX);
      if (w !== lastWidth) {
        lastWidth = w;
        applyWidth(w);
      }
    });

    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      try { handle.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      handle.classList.remove('ycw-dragging');
      document.documentElement.classList.remove('ycw-dragging-active');
      if (lastWidth) saveWidth(lastWidth);
    };
    handle.addEventListener('pointerup', endDrag);
    handle.addEventListener('pointercancel', endDrag);

    handle.addEventListener('dblclick', (e) => {
      e.preventDefault();
      e.stopPropagation();
      saveWidth(null);
      applyWidth(null);
    });
  }

  // ---------- ポップアウト時の非表示 ----------
  function getShowHideButton() {
    const chat = getChat();
    if (!chat) return null;
    return chat.querySelector('#show-hide-button button');
  }

  function collapseChat() {
    const chat = getChat();
    if (!chat) return;
    if (chat.hasAttribute('collapsed')) return; // 既に閉じている(ユーザー操作など)
    const btn = getShowHideButton();
    if (btn) {
      btn.click();
      collapsedByUs = true;
    } else {
      // ボタンが見つからない場合は CSS で強制非表示
      document.documentElement.classList.add('ycw-force-hide-chat');
      collapsedByUs = true;
    }
  }

  function expandChat() {
    document.documentElement.classList.remove('ycw-force-hide-chat');
    if (!collapsedByUs) return;
    collapsedByUs = false;
    const chat = getChat();
    if (!chat || !chat.hasAttribute('collapsed')) return;
    const btn = getShowHideButton();
    if (btn) btn.click();
  }

  function syncPopoutState() {
    const shouldHide = settings.hideOnPopout && popoutOpen && !!currentVideoId;
    if (shouldHide) {
      clearTimeout(popoutCloseTimer);
      popoutCloseTimer = null;
      collapseChat();
    } else if (collapsedByUs) {
      // サービスワーカー再起動時の一瞬の「閉じた」判定でちらつかないよう、少し待ってから戻す
      if (popoutCloseTimer) return;
      popoutCloseTimer = setTimeout(() => {
        popoutCloseTimer = null;
        if (!(settings.hideOnPopout && popoutOpen)) expandChat();
      }, 1200);
    }
  }

  function readPopoutState() {
    chrome.storage.local.get(POPOUT_KEY, (res) => {
      if (chrome.runtime.lastError) return;
      const map = (res && res[POPOUT_KEY]) || {};
      popoutOpen = !!(currentVideoId && map[currentVideoId] > 0);
      syncPopoutState();
    });
  }

  // ---------- ページ遷移 (YouTube は SPA) ----------
  function onNavigate() {
    const v = getVideoId();
    if (v !== currentVideoId) {
      currentVideoId = v;
      collapsedByUs = false; // 動画が変わればチャットの状態もリセットされる
      document.documentElement.classList.remove('ycw-force-hide-chat');
      clearTimeout(popoutCloseTimer);
      popoutCloseTimer = null;
    }
    readPopoutState();
    ensureHandle();
  }

  // ---------- 初期化 ----------
  function init() {
    chrome.storage.sync.get(SETTINGS_KEY, (res) => {
      if (!chrome.runtime.lastError && res && res[SETTINGS_KEY]) {
        settings = { ...DEFAULT_SETTINGS, ...res[SETTINGS_KEY] };
      }
      applyWidth(settings.width);
      onNavigate();
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes[POPOUT_KEY]) {
        const map = changes[POPOUT_KEY].newValue || {};
        popoutOpen = !!(currentVideoId && map[currentVideoId] > 0);
        syncPopoutState();
      }
      if (area === 'sync' && changes[SETTINGS_KEY]) {
        settings = { ...DEFAULT_SETTINGS, ...(changes[SETTINGS_KEY].newValue || {}) };
        applyWidth(settings.width);
        syncPopoutState();
      }
    });

    document.addEventListener('yt-navigate-finish', onNavigate);
    window.addEventListener('popstate', onNavigate);

    // チャット要素は後から生成される/作り直されるので監視してハンドルを付け直す
    const mo = new MutationObserver(() => {
      if (!currentVideoId) return;
      ensureHandle();
      if (popoutOpen && settings.hideOnPopout && !collapsedByUs) collapseChat();
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });

    // 保険: 数秒おきに状態を確認(MutationObserver の取りこぼし対策)
    setInterval(() => {
      if (!currentVideoId) return;
      ensureHandle();
    }, 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
