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

## クロスレビュー（ai-cross-review）

Claude ↔ Codex の相互レビューは [ai-cross-review](https://github.com/ktysne/ai-cross-review) を同期導入している。手順の詳細は [docs/cross-review.md](docs/cross-review.md)、観点は [.cross-review.md](.cross-review.md)。

```powershell
npm run review:codex                   # 現在ブランチ (origin/main 比較) を Codex がレビュー (read-only)
npm run review:claude                  # 同上を Claude がレビュー
npm run review:codex -- --uncommitted  # 未コミット差分をレビュー
node tools/cross-review.js subagent --uncommitted  # CLI を起動できない環境: プロンプトのみ出力
npm run sync:check                     # vendored ファイルのドリフト検査
npm run sync                           # 上流から vendored ファイルを再同期
```

vendored ファイル（`tools/cross-review*.js`、`docs/cross-review.md`、`.cross-review.example.md`、`.claude/skills/cross-review/SKILL.md`）は直接編集しない（上流へ PR し `npm run sync` で取り込む）。プロジェクト固有の観点は `.cross-review.md` を編集する。

## CLAUDE.md と AGENTS.md の同期

`CLAUDE.md` と `AGENTS.md` は同一内容を保つ。どちらか一方を変更した場合は、必ずもう一方にも同じ変更を反映すること。片方だけを更新した状態でコミットしてはならない。
