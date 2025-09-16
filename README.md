# 📅 Scheduler MVP

Google Calendar を利用した「研修・オンボーディング用の日程調整アプリ」MVP。

- **目的**: メンバーが「不在予定」だけを入れておけば、主催者が全員の空き時間をまとめて抽出し、2時間の研修枠を自動で提案・作成できる。
- **技術スタック**: Next.js (App Router) + React + TypeScript + TailwindCSS + Google Calendar API

---

## 🎯 MVP要件

- **入力例**
    1. 期間: 2025-09-16 00:00 ～ 2025-10-01 23:59 (Asia/Tokyo)
    2. 所要時間: 120分
    3. 対象メンバー: 複数選択

- **出力**
    - 「全員が不在でない2時間連続の候補」リスト

- **操作**
    - 候補を選び Google カレンダーにイベント作成（Meetリンク自動付）

- **制約**
    - Free/Busy のみ取得（予定詳細は見えない）
    - 終日予定・仮予定は Busy 扱い
    - 15分刻みで探索

- **性能**
    - ≤10人 × ≤2週間 → 3秒以内に候補提示

---

## 🖥️ UI仕様（最小）

1. **メンバー選択**: 検索 + チェックボックス
2. **条件入力**: 期間（既定=9/16–10/1）、所要時間固定120分、勤務帯(09:00–18:00)
3. **候補一覧**: `YYYY/MM/DD HH:mm–HH:mm` リスト
4. **イベント作成**: タイトル・説明入力、Meetリンク自動生成

---

## 📚 初学者向けガイド

### 🎯 Next.jsとは

Next.jsは、Reactベースのフルスタックフレームワークです。通常のReactアプリと異なり、サーバーサイド機能も含むWebアプリケーションを作成できます。

#### Next.js App Router の仕組み

```
src/app/
├── page.tsx          # トップページ (http://localhost:3000/)
├── auth/
│   └── page.tsx      # 認証ページ (http://localhost:3000/auth)
└── api/
    ├── auth/
    │   └── [...nextauth]/route.ts  # OAuth認証エンドポイント
    ├── freebusy/
    │   └── route.ts    # FreeBusy API エンドポイント
    └── check-user/
        └── route.ts    # ユーザー存在確認 API
```

- **page.tsx**: ブラウザで表示されるページを定義
- **route.ts**: サーバーサイドAPIエンドポイントを定義
- **フォルダ構造**: URLパスと一致します

### ⚛️ Reactの基本概念

#### 1. コンポーネント
```typescript
// 関数コンポーネント（推奨）
function MyComponent() {
  return <div>Hello World</div>
}

// アロー関数版
const MyComponent = () => {
  return <div>Hello World</div>
}
```

#### 2. JSX（JavaScript XML）
```typescript
const element = (
  <div className="container">
    <h1>タイトル</h1>
    <p>内容: {variable}</p>
  </div>
)
```

#### 3. Props（プロパティ）
```typescript
// 親コンポーネント
<UserCard name="田中" email="tanaka@example.com" />

// 子コンポーネント
interface UserCardProps {
  name: string
  email: string
}

const UserCard = ({ name, email }: UserCardProps) => {
  return (
    <div>
      <h2>{name}</h2>
      <p>{email}</p>
    </div>
  )
}
```

### 🎣 Reactフック

#### 1. useState - 状態管理
```typescript
import { useState } from 'react'

const Counter = () => {
  const [count, setCount] = useState(0)

  return (
    <div>
      <p>カウント: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        +1
      </button>
    </div>
  )
}
```

#### 2. useEffect - 副作用処理
```typescript
import { useEffect, useState } from 'react'

const DataFetcher = () => {
  const [data, setData] = useState(null)

  // コンポーネントマウント時に実行
  useEffect(() => {
    fetchData()
  }, []) // 空の依存配列 = 初回のみ実行

  // dataが変更されるたびに実行
  useEffect(() => {
    console.log('Data updated:', data)
  }, [data]) // data が依存配列

  const fetchData = async () => {
    const response = await fetch('/api/data')
    const result = await response.json()
    setData(result)
  }

  return <div>{data ? JSON.stringify(data) : 'Loading...'}</div>
}
```

#### 3. useSession - NextAuth.js認証状態
```typescript
import { useSession } from 'next-auth/react'

const ProfilePage = () => {
  const { data: session, status } = useSession()

  if (status === 'loading') return <p>Loading...</p>
  if (status === 'unauthenticated') return <p>Not signed in</p>

  return <p>Signed in as {session?.user?.email}</p>
}
```

