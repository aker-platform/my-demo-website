import { NextRequest, NextResponse } from "next/server";

const EODHD_BASE_URL = "https://eodhd.com/api";

interface EodhdSearchResult {
  Code: string;
  Exchange: string;
  Name: string;
  Type: string;
  Country: string;
  Currency: string;
  ISIN: string;
  previousClose: number;
  previousCloseDate: string;
}

interface EodhdRealtimeResult {
  code: string;
  timestamp: number;
  gmtoffset: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  previousClose: number;
  change: number;
  change_p: number;
}

interface PriceResult {
  isin: string;
  ticker: string;
  exchange: string;
  name: string;
  currentPrice: number;
  dayChange: number;
  dayChangePercent: number;
  volume: number;
  currency: string;
}

// Search EODHD for a ticker by ISIN
async function searchByIsin(
  isin: string,
  apiKey: string
): Promise<EodhdSearchResult | null> {
  try {
    const url = `${EODHD_BASE_URL}/search/${isin}?api_token=${apiKey}&fmt=json`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const results: EodhdSearchResult[] = await response.json();
    if (!results || results.length === 0) return null;

    // Prefer ETF type, otherwise take the first result
    const etfResult = results.find(
      (r) => r.Type === "ETF" || r.Type === "Fund"
    );
    return etfResult || results[0];
  } catch (error) {
    console.error(`Error searching EODHD for ISIN ${isin}:`, error);
    return null;
  }
}

// Fetch real-time price from EODHD
async function fetchRealtimePrice(
  code: string,
  exchange: string,
  apiKey: string
): Promise<EodhdRealtimeResult | null> {
  try {
    const url = `${EODHD_BASE_URL}/real-time/${code}.${exchange}?api_token=${apiKey}&fmt=json`;
    const response = await fetch(url);
    if (!response.ok) return null;

    return await response.json();
  } catch (error) {
    console.error(
      `Error fetching price for ${code}.${exchange}:`,
      error
    );
    return null;
  }
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.EODHD_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "EODHD API key not configured" },
      { status: 500 }
    );
  }

  try {
    const { isins } = (await request.json()) as { isins: string[] };
    if (!isins || !Array.isArray(isins) || isins.length === 0) {
      return NextResponse.json(
        { error: "Please provide an array of ISINs" },
        { status: 400 }
      );
    }

    const prices: PriceResult[] = [];

    // Process ISINs sequentially to avoid rate limiting
    for (const isin of isins) {
      // Step 1: Search for the ticker by ISIN
      const searchResult = await searchByIsin(isin, apiKey);
      if (!searchResult) {
        console.warn(`No EODHD result found for ISIN: ${isin}`);
        continue;
      }

      // Step 2: Fetch real-time price
      const priceData = await fetchRealtimePrice(
        searchResult.Code,
        searchResult.Exchange,
        apiKey
      );
      if (!priceData) {
        console.warn(
          `No price data for ${searchResult.Code}.${searchResult.Exchange}`
        );
        continue;
      }

      prices.push({
        isin,
        ticker: searchResult.Code,
        exchange: searchResult.Exchange,
        name: searchResult.Name,
        currentPrice: priceData.close,
        dayChange: priceData.change,
        dayChangePercent: priceData.change_p,
        volume: priceData.volume,
        currency: searchResult.Currency,
      });
    }

    return NextResponse.json({ prices });
  } catch (error) {
    console.error("Error fetching prices:", error);
    return NextResponse.json(
      { error: "Failed to fetch prices from EODHD" },
      { status: 500 }
    );
  }
}
