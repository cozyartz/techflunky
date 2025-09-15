import React, { useEffect, useRef, useState } from 'react';

interface ChartData {
  date: string;
  revenue: number;
  transactions: number;
}

interface RevenueChartProps {
  data: ChartData[];
  period: '7d' | '30d' | '90d' | '1y';
  onPeriodChange: (period: '7d' | '30d' | '90d' | '1y') => void;
  loading?: boolean;
}

export default function RevenueChart({ data, period, onPeriodChange, loading = false }: RevenueChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);
  const [activeMetric, setActiveMetric] = useState<'revenue' | 'transactions'>('revenue');

  useEffect(() => {
    if (!canvasRef.current || loading || !data.length) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Destroy existing chart
    if (chartRef.current) {
      chartRef.current.destroy();
    }

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
            label: activeMetric === 'revenue' ? 'Revenue' : 'Transactions',
            data: data.map(d => activeMetric === 'revenue' ? d.revenue : d.transactions),
            borderColor: '#fbbf24',
            backgroundColor: 'rgba(251, 191, 36, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#fbbf24',
            pointBorderColor: '#000000',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 8,
            pointHoverBackgroundColor: '#fbbf24',
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
            titleColor: '#fbbf24',
            bodyColor: '#ffffff',
            borderColor: '#fbbf24',
            borderWidth: 1,
            cornerRadius: 8,
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
                if (activeMetric === 'revenue') {
                  return `Revenue: $${value.toLocaleString()}`;
                } else {
                  return `Transactions: ${value.toLocaleString()}`;
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
                if (activeMetric === 'revenue') {
                  return '$' + (value / 1000).toFixed(0) + 'K';
                } else {
                  return value.toLocaleString();
                }
              }
            }
          }
        },
        elements: {
          point: {
            hoverRadius: 8
          }
        }
      }
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [data, activeMetric, loading]);

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

  return (
    <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-yellow-400/20 p-6 hover:border-yellow-400/40 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-white">Revenue Analytics</h3>
          <p className="text-sm text-gray-400">{periodLabels[period]}</p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Metric Toggle */}
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setActiveMetric('revenue')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-all duration-200 ${
                activeMetric === 'revenue'
                  ? 'bg-yellow-400 text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Revenue
            </button>
            <button
              onClick={() => setActiveMetric('transactions')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-all duration-200 ${
                activeMetric === 'transactions'
                  ? 'bg-yellow-400 text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Transactions
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
      <div className="relative h-80">
        <canvas ref={canvasRef} className="w-full h-full"></canvas>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-400">
            ${data.reduce((sum, d) => sum + d.revenue, 0).toLocaleString()}
          </div>
          <div className="text-sm text-gray-400">Total Revenue</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-white">
            {data.reduce((sum, d) => sum + d.transactions, 0).toLocaleString()}
          </div>
          <div className="text-sm text-gray-400">Total Transactions</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-white">
            ${data.length ? Math.round(data.reduce((sum, d) => sum + d.revenue, 0) / data.reduce((sum, d) => sum + d.transactions, 0)).toLocaleString() : '0'}
          </div>
          <div className="text-sm text-gray-400">Avg Order Value</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-white">
            {data.length ? Math.round(data.reduce((sum, d) => sum + d.transactions, 0) / data.length).toLocaleString() : '0'}
          </div>
          <div className="text-sm text-gray-400">Avg Daily Transactions</div>
        </div>
      </div>
    </div>
  );
}

// Simpler chart component for smaller widgets
export function MiniRevenueChart({ data, height = 100 }: { data: ChartData[]; height?: number }) {
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
          data: data.map(d => d.revenue),
          borderColor: '#fbbf24',
          backgroundColor: 'rgba(251, 191, 36, 0.1)',
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