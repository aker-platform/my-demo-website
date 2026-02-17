# ETF Price Fetching - Diagnostic Report

## Changes Implemented

### 1. Ticker Normalization ✅
- All ISINs converted to uppercase and trimmed
- Consistent across: queries, mutations, imports, lookups
- Files updated: `etfPrices.ts`, `import.ts`, `portfolios.ts`

### 2. Exchange Mapping Expansion ✅
Supported exchanges increased from 3 to 11:

| Broker Code | Exchange | EODHD Suffix | Currency |
|-------------|----------|--------------|----------|
| EAM, AMS    | Amsterdam | .AS | EUR |
| MIL         | Milan | .MI | EUR |
| XET, XETRA  | XETRA | .DE | EUR |
| FRA         | Frankfurt | .F | EUR |
| PAR, EPA    | Paris | .PA | EUR |
| BRU         | Brussels | .BR | EUR |
| LIS         | Lisbon | .LS | EUR |
| SWX         | Swiss | .SW | CHF |
| LSE, LON    | London | .L | GBP |

### 3. Currency Validation ✅
- `expectedCurrency` parameter added to `fetchEtfPrice`
- Warns when fetched price currency doesn't match holding currency
- Smart fallback tries same-currency alternatives first

### 4. Enhanced Logging ✅
Success logs show:
```
[fetchEtfPrice] ✓ IE00B4L5Y983 → IWDA.AS: EUR 89.45 (+0.35%)
```

Warning logs show:
```
[fetchEtfPrice] Currency mismatch: Expected EUR, got USD from IWDA.US
[fetchEtfPrice] Using fallback exchange mapping for IE00B4L5Y983
```

### 5. Data Validation ✅
- Validates `currentPrice > 0` before saving
- Returns error for invalid price data
- Checks currency field presence

## Testing Steps

### Manual Test via UI:
1. Start development servers:
   ```bash
   cd my-website
   npm run dev          # Terminal 1
   npx convex dev       # Terminal 2
   ```

2. Open browser at `http://localhost:3000`

3. Re-import your portfolio CSV if needed (to apply ISIN normalization)

4. Click the refresh button (circular arrow icon)

5. Check browser console for detailed logs:
   - Look for `[fetchEtfPrice]` entries
   - Verify each ISIN → ticker resolution
   - Check for any warnings about currency mismatches
   - Confirm prices are displayed correctly

### Expected Console Output:
```
[Price fetch] IE00B4L5Y983: Fetching from EODHD...
[fetchEtfPrice] ✓ IE00B4L5Y983 → IWDA.AS: EUR 89.45 (+0.35%)
[fetchEtfPrice] ✓ IE00B3RBWM25 → VWRL.AS: EUR 112.78 (+0.42%)
```

### Troubleshooting:

**If prices still show as dashes (—):**
1. Check browser console for error messages
2. Verify EODHD_API_KEY is set in Convex environment
3. Check that ISINs in database are now uppercase (re-import if needed)
4. Look for "No EODHD results found" errors

**If currency mismatches occur:**
1. Check console warnings showing the mismatch
2. Verify the exchange code in your CSV matches our mapping
3. Consider adding custom exchange mapping if needed

**If exchange not mapped:**
1. Check console for "Unknown exchange code" warnings
2. Add the exchange code to EXCHANGE_MAP in `etfPrices.ts`
3. Example: `"YOUR_CODE": ".XX"` where XX is the EODHD suffix

## Database Schema Note

The `etfPrices` table uses ISIN (uppercase) as the `ticker` key:
- Holdings store: `ticker: "IE00B4L5Y983"` (normalized ISIN)
- Prices store: `ticker: "IE00B4L5Y983"` (normalized ISIN)
- Lookup matches: `etfPrices.ticker === holdings.ticker` ✅

## Next Steps

If issues persist:
1. Share browser console output showing the `[fetchEtfPrice]` logs
2. Share any error messages from the refresh operation
3. Verify which ETFs are showing incorrect prices
4. Check the exchange codes used in your CSV file
