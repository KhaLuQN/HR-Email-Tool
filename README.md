# HR Email Tool — Hướng dẫn cài đặt

## Bước 1: Cài Node.js

Tải và cài Node.js >= 18 từ: https://nodejs.org/en/download

Sau khi cài, mở terminal mới và kiểm tra:
```
node --version
npm --version
```

## Bước 2: Cài dependencies

Mở terminal tại thư mục này (`HR TOOL`):
```bash
npm install
```

## Bước 3: Tạo .env.local

Tạo file `.env.local` cùng thư mục với `.env.example`, tham khảo `.env.example`:
```
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="<chuỗi ngẫu nhiên 32+ ký tự>"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="xxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxx"
```

### Tạo Google OAuth Credentials

1. Vào https://console.cloud.google.com
2. Tạo project mới → APIs & Services → Library → bật **Gmail API**
3. APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
4. Application type: **Web application**
5. Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
6. Lưu Client ID và Client Secret vào `.env.local`

## Bước 4: Khởi tạo database

```bash
npm run db:push
```

## Bước 5: Chạy

```bash
npm run dev
```

Mở http://localhost:3000 → đăng nhập Google → bắt đầu dùng!

---

## Cấu trúc thư mục

```
HR TOOL/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── labels/route.ts
│   │   ├── emails/route.ts
│   │   ├── templates/route.ts
│   │   ├── send/route.ts
│   │   └── logs/route.ts
│   ├── dashboard/page.tsx     ← Main UI
│   ├── login/page.tsx
│   ├── layout.tsx
│   ├── providers.tsx
│   ├── page.tsx
│   └── globals.css
├── lib/
│   ├── auth.ts                ← NextAuth config
│   ├── gmail.ts               ← Gmail API helpers
│   ├── prisma.ts              ← DB singleton
│   └── template.ts            ← {{name}} substitution
├── prisma/schema.prisma
├── types/index.ts
├── .env.example
└── package.json
```
