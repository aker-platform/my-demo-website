import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Portfolio table - stores user portfolio metadata
  portfolios: defineTable({
    userId: v.string(),
    name: v.string(),
    fileName: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // Raw transactions table - stores individual broker transactions from CSV
  transactions: defineTable({
    portfolioId: v.id("portfolios"),
    userId: v.string(),
    date: v.string(),
    time: v.string(),
    product: v.string(),
    isin: v.string(),
    exchange: v.string(),
    executionPlatform: v.string(),
    amount: v.float64(),
    price: v.float64(),
    currency: v.string(),
  })
    .index("by_portfolio", ["portfolioId"])
    .index("by_user", ["userId"])
    .index("by_isin", ["isin"]),

  // Holdings table - stores aggregated ETF positions
  holdings: defineTable({
    portfolioId: v.id("portfolios"),
    userId: v.string(),
    ticker: v.string(), // ISIN used as primary key for price lookups
    tickerSymbol: v.optional(v.string()), // Actual ticker symbol (e.g., "IWDA.AS")
    isin: v.optional(v.string()),
    name: v.string(),
    shares: v.float64(),
    avgCost: v.float64(),
    totalCost: v.float64(),
    currency: v.optional(v.string()),
    exchange: v.optional(v.string()),
    transactionCount: v.optional(v.float64()),
    firstDate: v.optional(v.string()),
    lastDate: v.optional(v.string()),
    purchaseDate: v.optional(v.number()),
    notes: v.optional(v.string()),
  })
    .index("by_portfolio", ["portfolioId"])
    .index("by_user", ["userId"])
    .index("by_ticker", ["ticker"]),

  // ETFs table - caches resolved EODHD tickers for each ISIN + exchange
  etfs: defineTable({
    isin: v.string(),
    exchangeCode: v.string(),
    resolvedTicker: v.string(),
    eodhExchange: v.string(),
    name: v.optional(v.string()),
    lastResolved: v.number(),
  })
    .index("by_isin", ["isin"])
    .index("by_isin_exchange", ["isin", "exchangeCode"]),

  // ETF Prices table - stores current and historical price data
  etfPrices: defineTable({
    ticker: v.string(),
    currentPrice: v.float64(),
    dayChange: v.float64(),
    dayChangePercent: v.float64(),
    volume: v.optional(v.float64()),
    lastUpdated: v.number(),
  }).index("by_ticker", ["ticker"]),
});
