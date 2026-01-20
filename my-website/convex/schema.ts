import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Portfolio table - stores user portfolio metadata
  portfolios: defineTable({
    userId: v.string(),
    name: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // Holdings table - stores individual ETF positions
  holdings: defineTable({
    portfolioId: v.id("portfolios"),
    userId: v.string(),
    ticker: v.string(),
    name: v.string(),
    shares: v.float64(),
    avgCost: v.float64(),
    purchaseDate: v.optional(v.number()),
    notes: v.optional(v.string()),
  })
    .index("by_portfolio", ["portfolioId"])
    .index("by_user", ["userId"])
    .index("by_ticker", ["ticker"]),

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
