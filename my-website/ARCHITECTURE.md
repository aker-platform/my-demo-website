# Investment Portfolio Architecture

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js 15 Frontend                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  App Router (app/)                                        │   │
│  │  - page.tsx (Portfolio Dashboard)                         │   │
│  │  - layout.tsx (Root with Providers)                       │   │
│  │  - sign-in/[[...sign-in]]/page.tsx                        │   │
│  │  - sign-up/[[...sign-up]]/page.tsx                        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Shadcn UI Components                                     │   │
│  │  - Card, Table, Badge (components/ui/)                    │   │
│  │  - Tailwind CSS v4                                        │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────┬─────────────────────┬──────────────────────┘
                   │                     │
                   │                     │
        ┌──────────▼─────────┐  ┌───────▼────────┐
        │  Clerk Provider    │  │ Convex Provider │
        │  (Authentication)  │  │ (Database/API)  │
        └──────────┬─────────┘  └───────┬────────┘
                   │                     │
                   │    JWT Token        │
                   └─────────┬───────────┘
                             │
                  ┌──────────▼───────────┐
                  │   ConvexProvider     │
                  │    WithClerk         │
                  │  (Integration Layer) │
                  └──────────────────────┘
```

## 🔐 Authentication Flow (Clerk)

```
User Action                    Clerk                    Next.js
    │                            │                         │
    ├──[1] Click Sign In ───────>│                         │
    │                            │                         │
    │<───[2] Show Auth UI ────────┤                         │
    │                            │                         │
    ├──[3] Enter Credentials ───>│                         │
    │                            │                         │
    │                      [4] Validate                    │
    │                            │                         │
    │<───[5] JWT Token ───────────┤                         │
    │                            │                         │
    ├──[6] Access App ──────────────────────────────────>│
    │                            │                         │
    │                            │    [7] Verify JWT       │
    │                            │<────────────────────────┤
    │                            │                         │
    │                            ├─[8] Valid ─────────────>│
    │                            │                         │
    │<───[9] Render Protected Page ────────────────────────┤
```

## 💾 Data Flow (Convex)

```
Portfolio Page              Convex Queries           Convex Database
     │                           │                         │
     ├─[1] useQuery() ──────────>│                         │
     │   getUserPortfolios       │                         │
     │                           │                         │
     │                     [2] Check Auth                  │
     │                     (via Clerk JWT)                 │
     │                           │                         │
     │                           ├──[3] Query ────────────>│
     │                           │   portfolios table      │
     │                           │                         │
     │                           │<─[4] Portfolio Data ────┤
     │                           │                         │
     │                           ├──[5] Query ────────────>│
     │                           │   holdings table        │
     │                           │                         │
     │                           │<─[6] Holdings Data ─────┤
     │                           │                         │
     │                           ├──[7] Query ────────────>│
     │                           │   etfPrices table       │
     │                           │                         │
     │                           │<─[8] Price Data ────────┤
     │                           │                         │
     │                     [9] Combine & Calculate         │
     │                     (market value, gains, etc.)     │
     │                           │                         │
     │<──[10] Complete Data ─────┤                         │
     │                           │                         │
     ├─[11] Render UI           │                         │
     │   (auto-updates)          │                         │
```

## 📊 Database Schema

### Portfolios Table
```typescript
{
  _id: Id<"portfolios">,
  userId: string,              // Clerk user ID
  name: string,                // Portfolio name
  createdAt: number,           // Timestamp
  updatedAt: number            // Timestamp
}
```
**Indexes:**
- `by_user` on `userId`

### Holdings Table
```typescript
{
  _id: Id<"holdings">,
  portfolioId: Id<"portfolios">,
  userId: string,              // Clerk user ID
  ticker: string,              // ETF symbol (e.g., "SPY")
  name: string,                // ETF name
  shares: number,              // Number of shares
  avgCost: number,             // Average cost per share
  purchaseDate?: number,       // Optional timestamp
  notes?: string               // Optional notes
}
```
**Indexes:**
- `by_portfolio` on `portfolioId`
- `by_user` on `userId`
- `by_ticker` on `ticker`

### ETF Prices Table
```typescript
{
  _id: Id<"etfPrices">,
  ticker: string,              // ETF symbol
  currentPrice: number,        // Current price
  dayChange: number,           // Dollar change today
  dayChangePercent: number,    // Percent change today
  volume?: number,             // Trading volume
  lastUpdated: number          // Timestamp
}
```
**Indexes:**
- `by_ticker` on `ticker`

## 🔄 Real-Time Synchronization

Convex provides automatic real-time updates:

```
User A's Browser         Convex Server         User B's Browser
      │                        │                       │
      ├──[1] Add Holding ─────>│                       │
      │   (mutation)           │                       │
      │                        │                       │
      │                  [2] Update DB                 │
      │                        │                       │
      │<───[3] Success ─────────┤                       │
      │                        │                       │
      │                        ├──[4] Push Update ────>│
      │                        │   (if watching same   │
      │                        │    portfolio)         │
      │                        │                       │
      │   [5] UI Updates       │       [6] UI Updates  │
      │   automatically        │       automatically   │
