import { v } from "convex/values";
import { mutation, query, action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { api } from "./_generated/api";

// Default userId when Clerk is not configured
const DEFAULT_USER_ID = "default-user";

// ─── Mutation: Import a full portfolio from CSV data ───────────────────

export const importPortfolio = mutation({
  args: {
    fileName: v.string(),
    transactions: v.array(
      v.object({
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
    ),
    holdings: v.array(
      v.object({
        isin: v.string(),
        product: v.string(),
        exchange: v.string(),
        totalShares: v.float64(),
        totalCost: v.float64(),
        avgCost: v.float64(),
        currency: v.string(),
        transactionCount: v.float64(),
        firstDate: v.string(),
        lastDate: v.string(),
        tickerSymbol: v.optional(v.string()), // Optional ticker symbol resolved via EODHD
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = DEFAULT_USER_ID;
    const now = Date.now();

    // Delete existing portfolio data for this user (replace on re-import)
    const existingPortfolios = await ctx.db
      .query("portfolios")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    for (const portfolio of existingPortfolios) {
      // Delete all transactions for this portfolio
      const txns = await ctx.db
        .query("transactions")
        .withIndex("by_portfolio", (q) => q.eq("portfolioId", portfolio._id))
        .collect();
      for (const txn of txns) {
        await ctx.db.delete(txn._id);
      }

      // Delete all holdings for this portfolio
      const holdings = await ctx.db
        .query("holdings")
        .withIndex("by_portfolio", (q) => q.eq("portfolioId", portfolio._id))
        .collect();
      for (const holding of holdings) {
        await ctx.db.delete(holding._id);
      }

      // Delete the portfolio itself
      await ctx.db.delete(portfolio._id);
    }

    // Create new portfolio
    const portfolioId = await ctx.db.insert("portfolios", {
      userId,
      name: args.fileName.replace(/\.csv$/i, ""),
      fileName: args.fileName,
      createdAt: now,
      updatedAt: now,
    });

    // Insert all raw transactions
    for (const tx of args.transactions) {
      await ctx.db.insert("transactions", {
        portfolioId,
        userId,
        date: tx.date,
        time: tx.time,
        product: tx.product,
        isin: tx.isin,
        exchange: tx.exchange,
        executionPlatform: tx.executionPlatform,
        amount: tx.amount,
        price: tx.price,
        currency: tx.currency,
      });
    }

    // Insert aggregated holdings
    for (const h of args.holdings) {
      const normalizedIsin = h.isin?.toUpperCase().trim() || "";
      await ctx.db.insert("holdings", {
        portfolioId,
        userId,
        ticker: normalizedIsin || h.product, // Use normalized ISIN as ticker identifier
        tickerSymbol: h.tickerSymbol, // Store resolved ticker symbol if available
        isin: normalizedIsin,
        name: h.product,
        shares: h.totalShares,
        avgCost: h.avgCost,
        totalCost: h.totalCost,
        currency: h.currency.toUpperCase(),
        exchange: h.exchange.toUpperCase(),
        transactionCount: h.transactionCount,
        firstDate: h.firstDate,
        lastDate: h.lastDate,
      });
    }

    return portfolioId;
  },
});

// ─── Query: Get the current portfolio overview for the Overview page ───

export const getPortfolioOverview = query({
  args: {},
  handler: async (ctx) => {
    const userId = DEFAULT_USER_ID;

    // Get the user's portfolio
    const portfolio = await ctx.db
      .query("portfolios")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!portfolio) {
      return null;
    }

    // Get all holdings for this portfolio
    const holdings = await ctx.db
      .query("holdings")
      .withIndex("by_portfolio", (q) => q.eq("portfolioId", portfolio._id))
      .collect();

    // Fetch current prices for all holdings from etfPrices table
    const holdingsWithPrices = await Promise.all(
      holdings.map(async (h) => {
        // Look up price by normalized ticker (ISIN)
        const normalizedTicker = h.ticker.toUpperCase().trim();
        const priceData = await ctx.db
          .query("etfPrices")
          .withIndex("by_ticker", (q) => q.eq("ticker", normalizedTicker))
          .first();

        const currentPrice = priceData?.currentPrice ?? null;
        const marketValue = currentPrice !== null ? h.shares * currentPrice : null;
        const totalGain = marketValue !== null ? marketValue - h.totalCost : null;
        const gainPercent =
          totalGain !== null && h.totalCost !== 0
            ? (totalGain / Math.abs(h.totalCost)) * 100
            : null;

        return {
          _id: h._id,
          name: h.name,
          ticker: h.ticker,
          tickerSymbol: h.tickerSymbol ?? null,
          isin: h.isin ?? "",
          exchange: h.exchange ?? "",
          shares: h.shares,
          avgCost: h.avgCost,
          totalCost: h.totalCost,
          currency: h.currency ?? "EUR",
          transactionCount: h.transactionCount ?? 0,
          firstDate: h.firstDate ?? "",
          lastDate: h.lastDate ?? "",
          currentPrice,
          marketValue,
          totalGain,
          gainPercent,
          dayChange: priceData?.dayChange ?? null,
          dayChangePercent: priceData?.dayChangePercent ?? null,
          lastPriceUpdate: priceData?.lastUpdated ?? null,
        };
      })
    );

    // Calculate portfolio totals
    const totalCost = holdings.reduce((sum, h) => sum + h.totalCost, 0);
    const totalShares = holdings.reduce((sum, h) => sum + h.shares, 0);
    const totalMarketValue = holdingsWithPrices.reduce(
      (sum, h) => sum + (h.marketValue ?? 0),
      0
    );
    const hasPrices = holdingsWithPrices.some((h) => h.currentPrice !== null);

    return {
      portfolio,
      holdings: holdingsWithPrices,
      summary: {
        totalCost,
        totalShares,
        holdingsCount: holdings.length,
        totalMarketValue: hasPrices ? totalMarketValue : null,
        totalGain: hasPrices ? totalMarketValue - totalCost : null,
        totalGainPercent:
          hasPrices && totalCost !== 0
            ? ((totalMarketValue - totalCost) / Math.abs(totalCost)) * 100
            : null,
      },
    };
  },
});

// ─── Action: Import portfolio with ticker resolution ───

export const importPortfolioWithTickers = action({
  args: {
    fileName: v.string(),
    transactions: v.array(
      v.object({
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
    ),
    holdings: v.array(
      v.object({
        isin: v.string(),
        product: v.string(),
        exchange: v.string(),
        totalShares: v.float64(),
        totalCost: v.float64(),
        avgCost: v.float64(),
        currency: v.string(),
        transactionCount: v.float64(),
        firstDate: v.string(),
        lastDate: v.string(),
      })
    ),
  },
  handler: async (ctx, args): Promise<{
    portfolioId: any;
    totalHoldings: number;
    resolvedTickers: number;
    unresolvedTickers: number;
  }> => {
    console.log(`[importPortfolioWithTickers] Resolving tickers for ${args.holdings.length} holdings...`);

    // Step 1: Resolve ticker symbols for all holdings
    const holdingsWithTickers = await Promise.all(
      args.holdings.map(async (h): Promise<typeof h & { tickerSymbol?: string }> => {
        const isin = h.isin.toUpperCase().trim();
        const exchange = h.exchange.toUpperCase().trim();

        // Skip if no ISIN
        if (!isin) {
          return { ...h, tickerSymbol: undefined };
        }

        // Resolve ticker via EODHD
        try {
          const resolution: any = await ctx.runAction(api.tickerResolver.resolveTickerSymbol, {
            isin,
            exchangeCode: exchange,
          });

          if (resolution.success && resolution.tickerSymbol) {
            console.log(`[importPortfolioWithTickers] ✓ ${isin} → ${resolution.tickerSymbol}`);
            return { ...h, tickerSymbol: resolution.tickerSymbol };
          } else {
            console.warn(`[importPortfolioWithTickers] ✗ ${isin}: ${resolution.error}`);
            return { ...h, tickerSymbol: undefined };
          }
        } catch (error) {
          console.error(`[importPortfolioWithTickers] Error resolving ${isin}:`, error);
          return { ...h, tickerSymbol: undefined };
        }
      })
    );

    // Step 2: Import portfolio with resolved tickers
    const portfolioId: any = await ctx.runMutation(api.import.importPortfolio, {
      fileName: args.fileName,
      transactions: args.transactions,
      holdings: holdingsWithTickers,
    });

    const resolvedCount = holdingsWithTickers.filter((h: any) => h.tickerSymbol).length;
    console.log(
      `[importPortfolioWithTickers] Complete: ${resolvedCount}/${args.holdings.length} tickers resolved`
    );

    return {
      portfolioId,
      totalHoldings: args.holdings.length,
      resolvedTickers: resolvedCount,
      unresolvedTickers: args.holdings.length - resolvedCount,
    };
  },
});

// ─── Query: Get all transactions for the portfolio ───

export const getTransactions = query({
  args: {},
  handler: async (ctx) => {
    const userId = DEFAULT_USER_ID;

    const portfolio = await ctx.db
      .query("portfolios")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!portfolio) return [];

    return await ctx.db
      .query("transactions")
      .withIndex("by_portfolio", (q) => q.eq("portfolioId", portfolio._id))
      .collect();
  },
});
