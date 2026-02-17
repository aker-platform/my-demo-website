"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Upload,
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Loader2,
} from "lucide-react";
import {
  parseBrokerCSV,
  aggregateHoldings,
  type BrokerTransaction,
  type HoldingSummary,
} from "@/lib/csv-parser";

type Step = "upload" | "preview" | "summary";

export default function UploadPortfolioPage() {
  const router = useRouter();
  const importPortfolioWithTickers = useAction(api.import.importPortfolioWithTickers);

  const [step, setStep] = useState<Step>("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState("");
  const [transactions, setTransactions] = useState<BrokerTransaction[]>([]);
  const [holdings, setHoldings] = useState<HoldingSummary[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [importProgress, setImportProgress] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const processFile = useCallback((file: File) => {
    setFileName(file.name);
    setFileSize(formatFileSize(file.size));

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { transactions: parsed, errors } = parseBrokerCSV(text);

      setTransactions(parsed);
      setParseErrors(errors);
      setHoldings(aggregateHoldings(parsed));
      setStep("preview");
    };
    reader.readAsText(file, "utf-8");
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && (file.name.endsWith(".csv") || file.type === "text/csv")) {
        processFile(file);
      }
    },
    [processFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleReset = () => {
    setStep("upload");
    setFileName("");
    setFileSize("");
    setTransactions([]);
    setHoldings([]);
    setParseErrors([]);
    setShowAllTransactions(false);
    setShowErrors(false);
    setImportError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImport = async () => {
    setIsImporting(true);
    setImportError("");
    setImportProgress("Resolving ticker symbols...");

    try {
      const result = await importPortfolioWithTickers({
        fileName,
        transactions: transactions.map((tx) => ({
          date: tx.date,
          time: tx.time,
          product: tx.product,
          isin: tx.isin,
          exchange: tx.exchange,
          executionPlatform: tx.executionPlatform,
          amount: tx.amount,
          price: tx.price,
          currency: tx.currency,
        })),
        holdings: holdings.map((h) => ({
          isin: h.isin,
          product: h.product,
          exchange: h.exchange,
          totalShares: h.totalShares,
          totalCost: h.totalCost,
          avgCost: h.avgCost,
          currency: h.currency,
          transactionCount: h.transactionCount,
          firstDate: h.firstDate,
          lastDate: h.lastDate,
        })),
      });

      setImportProgress(`Resolved ${result.resolvedTickers}/${result.totalHoldings} tickers`);

      // Redirect to overview on success after short delay
      setTimeout(() => {
        router.push("/");
      }, 1000);
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : "Failed to import portfolio"
      );
      setImportProgress("");
    } finally {
      setIsImporting(false);
    }
  };

  const visibleTransactions = showAllTransactions
    ? transactions
    : transactions.slice(0, 10);

  return (
    <div className="min-h-screen px-8 py-8 lg:px-12">
      {/* Page header */}
      <div>
        <h1 className="text-[32px] font-bold tracking-tight text-gray-900">
          Upload Portfolio
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Import your broker CSV to analyze your portfolio
        </p>
      </div>

      {/* Steps indicator */}
      <div className="mt-8 flex items-center gap-3">
        {[
          { key: "upload", label: "Upload" },
          { key: "preview", label: "Preview" },
          { key: "summary", label: "Summary" },
        ].map((s, i) => {
          const isActive = step === s.key;
          const isCompleted =
            (s.key === "upload" && step !== "upload") ||
            (s.key === "preview" && step === "summary");
          return (
            <div key={s.key} className="flex items-center gap-3">
              {i > 0 && (
                <div
                  className={`h-px w-8 ${
                    isCompleted || isActive ? "bg-gray-900" : "bg-gray-200"
                  }`}
                />
              )}
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                    isActive
                      ? "bg-gray-900 text-white"
                      : isCompleted
                        ? "bg-green-500 text-white"
                        : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={`text-sm font-medium ${
                    isActive
                      ? "text-gray-900"
                      : isCompleted
                        ? "text-green-600"
                        : "text-gray-400"
                  }`}
                >
                  {s.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Step 1: Upload */}
      {step === "upload" && (
        <div className="mt-8">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-16 transition-colors ${
              isDragging
                ? "border-blue-400 bg-blue-50"
                : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-full ${
                isDragging ? "bg-blue-100" : "bg-gray-100"
              }`}
            >
              <Upload
                className={`h-6 w-6 ${
                  isDragging ? "text-blue-500" : "text-gray-400"
                }`}
              />
            </div>
            <p className="mt-4 text-sm font-semibold text-gray-900">
              {isDragging
                ? "Drop your CSV file here"
                : "Drag & drop your CSV file here"}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              or click to browse files
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Expected format info */}
          <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6">
            <h3 className="text-sm font-semibold text-gray-900">
              Expected CSV format
            </h3>
            <p className="mt-1 text-xs text-gray-400">
              Your broker CSV should contain the following columns:
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-2 pr-6 text-left font-semibold text-gray-900">
                      Column
                    </th>
                    <th className="pb-2 pr-6 text-left font-semibold text-gray-900">
                      Header in CSV
                    </th>
                    <th className="pb-2 text-left font-semibold text-gray-900">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="text-gray-500">
                  {[
                    ["Date", "Datum", "Transaction date"],
                    ["Time", "Tijd", "Transaction time"],
                    ["Product", "Product", "Name of the ETF"],
                    ["ISIN", "ISIN", "Unique ETF identifier"],
                    ["Exchange", "Beurs", "Stock exchange"],
                    [
                      "Execution platform",
                      "Uitvoeringsplaats",
                      "Where the trade was executed",
                    ],
                    ["Amount", "Aantal", "Number of shares (buy/sell)"],
                    ["Price", "Koers", "Price per share"],
                    ["Currency", "(empty)", "Currency of the transaction"],
                  ].map(([field, header, desc]) => (
                    <tr key={field} className="border-b border-gray-50">
                      <td className="py-2 pr-6 font-medium text-gray-700">
                        {field}
                      </td>
                      <td className="py-2 pr-6">
                        <code className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-mono text-gray-600">
                          {header}
                        </code>
                      </td>
                      <td className="py-2 text-gray-400">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === "preview" && (
        <div className="mt-8 space-y-6">
          {/* File info bar */}
          <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {fileName}
                </p>
                <p className="text-xs text-gray-400">
                  {fileSize} · {transactions.length} transactions parsed
                </p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Parse errors */}
          {parseErrors.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <button
                onClick={() => setShowErrors(!showErrors)}
                className="flex w-full items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium text-amber-800">
                    {parseErrors.length} row(s) could not be parsed
                  </span>
                </div>
                {showErrors ? (
                  <ChevronUp className="h-4 w-4 text-amber-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-amber-500" />
                )}
              </button>
              {showErrors && (
                <ul className="mt-3 space-y-1">
                  {parseErrors.map((err, i) => (
                    <li key={i} className="text-xs text-amber-700">
                      {err}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Transactions table */}
          <div className="rounded-2xl border border-gray-100 bg-white">
            <div className="border-b border-gray-100 px-6 py-4">
              <h3 className="text-sm font-semibold text-gray-900">
                Transaction Preview
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Showing {visibleTransactions.length} of {transactions.length}{" "}
                transactions
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-400">
                    <th className="px-6 py-3 text-left font-medium">Date</th>
                    <th className="px-6 py-3 text-left font-medium">Time</th>
                    <th className="px-6 py-3 text-left font-medium">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left font-medium">ISIN</th>
                    <th className="px-6 py-3 text-left font-medium">
                      Exchange
                    </th>
                    <th className="px-6 py-3 text-right font-medium">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-right font-medium">Price</th>
                    <th className="px-6 py-3 text-left font-medium">
                      Currency
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTransactions.map((tx, i) => (
                    <tr
                      key={i}
                      className="border-b border-gray-50 last:border-0"
                    >
                      <td className="px-6 py-3 text-gray-900 whitespace-nowrap">
                        {tx.date}
                      </td>
                      <td className="px-6 py-3 text-gray-500 whitespace-nowrap">
                        {tx.time}
                      </td>
                      <td className="px-6 py-3 font-medium text-gray-900 max-w-[200px] truncate">
                        {tx.product}
                      </td>
                      <td className="px-6 py-3 text-gray-500 font-mono text-xs whitespace-nowrap">
                        {tx.isin}
                      </td>
                      <td className="px-6 py-3 text-gray-500 whitespace-nowrap">
                        {tx.exchange}
                      </td>
                      <td
                        className={`px-6 py-3 text-right font-medium whitespace-nowrap ${
                          tx.amount >= 0 ? "text-green-600" : "text-red-500"
                        }`}
                      >
                        {tx.amount >= 0 ? "+" : ""}
                        {tx.amount}
                      </td>
                      <td className="px-6 py-3 text-right text-gray-900 whitespace-nowrap">
                        {tx.price.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 4,
                        })}
                      </td>
                      <td className="px-6 py-3 text-gray-500 whitespace-nowrap">
                        {tx.currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {transactions.length > 10 && (
              <div className="border-t border-gray-100 px-6 py-3">
                <button
                  onClick={() => setShowAllTransactions(!showAllTransactions)}
                  className="text-xs font-medium text-blue-600 hover:underline"
                >
                  {showAllTransactions
                    ? "Show less"
                    : `Show all ${transactions.length} transactions`}
                </button>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleReset}
              className="rounded-xl px-5 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              Upload different file
            </button>
            <button
              onClick={() => setStep("summary")}
              className="flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Continue to Summary
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Summary */}
      {step === "summary" && (
        <div className="mt-8 space-y-6">
          {/* Stats row */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Transactions
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {transactions.length}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Unique Holdings
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {holdings.length}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Total Invested
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {holdings
                  .reduce((sum, h) => sum + Math.abs(h.totalCost), 0)
                  .toLocaleString("en-US", {
                    style: "currency",
                    currency: "EUR",
                  })}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Total Shares
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {holdings
                  .reduce((sum, h) => sum + h.totalShares, 0)
                  .toLocaleString("en-US", { maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Holdings cards */}
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Portfolio <span className="text-gray-400">holdings</span>
            </h2>
            <p className="mt-1 text-xs text-gray-400">
              Aggregated from your transaction history
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {holdings.map((holding) => (
              <div
                key={holding.isin || holding.product}
                className="rounded-2xl border border-gray-100 bg-white p-6 transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {holding.product}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400 font-mono">
                      {holding.isin}
                    </p>
                  </div>
                  <span className="ml-3 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                    {holding.currency || "EUR"}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400">Shares</p>
                    <p className="text-lg font-bold text-gray-900">
                      {holding.totalShares.toLocaleString("en-US", {
                        maximumFractionDigits: 4,
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Avg. Cost</p>
                    <p className="text-lg font-bold text-gray-900">
                      {holding.avgCost.toLocaleString("en-US", {
                        style: "currency",
                        currency: holding.currency || "EUR",
                      })}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-gray-50 pt-3">
                  <span className="text-xs text-gray-400">
                    {holding.transactionCount} transaction
                    {holding.transactionCount !== 1 ? "s" : ""} ·{" "}
                    {holding.firstDate}
                    {holding.firstDate !== holding.lastDate &&
                      ` – ${holding.lastDate}`}
                  </span>
                  <span className="text-xs font-semibold text-gray-900">
                    {Math.abs(holding.totalCost).toLocaleString("en-US", {
                      style: "currency",
                      currency: holding.currency || "EUR",
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Import progress */}
          {isImporting && importProgress && (
            <div className="flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-6 py-4">
              <Loader2 className="h-4 w-4 text-blue-500 animate-spin flex-shrink-0" />
              <p className="text-sm text-blue-700">{importProgress}</p>
            </div>
          )}

          {/* Import error */}
          {importError && (
            <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-6 py-4">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">{importError}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep("preview")}
              className="rounded-xl px-5 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
              disabled={isImporting}
            >
              Back to Preview
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={handleReset}
                className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                disabled={isImporting}
              >
                Upload new file
              </button>
              <button
                onClick={handleImport}
                disabled={isImporting}
                className="flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {importProgress || "Importing..."}
                  </>
                ) : (
                  <>
                    Import Portfolio & Resolve Tickers
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
