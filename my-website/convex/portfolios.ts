import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Query to get all portfolios for a user
export const getUserPortfolios = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("portfolios")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

// Query to get portfolio with all holdings
export const getPortfolioWithHoldings = query({
  args: { portfolioId: v.id("portfolios") },
  handler: async (ctx, args) => {
    const portfolio = await ctx.db.get(args.portfolioId);
    if (!portfolio) return null;

    const holdings = await ctx.db
      .query("holdings")
      .withIndex("by_portfolio", (q) => q.eq("portfolioId", args.portfolioId))
      .collect();

    // Fetch current prices for all holdings
    const holdingsWithPrices = await Promise.all(
      holdings.map(async (holding) => {
        const normalizedTicker = holding.ticker.toUpperCase().trim();
        const priceData = await ctx.db
          .query("etfPrices")
          .withIndex("by_ticker", (q) => q.eq("ticker", normalizedTicker))
          .first();

        const currentPrice = priceData?.currentPrice || holding.avgCost;
        const marketValue = holding.shares * currentPrice;
        const totalCost = holding.shares * holding.avgCost;
        const totalGain = marketValue - totalCost;
        const gainPercent = (totalGain / totalCost) * 100;

        return {
          ...holding,
          currentPrice,
          marketValue,
          totalGain,
          gainPercent,
          dayChange: priceData?.dayChangePercent || 0,
        };
      })
    );

    // Calculate portfolio totals
    const totalValue = holdingsWithPrices.reduce(
      (sum, h) => sum + h.marketValue,
      0
    );
    const totalCost = holdingsWithPrices.reduce(
      (sum, h) => sum + h.shares * h.avgCost,
      0
    );
    const totalGain = totalValue - totalCost;
    const totalGainPercent = (totalGain / totalCost) * 100;

    return {
      portfolio,
      holdings: holdingsWithPrices,
      summary: {
        totalValue,
        totalCost,
        totalGain,
        totalGainPercent,
        holdingsCount: holdings.length,
      },
    };
  },
});

// Mutation to create a new portfolio
export const createPortfolio = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const portfolioId = await ctx.db.insert("portfolios", {
      userId: args.userId,
      name: args.name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return portfolioId;
  },
});

// Mutation to add a holding to a portfolio
export const addHolding = mutation({
  args: {
    portfolioId: v.id("portfolios"),
    userId: v.string(),
    ticker: v.string(),
    name: v.string(),
    shares: v.float64(),
    avgCost: v.float64(),
    purchaseDate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const holdingId = await ctx.db.insert("holdings", {
      portfolioId: args.portfolioId,
      userId: args.userId,
      ticker: args.ticker.toUpperCase(),
      name: args.name,
      shares: args.shares,
      avgCost: args.avgCost,
      totalCost: args.shares * args.avgCost,
      purchaseDate: args.purchaseDate,
      notes: args.notes,
    });

    // Update portfolio's updatedAt timestamp
    await ctx.db.patch(args.portfolioId, {
      updatedAt: Date.now(),
    });

    return holdingId;
  },
});

// Mutation to update a holding
export const updateHolding = mutation({
  args: {
    holdingId: v.id("holdings"),
    shares: v.optional(v.float64()),
    avgCost: v.optional(v.float64()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { holdingId, ...updates } = args;
    await ctx.db.patch(holdingId, updates);
  },
});

// Mutation to delete a holding
export const deleteHolding = mutation({
  args: { holdingId: v.id("holdings") },
  handler: async (ctx, args) => {
    const holding = await ctx.db.get(args.holdingId);
    if (holding) {
      await ctx.db.delete(args.holdingId);
      // Update portfolio's updatedAt timestamp
      await ctx.db.patch(holding.portfolioId, {
        updatedAt: Date.now(),
      });
    }
  },
});
