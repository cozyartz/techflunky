import React, { useEffect, useRef, useState } from 'react';

interface PortfolioData {
  date: string;
  portfolioValue: number;
  invested: number;
  unrealizedGains: number;
  realizedGains: number;
}

interface PortfolioChartProps {
  data: PortfolioData[];
  period: '1m' | '3m' | '6m' | '1y' | '2y' | 'all';
  onPeriodChange: (period: '1m' | '3m' | '6m' | '1y' | '2y' | 'all') => void;
  loading?: boolean;
  totalValue?: number;
  totalInvested?: number;
  totalGains?: number;
}

export default function PortfolioChart({
  data,
  period,
  onPeriodChange,
  loading = false,
  totalValue = 0,
  totalInvested = 0,
  totalGains = 0
}: PortfolioChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);
  const [activeView, setActiveView] = useState<'value' | 'performance' | 'allocation'>('value');

  useEffect(() => {
    if (!canvasRef.current || loading || !data.length) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Destroy existing chart
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const getChartData = () => {
      if (activeView === 'value') {
        return {
          datasets: [
            {
              label: 'Portfolio Value',
              data: data.map(d => d.portfolioValue),
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              borderWidth: 3,
              fill: true,
              tension: 0.4,
              pointBackgroundColor: '#10b981',
              pointBorderColor: '#000000',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 8,
            },
            {
              label: 'Total Invested',
              data: data.map(d => d.invested),
              borderColor: '#6b7280',
              backgroundColor: 'rgba(107, 114, 128, 0.1)',
              borderWidth: 2,
              fill: false,
              tension: 0.4,
              pointBackgroundColor: '#6b7280',
              pointBorderColor: '#000000',
              pointBorderWidth: 1,
              pointRadius: 3,
              pointHoverRadius: 6,
            }
          ]
        };
      } else if (activeView === 'performance') {
        return {
          datasets: [
            {
              label: 'Unrealized Gains',
              data: data.map(d => d.unrealizedGains),
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderWidth: 3,
              fill: true,
              tension: 0.4,
              pointBackgroundColor: '#3b82f6',
              pointBorderColor: '#000000',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 8,
            },
            {
              label: 'Realized Gains',
              data: data.map(d => d.realizedGains),
              borderColor: '#fbbf24',
              backgroundColor: 'rgba(251, 191, 36, 0.1)',
              borderWidth: 3,
              fill: true,
              tension: 0.4,
              pointBackgroundColor: '#fbbf24',
              pointBorderColor: '#000000',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 8,
            }
          ]
        };
      } else {
        // Allocation view would show different data
        return {
          datasets: [
            {
              label: 'Portfolio Value',
              data: data.map(d => d.portfolioValue),
              borderColor: '#8b5cf6',
              backgroundColor: 'rgba(139, 92, 246, 0.1)',
              borderWidth: 3,
              fill: true,
              tension: 0.4,
              pointBackgroundColor: '#8b5cf6',
              pointBorderColor: '#000000',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 8,
            }
          ]
        };
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
            ...(period === '1y' || period === '2y' || period === 'all' ? { year: 'numeric' } : {})
          });
        }),
        ...getChartData()
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
            display: true,
            position: 'bottom',
            labels: {
              color: '#d1d5db',
              font: {
                size: 12
              },
              padding: 20,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            titleColor: '#fbbf24',
            bodyColor: '#ffffff',
            borderColor: '#fbbf24',
            borderWidth: 1,
            cornerRadius: 12,
            displayColors: true,
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
                return `${context.dataset.label}: $${value.toLocaleString()}`;
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
                if (value >= 1000000) {
                  return '$' + (value / 1000000).toFixed(1) + 'M';
                } else if (value >= 1000) {
                  return '$' + (value / 1000).toFixed(0) + 'K';
                }
                return '$' + value.toLocaleString();
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
  }, [data, activeView, loading, period]);

  const periodLabels = {
    '1m': 'Last Month',
    '3m': 'Last 3 Months',
    '6m': 'Last 6 Months',
    '1y': 'Last Year',
    '2y': 'Last 2 Years',
    'all': 'All Time'
  };

  const totalROI = totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 0;

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-yellow-400/20 p-6">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-6">
            <div className="w-48 h-6 bg-gray-700 rounded"></div>
            <div className="w-32 h-8 bg-gray-700 rounded"></div>
          </div>
          <div className="h-96 bg-gray-700 rounded-lg mb-6"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-20 bg-gray-700 rounded"></div>
            <div className="h-20 bg-gray-700 rounded"></div>
            <div className="h-20 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-yellow-400/20 p-6 hover:border-yellow-400/40 transition-all duration-300">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 space-y-4 lg:space-y-0">
        <div className="space-y-1">
          <h3 className="text-xl font-semibold text-white">Portfolio Performance</h3>
          <p className="text-sm text-gray-400">{periodLabels[period]} • {data.length} data points</p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
          {/* View Toggle */}
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setActiveView('value')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                activeView === 'value'
                  ? 'bg-green-400 text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Value
            </button>
            <button
              onClick={() => setActiveView('performance')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                activeView === 'performance'
                  ? 'bg-blue-400 text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Performance
            </button>
            <button
              onClick={() => setActiveView('allocation')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                activeView === 'allocation'
                  ? 'bg-purple-400 text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Allocation
            </button>
          </div>

          {/* Period Selector */}
          <select
            value={period}
            onChange={(e) => onPeriodChange(e.target.value as any)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-colors"
          >
            <option value="1m">1 Month</option>
            <option value="3m">3 Months</option>
            <option value="6m">6 Months</option>
            <option value="1y">1 Year</option>
            <option value="2y">2 Years</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {/* Chart */}
      <div className="relative h-96 mb-6">
        <canvas ref={canvasRef} className="w-full h-full"></canvas>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-green-400/10 border border-green-400/20 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-400">
            ${totalValue.toLocaleString()}
          </div>
          <div className="text-sm text-gray-400">Current Value</div>
        </div>

        <div className="bg-gray-400/10 border border-gray-400/20 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-400">
            ${totalInvested.toLocaleString()}
          </div>
          <div className="text-sm text-gray-400">Total Invested</div>
        </div>

        <div className={`border rounded-lg p-4 text-center ${
          totalROI >= 0
            ? 'bg-green-400/10 border-green-400/20'
            : 'bg-red-400/10 border-red-400/20'
        }`}>
          <div className={`text-2xl font-bold ${
            totalROI >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {totalROI >= 0 ? '+' : ''}{totalROI.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-400">Total ROI</div>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Performance Metrics */}
        <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
          <h4 className="text-sm font-medium text-white mb-3">Performance Metrics</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Total Gains/Losses</span>
              <span className={`text-sm font-medium ${
                totalGains >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {totalGains >= 0 ? '+' : ''}${totalGains.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Best Month</span>
              <span className="text-sm font-medium text-green-400">
                +12.4% (March 2024)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Worst Month</span>
              <span className="text-sm font-medium text-red-400">
                -3.2% (January 2024)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Volatility</span>
              <span className="text-sm font-medium text-yellow-400">
                Medium (8.2%)
              </span>
            </div>
          </div>
        </div>

        {/* Risk Analysis */}
        <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
          <h4 className="text-sm font-medium text-white mb-3">Risk Analysis</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Risk Score</span>
              <span className="text-sm font-medium text-yellow-400">
                6.2/10 (Medium)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Sharpe Ratio</span>
              <span className="text-sm font-medium text-white">
                1.34
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Max Drawdown</span>
              <span className="text-sm font-medium text-red-400">
                -15.6%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Beta vs Market</span>
              <span className="text-sm font-medium text-white">
                0.87
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 pt-6 border-t border-gray-700">
        <div className="flex flex-wrap gap-3">
          <button className="px-4 py-2 bg-green-400 text-black rounded-lg font-medium hover:bg-green-300 transition-colors text-sm">
            Export Chart
          </button>
          <button className="px-4 py-2 bg-blue-400/10 border border-blue-400/20 text-blue-400 rounded-lg font-medium hover:bg-blue-400/20 transition-colors text-sm">
            Detailed Analysis
          </button>
          <button className="px-4 py-2 bg-purple-400/10 border border-purple-400/20 text-purple-400 rounded-lg font-medium hover:bg-purple-400/20 transition-colors text-sm">
            Compare Benchmark
          </button>
          <button className="px-4 py-2 bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 rounded-lg font-medium hover:bg-yellow-400/20 transition-colors text-sm">
            Schedule Report
          </button>
        </div>
      </div>
    </div>
  );
}

// Mini portfolio chart for dashboard widgets
export function MiniPortfolioChart({
  data,
  height = 120,
  showValue = true
}: {
  data: PortfolioData[];
  height?: number;
  showValue?: boolean;
}) {
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
          data: data.map(d => showValue ? d.portfolioValue : d.unrealizedGains + d.realizedGains),
          borderColor: showValue ? '#10b981' : '#3b82f6',
          backgroundColor: showValue ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
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
  }, [data, showValue]);

  return (
    <div style={{ height: `${height}px` }}>
      <canvas ref={canvasRef} className="w-full h-full"></canvas>
    </div>
  );
}