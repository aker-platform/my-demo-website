"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface Holding {
  ticker: string;
  name: string;
  marketValue: number;
  totalGain: number;
  gainPercent: number;
}

interface PortfolioPieChartProps {
  holdings: Holding[];
  totalValue: number;
}

// Color palette for the pie chart
const COLORS = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
];

export function PortfolioPieChart({ holdings, totalValue }: PortfolioPieChartProps) {
  // Prepare data for pie chart
  const chartData = holdings.map((holding, index) => ({
    name: holding.ticker,
    fullName: holding.name,
    value: holding.marketValue,
    percentage: (holding.marketValue / totalValue) * 100,
    gain: holding.totalGain,
    gainPercent: holding.gainPercent,
    fill: COLORS[index % COLORS.length]
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-lg">
          <p className="font-semibold text-gray-900">{data.name}</p>
          <p className="text-xs text-gray-400 mb-2">{data.fullName}</p>
          <p className="text-sm text-gray-600">
            Value: <span className="font-medium text-gray-900">${data.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </p>
          <p className="text-sm text-gray-600">
            Allocation: <span className="font-medium text-gray-900">{data.percentage.toFixed(2)}%</span>
          </p>
          <p className={`text-sm ${data.gain >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            Gain/Loss: <span className="font-medium">
              {data.gain >= 0 ? '+' : ''}${data.gain.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            {' '}({data.gain >= 0 ? '+' : ''}{data.gainPercent.toFixed(2)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null;

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs font-semibold"
      >
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    );
  };

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="grid grid-cols-2 gap-3 mt-4">
        {payload.map((entry: any, index: number) => {
          const data = chartData[index];
          return (
            <div key={`legend-${index}`} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">{entry.value}</div>
                <div className="text-xs text-gray-400">
                  ${data.value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ({data.percentage.toFixed(1)}%)
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      <h3 className="text-lg font-bold text-gray-900">Portfolio Allocation</h3>
      <p className="text-sm text-gray-400 mt-1">
        Distribution by market value · Total: ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </p>
      <ResponsiveContainer width="100%" height={400}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={120}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
