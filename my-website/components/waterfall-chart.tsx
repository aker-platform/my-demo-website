"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Holding {
  ticker: string;
  name: string;
  marketValue: number;
  totalGain: number;
  gainPercent: number;
}

interface WaterfallChartProps {
  holdings: Holding[];
  totalCost: number;
}

export function WaterfallChart({ holdings, totalCost }: WaterfallChartProps) {
  // Sort holdings by market value (descending)
  const sortedHoldings = [...holdings].sort((a, b) => b.marketValue - a.marketValue);

  // Create waterfall data
  const waterfallData = [];
  let cumulativeValue = totalCost;

  // Starting point (total cost basis)
  waterfallData.push({
    name: 'Initial Cost',
    value: totalCost,
    displayValue: totalCost,
    base: 0,
    isPositive: true,
    fill: '#94a3b8'
  });

  // Add each holding's contribution
  sortedHoldings.forEach((holding, index) => {
    const contribution = holding.totalGain;
    const isPositive = contribution >= 0;

    waterfallData.push({
      name: holding.ticker,
      value: Math.abs(contribution),
      displayValue: cumulativeValue + contribution,
      base: isPositive ? cumulativeValue : cumulativeValue + contribution,
      isPositive,
      fill: isPositive ? '#22c55e' : '#ef4444',
      fullName: holding.name,
      gain: contribution,
      gainPercent: holding.gainPercent
    });

    cumulativeValue += contribution;
  });

  // Final total
  waterfallData.push({
    name: 'Total Value',
    value: cumulativeValue,
    displayValue: cumulativeValue,
    base: 0,
    isPositive: true,
    fill: '#3b82f6'
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="font-semibold">{data.name}</p>
          {data.fullName && <p className="text-xs text-muted-foreground mb-1">{data.fullName}</p>}
          <p className="text-sm">
            Value: <span className="font-medium">${data.displayValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </p>
          {data.gain !== undefined && (
            <>
              <p className={`text-sm ${data.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                Gain/Loss: <span className="font-medium">
                  {data.isPositive ? '+' : ''}${data.gain.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </p>
              <p className={`text-xs ${data.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                ({data.isPositive ? '+' : ''}{data.gainPercent.toFixed(2)}%)
              </p>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio Waterfall Analysis</CardTitle>
        <CardDescription>Contribution of each holding to total portfolio value</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={waterfallData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={80}
              className="text-xs"
            />
            <YAxis
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              className="text-xs"
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#000" strokeWidth={1} />
            <Bar dataKey="value" stackId="a">
              {waterfallData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
            <Bar dataKey="base" stackId="a" fill="transparent" />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 flex justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#94a3b8] rounded"></div>
            <span>Initial Cost</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#22c55e] rounded"></div>
            <span>Positive Gain</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#ef4444] rounded"></div>
            <span>Loss</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#3b82f6] rounded"></div>
            <span>Total Value</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
