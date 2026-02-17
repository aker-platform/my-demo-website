import { v } from "convex/values";
import { query, mutation, action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

// ─── Exchange mapping: broker "Beurs" code → EODHD exchange suffix ─────────
const EXCHANGE_MAP: Record<string, string> = {
  EAM: ".AS", // Euronext Amsterdam
  AMS: ".AS", // Euronext Amsterdam (alternative code)
  MIL: ".MI", // Borsa Italiana (Milan)
  XET: ".DE", // XETRA (Deutsche Börse)
  XETRA: ".DE", // XETRA (alternative)
  FRA: ".F", // Frankfurt Stock Exchange
  PAR: ".PA", // Euronext Paris
  EPA: ".PA", // Euronext Paris (alternative)
  BRU: ".BR", // Euronext Brussels
  LIS: ".LS", // Euronext Lisbon
  SWX: ".SW", // SIX Swiss Exchange
  LSE: ".L", // London Stock Exchange
  LON: ".L", // London Stock Exchange (alternative)
};

// Currency mapping for exchanges to validate pricing
const EXCHANGE_CURRENCY_MAP: Record<string, string> = {
  AS: "EUR", // Amsterdam
  MI: "EUR", // Milan
  DE: "EUR", // XETRA
  F: "EUR", // Frankfurt
  PA: "EUR", // Paris
  BR: "EUR", // Brussels
  LS: "EUR", // Lisbon
  SW: "CHF", // Swiss
  L: "GBP", // London
};

const EODHD_BASE_URL = "https://eodhd.com/api";

// ─── Queries ───────────────────────────────────────────────────────────────

// Query to get price for a specific ticker (ISIN)
export const getPrice = query({
  args: { ticker: v.string() },
  handler: async (ctx, args) => {
    const normalizedTicker = args.ticker.toUpperCase().trim();
    return await ctx.db
      .query("etfPrices")
      .withIndex("by_ticker", (q) => q.eq("ticker", normalizedTicker))
      .first();
  },
});

// Query to get prices for multiple tickers (ISINs)
export const getPrices = query({
  args: { tickers: v.array(v.string()) },
  handler: async (ctx, args) => {
    const prices = await Promise.all(
      args.tickers.map((ticker) => {
        const normalizedTicker = ticker.toUpperCase().trim();
        return ctx.db
          .query("etfPrices")
          .withIndex("by_ticker", (q) => q.eq("ticker", normalizedTicker))
          .first();
      })
    );
    return prices.filter((p) => p !== null);
  },
});

// Query to get cached ETF ticker resolution
export const getCachedTicker = query({
  args: { isin: v.string(), exchangeCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("etfs")
      .withIndex("by_isin_exchange", (q) =>
        q.eq("isin", args.isin).eq("exchangeCode", args.exchangeCode)
      )
      .first();
  },
});

// ─── Mutations ─────────────────────────────────────────────────────────────

// Mutation to update ETF price
export const updatePrice = mutation({
  args: {
    ticker: v.string(),
    currentPrice: v.float64(),
    dayChange: v.float64(),
    dayChangePercent: v.float64(),
    volume: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const normalizedTicker = args.ticker.toUpperCase().trim();
    const existing = await ctx.db
      .query("etfPrices")
      .withIndex("by_ticker", (q) => q.eq("ticker", normalizedTicker))
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
        ticker: normalizedTicker,
        currentPrice: args.currentPrice,
        dayChange: args.dayChange,
        dayChangePercent: args.dayChangePercent,
        volume: args.volume,
        lastUpdated: Date.now(),
      });
    }
  },
});

// ─── Internal mutations (called by the action) ────────────────────────────

// Save resolved ticker to etfs cache table
export const saveResolvedTicker = internalMutation({
  args: {
    isin: v.string(),
    exchangeCode: v.string(),
    resolvedTicker: v.string(),
    eodhExchange: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if a mapping already exists
    const existing = await ctx.db
      .query("etfs")
      .withIndex("by_isin_exchange", (q) =>
        q.eq("isin", args.isin).eq("exchangeCode", args.exchangeCode)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        resolvedTicker: args.resolvedTicker,
        eodhExchange: args.eodhExchange,
        name: args.name,
        lastResolved: Date.now(),
      });
    } else {
      await ctx.db.insert("etfs", {
        isin: args.isin,
        exchangeCode: args.exchangeCode,
        resolvedTicker: args.resolvedTicker,
        eodhExchange: args.eodhExchange,
        name: args.name,
        lastResolved: Date.now(),
      });
    }
  },
});