```

## 🛡️ Security Model

### Route Protection (Middleware)
```typescript
Public Routes:
  - / (home/portfolio - public view)
  - /sign-in
  - /sign-up
  - /api/webhooks

Protected Routes:
  - All other routes require authentication
```

### Data Isolation
- Every query filters by `userId` from Clerk
- Users can only access their own portfolios
- Convex validates JWT on every request

### Environment Variables
```
Development: .env.local
Production: Deployed platform (Vercel, etc.)

Required:
- NEXT_PUBLIC_CONVEX_URL (public)
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (public)
- CLERK_SECRET_KEY (secret)
```

## 📦 Component Structure

```
app/
├── layout.tsx
│   └── <ConvexClientProvider>
│       └── <ClerkProvider>
│           └── <ConvexProviderWithClerk>
│               └── {children}
│
├── page.tsx (Portfolio Dashboard)
│   ├── Summary Cards (Total Value, Gains, Day Change, Holdings)
│   └── Holdings Table
│       ├── Ticker, Name, Shares
│       ├── Avg Cost, Current Price
│       └── Market Value, Gain/Loss
│
├── sign-in/[[...sign-in]]/page.tsx
│   └── <SignIn /> (Clerk component)
│
└── sign-up/[[...sign-up]]/page.tsx
    └── <SignUp /> (Clerk component)

middleware.ts
└── clerkMiddleware() (Route protection)

convex/
├── schema.ts (Database schema)
├── portfolios.ts (Portfolio operations)
└── etfPrices.ts (Price operations)
```

## 🚀 Deployment Architecture

### Development
```
localhost:3000          Local Next.js server
convex dev              Local Convex development
clerk.dev               Clerk development instance
```

### Production
```
Vercel/Netlify          Next.js hosting
convex.cloud            Convex production deployment
clerk.com               Clerk production
```

## 📈 Future Enhancements

### Phase 1 (Current)
- ✅ User authentication
- ✅ Portfolio dashboard
- ✅ Static sample data
- ✅ Basic UI components

### Phase 2 (Next)
- Add/edit/delete portfolios
- Add/edit/delete holdings
- User profile management
- Multi-portfolio support

### Phase 3 (Advanced)
- Real-time ETF price updates (external API)
- Historical performance charts
- Price alerts and notifications
- Export to CSV/PDF

### Phase 4 (Enterprise)
- Portfolio sharing
- Advisor collaboration
- Advanced analytics
- Mobile app (React Native)

## 🔗 Integration Points

### External APIs (Future)
- Alpha Vantage (market data)
- Polygon.io (real-time prices)
- Yahoo Finance (historical data)
- IEX Cloud (company info)

### Webhooks
- Clerk: User lifecycle events
- Convex: Scheduled functions (cron jobs)
- Price updates: Periodic fetching

## 📊 Performance Considerations

- **Real-time Updates**: Convex uses WebSocket for instant sync
- **Caching**: Convex automatically caches query results
- **Optimistic Updates**: UI updates immediately, syncs in background
- **Edge Functions**: Next.js 15 with Turbopack for fast builds
- **Code Splitting**: Automatic with App Router

## 🎯 Key Features

1. **Real-time Synchronization**: Changes appear instantly across all devices
2. **Secure Authentication**: Enterprise-grade auth with Clerk
3. **Type Safety**: Full TypeScript support throughout
4. **Responsive Design**: Works on mobile, tablet, and desktop
5. **Dark Mode**: Automatic dark mode support with Tailwind
6. **Modern UI**: Beautiful components with Shadcn UI
