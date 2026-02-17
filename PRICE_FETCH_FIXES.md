# ETF Price Fetching - Fixes Implemented ✅

## Summary
Fixed critical issues in ETF price fetching logic that were causing incorrect or missing prices for stored ETFs.

## Root Causes Identified

1. **Case Sensitivity Bug**: ISINs were stored/queried with inconsistent casing
2. **Limited Exchange Coverage**: Only 3 exchanges mapped, causing fallback to wrong exchanges
3. **No Currency Validation**: Prices from wrong currency exchanges being accepted
4. **Poor Fallback Logic**: First result blindly used regardless of currency/exchange match
5. **Insufficient Logging**: Hard to diagnose which exchange was resolved

## Fixes Implemented

### 1. Ticker Normalization (etfPrices.ts, import.ts, portfolios.ts)
```typescript
// Before: Inconsistent casing
ticker: isin  // Could be lowercase or mixed case

// After: Always normalized
ticker: isin.toUpperCase().trim()  // Consistent uppercase
```

**Impact**: Ensures price lookups always match stored holdings

### 2. Exchange Mapping Expansion (etfPrices.ts)
```typescript
// Before: 3 exchanges
const EXCHANGE_MAP = {
  EAM: ".AS",
  MIL: ".MI",
  XET: ".DE",
};

// After: 11 exchanges
const EXCHANGE_MAP = {
  EAM: ".AS", AMS: ".AS",      // Amsterdam
  MIL: ".MI",                   // Milan
  XET: ".DE", XETRA: ".DE",    // XETRA
  FRA: ".F",                    // Frankfurt
  PAR: ".PA", EPA: ".PA",      // Paris
  BRU: ".BR",                   // Brussels
  LIS: ".LS",                   // Lisbon
  SWX: ".SW",                   // Swiss
  LSE: ".L", LON: ".L",        // London
};
```

**Impact**: Correctly maps more broker exchange codes to EODHD exchanges

### 3. Currency Validation (etfPrices.ts)
```typescript
// Added currency mapping per exchange
const EXCHANGE_CURRENCY_MAP = {
  AS: "EUR", MI: "EUR", DE: "EUR", F: "EUR",
  PA: "EUR", BR: "EUR", LS: "EUR",
  SW: "CHF", L: "GBP",
};

// Validate in fetchEtfPrice
if (expectedCurrency && priceCurrency !== expectedCurrency) {
  warning = `Currency mismatch: Expected ${expectedCurrency}, got ${priceCurrency}`;
}
```

**Impact**: Detects when wrong exchange/currency is used, warns user

### 4. Smart Fallback Strategy (etfPrices.ts)
```typescript
// Before: Blind fallback to first result
if (!match) {
  match = searchResults[0];  // Could be wrong currency/exchange
}

// After: Currency-aware fallback
if (!match) {
  // Try to find same currency match
  if (expectedCurrency) {
    match = searchResults.find(r =>
      EXCHANGE_CURRENCY_MAP[r.Exchange] === expectedCurrency
    );
  }
  // Only use first result as last resort
  if (!match) match = searchResults[0];

  fallbackUsed = true;  // Track for warning
}
```

**Impact**: Reduces incorrect exchange selection when exact match unavailable

### 5. Enhanced Diagnostics (etfPrices.ts)
```typescript
// Success logging
console.log(
  `[fetchEtfPrice] ✓ ${isin} → ${resolvedTicker}: ${currency} ${price} (${change}%)`
);

// Warning system
return {
  success: true,
  warning: fallbackUsed ? "Using fallback exchange" : null,
  ...
};
```

**Impact**: Easy to diagnose which ETFs have issues and why

### 6. Data Validation (etfPrices.ts)
```typescript
// Validate price before saving
if (currentPrice <= 0) {
  return {
    success: false,
    error: `Invalid price data: currentPrice=${currentPrice}`,
  };
}
```

**Impact**: Prevents storing invalid/zero prices

## Files Modified

1. `convex/etfPrices.ts` - Core logic improvements
2. `convex/import.ts` - Normalize data on import
3. `convex/portfolios.ts` - Normalize ticker lookups
4. `app/page.tsx` - Pass currency, handle warnings

## Testing

### ✅ Compilation Tests
- TypeScript compilation: **PASSED**
- Convex functions syntax: **PASSED**
- Test script execution: **PASSED**

### 🧪 Manual Testing Steps

1. **Re-import Portfolio** (to apply ISIN normalization):
   - Go to Upload Portfolio page
   - Re-upload your CSV file
   - This normalizes all ISINs to uppercase

2. **Refresh Prices**:
   - Click the refresh button (circular arrow)
   - Open browser console (F12)
   - Monitor the `[fetchEtfPrice]` logs

3. **Verify Results**:
   - Check that prices appear for all ETFs
   - Look for success logs: `✓ ISIN → TICKER: CUR PRICE (CHANGE%)`
   - Check for warnings about currency mismatches
   - Verify displayed prices match actual market prices

### Expected Console Output

**Success case:**
```
[fetchEtfPrice] ✓ IE00B4L5Y983 → IWDA.AS: EUR 89.45 (+0.35%)
[fetchEtfPrice] ✓ IE00B3RBWM25 → VWRL.AS: EUR 112.78 (+0.42%)
```

**Warning case:**
```
[fetchEtfPrice] ⚠ Unknown exchange code "ABC" for ISIN XYZ123
[fetchEtfPrice] ⚠ Currency mismatch: Expected EUR, got USD from TICKER.US
```

**Error case:**
```
[Price fetch] IE00XXXXXXXX: No EODHD results found for ISIN
```

## Troubleshooting

### Prices still showing as dashes (—)

**Cause**: Old data with lowercase ISINs still in database

**Solution**:
1. Re-import your portfolio CSV
2. Or manually update via Convex dashboard (convert ticker to uppercase)

### Currency mismatch warnings

**Cause**: Exchange code doesn't match expected currency

**Solution**:
1. Check console to see which exchange was resolved
2. Verify broker exchange code matches EXCHANGE_MAP
3. Add custom mapping if needed in `etfPrices.ts`

### Unknown exchange code

**Cause**: Broker uses exchange code not in our mapping

**Solution**:
Add to EXCHANGE_MAP in `convex/etfPrices.ts`:
```typescript
const EXCHANGE_MAP: Record<string, string> = {
  // ... existing mappings
  "YOUR_CODE": ".XX",  // Add your exchange
};
```

Then update EXCHANGE_CURRENCY_MAP if needed.

## Performance Impact

- **Faster**: Expanded exchange mapping reduces fallback searches
- **Fewer API calls**: Better caching via normalized keys
- **Better UX**: Clear logging helps identify issues quickly

## Next Steps

1. Start dev servers and test the refresh functionality
2. Monitor console logs during price fetch
3. Report any remaining issues with:
   - The specific ISIN having problems
   - Console logs showing the error
   - Expected vs actual exchange/currency
