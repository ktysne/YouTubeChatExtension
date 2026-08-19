# 全体の構成

この文書では、拡張機能を構成するファイルと、それぞれがどのページで動くかを説明する。

## ファイル構成

| ファイル | 動作する場所 | 役割 |
| --- | --- | --- |
| `manifest.json` | （定義） | Manifest V3 の拡張機能定義 |
| `watch.js` | 視聴ページ（`https://www.youtube.com/*`、`live_chat` と `embed` を除く） | ドラッグハンドルの設置、幅の適用、ポップアウト中のチャット折りたたみ |
| `watch.css` | 視聴ページ | ハンドルの見た目、ドラッグ中のカーソル制御、強制非表示用のスタイル |
| `popout.js` | ポップアウトウィンドウ（`https://www.youtube.com/live_chat?is_popout=1&v=...`） | 開いていることをバックグラウンドへ通知 |
| `background.js` | サービスワーカー | ポップアウトの接続状態を `chrome.storage.local` に書き出す |
| `popup.html` / `popup.js` | ツールバーのポップアップ | 設定画面（自動非表示の ON/OFF、幅の数値指定） |
| `icons/` | （定義） | ツールバーと拡張機能一覧で使うアイコン |

## コンポーネント間の関係

```
[ポップアウトウィンドウ]          [サービスワーカー]              [視聴ページ]
   popout.js  --runtime.connect-->  background.js                    watch.js
                                       |                                ^
                                       +-- storage.local に書き込み ----+
                                           (storage.onChanged で購読)

[ツールバーのポップアップ]
   popup.js  --storage.sync に書き込み--> watch.js (storage.onChanged で購読)
```

視聴ページとポップアウトウィンドウは直接通信しない。
両者の仲介はバックグラウンドと `chrome.storage` が担う。
この構成にした理由は [how-it-works.md](how-it-works.md) の「ポップアウトの検知」で述べる。

## 設定の保存先

| キー | 保存先 | 内容 |
| --- | --- | --- |
| `ycw_settings` | `chrome.storage.sync` | `{ width: number \| null, hideOnPopout: boolean }` |
| `ycw_popouts` | `chrome.storage.local` | `{ [videoId]: 接続数 }`。ポップアウトが開いている動画 ID の一覧 |

`ycw_settings` は `watch.js` と `popup.js` の両方が読み書きする。
`ycw_popouts` は `background.js` だけが書き、`watch.js` は読むだけである。

## 権限

`permissions` は `storage` のみ。
コンテンツスクリプトの `matches` が `https://www.youtube.com/*` なので、インストール時に「www.youtube.com のデータの読み取りと変更」の許可が求められる。
