# プロジェクトガイドライン

このファイルは AI コーディングエージェント（Claude Code など）向けの共通指示を記載する。

## 言語

このプロジェクトでは日本語を共通言語とする。具体的には以下をすべて日本語で書くこと。

- セッション中の応答・説明・報告などの出力
- コミットメッセージ
- Pull Request のタイトルと本文
- Issue やレビューコメントなど、リポジトリ上のやり取り

コード中の識別子（変数名・関数名など）は慣例どおり英語でよい。コメントやドキュメントは日本語で書く。

## プロジェクト概要

YouTube ライブ配信のチャット欄をドラッグで横幅変更し、ポップアウト中はページ内チャットを非表示にする Chrome 拡張機能（Manifest V3）。
ビルド工程はなく、フォルダをそのまま `chrome://extensions` から読み込む。

- ユーザー向けの説明は [README.md](README.md)
- 構成と仕組みは [docs/architecture.md](docs/architecture.md)、[docs/how-it-works.md](docs/how-it-works.md)
- 動作確認の手順と、YouTube 側の DOM 変更時に確認すべき依存箇所は [docs/development.md](docs/development.md)

```powershell
node --check watch.js; node --check background.js; node --check popout.js; node --check popup.js   # 構文チェック
```

## CLAUDE.md と AGENTS.md の同期

`CLAUDE.md` と `AGENTS.md` は同一内容を保つ。どちらか一方を変更した場合は、必ずもう一方にも同じ変更を反映すること。片方だけを更新した状態でコミットしてはならない。