// Save price data from action
export const savePrice = internalMutation({
  args: {
    ticker: v.string(),
    currentPrice: v.float64(),
    dayChange: v.float64(),
    dayChangePercent: v.float64(),
    volume: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const normalizedTicker = args.ticker.toUpperCase().trim();
    const existing = await ctx.db
      .query("etfPrices")
      .withIndex("by_ticker", (q) => q.eq("ticker", normalizedTicker))
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
        ticker: normalizedTicker,
        currentPrice: args.currentPrice,
        dayChange: args.dayChange,
        dayChangePercent: args.dayChangePercent,
        volume: args.volume,
        lastUpdated: Date.now(),
      });
    }
  },
});

// Internal query to look up cached ticker from within action
export const getCachedTickerInternal = internalMutation({
  args: { isin: v.string(), exchangeCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("etfs")
      .withIndex("by_isin_exchange", (q) =>
        q.eq("isin", args.isin).eq("exchangeCode", args.exchangeCode)
      )
      .first();
  },
});

// ─── Action: fetchEtfPrice ─────────────────────────────────────────────────
//
// Fetches the latest price for an ETF from EODHD.
//  1. Checks the etfs cache table for a previously resolved ticker.
//  2. If not cached, searches EODHD by ISIN and filters by mapped exchange.
//  3. Saves the resolved ticker to the etfs table for future lookups.
//  4. Fetches the real-time price and saves it to etfPrices.
//
export const fetchEtfPrice = action({
  args: {
    isin: v.string(),
    exchangeCode: v.string(),
    expectedCurrency: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    isin: string;
    resolvedTicker: string | null;
    currentPrice: number | null;
    dayChangePercent: number | null;
    error: string | null;
    warning: string | null;
  }> => {
    const apiKey = process.env.EODHD_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        isin: args.isin,
        resolvedTicker: null,
        currentPrice: null,
        dayChangePercent: null,
        error: "EODHD_API_KEY environment variable not set",
        warning: null,
      };
    }

    const isin = args.isin.toUpperCase().trim();
    const exchangeCode = args.exchangeCode.toUpperCase().trim();
    const expectedCurrency = args.expectedCurrency?.toUpperCase().trim();

    // ── Step 1: Check etfs cache for a previously resolved ticker ──────
    const cached = await ctx.runMutation(internal.etfPrices.getCachedTickerInternal, {
      isin,
      exchangeCode,
    });

    let resolvedTicker: string;
    let eodhExchange: string;
    let etfName: string | undefined;
    let fallbackUsed = false;

    if (cached) {
      // Use the cached resolution
      resolvedTicker = cached.resolvedTicker;
      eodhExchange = cached.eodhExchange;
      etfName = cached.name ?? undefined;
    } else {
      // ── Step 2: Search EODHD by ISIN ─────────────────────────────────
      const mappedSuffix = EXCHANGE_MAP[exchangeCode] ?? null;

      let searchResults: Array<{
        Code: string;
        Exchange: string;
        Name: string;
        Type: string;
        Country: string;
        Currency: string;
        ISIN: string;
      }>;

      try {
        const searchUrl = `${EODHD_BASE_URL}/search/${isin}?api_token=${apiKey}&fmt=json`;
        const searchResponse = await fetch(searchUrl);
        if (!searchResponse.ok) {
          return {
            success: false,
            isin,
            resolvedTicker: null,
            currentPrice: null,
            dayChangePercent: null,
            error: `EODHD search failed with status ${searchResponse.status}`,
            warning: null,
          };
        }
        searchResults = await searchResponse.json();
      } catch (error) {
        return {
          success: false,
          isin,
          resolvedTicker: null,
          currentPrice: null,
          dayChangePercent: null,
          error: `EODHD search request failed: ${error}`,
          warning: null,
        };
      }

      if (!searchResults || searchResults.length === 0) {
        return {
          success: false,
          isin,
          resolvedTicker: null,
          currentPrice: null,
          dayChangePercent: null,
          error: `No EODHD results found for ISIN ${isin}`,
          warning: null,
        };
      }

      // ── Step 3: Filter by mapped exchange suffix ─────────────────────
      let match = null;

      if (mappedSuffix) {
        // The mapped suffix is e.g. ".AS" — EODHD Exchange field is e.g. "AS"
        const exchangeWithoutDot = mappedSuffix.replace(".", "");
        match = searchResults.find(
          (r) => r.Exchange.toUpperCase() === exchangeWithoutDot.toUpperCase()
        );
      }

      // ── Step 4: Smart fallback strategy ───────────────────────────────
      if (!match) {
        fallbackUsed = true;

        // If we have an expected currency, try to find a match with same currency
        if (expectedCurrency) {
          match = searchResults.find((r) => {
            const rExchange = r.Exchange.toUpperCase();
            const expectedCurr = EXCHANGE_CURRENCY_MAP[rExchange];
            return expectedCurr === expectedCurrency;
          });
        }

        // If still no match, use first result but log a warning
        if (!match) {
          match = searchResults[0];
        }

        if (mappedSuffix) {
          console.warn(
            `[fetchEtfPrice] No exact exchange match for ISIN ${isin} ` +
              `with mapped suffix "${mappedSuffix}" (broker code: ${exchangeCode}). ` +
              `Fallback to: ${match.Code}.${match.Exchange} (${match.Name}, ${match.Currency})`
          );
        } else {
          console.warn(
            `[fetchEtfPrice] Unknown exchange code "${exchangeCode}" for ISIN ${isin}. ` +
              `No mapping found. Using: ${match.Code}.${match.Exchange} (${match.Name}, ${match.Currency})`
          );
        }
      }

      resolvedTicker = `${match.Code}.${match.Exchange}`;
      eodhExchange = match.Exchange;
      etfName = match.Name;

      // ── Step 5: Save resolved ticker to etfs table ───────────────────
      await ctx.runMutation(internal.etfPrices.saveResolvedTicker, {
        isin,
        exchangeCode,
        resolvedTicker,
        eodhExchange,
        name: etfName,
      });
    }

    // ── Step 6: Fetch real-time price ──────────────────────────────────
    try {
      const priceUrl = `${EODHD_BASE_URL}/real-time/${resolvedTicker}?api_token=${apiKey}&fmt=json`;
      const priceResponse = await fetch(priceUrl);

      if (!priceResponse.ok) {
        return {
          success: false,
          isin,
          resolvedTicker,
          currentPrice: null,
          dayChangePercent: null,
          error: `EODHD price fetch failed with status ${priceResponse.status} for ${resolvedTicker}`,
          warning: null,
        };
      }

      const priceData = await priceResponse.json();
      const currentPrice = priceData.close ?? 0;
      const dayChange = priceData.change ?? 0;
      const dayChangePercent = priceData.change_p ?? 0;
      const volume = priceData.volume ?? undefined;
      const priceCurrency = priceData.currency?.toUpperCase() ?? null;

      // ── Step 7: Validate currency match ─────────────────────────────
      let warning = null;
      if (expectedCurrency && priceCurrency && priceCurrency !== expectedCurrency) {
        warning = `Currency mismatch: Expected ${expectedCurrency}, got ${priceCurrency} from ${resolvedTicker}`;
        console.warn(`[fetchEtfPrice] ${warning}`);
      }

      if (fallbackUsed && !warning) {
        warning = `Using fallback exchange mapping for ${isin}`;
      }

      // Validate price data
      if (currentPrice <= 0) {
        return {
          success: false,
          isin,
          resolvedTicker,
          currentPrice: null,
          dayChangePercent: null,
          error: `Invalid price data: currentPrice=${currentPrice} for ${resolvedTicker}`,
          warning,
        };
      }

      // Save price to etfPrices table (keyed by ISIN to match holdings.ticker)
      await ctx.runMutation(internal.etfPrices.savePrice, {
        ticker: isin, // Use normalized ISIN as key to match holdings
        currentPrice,
        dayChange,
        dayChangePercent,
        volume,
      });

      console.log(
        `[fetchEtfPrice] ✓ ${isin} → ${resolvedTicker}: ${priceCurrency} ${currentPrice} (${dayChangePercent >= 0 ? "+" : ""}${dayChangePercent.toFixed(2)}%)`
      );

      return {
        success: true,
        isin,
        resolvedTicker,
        currentPrice,
        dayChangePercent,
        error: null,
        warning,
      };
    } catch (error) {
      return {
        success: false,
        isin,
        resolvedTicker,
        currentPrice: null,
        dayChangePercent: null,
        error: `Price fetch failed for ${resolvedTicker}: ${error}`,
        warning: null,
      };
    }
  },
});
