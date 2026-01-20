import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// Sample ETF portfolio data
const portfolioData = {
  totalValue: 125430.50,
  totalCost: 110000.00,
  dayChange: 1250.75,
  dayChangePercent: 1.01,
  holdings: [
    {
      ticker: "SPY",
      name: "SPDR S&P 500 ETF Trust",
      shares: 50,
      avgCost: 420.50,
      currentPrice: 445.20,
      marketValue: 22260.00,
      totalGain: 1235.00,
      gainPercent: 5.87,
      dayChange: 2.15,
    },
    {
      ticker: "QQQ",
      name: "Invesco QQQ Trust",
      shares: 75,
      avgCost: 365.00,
      currentPrice: 388.50,
      marketValue: 29137.50,
      totalGain: 1762.50,
      gainPercent: 6.44,
      dayChange: 1.85,
    },
    {
      ticker: "VTI",
      name: "Vanguard Total Stock Market ETF",
      shares: 100,
      avgCost: 215.00,
      currentPrice: 228.75,
      marketValue: 22875.00,
      totalGain: 1375.00,
      gainPercent: 6.40,
      dayChange: 0.95,
    },
    {
      ticker: "SCHD",
      name: "Schwab U.S. Dividend Equity ETF",
      shares: 200,
      avgCost: 75.50,
      currentPrice: 79.20,
      marketValue: 15840.00,
      totalGain: 740.00,
      gainPercent: 4.90,
      dayChange: 0.45,
    },
    {
      ticker: "VGT",
      name: "Vanguard Information Technology ETF",
      shares: 35,
      avgCost: 460.00,
      currentPrice: 485.90,
      marketValue: 17006.50,
      totalGain: 906.50,
      gainPercent: 5.63,
      dayChange: -0.25,
    },
    {
      ticker: "VOO",
      name: "Vanguard S&P 500 ETF",
      shares: 40,
      avgCost: 410.00,
      currentPrice: 438.28,
      marketValue: 17531.20,
      totalGain: 1131.20,
      gainPercent: 6.88,
      dayChange: 1.12,
    },
  ],
};

const totalGain = portfolioData.totalValue - portfolioData.totalCost;
const totalGainPercent = (totalGain / portfolioData.totalCost) * 100;

export default function Home() {
  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Investment Portfolio</h1>
          <p className="text-muted-foreground">Track your ETF holdings and performance</p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Value</CardDescription>
              <CardTitle className="text-3xl">${portfolioData.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Cost basis: ${portfolioData.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Gain/Loss</CardDescription>
              <CardTitle className={`text-3xl ${totalGain >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                {totalGain >= 0 ? '+' : ''}${totalGain.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={totalGain >= 0 ? "default" : "destructive"}>
                {totalGain >= 0 ? '+' : ''}{totalGainPercent.toFixed(2)}%
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Today's Change</CardDescription>
              <CardTitle className={`text-3xl ${portfolioData.dayChange >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                {portfolioData.dayChange >= 0 ? '+' : ''}${portfolioData.dayChange.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={portfolioData.dayChange >= 0 ? "default" : "destructive"}>
                {portfolioData.dayChange >= 0 ? '+' : ''}{portfolioData.dayChangePercent.toFixed(2)}%
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Holdings</CardDescription>
              <CardTitle className="text-3xl">{portfolioData.holdings.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">ETFs in portfolio</p>
            </CardContent>
          </Card>
        </div>

        {/* Holdings Table */}
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Holdings</CardTitle>
            <CardDescription>Detailed view of your ETF positions</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Shares</TableHead>
                  <TableHead className="text-right">Avg Cost</TableHead>
                  <TableHead className="text-right">Current Price</TableHead>
                  <TableHead className="text-right">Market Value</TableHead>
                  <TableHead className="text-right">Gain/Loss</TableHead>
                  <TableHead className="text-right">Day Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {portfolioData.holdings.map((holding) => (
                  <TableRow key={holding.ticker}>
                    <TableCell className="font-bold">{holding.ticker}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{holding.name}</TableCell>
                    <TableCell className="text-right">{holding.shares}</TableCell>
                    <TableCell className="text-right">${holding.avgCost.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${holding.currentPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-medium">${holding.marketValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right">
                      <div className={holding.totalGain >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}>
                        <div>{holding.totalGain >= 0 ? '+' : ''}${holding.totalGain.toFixed(2)}</div>
                        <div className="text-xs">({holding.totalGain >= 0 ? '+' : ''}{holding.gainPercent.toFixed(2)}%)</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={holding.dayChange >= 0 ? "default" : "destructive"}>
                        {holding.dayChange >= 0 ? '+' : ''}{holding.dayChange.toFixed(2)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
