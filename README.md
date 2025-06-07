# Lexicore - 言葉によって変化するメディアアート

## 概要

Lexicoreは、ユーザーの入力した言葉の善性・悪性を判定し、その判定結果に基づいてリアルタイムでビジュアルとAIの応答が変化するインタラクティブなメディアアートプロジェクトです。

### 主な特徴
- 💚 **言葉の善性判定** - OpenAI GPTを使用して、入力されたメッセージの善性（Echo）と悪性（Corrosion）を判定
- 🎨 **リアルタイムビジュアル** - p5.jsを使用した3Dハートアニメーションが言葉に応じて変化
- 🔊 **サウンドエフェクト** - ハートの鼓動と赤点滅時のノイズ音
- 💬 **インタラクティブチャット** - WebSocketによるリアルタイム通信

## システム構成

```
lexicore/
├── lexicore-front/     # フロントエンド (Next.js + React)
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.js       # ホーム画面（メディアアート表示）
│   │   │   └── chat/
│   │   │       └── page.js   # チャット画面
│   │   └── components/       # Reactコンポーネント
│   └── public/
│       └── sound/           # 音声ファイル
│           ├── beat.mp3     # 鼓動音
│           └── noise.mp3    # ノイズ音
└── lexicore-back/      # バックエンド (Sinatra + Ruby)
    ├── app.rb          # メインサーバー
    └── Gemfile         # 依存関係定義
```

## データフローと動作原理

### 1. メッセージ送信フロー
```
[チャット画面] → WebSocket → [Sinatraサーバー]
```
- ユーザーがチャット画面（`/chat`）でメッセージを入力
- WebSocket経由でメッセージと現在のEcho/Corrosion値を送信
- メッセージ形式: `{message: "内容", echo: 100, corrosion: 1, fromClient: true}`

### 2. 善性判定フロー
```
[Sinatraサーバー] → OpenAI API → [善性判定結果]
```
- サーバーがGPT-4oに善性判定を依頼
- プロンプト: メッセージから`echo`（0-10）と`corrosion`（0-10）を判定
- 基本ルール: `echo + corrosion = 10`
- 攻撃的・悪意のあるメッセージ: `echo=0, corrosion=10`

### 3. ビジュアル変化フロー
```
[善性判定結果] → WebSocket → [ホーム画面] → [p5.jsビジュアル]
```
- **Echo値** → ハートの滑らかさを制御（1-200）
  - 低い値: カクカクした立方体
  - 高い値: 滑らかなハート型
- **Corrosion値** → 赤点滅確率を制御（1-100）
  - 低い値: 穏やかな緑の鼓動
  - 高い値: 頻繁な赤い点滅

### 4. AI応答生成フロー
```
[Echo/Corrosion値] → GPT-4o → [カスタマイズされた応答]
```
- Echo値に応じた文章力：
  - Echo=1: 幼児レベル（単語の羅列）
  - Echo=200: 完璧な文章
- Corrosion値に応じた感情：
  - Corrosion=1: 非常に穏やか
  - Corrosion=100: 攻撃的（差別は禁止）

## 技術スタック

### フロントエンド（lexicore-front）
- **フレームワーク**: Next.js 15.3.2
- **UIライブラリ**: React 19.0.0
- **グラフィックス**: react-p5 1.4.1（p5.jsのReactラッパー）
- **スタイリング**: Tailwind CSS 4
- **リアルタイム通信**: WebSocket（ネイティブ）

### バックエンド（lexicore-back）
- **言語**: Ruby 3.0.0
- **フレームワーク**: Sinatra 2.1
- **WebSocket**: faye-websocket
- **サーバー**: Puma
- **AI API**: OpenAI GPT-4o
- **環境変数管理**: dotenv

## 主要機能の詳細

### ホーム画面（`/`）
- **3Dハートアニメーション**
  - WebGLを使用した3D表示
  - 継続的な回転アニメーション
  - 緑の鼓動（1.2秒周期）
  - 赤点滅（確率ベース）
- **リアルタイムデータ表示**
  - 左上: WebSocketメッセージ履歴（最新50件）
  - 右上: 最新メッセージ
  - 左下: Echo/Corrosionグラフ
  - 右下: 善性判定結果とAI応答
- **音声エフェクト**
  - 緑の鼓動時: beat.mp3
  - 赤点滅時: noise.mp3
  - ON/OFFトグル可能

### チャット画面（`/chat`）
- チャット形式のUI
- WebSocket接続状態の表示
- localStorageからEcho/Corrosion値を読み込み

### WebSocketプロトコル

#### メッセージタイプ
1. **通常メッセージ**: 文字列
2. **善性判定リクエスト**: `{message: "", gptVirtue: true, echo: n, corrosion: n}`
3. **善性判定結果**: `{gptVirtueResult: {echo: n, corrosion: n}, gptVirtueMessage: ""}`
4. **AI応答**: `{gpt: "応答テキスト"}`
5. **システムプロンプト変更**: `__systemprompt:新しいプロンプト`

## セットアップ

### 前提条件
- Node.js 20.11.1以上
- Ruby 3.0.0
- OpenAI APIキー

### インストール手順

1. **バックエンドのセットアップ**
```bash
cd lexicore-back
bundle install
echo "OPENAI_API_KEY=your_api_key_here" > .env
```

2. **フロントエンドのセットアップ**
```bash
cd lexicore-front
npm install
```

### 起動方法

1. **バックエンドの起動**
```bash
cd lexicore-back
bundle exec ruby app.rb
# http://localhost:4567 で起動
```

2. **フロントエンドの起動**
```bash
cd lexicore-front
npm run dev
# http://localhost:3000 で起動
```

## 使い方

1. ブラウザで`http://localhost:3000/chat`にアクセス
2. メッセージを入力して送信
3. 別タブで`http://localhost:3000`を開く
4. 言葉に応じて変化するハートを観察
5. 音声をONにして体験を楽しむ

## システムの特徴

### アーキテクチャの特徴
- **リアルタイム双方向通信**: WebSocketによる低遅延通信
- **非同期処理**: GPT API呼び出しを別スレッドで実行
- **状態管理**: Echo/Corrosion値をlocalStorageで永続化
- **レスポンシブデザイン**: 画面サイズに応じたキャンバスサイズ調整

### セキュリティとパフォーマンス
- 差別的発言の禁止ルール
- メッセージ履歴の上限管理（50件）
- 音声の自動再生許可処理
- エラーハンドリング（WebSocket切断、API失敗）

## 今後の拡張可能性

- 複数ユーザー対応
- メッセージの永続化
- より高度な感情分析
- ビジュアルエフェクトの追加
- モバイル対応の改善

## ライセンス

このプロジェクトは個人プロジェクトです。

---

Created with ❤️ using p5.js, Next.js, and OpenAI GPT-4o