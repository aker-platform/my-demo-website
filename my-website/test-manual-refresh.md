# Manual Testing Instructions

## ✅ Development Servers Started

The Next.js development server is running on **http://localhost:3000**

## Testing the Price Refresh

### Step 1: Open the Application
1. Open your browser
2. Navigate to: **http://localhost:3000**
3. You should see your portfolio dashboard

### Step 2: Open Developer Console
1. Press **F12** or **Ctrl+Shift+I** (Windows)
2. Click on the **Console** tab
3. Clear any existing logs (trash icon)

### Step 3: Test Price Refresh
1. Click the **circular arrow (refresh) button** in the top right
2. Watch the console for logs

### Expected Console Output

You should see logs like this:

```
[Price fetch] Fetching prices for X holdings...
[fetchEtfPrice] ✓ IE00B4L5Y983 → IWDA.AS: EUR 89.45 (+0.35%)
[fetchEtfPrice] ✓ IE00B3RBWM25 → VWRL.AS: EUR 112.78 (+0.42%)
[fetchEtfPrice] ✓ LU0274208692 → XMWO.MI: EUR 45.67 (+0.15%)
```

### What Each Log Shows:
- ✓ = Success
- ISIN → EODHD Ticker
- Currency + Price
- Day change percentage

### If You See Warnings:
```
[fetchEtfPrice] ⚠ Currency mismatch: Expected EUR, got USD from TICKER.US
[fetchEtfPrice] ⚠ No exact exchange match for ISIN XXX, using fallback
```
These are non-critical but indicate the exchange mapping may need adjustment.

### If You See Errors:
```
[Price fetch] IE00XXXXX: No EODHD results found for ISIN
```
This means EODHD doesn't have data for this ISIN. Check the ISIN is correct.

## Step 4: Verify Prices Display

After refresh completes:
1. Prices should appear on all ETF cards (no more dashes)
2. Current price should show per share
3. Market value and Gain/Loss should be calculated
4. Total portfolio value shown at top

## Troubleshooting

### Problem: Prices still show as "—"
**Solution**: Re-import your portfolio to normalize ISINs:
1. Click "Re-import CSV" link
2. Upload your CSV file again
3. Click refresh button again

### Problem: "EODHD_API_KEY not set" error
**Solution**: Check Convex environment variables
1. Run: `npx convex env list`
2. If missing, set: `npx convex env set EODHD_API_KEY your_key_here`

### Problem: Currency mismatch warnings
**Solution**: Check which exchange was resolved
1. Look at console log to see resolved ticker
2. Verify broker exchange code in CSV
3. May need to add exchange mapping in `etfPrices.ts`

## Next Steps After Testing

1. Share console output if issues persist
2. Note which specific ETFs have problems
3. Check exchange codes in your CSV file
4. We can adjust exchange mappings as needed

## Quick Reference

**Files Modified:**
- `convex/etfPrices.ts` - Core price fetching logic
- `convex/import.ts` - Import data normalization
- `convex/portfolios.ts` - Price lookup normalization
- `app/page.tsx` - Frontend refresh with currency validation

**Test Scripts:**
- `npx tsx test-price-fetch.ts` - Test exchange mapping logic
- `npx tsx check-data-normalization.ts` - Verify data normalization
