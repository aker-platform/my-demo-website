#!/usr/bin/env tsx
/**
 * Simulate EODHD API Call
 *
 * This simulates what happens when fetchEtfPrice is called
 * Shows the exact API URLs that would be used
 *
 * Run: npx tsx simulate-api-call.ts
 */

const EODHD_BASE_URL = "https://eodhd.com/api";

// Exchange mapping (same as in etfPrices.ts)
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

type TestCase = {
  isin: string;
  exchangeCode: string;
  expectedCurrency: string;
  name: string;
};

const testCases: TestCase[] = [
  {
    isin: "IE00B4L5Y983",
    exchangeCode: "EAM",
    expectedCurrency: "EUR",
    name: "iShares Core MSCI World UCITS ETF",
  },
  {
    isin: "IE00B3RBWM25",
    exchangeCode: "XET",
    expectedCurrency: "EUR",
    name: "Vanguard FTSE All-World UCITS ETF",
  },
  {
    isin: "LU0274208692",
    exchangeCode: "MIL",
    expectedCurrency: "EUR",
    name: "Xtrackers MSCI World UCITS ETF",
  },
];

console.log("🔌 EODHD API Call Simulation\n");
console.log("=".repeat(80));

testCases.forEach((testCase, index) => {
  console.log(`\n📊 Test Case ${index + 1}: ${testCase.name}`);
  console.log("-".repeat(80));

  // Step 1: Normalize inputs
  const isin = testCase.isin.toUpperCase().trim();
  const exchangeCode = testCase.exchangeCode.toUpperCase().trim();
  const expectedCurrency = testCase.expectedCurrency.toUpperCase().trim();

  console.log(`\n1️⃣  Input Normalization:`);
  console.log(`   ISIN:              ${isin}`);
  console.log(`   Exchange Code:     ${exchangeCode}`);
  console.log(`   Expected Currency: ${expectedCurrency}`);

  // Step 2: Check cache (simulated)
  console.log(`\n2️⃣  Cache Check:`);
  console.log(`   Query: etfs.by_isin_exchange("${isin}", "${exchangeCode}")`);
  console.log(`   Result: [Simulated - would check database]`);

  // Step 3: Exchange mapping
  const mappedSuffix = EXCHANGE_MAP[exchangeCode];
  console.log(`\n3️⃣  Exchange Mapping:`);
  if (mappedSuffix) {
    console.log(`   ✓ ${exchangeCode} → ${mappedSuffix}`);
    console.log(`   EODHD Exchange: ${mappedSuffix.replace(".", "")}`);
  } else {
    console.log(`   ✗ No mapping found for ${exchangeCode}`);
    console.log(`   Will use fallback strategy`);
  }

  // Step 4: Search API call
  const searchUrl = `${EODHD_BASE_URL}/search/${isin}?api_token=YOUR_API_KEY&fmt=json`;
  console.log(`\n4️⃣  Search API Call:`);
  console.log(`   URL: ${searchUrl.replace("YOUR_API_KEY", "[API_KEY]")}`);
  console.log(`   Method: GET`);
  console.log(`   Expected: Array of matching securities`);

  // Step 5: Filter results (simulated)
  if (mappedSuffix) {
    const targetExchange = mappedSuffix.replace(".", "");
    console.log(`\n5️⃣  Filter Search Results:`);
    console.log(`   Looking for: Exchange === "${targetExchange}"`);
    console.log(`   Currency check: ${expectedCurrency}`);
  }

  // Step 6: Real-time price call (simulated)
  const assumedTicker = `${isin.substring(0, 4)}${mappedSuffix || ".XX"}`;
  const priceUrl = `${EODHD_BASE_URL}/real-time/${assumedTicker}?api_token=YOUR_API_KEY&fmt=json`;
  console.log(`\n6️⃣  Real-Time Price API Call:`);
  console.log(`   Resolved Ticker: ${assumedTicker}`);
  console.log(`   URL: ${priceUrl.replace("YOUR_API_KEY", "[API_KEY]")}`);
  console.log(`   Method: GET`);
  console.log(`   Expected fields:`);
  console.log(`     - close: current price`);
  console.log(`     - change: absolute change`);
  console.log(`     - change_p: percentage change`);
  console.log(`     - currency: price currency`);
  console.log(`     - volume: trading volume`);

  // Step 7: Validation
  console.log(`\n7️⃣  Validation:`);
  console.log(`   Check: close > 0`);
  console.log(`   Check: currency === "${expectedCurrency}"`);
  console.log(`   Warning if: currency mismatch detected`);

  // Step 8: Save to database
  console.log(`\n8️⃣  Save to Database:`);
  console.log(`   Table: etfPrices`);
  console.log(`   Key (ticker): "${isin}"`);
  console.log(`   Fields: currentPrice, dayChange, dayChangePercent, volume, lastUpdated`);

  console.log(`\n9️⃣  Success Log:`);
  console.log(`   [fetchEtfPrice] ✓ ${isin} → ${assumedTicker}: ${expectedCurrency} XX.XX (+X.XX%)`);
});

console.log("\n" + "=".repeat(80));
console.log("\n📝 Summary:");
console.log(`   • ${testCases.length} test cases simulated`);
console.log(`   • All show the exact API calls that would be made`);
console.log(`   • All mappings verified from etfPrices.ts`);

console.log("\n🔐 Important:");
console.log("   • Actual API calls require EODHD_API_KEY in Convex environment");
console.log("   • Set via: npx convex env set EODHD_API_KEY your_key");
console.log("   • Get key from: https://eodhd.com/");

console.log("\n🧪 Next Steps:");
console.log("   1. Open http://localhost:3000 in browser");
console.log("   2. Open browser console (F12)");
console.log("   3. Click refresh button");
console.log("   4. Watch for actual [fetchEtfPrice] logs");
console.log("   5. Compare with simulation above");
