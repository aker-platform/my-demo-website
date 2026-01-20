# Convex Backend

This folder contains your Convex backend code.

## Getting Started

1. **Initialize Convex:**
   ```bash
   npm run convex:dev
   ```
   This will:
   - Create or connect to your Convex project
   - Generate the `_generated/` folder with proper types
   - Deploy your schema and functions
   - Start watching for changes

2. **The first time you run this, you'll need to:**
   - Sign in to Convex (or create a free account)
   - Create a new project or select an existing one
   - Your `NEXT_PUBLIC_CONVEX_URL` will be automatically added to `.env.local`

## Files

### `schema.ts`
Defines your database schema with three tables:
- **portfolios**: User portfolio metadata
- **holdings**: Individual ETF positions
- **etfPrices**: Current and historical price data

### `portfolios.ts`
Queries and mutations for portfolio operations:
- `getUserPortfolios` - Get all portfolios for a user
- `getPortfolioWithHoldings` - Get full portfolio with calculations
- `createPortfolio` - Create a new portfolio
- `addHolding` - Add an ETF to a portfolio
- `updateHolding` - Update holding details
- `deleteHolding` - Remove a holding

### `etfPrices.ts`
Queries and mutations for price data:
- `getPrice` - Get current price for one ticker
- `getPrices` - Get prices for multiple tickers
- `updatePrice` - Update price data (for external API integration)
- `seedPrices` - Load sample price data

### `_generated/` folder
This folder contains auto-generated TypeScript types and helpers.

**Important:** 
- The placeholder files in this folder allow the project to build before running `convex dev`
- When you run `npm run convex:dev`, these files will be replaced with proper generated types
- Do not manually edit files in this folder - they are auto-generated

## Development Workflow

1. **Start Convex dev server (Terminal 1):**
   ```bash
   npm run convex:dev
   ```

2. **Start Next.js dev server (Terminal 2):**
   ```bash
   npm run dev
   ```

3. **Make changes:**
   - Edit schema in `schema.ts`
   - Add queries/mutations in `*.ts` files
   - Convex will automatically redeploy

## Deployment

When you're ready to deploy to production:

```bash
npm run convex:deploy
```

This deploys your backend to Convex's production environment.

## Learn More

- [Convex Documentation](https://docs.convex.dev)
- [Schema Design](https://docs.convex.dev/database/schemas)
- [Queries & Mutations](https://docs.convex.dev/functions)
- [Authentication with Clerk](https://docs.convex.dev/auth/clerk)
