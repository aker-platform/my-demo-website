import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

// ─── Exchange mapping: broker "Beurs" code → EODHD exchange suffix ─────────
const EXCHANGE_MAP: Record<string, string> = {
  EAM: ".AS",
  AMS: ".AS",
  MIL: ".MI",
  XET: ".DE",
  XETRA: ".DE",
  FRA: ".F",
  PAR: ".PA",
  EPA: ".PA",
  BRU: ".BR",
  LIS: ".LS",
  SWX: ".SW",
  LSE: ".L",
  LON: ".L",
};

const EODHD_BASE_URL = "https://eodhd.com/api";

type TickerResolutionResult = {
  success: boolean;
  isin: string;
  exchange: string;
  tickerSymbol: string | null;
  eodhExchange: string | null;
  error: string | null;
};

/**
 * Resolves ISIN + Exchange to actual ticker symbol using EODHD Search API
 * This is called during portfolio import to pre-fetch ticker symbols
 */
export const resolveTickerSymbol = action({
  args: {
    isin: v.string(),
    exchangeCode: v.string(),
  },
  handler: async (ctx, args): Promise<TickerResolutionResult> => {
    const apiKey = process.env.EODHD_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        isin: args.isin,
        exchange: args.exchangeCode,
        tickerSymbol: null,
        eodhExchange: null,
        error: "EODHD_API_KEY not set",
      };
    }

    const isin = args.isin.toUpperCase().trim();
    const exchangeCode = args.exchangeCode.toUpperCase().trim();

    // Get the mapped exchange suffix (e.g., ".AS" for EAM)
    const mappedSuffix = EXCHANGE_MAP[exchangeCode];

    // Search EODHD by ISIN
    try {
      const searchUrl = `${EODHD_BASE_URL}/search/${isin}?api_token=${apiKey}&fmt=json`;
      const searchResponse = await fetch(searchUrl);

      if (!searchResponse.ok) {
        return {
          success: false,
          isin,
          exchange: exchangeCode,
          tickerSymbol: null,
          eodhExchange: null,
          error: `EODHD search failed with status ${searchResponse.status}`,
        };
      }

      const searchResults: Array<{
        Code: string;
        Exchange: string;
        Name: string;
        Type: string;
        Country: string;
        Currency: string;
        ISIN: string;
      }> = await searchResponse.json();

      if (!searchResults || searchResults.length === 0) {
        return {
          success: false,
          isin,
          exchange: exchangeCode,
          tickerSymbol: null,
          eodhExchange: null,
          error: `No results found for ISIN ${isin}`,
        };
      }

      // Try to find exact exchange match
      let match = null;
      if (mappedSuffix) {
        const exchangeWithoutDot = mappedSuffix.replace(".", "");
        match = searchResults.find(
          (r) => r.Exchange.toUpperCase() === exchangeWithoutDot.toUpperCase()
        );
      }

      // Fallback to first result if no exact match
      if (!match) {
        match = searchResults[0];
        console.log(
          `[resolveTickerSymbol] No exact exchange match for ${isin} on ${exchangeCode}, ` +
          `using: ${match.Code}.${match.Exchange}`
        );
      }

      const tickerSymbol = `${match.Code}.${match.Exchange}`;
      const eodhExchange = match.Exchange;

      console.log(
        `[resolveTickerSymbol] ✓ ${isin} (${exchangeCode}) → ${tickerSymbol}`
      );

      return {
        success: true,
        isin,
        exchange: exchangeCode,
        tickerSymbol,
        eodhExchange,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        isin,
        exchange: exchangeCode,
        tickerSymbol: null,
        eodhExchange: null,
        error: `Failed to resolve ticker: ${error}`,
      };
    }
  },
});

/**
 * Batch resolve multiple ticker symbols
 * More efficient than calling resolveTickerSymbol multiple times
 */
export const resolveTickerSymbolsBatch = action({
  args: {
    holdings: v.array(
      v.object({
        isin: v.string(),
        exchange: v.string(),
      })
    ),
  },
  handler: async (ctx, args): Promise<TickerResolutionResult[]> => {
    const results = await Promise.allSettled(
      args.holdings.map((h) =>
        ctx.runAction(api.tickerResolver.resolveTickerSymbol, {
          isin: h.isin,
          exchangeCode: h.exchange,
        })
      )
    );

    return results.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      } else {
        return {
          success: false,
          isin: args.holdings[index].isin,
          exchange: args.holdings[index].exchange,
          tickerSymbol: null,
          eodhExchange: null,
          error: `Action failed: ${result.reason}`,
        };
      }
    });
  },
});