### 🌐 外部API連携

#### 1. クライアントサイドAPI呼び出し
```typescript
// フロントエンド（ブラウザ）でAPIを呼び出し
const fetchUserData = async (email: string) => {
  try {
    const response = await fetch('/api/check-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email })
    })

    if (!response.ok) {
      throw new Error('API call failed')
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error:', error)
    throw error
  }
}
```

#### 2. サーバーサイドAPI実装
```typescript
// src/app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // クエリパラメータを取得
    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    // 外部APIを呼び出し
    const externalResponse = await fetch(`https://api.example.com/users/${id}`)
    const userData = await externalResponse.json()

    // レスポンスを返す
    return NextResponse.json({ user: userData })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // リクエストボディを取得
    const body = await request.json()
    const { name, email } = body

    // バリデーション
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      )
    }

    // 処理実行
    const result = await createUser(name, email)

    return NextResponse.json({ success: true, user: result })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

#### 3. 認証付きAPI呼び出し
```typescript
// src/app/api/protected/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]/route'

export async function GET(request: NextRequest) {
  try {
    // セッション情報を取得
    const session = await getServerSession(authOptions)

    // 認証チェック
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Googleアクセストークンを使って外部API呼び出し
    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error('Google API call failed')
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### 🔐 Google APIs 認証設定

#### 1. Google Cloud Console設定
1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを作成または選択
3. 「APIとサービス」→「ライブラリ」で以下のAPIを有効化：
   - Google Calendar API
   - Google People API
   - Admin SDK API（オプション）
4. 「認証情報」→「OAuth 2.0 クライアント ID」を作成
5. リダイレクトURIを設定：`http://localhost:3000/api/auth/callback/google`

#### 2. 環境変数設定
```bash
# .env.local
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
NEXTAUTH_SECRET=your_random_secret_here
NEXTAUTH_URL=http://localhost:3000
```

#### 3. NextAuth.js設定
```typescript
// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events',
            'https://www.googleapis.com/auth/directory.readonly',
            'https://www.googleapis.com/auth/contacts.readonly'
          ].join(' '),
          access_type: 'offline',
          prompt: 'consent select_account',
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      session.refreshToken = token.refreshToken as string
      return session
    },
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

### 🔄 非同期処理パターン

#### 1. Promise/async-await
```typescript
// 基本的な非同期処理
const fetchData = async () => {
  try {
    const response = await fetch('/api/data')
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error:', error)
    throw error
  }
}

// 複数の非同期処理を並列実行
const fetchMultipleData = async () => {
  try {
    const [users, posts, comments] = await Promise.all([
      fetch('/api/users').then(r => r.json()),
      fetch('/api/posts').then(r => r.json()),
      fetch('/api/comments').then(r => r.json()),
    ])

    return { users, posts, comments }
  } catch (error) {
    console.error('Error:', error)
    throw error
  }
}
```

#### 2. エラーハンドリング
```typescript
const handleApiCall = async () => {
  try {
    setLoading(true)
    setError(null)

    const data = await fetchData()
    setData(data)
  } catch (error) {
    setError(error.message)
  } finally {
    setLoading(false)
  }
}
```

### 🎨 TailwindCSS クラス

このプロジェクトでよく使われるクラス：

```typescript
// レイアウト
<div className="container mx-auto px-4 py-8">        // コンテナ
<div className="flex flex-col space-y-4">           // 縦並び
<div className="grid grid-cols-2 gap-4">           // グリッドレイアウト

// ボタン
<button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
  クリック
</button>

// カード
<div className="bg-white shadow-md rounded-lg p-6 border border-gray-200">
  カード内容
</div>

// フォーム
<input className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
```

### 🚀 プロジェクト実行方法

```bash
# 依存関係インストール
pnpm install

# 開発サーバー起動
pnpm dev

# Docker使用の場合
docker-compose up --build
```

### 🐛 デバッグ方法

#### 1. Console.log
```typescript
console.log('Variable value:', variable)
console.error('Error occurred:', error)
console.table(arrayData) // 配列やオブジェクトを表形式で表示
```

#### 2. React DevTools
- ブラウザの開発者ツールでコンポーネントツリーと状態を確認

#### 3. Network タブ
- ブラウザの開発者ツールでAPI呼び出しを確認

#### 4. サーバーログ
```bash
# Dockerコンテナのログを確認
docker-compose logs -f web
```