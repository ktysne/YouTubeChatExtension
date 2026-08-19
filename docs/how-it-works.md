# 動作の仕組み

この文書では、幅変更とポップアウト検知がどのように実現されているかを説明する。
いずれも 2026 年 8 月時点の YouTube の DOM 構造を実際のページで調べて設計したものであり、YouTube 側の変更で動かなくなる可能性がある。

## チャット幅の変更

### YouTube がチャット幅を決めている場所

視聴ページのレイアウトは `ytd-watch-flexy` 要素が担っている。
この要素のインラインスタイルに CSS 変数 `--ytd-watch-flexy-sidebar-width` が設定されており、YouTube の JavaScript がウィンドウ幅に応じて値を計算し直す。

チャット欄（`ytd-live-chat-frame#chat`）とサイドバー（`#secondary`）の幅は、どちらもこの変数を参照している。

```css
#secondary.ytd-watch-flexy {
  width: var(--ytd-watch-flexy-sidebar-width);
  min-width: var(--ytd-watch-flexy-sidebar-min-width);
}
/* シアターモード */
ytd-watch-flexy[fixed-panels] #chat.ytd-watch-flexy {
  position: fixed;
  right: 0;
  width: var(--ytd-watch-flexy-sidebar-width);
}
ytd-watch-flexy[fixed-panels] #columns.ytd-watch-flexy {
  padding-right: var(--ytd-watch-flexy-sidebar-width);
}
```

通常表示でもシアターモードでも同じ変数が使われているため、この変数を一箇所で上書きすれば両方の表示に効く。

### 上書きの方法

`watch.js` は `<style>` 要素を 1 つ挿入し、次のルールを書き込む。

```css
ytd-watch-flexy[live-chat-present-and-expanded] {
  --ytd-watch-flexy-sidebar-width: 689px !important;
  --ytd-watch-flexy-sidebar-min-width: 689px !important;
}
```

インラインスタイルは通常のスタイルシートより優先されるが、`!important` 付きのスタイルシートはインラインスタイル（`!important` なし）より優先される。
YouTube が変数を再計算してインラインスタイルを書き換えても、この上書きが勝ち続ける。

セレクタを `[live-chat-present-and-expanded]` で限定しているのは、ライブチャットが表示されている間だけ効かせるためである。
この属性はチャットが折りたたまれると外れるので、通常の動画ページや、チャットを閉じた状態では関連動画欄の幅が変わらない。

### プレーヤーの追従

動画プレーヤー（`#movie_player`）は、ウィンドウの `resize` イベントを受けて自身の大きさを計算し直す。
CSS 変数を変えただけでは枠だけが動いて動画の描画サイズが古いまま残ることがあるため、幅を変更するたびに `requestAnimationFrame` でまとめて `window.dispatchEvent(new Event('resize'))` を呼んでいる。

### ドラッグハンドル

`ytd-live-chat-frame#chat` の子要素として `div#ycw-resize-handle` を追加し、`position: absolute; left: 0; top: 0; bottom: 0; width: 10px` で左端に置いている。
チャット欄は通常表示では `position: relative`、シアターモードでは `position: fixed` なので、どちらでも絶対配置の基準になる。

ドラッグは Pointer Events で処理する。
`pointerdown` で `setPointerCapture` を呼び、その後の `pointermove` でチャット欄の右端とマウス位置の差を新しい幅とする。
チャット欄の中身は同一オリジンの `<iframe>` だが、ドラッグ中にマウスが iframe 上に入るとイベントが iframe に奪われるため、ドラッグ中は `html.ycw-dragging-active iframe#chatframe { pointer-events: none }` を効かせている。

幅の下限は 250px、上限はウィンドウ幅から 700px を引いた値にしている。
YouTube 側でプレーヤーの最小幅（`calc(480px * 16 / 9)` = 853px）が決まっており、これを大きく下回るとレイアウトが崩れるためである。

`pointerup` で `chrome.storage.sync` に幅を保存する。
ダブルクリックで保存値を `null` に戻し、`<style>` を削除して YouTube 標準の幅に戻す。

チャット欄の要素は SPA 遷移やチャットの開閉で作り直されるため、`MutationObserver` と 3 秒おきのタイマーでハンドルの有無を確認し、なければ付け直している。

## ポップアウトの検知

### なぜ視聴ページだけでは検知できないか

チャットメニューの「チャットをポップアウト」を選ぶと、YouTube はチャット iframe の中から `window.open` で `https://www.youtube.com/live_chat?is_popout=1&v=<videoId>` を開く。
このとき、視聴ページ側の DOM には「ポップアウト中」を示す属性やクラスが付かない（調査時点で、`ytd-live-chat-frame` にも `ytd-watch-flexy` にも変化はなかった）。
そのため、視聴ページだけを見ていてもポップアウトが開いたことは分からない。

### 採用した方式

ポップアウトウィンドウ自体にコンテンツスクリプト（`popout.js`）を入れ、そこから「開いている」ことを伝える方式にした。

1. `popout.js` は、トップレベルのウィンドウで URL に `is_popout=1` があるときだけ動く（視聴ページ内の埋め込みチャット iframe は `all_frames: false` のため対象外）。
2. `chrome.runtime.connect({ name: 'ycw-popout' })` でサービスワーカーに接続し、動画 ID を送る。
3. `background.js` は動画 ID ごとに接続中のポートを数え、`chrome.storage.local` の `ycw_popouts` に `{ videoId: 接続数 }` を書き出す。
4. ポップアウトウィンドウが閉じるとポートが切断され、`background.js` は `onDisconnect` で接続数を減らして書き直す。
5. `watch.js` は `chrome.storage.onChanged` で `ycw_popouts` を監視し、自分の動画 ID が含まれていればチャットを折りたたみ、外れれば復元する。

視聴ページ側の通知を `chrome.storage` 経由にしたのは、視聴ページが後から開かれた場合（ポップアウトを開いたあとでページを再読み込みした場合など）でも、読み込み時に `storage.local.get` を 1 回呼べば現在の状態が分かるからである。

### サービスワーカーの停止への備え

Manifest V3 のサービスワーカーはアイドル状態が続くと停止される。
停止するとポートも切れるため、`popout.js` は `onDisconnect` を受けたら 0.5 秒後に再接続する。
また 20 秒おきに `ping` メッセージを送り、アイドルタイマーをリセットしている。

`background.js` は起動時（再起動時を含む）に `ycw_popouts` を空にしてから、再接続してくるポップアウトで埋め直す。
この間、視聴ページは一瞬「閉じた」と判定するので、`watch.js` は「閉じた」判定から 1.2 秒待ってから復元し、その間に「開いた」に戻ればちらつかないようにしている。

### 折りたたみの方法

折りたたみには YouTube 自身の「チャットを非表示／表示」ボタン（`ytd-live-chat-frame#chat` 内の `#show-hide-button button`）をクリックしている。
現在の UI ではこのボタンは非表示だが、`click()` は機能し、YouTube 側のレイアウト切り替え（シアターモードでプレーヤーを全幅にする等）まで含めて正しく処理される。
独自に `display: none` で隠すより、YouTube の状態と食い違わない。

ボタンが見つからなかった場合のフォールバックとして、`html.ycw-force-hide-chat` クラスを付けて CSS で隠す経路も残している。

拡張機能が折りたたんだかどうかは `collapsedByUs` フラグで覚えておく。
ユーザーが自分で閉じていた場合は触らず、ポップアウトが閉じても開き直さない。
逆に、拡張機能が閉じたあとでユーザーが開き直した場合は、それを尊重して閉じ直さない。
