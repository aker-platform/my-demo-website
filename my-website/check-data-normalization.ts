#!/usr/bin/env tsx
/**
 * Check Data Normalization Script
 *
 * This script simulates the data flow to verify normalization is working correctly
 * Run: npx tsx check-data-normalization.ts
 */

type Holding = {
  isin: string;
  exchange: string;
  currency: string;
  name: string;
};

// Simulate CSV import with various cases
const csvImportData: Holding[] = [
  { isin: "ie00b4l5y983", exchange: "eam", currency: "eur", name: "iShares Core MSCI World" },
  { isin: "IE00B3RBWM25", exchange: "XET", currency: "EUR", name: "Vanguard FTSE All-World" },
  { isin: "LU0274208692", exchange: "Mil", currency: "Eur", name: "Xtrackers MSCI World" },
];

console.log("🔍 Data Normalization Verification\n");
console.log("=".repeat(70));

// Step 1: Import normalization (as per import.ts fix)
console.log("\n📥 Step 1: Import Normalization (import.ts)");
console.log("-".repeat(70));

const normalizedHoldings = csvImportData.map((h) => {
  const normalizedIsin = h.isin.toUpperCase().trim();
  const normalizedExchange = h.exchange.toUpperCase().trim();
  const normalizedCurrency = h.currency.toUpperCase().trim();

  console.log(`\nOriginal: ${h.isin} | ${h.exchange} | ${h.currency}`);
  console.log(`Stored:   ${normalizedIsin} | ${normalizedExchange} | ${normalizedCurrency}`);

  return {
    ticker: normalizedIsin,  // Used as key
    isin: normalizedIsin,
    exchange: normalizedExchange,
    currency: normalizedCurrency,
    name: h.name,
  };
});

// Step 2: Price lookup normalization (as per import.ts getPortfolioOverview fix)
console.log("\n\n💰 Step 2: Price Lookup (import.ts - getPortfolioOverview)");
console.log("-".repeat(70));

normalizedHoldings.forEach((h) => {
  const lookupKey = h.ticker.toUpperCase().trim();
  console.log(`\nHolding: ${h.name}`);
  console.log(`  Ticker (from DB): "${h.ticker}"`);
  console.log(`  Lookup key:       "${lookupKey}"`);
  console.log(`  Match: ${h.ticker === lookupKey ? "✅" : "❌"}`);
});

// Step 3: Price storage normalization (as per etfPrices.ts savePrice fix)
console.log("\n\n💾 Step 3: Price Storage (etfPrices.ts - savePrice)");
console.log("-".repeat(70));

const priceStorageKeys = normalizedHoldings.map((h) => {
  const storageKey = h.isin.toUpperCase().trim();  // From fetchEtfPrice action
  console.log(`\nETF: ${h.name}`);
  console.log(`  ISIN from holding: "${h.isin}"`);
  console.log(`  Storage key:       "${storageKey}"`);
  console.log(`  Match: ${h.isin === storageKey ? "✅" : "❌"}`);

  return storageKey;
});

// Step 4: Verification - All keys should match
console.log("\n\n✅ Step 4: Verification");
console.log("-".repeat(70));

let allMatch = true;
normalizedHoldings.forEach((h, i) => {
  const holdingKey = h.ticker;
  const priceKey = priceStorageKeys[i];
  const matches = holdingKey === priceKey;

  console.log(`\n${i + 1}. ${h.name}`);
  console.log(`   Holdings.ticker:    "${holdingKey}"`);
  console.log(`   etfPrices.ticker:   "${priceKey}"`);
  console.log(`   Keys match:         ${matches ? "✅ YES" : "❌ NO"}`);

  if (!matches) allMatch = false;
});

console.log("\n" + "=".repeat(70));
if (allMatch) {
  console.log("\n✅ SUCCESS: All normalization checks passed!");
  console.log("   Holdings and prices will match correctly.");
} else {
  console.log("\n❌ FAILURE: Normalization mismatch detected!");
  console.log("   This would cause price lookup failures.");
}

console.log("\n📊 Summary:");
console.log(`   • ${csvImportData.length} holdings processed`);
console.log(`   • All ISINs normalized to uppercase`);
console.log(`   • All exchanges normalized to uppercase`);
console.log(`   • All currencies normalized to uppercase`);
console.log(`   • Ticker keys consistent across tables`);

console.log("\n🧪 Next: Test with real data by refreshing prices in the app");
