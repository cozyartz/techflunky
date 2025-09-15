import React, { useEffect, useRef, useState } from 'react';

interface EarningsData {
  date: string;
  earnings: number;
  sales: number;
  views: number;
}

interface EarningsChartProps {
  data: EarningsData[];
  period: '7d' | '30d' | '90d' | '1y';
  onPeriodChange: (period: '7d' | '30d' | '90d' | '1y') => void;
  loading?: boolean;
  totalEarnings?: number;
  pendingPayouts?: number;
}

export default function EarningsChart({
  data,
  period,
  onPeriodChange,
  loading = false,
  totalEarnings = 0,
  pendingPayouts = 0
}: EarningsChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);
  const [activeMetric, setActiveMetric] = useState<'earnings' | 'sales' | 'views'>('earnings');

  useEffect(() => {
    if (!canvasRef.current || loading || !data.length) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Destroy existing chart
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const getMetricData = () => {
      switch (activeMetric) {
        case 'earnings':
          return data.map(d => d.earnings);
        case 'sales':
          return data.map(d => d.sales);
        case 'views':
          return data.map(d => d.views);
        default:
          return data.map(d => d.earnings);
      }
    };

    const getMetricColor = () => {
      switch (activeMetric) {
        case 'earnings':
          return '#10b981'; // green
        case 'sales':
          return '#fbbf24'; // yellow
        case 'views':
          return '#3b82f6'; // blue
        default:
          return '#10b981';
      }
    };

    // Create new chart
    // @ts-ignore - Chart.js will be loaded via CDN
    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => {
          const date = new Date(d.date);
          return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            ...(period === '1y' ? { year: 'numeric' } : {})
          });
        }),
        datasets: [
          {
            label: activeMetric.charAt(0).toUpperCase() + activeMetric.slice(1),
            data: getMetricData(),
            borderColor: getMetricColor(),
            backgroundColor: getMetricColor() + '20',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: getMetricColor(),
            pointBorderColor: '#000000',
            pointBorderWidth: 2,
            pointRadius: 6,
            pointHoverRadius: 10,
            pointHoverBackgroundColor: getMetricColor(),
            pointHoverBorderColor: '#ffffff',
            pointHoverBorderWidth: 3,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            titleColor: getMetricColor(),
            bodyColor: '#ffffff',
            borderColor: getMetricColor(),
            borderWidth: 1,
            cornerRadius: 12,
            displayColors: false,
            titleFont: {
              size: 14,
              weight: 'bold'
            },
            bodyFont: {
              size: 13
            },
            callbacks: {
              title: function(context: any) {
                return context[0].label;
              },
              label: function(context: any) {
                const value = context.parsed.y;
                switch (activeMetric) {
                  case 'earnings':
                    return `Earnings: $${value.toLocaleString()}`;
                  case 'sales':
                    return `Sales: ${value}`;
                  case 'views':
                    return `Views: ${value.toLocaleString()}`;
                  default:
                    return `${value}`;
                }
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.1)',
              drawBorder: false
            },
            ticks: {
              color: '#9ca3af',
              font: {
                size: 12
              },
              maxTicksLimit: 8
            }
          },
          y: {
            grid: {
              color: 'rgba(255, 255, 255, 0.1)',
              drawBorder: false
            },
            ticks: {
              color: '#9ca3af',
              font: {
                size: 12
              },
              callback: function(value: any) {
                switch (activeMetric) {
                  case 'earnings':
                    return '$' + (value / 1000).toFixed(0) + 'K';
                  case 'sales':
                    return value.toString();
                  case 'views':
                    return (value / 1000).toFixed(1) + 'K';
                  default:
                    return value;
                }
              }
            }
          }
        },
        elements: {
          point: {
            hoverRadius: 10
          }
        }
      }
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [data, activeMetric, loading, period]);

  const periodLabels = {
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
    '90d': 'Last 90 Days',
    '1y': 'Last Year'
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-yellow-400/20 p-6">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-6">
            <div className="w-32 h-6 bg-gray-700 rounded"></div>
            <div className="w-24 h-8 bg-gray-700 rounded"></div>
          </div>
          <div className="h-80 bg-gray-700 rounded-lg"></div>
        </div>
      </div>
    );
  }

  const totalPeriodEarnings = data.reduce((sum, d) => sum + d.earnings, 0);
  const totalPeriodSales = data.reduce((sum, d) => sum + d.sales, 0);
  const totalPeriodViews = data.reduce((sum, d) => sum + d.views, 0);
  const averageSaleValue = totalPeriodSales > 0 ? totalPeriodEarnings / totalPeriodSales : 0;

  return (
    <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-yellow-400/20 p-6 hover:border-yellow-400/40 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-white">Seller Performance</h3>
          <p className="text-sm text-gray-400">{periodLabels[period]}</p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Metric Toggle */}
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setActiveMetric('earnings')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                activeMetric === 'earnings'
                  ? 'bg-green-400 text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Earnings
            </button>
            <button
              onClick={() => setActiveMetric('sales')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                activeMetric === 'sales'
                  ? 'bg-yellow-400 text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Sales
            </button>
            <button
              onClick={() => setActiveMetric('views')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                activeMetric === 'views'
                  ? 'bg-blue-400 text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Views
            </button>
          </div>

          {/* Period Selector */}
          <select
            value={period}
            onChange={(e) => onPeriodChange(e.target.value as any)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-colors"
          >
            <option value="7d">7 Days</option>
            <option value="30d">30 Days</option>
            <option value="90d">90 Days</option>
            <option value="1y">1 Year</option>
          </select>
        </div>
      </div>

      {/* Chart */}
      <div className="relative h-80 mb-6">
        <canvas ref={canvasRef} className="w-full h-full"></canvas>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-400/10 border border-green-400/20 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-400">
            ${totalPeriodEarnings.toLocaleString()}
          </div>
          <div className="text-sm text-gray-400">Period Earnings</div>
        </div>

        <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400">
            {totalPeriodSales}
          </div>
          <div className="text-sm text-gray-400">Total Sales</div>
        </div>

        <div className="bg-blue-400/10 border border-blue-400/20 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">
            {totalPeriodViews.toLocaleString()}
          </div>
          <div className="text-sm text-gray-400">Total Views</div>
        </div>

        <div className="bg-purple-400/10 border border-purple-400/20 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-400">
            ${averageSaleValue.toLocaleString()}
          </div>
          <div className="text-sm text-gray-400">Avg Sale Value</div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Earnings Breakdown */}
        <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
          <h4 className="text-sm font-medium text-white mb-3">Earnings Overview</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Total Lifetime Earnings</span>
              <span className="text-sm font-medium text-green-400">${totalEarnings.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Pending Payouts</span>
              <span className="text-sm font-medium text-yellow-400">${pendingPayouts.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Available for Withdrawal</span>
              <span className="text-sm font-medium text-white">${(totalEarnings - pendingPayouts).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
          <h4 className="text-sm font-medium text-white mb-3">Performance Metrics</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Conversion Rate</span>
              <span className="text-sm font-medium text-white">
                {totalPeriodViews > 0 ? ((totalPeriodSales / totalPeriodViews) * 100).toFixed(2) : 0}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Views per Day</span>
              <span className="text-sm font-medium text-white">
                {data.length > 0 ? Math.round(totalPeriodViews / data.length) : 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Revenue per View</span>
              <span className="text-sm font-medium text-white">
                ${totalPeriodViews > 0 ? (totalPeriodEarnings / totalPeriodViews).toFixed(2) : '0.00'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 pt-6 border-t border-gray-700">
        <div className="flex flex-wrap gap-3">
          <button className="px-4 py-2 bg-green-400 text-black rounded-lg font-medium hover:bg-green-300 transition-colors text-sm">
            Request Payout
          </button>
          <button className="px-4 py-2 bg-blue-400/10 border border-blue-400/20 text-blue-400 rounded-lg font-medium hover:bg-blue-400/20 transition-colors text-sm">
            View Detailed Analytics
          </button>
          <button className="px-4 py-2 bg-purple-400/10 border border-purple-400/20 text-purple-400 rounded-lg font-medium hover:bg-purple-400/20 transition-colors text-sm">
            Download Report
          </button>
        </div>
      </div>
    </div>
  );
}

// Mini earnings chart for dashboard widgets
export function MiniEarningsChart({ data, height = 100 }: { data: EarningsData[]; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!canvasRef.current || !data.length) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    // @ts-ignore - Chart.js will be loaded via CDN
    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => d.date),
        datasets: [{
          data: data.map(d => d.earnings),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 0,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        },
        scales: {
          x: { display: false },
          y: { display: false }
        },
        elements: {
          point: { radius: 0 }
        }
      }
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [data]);

  return (
    <div style={{ height: `${height}px` }}>
      <canvas ref={canvasRef} className="w-full h-full"></canvas>
    </div>
  );
}