"use client";

import { useState, useCallback } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import {
  Plus,
  RefreshCw,
  ArrowLeft,
  Send,
  LayoutGrid,
  List,
  Search,
  Upload,
  Loader2,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { PortfolioPieChart } from "@/components/portfolio-pie-chart";

type Tab = "holdings" | "summary" | "performance";
type ViewMode = "grid" | "list";

export default function Home() {
  const portfolioData = useQuery(api.import.getPortfolioOverview);
  const fetchEtfPrice = useAction(api.etfPrices.fetchEtfPrice);
  const [activeTab, setActiveTab] = useState<Tab>("holdings");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const refreshPrices = useCallback(async () => {
    if (!portfolioData || isRefreshing) return;

    setIsRefreshing(true);
    try {
      // Collect unique ISIN + exchange pairs from holdings
      const seen = new Set<string>();
      const holdingsToFetch: {
        isin: string;
        exchangeCode: string;
        expectedCurrency?: string;
      }[] = [];

      for (const h of portfolioData.holdings) {
        if (!h.isin || h.isin.length === 0) continue;
        const key = `${h.isin}|${h.exchange}`;
        if (seen.has(key)) continue;
        seen.add(key);
        holdingsToFetch.push({
          isin: h.isin,
          exchangeCode: h.exchange,
          expectedCurrency: h.currency,
        });
      }

      if (holdingsToFetch.length === 0) return;

      // Fetch prices via the Convex action (handles exchange mapping + caching)
      const results = await Promise.allSettled(
        holdingsToFetch.map(({ isin, exchangeCode, expectedCurrency }) =>
          fetchEtfPrice({ isin, exchangeCode, expectedCurrency })
        )
      );

      // Log any errors or warnings
      for (const result of results) {
        if (result.status === "fulfilled") {
          if (!result.value.success) {
            console.warn(
              `[Price fetch] ${result.value.isin}: ${result.value.error}`
            );
          } else if (result.value.warning) {
            console.warn(
              `[Price fetch] ${result.value.isin}: ${result.value.warning}`
            );
          }
        } else if (result.status === "rejected") {
          console.error("[Price fetch] Action failed:", result.reason);
        }
      }

      setLastRefresh(new Date());
    } catch (error) {
      console.error("Error refreshing prices:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [portfolioData, isRefreshing, fetchEtfPrice]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "holdings", label: "Holdings" },
    { key: "summary", label: "Summary" },
    { key: "performance", label: "Performance" },
  ];

  // Loading state
  if (portfolioData === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <p className="text-sm text-gray-400">Loading portfolio...</p>
        </div>
      </div>
    );
  }

  // Empty state - no portfolio imported yet
  if (portfolioData === null) {
    return (
      <div className="min-h-screen px-8 py-8 lg:px-12">
        <div className="flex flex-col items-center justify-center py-24">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <Upload className="h-7 w-7 text-gray-400" />
          </div>
          <h2 className="mt-6 text-xl font-bold text-gray-900">
            No portfolio imported yet
          </h2>
          <p className="mt-2 max-w-md text-center text-sm text-gray-400">
            Upload your broker CSV file to see your portfolio overview with
            holdings, allocation, and performance data.
          </p>
          <Link
            href="/upload-portfolio"
            className="mt-6 flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <Upload className="h-4 w-4" />
            Upload Portfolio
          </Link>
        </div>
      </div>
    );
  }

  const { holdings, summary } = portfolioData;
  const totalCost = summary.totalCost;

  // Build chart-compatible data
  const chartHoldings = holdings.map((h) => ({
    ticker: h.isin || h.ticker,
    name: h.name,
    marketValue: Math.abs(h.totalCost),
    totalGain: 0,
    gainPercent: 0,
  }));
  const totalValue = chartHoldings.reduce((sum, h) => sum + h.marketValue, 0);

  return (
    <div className="min-h-screen px-8 py-8 lg:px-12">
      {/* Balance header */}
      <div className="flex items-start justify-between">
        <div>
          {summary.totalMarketValue !== null ? (
            <>
              <h1 className="text-[42px] font-bold tracking-tight text-gray-900 leading-none">
                {summary.totalMarketValue.toLocaleString("en-US", {
                  style: "currency",
                  currency: "EUR",
                })}
              </h1>
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-sm text-gray-400">
                  <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                  Market value · {summary.holdingsCount} holdings ·{" "}
                  <span className="font-semibold text-blue-600">EUR</span>
                </span>
                {summary.totalGain !== null && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      summary.totalGain >= 0
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-600"
                    }`}
                  >
                    {summary.totalGain >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {summary.totalGain >= 0 ? "+" : ""}
                    {summary.totalGain.toLocaleString("en-US", {
                      style: "currency",
                      currency: "EUR",
                    })}{" "}
                    ({summary.totalGainPercent !== null
                      ? `${summary.totalGainPercent >= 0 ? "+" : ""}${summary.totalGainPercent.toFixed(2)}%`
                      : "—"})
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-300">
                Cost basis:{" "}
                {Math.abs(totalCost).toLocaleString("en-US", {
                  style: "currency",
                  currency: "EUR",
                })}
                {lastRefresh && (
                  <> · Prices updated {lastRefresh.toLocaleTimeString()}</>
                )}
              </p>
            </>
          ) : (
            <>
              <h1 className="text-[42px] font-bold tracking-tight text-gray-900 leading-none">
                {Math.abs(totalCost).toLocaleString("en-US", {
                  style: "currency",
                  currency: "EUR",
                })}
              </h1>
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-sm text-gray-400">
                  <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                  Total invested · {summary.holdingsCount} holdings ·{" "}
                  <span className="font-semibold text-blue-600">EUR</span>
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-300">
                Click refresh to fetch live prices from EODHD
              </p>
            </>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Link
            href="/upload-portfolio"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"
            title="Upload new portfolio"
          >
            <Plus className="h-5 w-5" />
          </Link>
          <button
            onClick={refreshPrices}
            disabled={isRefreshing}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 disabled:opacity-50"
            title="Refresh prices from EODHD"
          >
            <RefreshCw
              className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </button>
          <button className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white transition-opacity hover:opacity-90">
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-8 border-b border-gray-200">
        <div className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "text-gray-900"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-gray-900" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {activeTab === "holdings" && (
        <div className="mt-8">
          {/* Section header */}
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              All <span className="text-gray-400">holdings</span>
            </h2>
            <div className="flex items-center gap-3">
              <Link
                href="/upload-portfolio"
                className="text-sm text-blue-600 cursor-pointer hover:underline font-medium"
              >
                Re-import CSV
              </Link>
              <div className="flex items-center rounded-lg border border-gray-200 bg-white">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 transition-colors ${
                    viewMode === "grid"
                      ? "text-gray-900"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 transition-colors ${
                    viewMode === "list"
                      ? "text-gray-900"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <Search className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Holdings grid */}
          {viewMode === "grid" ? (
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              {holdings.map((holding) => (
                <div
                  key={holding._id}
                  className="group cursor-pointer rounded-2xl border border-gray-100 bg-white p-6 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {holding.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {holding.tickerSymbol && (
                          <span className="text-xs font-semibold text-blue-600 font-mono">
                            {holding.tickerSymbol}
                          </span>
                        )}
                        <p className="text-xs text-gray-400 font-mono">
                          {holding.isin}
                        </p>
                      </div>
                    </div>
                    <span className="ml-3 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                      {holding.currency}
                    </span>
                  </div>

                  {/* Current price from EODHD */}
                  {holding.currentPrice !== null ? (
                    <div className="mt-4">
                      <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-bold text-gray-900">
                          {holding.currentPrice.toLocaleString("en-US", {
                            style: "currency",
                            currency: holding.currency || "EUR",
                          })}
                        </p>
                        {holding.dayChangePercent !== null && (
                          <span
                            className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
                              holding.dayChangePercent >= 0
                                ? "text-emerald-600"
                                : "text-red-500"
                            }`}
                          >
                            {holding.dayChangePercent >= 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            {holding.dayChangePercent >= 0 ? "+" : ""}
                            {holding.dayChangePercent.toFixed(2)}%
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Current price per share
                      </p>
                    </div>
                  ) : (
                    <p className="mt-4 text-2xl font-bold text-gray-900">
                      {Math.abs(holding.totalCost).toLocaleString("en-US", {
                        style: "currency",
                        currency: holding.currency || "EUR",
                      })}
                    </p>
                  )}

                  {/* Market value & gain */}
                  {holding.marketValue !== null && holding.totalGain !== null ? (
                    <div className="mt-3 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                      <div>
                        <p className="text-xs text-gray-400">Market value</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {holding.marketValue.toLocaleString("en-US", {
                            style: "currency",
                            currency: holding.currency || "EUR",
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Gain/Loss</p>
                        <p
                          className={`text-sm font-semibold ${
                            holding.totalGain >= 0
                              ? "text-emerald-600"
                              : "text-red-500"
                          }`}
                        >
                          {holding.totalGain >= 0 ? "+" : ""}
                          {holding.totalGain.toLocaleString("en-US", {
                            style: "currency",
                            currency: holding.currency || "EUR",
                          })}{" "}
                          ({holding.gainPercent !== null
                            ? `${holding.gainPercent >= 0 ? "+" : ""}${holding.gainPercent.toFixed(2)}%`
                            : "—"})
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      {holding.shares.toLocaleString("en-US", {
                        maximumFractionDigits: 4,
                      })}{" "}
                      shares · avg.{" "}
                      {holding.avgCost.toLocaleString("en-US", {
                        style: "currency",
                        currency: holding.currency || "EUR",
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Holdings list view */
            <div className="mt-6 rounded-2xl border border-gray-100 bg-white overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-400">
                    <th className="px-6 py-3 text-left font-medium">ETF</th>
                    <th className="px-4 py-3 text-right font-medium">Shares</th>
                    <th className="px-4 py-3 text-right font-medium">Current Price</th>
                    <th className="px-4 py-3 text-right font-medium">Cost Basis</th>
                    <th className="px-4 py-3 text-right font-medium">Current Value</th>
                    <th className="px-6 py-3 text-right font-medium">Gain/Loss</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {holdings.map((holding) => {
                    const currency = holding.currency || "EUR";
                    const fmt = (val: number) =>
                      val.toLocaleString("en-US", {
                        style: "currency",
                        currency,
                      });

                    return (
                      <tr
                        key={holding._id}
                        className="transition-colors hover:bg-gray-50"
                      >
                        {/* ETF name + ISIN */}
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-gray-900 truncate max-w-[260px]">
                            {holding.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {holding.tickerSymbol && (
                              <span className="text-xs font-semibold text-blue-600 font-mono">
                                {holding.tickerSymbol}
                              </span>
                            )}
                            <p className="text-xs text-gray-400 font-mono">
                              {holding.isin}
                            </p>
                          </div>
                        </td>

                        {/* Shares */}
                        <td className="px-4 py-4 text-right text-sm text-gray-700 whitespace-nowrap">
                          {holding.shares.toLocaleString("en-US", {
                            maximumFractionDigits: 4,
                          })}
                        </td>

                        {/* Current Price */}
                        <td className="px-4 py-4 text-right whitespace-nowrap">
                          {holding.currentPrice !== null ? (
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {fmt(holding.currentPrice)}
                              </p>
                              {holding.dayChangePercent !== null && (
                                <p
                                  className={`text-xs font-medium ${
                                    holding.dayChangePercent >= 0
                                      ? "text-emerald-600"
                                      : "text-red-500"
                                  }`}
                                >
                                  {holding.dayChangePercent >= 0 ? "+" : ""}
                                  {holding.dayChangePercent.toFixed(2)}%
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-300">—</span>
                          )}
                        </td>

                        {/* Cost Basis (total cost invested) */}
                        <td className="px-4 py-4 text-right whitespace-nowrap">
                          <p className="text-sm text-gray-700">
                            {fmt(Math.abs(holding.totalCost))}
                          </p>
                          <p className="text-xs text-gray-400">
                            avg. {fmt(holding.avgCost)}
                          </p>
                        </td>

                        {/* Current Value (market value) */}
                        <td className="px-4 py-4 text-right whitespace-nowrap">
                          {holding.marketValue !== null ? (
                            <p className="text-sm font-semibold text-gray-900">
                              {fmt(holding.marketValue)}
                            </p>
                          ) : (
                            <span className="text-sm text-gray-300">—</span>
                          )}
                        </td>

                        {/* Gain / Loss */}
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          {holding.totalGain !== null &&
                          holding.gainPercent !== null ? (
                            <div>
                              <p
                                className={`text-sm font-semibold ${
                                  holding.totalGain >= 0
                                    ? "text-emerald-600"
                                    : "text-red-500"
                                }`}
                              >
                                {holding.totalGain >= 0 ? "+" : ""}
                                {fmt(holding.totalGain)}
                              </p>
                              <p
                                className={`text-xs font-medium ${
                                  holding.gainPercent >= 0
                                    ? "text-emerald-600"
                                    : "text-red-500"
                                }`}
                              >
                                {holding.gainPercent >= 0 ? "+" : ""}
                                {holding.gainPercent.toFixed(2)}%
                              </p>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "summary" && (
        <div className="mt-8 space-y-6">
          {/* Summary cards row */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-gray-100 bg-white p-6">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Total Invested
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {Math.abs(totalCost).toLocaleString("en-US", {
                  style: "currency",
                  currency: "EUR",
                })}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Across {summary.holdingsCount} holdings
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-6">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Total Shares
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {summary.totalShares.toLocaleString("en-US", {
                  maximumFractionDigits: 2,
                })}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Across all positions
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-6">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Portfolio
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {portfolioData.portfolio.name}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Imported{" "}
                {new Date(
                  portfolioData.portfolio.createdAt
                ).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Pie chart */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6">
            <PortfolioPieChart
              holdings={chartHoldings}
              totalValue={totalValue}
            />
          </div>
        </div>
      )}

      {activeTab === "performance" && (
        <div className="mt-8">
          <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center">
            <p className="text-gray-400 text-sm">
              Performance charts coming soon
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
