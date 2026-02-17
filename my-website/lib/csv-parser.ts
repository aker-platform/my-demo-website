export interface BrokerTransaction {
  date: string;       // Datum
  time: string;       // Tijd
  product: string;    // Product (ETF name)
  isin: string;       // ISIN
  exchange: string;   // Beurs
  executionPlatform: string; // Uitvoeringsplaats
  amount: number;     // Aantal
  price: number;      // Koers
  currency: string;   // (empty header column)
}

// Column header mappings from Dutch broker CSV
const COLUMN_MAP: Record<string, keyof BrokerTransaction> = {
  datum: "date",
  tijd: "time",
  product: "product",
  isin: "isin",
  beurs: "exchange",
  uitvoeringsplaats: "executionPlatform",
  aantal: "amount",
  koers: "price",
};

/**
 * Parse a CSV string from a Dutch broker export into structured transactions.
 * Handles comma/semicolon delimiters and quoted fields.
 */
export function parseBrokerCSV(csvText: string): {
  transactions: BrokerTransaction[];
  errors: string[];
  rawHeaders: string[];
} {
  const errors: string[] = [];

  // Normalize line endings
  const lines = csvText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.trim() !== "");

  if (lines.length === 0) {
    return { transactions: [], errors: ["File is empty"], rawHeaders: [] };
  }

  // Detect delimiter (semicolon is common in European CSVs)
  const firstLine = lines[0];
  const delimiter = firstLine.includes(";") ? ";" : ",";

  // Parse header row
  const rawHeaders = parseCSVLine(firstLine, delimiter).map((h) => h.trim());

  // Map headers to our fields
  const headerMapping: (keyof BrokerTransaction | null)[] = rawHeaders.map(
    (header) => {
      const normalized = header.toLowerCase().trim();
      return COLUMN_MAP[normalized] ?? null;
    }
  );

  // The last column with an empty header is typically the currency
  const emptyHeaderIndex = rawHeaders.findIndex(
    (h) => h === "" || h.toLowerCase() === "valuta"
  );
  if (emptyHeaderIndex !== -1) {
    headerMapping[emptyHeaderIndex] = "currency";
  }

  // If we still don't have a currency mapping, check for any unmapped column after "koers"
  if (!headerMapping.includes("currency")) {
    const koersIndex = headerMapping.indexOf("price");
    if (koersIndex !== -1 && koersIndex + 1 < headerMapping.length && headerMapping[koersIndex + 1] === null) {
      headerMapping[koersIndex + 1] = "currency";
    }
  }

  const transactions: BrokerTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line, delimiter);

    const tx: Partial<BrokerTransaction> = {};

    headerMapping.forEach((field, colIndex) => {
      if (!field) return;
      const raw = (values[colIndex] ?? "").trim();

      if (field === "amount") {
        // Handle European number format (comma as decimal separator)
        tx.amount = parseEuropeanNumber(raw);
      } else if (field === "price") {
        tx.price = parseEuropeanNumber(raw);
      } else {
        (tx as any)[field] = raw;
      }
    });

    // Validate required fields
    if (!tx.product && !tx.isin) {
      errors.push(`Row ${i + 1}: Missing product and ISIN`);
      continue;
    }

    transactions.push({
      date: tx.date ?? "",
      time: tx.time ?? "",
      product: tx.product ?? "",
      isin: tx.isin ?? "",
      exchange: tx.exchange ?? "",
      executionPlatform: tx.executionPlatform ?? "",
      amount: tx.amount ?? 0,
      price: tx.price ?? 0,
      currency: tx.currency ?? "",
    });
  }

  return { transactions, errors, rawHeaders };
}

/**
 * Parse a single CSV line, handling quoted fields.
 */
function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
  }

  result.push(current);
  return result;
}

/**
 * Parse European-style numbers (comma as decimal, period as thousands separator).
 */
function parseEuropeanNumber(value: string): number {
  if (!value) return 0;
  // Remove thousand separators (periods) and replace decimal comma with period
  const cleaned = value.replace(/\./g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Aggregate transactions by ISIN to get current holdings summary.
 */
export interface HoldingSummary {
  isin: string;
  product: string;
  exchange: string;
  totalShares: number;
  totalCost: number;
  avgCost: number;
  currency: string;
  transactionCount: number;
  firstDate: string;
  lastDate: string;
}

export function aggregateHoldings(
  transactions: BrokerTransaction[]
): HoldingSummary[] {
  const holdingsMap = new Map<string, {
    isin: string;
    product: string;
    exchange: string;
    totalShares: number;
    totalCost: number;
    currency: string;
    transactionCount: number;
    dates: string[];
  }>();

  for (const tx of transactions) {
    const key = tx.isin || tx.product;
    const existing = holdingsMap.get(key);

    if (existing) {
      existing.totalShares += tx.amount;
      existing.totalCost += tx.amount * tx.price;
      existing.transactionCount++;
      existing.dates.push(tx.date);
      // Keep the exchange from the first transaction
    } else {
      holdingsMap.set(key, {
        isin: tx.isin,
        product: tx.product,
        exchange: tx.exchange,
        totalShares: tx.amount,
        totalCost: tx.amount * tx.price,
        currency: tx.currency,
        transactionCount: 1,
        dates: [tx.date],
      });
    }
  }

  return Array.from(holdingsMap.values())
    .map((h) => ({
      isin: h.isin,
      product: h.product,
      exchange: h.exchange,
      totalShares: h.totalShares,
      totalCost: h.totalCost,
      avgCost: h.totalShares !== 0 ? h.totalCost / h.totalShares : 0,
      currency: h.currency,
      transactionCount: h.transactionCount,
      firstDate: h.dates.sort()[0] ?? "",
      lastDate: h.dates.sort()[h.dates.length - 1] ?? "",
    }))
    .filter((h) => h.totalShares !== 0) // Remove fully sold positions
    .sort((a, b) => Math.abs(b.totalCost) - Math.abs(a.totalCost));
}
