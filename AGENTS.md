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

`CLAUDE.md` と `AGENTS.md` は同一内容を保つ。どちらか一方を変更した場合は、必ずもう一方にも同じ変更を反映すること。片方だけを更新した状態でコミットしてはならない。ただし、片方のエージェントにしか関係しない記述は同期の対象外とする。「モデル役割分担」は Claude のサブエージェント運用を定めた節なので、`CLAUDE.md` にだけ置き、Codex 向けの `AGENTS.md` には書かない。

## リモートセッション時の作業について

### AI 相互レビュー（ai-cross-review）
相互レビューの手順の正本は [docs/cross-review.md](docs/cross-review.md)（vendored）と、グローバル SKILL `~/.claude/skills/cross-review/SKILL.md`（無い環境では vendored の [.claude/skills/cross-review/SKILL.md](.claude/skills/cross-review/SKILL.md)）である。
このリポジトリ固有のレビュー観点は `.cross-review.md` にある。
3 択、サーキットブレーカー、PR 運用といった汎用ルールはここに写さず、SKILL を参照する。

- 検証コマンド: `npm run check`（`node --check` による 4 ファイルの構文チェック。ビルド工程もテストも無い）
- 基盤の更新: `npm run sync`（検査は `npm run sync:check`、上流の配布物の取りこぼし確認は `node tools/cross-review.sync.js --check-manifest`）で上流から取り込む。更新手順は「同期 → 表示された移行ノートの作業 → 上の検証コマンド」の順。
- レビューの起点: 既定のレビュアーは実装者と別のベンダーで、実装を一区切りしたら 3 択を `AskUserQuestion` で提示する（詳細は SKILL）。指摘、対応、妥当性確認は PR コメントに残し、本文は `.cross-review/round-<N>-triage.md` を書いて `node tools/cross-review.js comment --round <N>` で生成する。
