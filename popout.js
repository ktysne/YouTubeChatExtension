// ポップアウトチャットウィンドウ (https://www.youtube.com/live_chat?is_popout=1&v=...) 側。
// バックグラウンドに接続し続けることで「ポップアウト中」であることを伝える。
(() => {
  if (window.top !== window) return; // 視聴ページ内の埋め込み iframe では何もしない

  const params = new URLSearchParams(location.search);
  if (params.get('is_popout') !== '1') return;
  const videoId = params.get('v');
  if (!videoId) return;

  let port = null;
  let pingTimer = null;
  let stopped = false;

  function connect() {
    if (stopped) return;
    try {
      port = chrome.runtime.connect({ name: 'ycw-popout' });
    } catch (e) {
      // 拡張機能が更新/無効化された場合など
      return;
    }
    port.postMessage({ type: 'hello', videoId });

    clearInterval(pingTimer);
    pingTimer = setInterval(() => {
      try { port.postMessage({ type: 'ping' }); } catch (e) { /* ignore */ }
    }, 20000);

    port.onDisconnect.addListener(() => {
      clearInterval(pingTimer);
      port = null;
      // サービスワーカーが停止した場合などは再接続する
      if (!stopped) setTimeout(connect, 500);
    });
  }

  connect();

  window.addEventListener('pagehide', () => {
    stopped = true;
    clearInterval(pingTimer);
    try { port && port.disconnect(); } catch (e) { /* ignore */ }
  });
})();
