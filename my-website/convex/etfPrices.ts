import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Query to get price for a specific ticker
export const getPrice = query({
  args: { ticker: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("etfPrices")
      .withIndex("by_ticker", (q) => q.eq("ticker", args.ticker.toUpperCase()))
      .first();
  },
});

// Query to get prices for multiple tickers
export const getPrices = query({
  args: { tickers: v.array(v.string()) },
  handler: async (ctx, args) => {
    const prices = await Promise.all(
      args.tickers.map((ticker) =>
        ctx.db
          .query("etfPrices")
          .withIndex("by_ticker", (q) => q.eq("ticker", ticker.toUpperCase()))
          .first()
      )
    );
    return prices.filter((p) => p !== null);
  },
});

// Mutation to update ETF price (would be called by a cron job or action)
export const updatePrice = mutation({
  args: {
    ticker: v.string(),
    currentPrice: v.float64(),
    dayChange: v.float64(),
    dayChangePercent: v.float64(),
    volume: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("etfPrices")
      .withIndex("by_ticker", (q) => q.eq("ticker", args.ticker.toUpperCase()))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        currentPrice: args.currentPrice,
        dayChange: args.dayChange,
        dayChangePercent: args.dayChangePercent,
        volume: args.volume,
        lastUpdated: Date.now(),
      });
    } else {
      await ctx.db.insert("etfPrices", {
        ticker: args.ticker.toUpperCase(),
        currentPrice: args.currentPrice,
        dayChange: args.dayChange,
        dayChangePercent: args.dayChangePercent,
        volume: args.volume,
        lastUpdated: Date.now(),
      });
    }
  },
});

// Mutation to seed initial price data (for development)
export const seedPrices = mutation({
  args: {},
  handler: async (ctx) => {
    const seedData = [
      {
        ticker: "SPY",
        currentPrice: 445.2,
        dayChange: 9.58,
        dayChangePercent: 2.15,
      },
      {
        ticker: "QQQ",
        currentPrice: 388.5,
        dayChange: 7.06,
        dayChangePercent: 1.85,
      },
      {
        ticker: "VTI",
        currentPrice: 228.75,
        dayChange: 2.15,
        dayChangePercent: 0.95,
      },
      {
        ticker: "SCHD",
        currentPrice: 79.2,
        dayChange: 0.35,
        dayChangePercent: 0.45,
      },
      {
        ticker: "VGT",
        currentPrice: 485.9,
        dayChange: -1.22,
        dayChangePercent: -0.25,
      },
      {
        ticker: "VOO",
        currentPrice: 438.28,
        dayChange: 4.85,
        dayChangePercent: 1.12,
      },
    ];

    for (const data of seedData) {
      await ctx.db.insert("etfPrices", {
        ...data,
        lastUpdated: Date.now(),
      });
    }
  },
});
