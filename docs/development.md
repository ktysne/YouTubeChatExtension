# 開発と動作確認

この文書では、コードを変更したあとの読み込み直しと、動作確認の手順を説明する。

## 読み込み直し

ビルド工程はない。
ファイルを編集したら、`chrome://extensions` でこの拡張機能の「更新」（円形矢印）ボタンを押し、YouTube のページを再読み込みする。

`background.js` を変えたときはサービスワーカーが再起動する。
`popout.js` を変えたときは、開いているポップアウトウィンドウも再読み込みしないと古いスクリプトが動き続ける。

## 構文チェック

Node.js があれば、次のコマンドで各ファイルの構文だけを確認できる。

```bash
node --check watch.js && node --check background.js && node --check popout.js && node --check popup.js
```

## 動作確認の手順

ライブ配信中（またはライブチャットのリプレイがある）動画ページで確認する。

### 幅の変更

1. チャット欄の左端にマウスを合わせ、青い帯が出ることを確認する。
2. 左右にドラッグし、チャット欄と動画プレーヤーの幅が同時に変わることを確認する。
3. ページを再読み込みし、幅が維持されていることを確認する。
4. プレーヤーのシアターモードボタンで表示を切り替え、同じ幅が適用されることを確認する。
5. 帯をダブルクリックし、標準の幅に戻ることを確認する。

### ポップアウト時の非表示

1. チャット欄右上のメニューから「チャットをポップアウト」を選ぶ。
2. 視聴ページ側のチャット欄が閉じることを確認する（シアターモードならプレーヤーが全幅になる）。
3. ポップアウトウィンドウを閉じ、1〜2 秒以内にチャット欄が戻ることを確認する。
4. ポップアウトを開いたまま視聴ページを再読み込みし、読み込み直後にチャット欄が閉じた状態になることを確認する。

### 状態の確認

サービスワーカーのコンソール（`chrome://extensions` の「Service Worker」リンク）で次を実行すると、現在ポップアウト中と認識している動画 ID が見られる。

```js
chrome.storage.local.get('ycw_popouts', console.log)
```

視聴ページの DevTools コンソールでは、上書き中の幅を次で確認できる。

```js
document.getElementById('ycw-width-style')?.textContent
```

## YouTube 側の変更で動かなくなったとき

依存している DOM とスタイルは次の 4 点である。
動かなくなった場合は、まずこれらが残っているかを確認する。

- `ytd-watch-flexy` 上の CSS 変数 `--ytd-watch-flexy-sidebar-width`（幅の上書き先）
- `ytd-watch-flexy` の属性 `live-chat-present-and-expanded`（上書きを効かせる条件）
- `ytd-live-chat-frame#chat` と、その中の `#show-hide-button button`（折りたたみ操作）
- ポップアウトの URL 形式 `/live_chat?is_popout=1&v=<videoId>`（ポップアウト検知）

調べ方は、視聴ページの DevTools で次を実行するのが早い。

```js
const f = document.querySelector('ytd-watch-flexy');
console.log([...f.attributes].map(a => a.name));
console.log(getComputedStyle(f).getPropertyValue('--ytd-watch-flexy-sidebar-width'));
console.log(document.querySelector('ytd-live-chat-frame#chat #show-hide-button button'));
```
