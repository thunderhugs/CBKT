import React, { useState, useEffect } from 'react';
import { Bar, Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import Papa from 'papaparse';
import tournamentData from './Spring Tournament 2025 data - Sheet1.csv';
import './App.css';

// Set default Chart.js colors and fonts
ChartJS.defaults.color = '#d4d4d4';
ChartJS.defaults.font.family = 'Cinzel';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  annotationPlugin
);

const chartOptions = {
  responsive: true,
  plugins: {
    legend: {
      labels: {
        color: '#d4d4d4',
        font: {
          family: 'Cinzel'
        }
      }
    },
    tooltip: {
      backgroundColor: 'rgba(26, 26, 26, 0.95)',
      titleColor: '#bf0f0f',
      bodyColor: '#d4d4d4',
      borderColor: '#bf0f0f',
      borderWidth: 1,
      padding: 10,
      titleFont: {
        family: 'Cinzel',
        weight: 'bold'
      },
      bodyFont: {
        family: 'Cinzel'
      },
      callbacks: {
        label: function(context) {
          const label = context.dataset.label || '';
          const value = context.parsed.y;
          const faction = context.raw.label || '';
          return `${faction}: ${value.toFixed(1)}`;
        }
      }
    }
  },
  scales: {
    x: {
      grid: {
        color: 'rgba(191, 15, 15, 0.1)',
      },
      ticks: {
        color: '#d4d4d4'
      }
    },
    y: {
      grid: {
        color: 'rgba(191, 15, 15, 0.1)',
      },
      ticks: {
        color: '#d4d4d4'
      }
    }
  }
};

function App() {
  const [data, setData] = useState([]);
  const [factionStats, setFactionStats] = useState({});
  const [totalEntries, setTotalEntries] = useState(0);

  useEffect(() => {
    console.log('Loading CSV file...');
    Papa.parse(tournamentData, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        console.log('CSV data loaded:', results.data);
        if (results.data && results.data.length > 0) {
          setData(results.data);
          setTotalEntries(results.data.length);
          processData(results.data);
        } else {
          console.error('No data found in CSV');
        }
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
      }
    });
  }, []);

  const processData = (rawData) => {
    if (!rawData || rawData.length === 0) {
      console.error('No data to process');
      return;
    }

    console.log('Processing data...');
    const stats = {};
    const total = rawData.length;

    rawData.forEach((entry, index) => {
      if (!entry.Faction) {
        console.error(`Missing Faction in entry ${index}:`, entry);
        return;
      }

      if (!stats[entry.Faction]) {
        stats[entry.Faction] = {
          count: 0,
          totalTP: 0,
          totalVP: 0,
          avgWinRate: 0,
          bestPlacing: Infinity
        };
      }
      
      const tp = parseInt(entry['Tournament Points']) || 0;
      const vp = parseInt(entry['Victory Points']) || 0;
      const winRate = parseFloat(entry['Oppt. Game Win %']) || 0;
      const placing = parseInt(entry.Placing) || Infinity;

      stats[entry.Faction].count += 1;
      stats[entry.Faction].totalTP += tp;
      stats[entry.Faction].totalVP += vp;
      stats[entry.Faction].avgWinRate += winRate;
      stats[entry.Faction].bestPlacing = Math.min(stats[entry.Faction].bestPlacing, placing);
    });

    // Calculate averages and play rates
    Object.keys(stats).forEach(faction => {
      if (stats[faction].count > 0) {
        stats[faction].avgTP = stats[faction].totalTP / stats[faction].count;
        stats[faction].avgVP = stats[faction].totalVP / stats[faction].count;
        stats[faction].avgWinRate = stats[faction].avgWinRate / stats[faction].count;
        stats[faction].playRate = (stats[faction].count / total) * 100;
      }
    });

    console.log('Processed stats:', stats);
    setFactionStats(stats);
  };

  // Log whenever factionStats changes
  useEffect(() => {
    console.log('FactionStats updated:', factionStats);
  }, [factionStats]);

  // Get top performing factions
  const topPerformingFactions = Object.entries(factionStats)
    .sort(([, a], [, b]) => b.avgWinRate - a.avgWinRate)
    .slice(0, 5)
    .map(([faction, stats]) => ({
      faction,
      winRate: stats.avgWinRate,
      avgTP: stats.avgTP
    }));

  // Get most popular factions
  const mostPopularFactions = Object.entries(factionStats)
    .sort(([, a], [, b]) => b.playRate - a.playRate)
    .slice(0, 5)
    .map(([faction, stats]) => ({
      faction,
      playRate: stats.playRate,
      avgWinRate: stats.avgWinRate
    }));

  const performanceData = {
    labels: Object.keys(factionStats),
    datasets: [
      {
        label: 'Average Tournament Points',
        data: Object.values(factionStats).map(stat => stat.avgTP),
        backgroundColor: 'rgba(191, 15, 15, 0.6)',
        borderColor: 'rgba(191, 15, 15, 0.8)',
        borderWidth: 1,
      }
    ]
  };

  const vpWinRateData = {
    datasets: [
      {
        label: 'Victory Points vs Win Rate',
        data: Object.keys(factionStats).map(faction => ({
          x: factionStats[faction].avgWinRate,
          y: factionStats[faction].avgVP,
          label: faction
        })),
        backgroundColor: 'rgba(255, 165, 0, 0.6)',
        borderColor: 'rgba(255, 165, 0, 0.8)',
        borderWidth: 1,
      }
    ]
  };

  const vpWinRateOptions = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      tooltip: {
        ...chartOptions.plugins.tooltip,
        callbacks: {
          label: function(context) {
            const faction = context.raw.label;
            return [
              `Faction: ${faction}`,
              `Win Rate: ${context.raw.x.toFixed(1)}%`,
              `Victory Points: ${context.raw.y.toFixed(1)}`
            ];
          }
        }
      }
    },
    scales: {
      x: {
        ...chartOptions.scales.x,
        title: {
          display: true,
          text: 'Win Rate (%)',
          color: '#d4d4d4'
        }
      },
      y: {
        ...chartOptions.scales.y,
        title: {
          display: true,
          text: 'Victory Points',
          color: '#d4d4d4'
        }
      }
    }
  };

  const quadrantData = {
    datasets: [
      {
        label: 'Play Rate vs Win Rate',
        data: Object.keys(factionStats).map(faction => ({
          x: factionStats[faction].playRate,
          y: factionStats[faction].avgWinRate,
          label: faction
        })),
        backgroundColor: 'rgba(0, 255, 255, 0.6)',
        borderColor: 'rgba(0, 255, 255, 0.8)',
        borderWidth: 1,
      }
    ]
  };

  const quadrantOptions = {
    ...chartOptions,
    scales: {
      x: {
        ...chartOptions.scales.x,
        title: {
          display: true,
          text: 'Play Rate (%)',
          color: '#d4d4d4'
        },
        min: 0,
        max: Math.ceil(Math.max(...Object.values(factionStats).map(stat => stat.playRate)))
      },
      y: {
        ...chartOptions.scales.y,
        title: {
          display: true,
          text: 'Win Rate (%)',
          color: '#d4d4d4'
        },
        min: Math.floor(Math.min(...Object.values(factionStats).map(stat => stat.avgWinRate))),
        max: Math.ceil(Math.max(...Object.values(factionStats).map(stat => stat.avgWinRate)))
      }
    },
    plugins: {
      ...chartOptions.plugins,
      tooltip: {
        ...chartOptions.plugins.tooltip,
        callbacks: {
          label: function(context) {
            const faction = context.raw.label;
            return [
              `Faction: ${faction}`,
              `Play Rate: ${context.raw.x.toFixed(1)}%`,
              `Win Rate: ${context.raw.y.toFixed(1)}%`
            ];
          }
        }
      },
      annotation: {
        annotations: {
          verticalLine: {
            type: 'line',
            xMin: (context) => {
              const xAxis = context.chart.scales.x;
              return (xAxis.max + xAxis.min) / 2;
            },
            xMax: (context) => {
              const xAxis = context.chart.scales.x;
              return (xAxis.max + xAxis.min) / 2;
            },
            borderColor: 'rgba(191, 15, 15, 0.3)',
            borderWidth: 2,
            borderDash: [5, 5]
          },
          horizontalLine: {
            type: 'line',
            yMin: (context) => {
              const yAxis = context.chart.scales.y;
              return (yAxis.max + yAxis.min) / 2;
            },
            yMax: (context) => {
              const yAxis = context.chart.scales.y;
              return (yAxis.max + yAxis.min) / 2;
            },
            borderColor: 'rgba(191, 15, 15, 0.3)',
            borderWidth: 2,
            borderDash: [5, 5]
          },
          alphaLabel: {
            type: 'label',
            xValue: (context) => {
              const xAxis = context.chart.scales.x;
              return (xAxis.max + xAxis.max + xAxis.min) / 3;
            },
            yValue: (context) => {
              const yAxis = context.chart.scales.y;
              return (yAxis.max + yAxis.max + yAxis.min) / 3;
            },
            backgroundColor: 'transparent',
            color: 'rgba(191, 15, 15, 0.8)',
            content: 'Alpha',
            font: {
              size: 16,
              family: 'Cinzel',
              weight: 'bold'
            }
          },
          betaLabel: {
            type: 'label',
            xValue: (context) => {
              const xAxis = context.chart.scales.x;
              return (xAxis.max + xAxis.max + xAxis.min) / 3;
            },
            yValue: (context) => {
              const yAxis = context.chart.scales.y;
              return (yAxis.min + yAxis.min + yAxis.max) / 3;
            },
            backgroundColor: 'transparent',
            color: 'rgba(191, 15, 15, 0.8)',
            content: 'Beta',
            font: {
              size: 16,
              family: 'Cinzel',
              weight: 'bold'
            }
          },
          deltaLabel: {
            type: 'label',
            xValue: (context) => {
              const xAxis = context.chart.scales.x;
              return (xAxis.min + xAxis.min + xAxis.max) / 3;
            },
            yValue: (context) => {
              const yAxis = context.chart.scales.y;
              return (yAxis.max + yAxis.max + yAxis.min) / 3;
            },
            backgroundColor: 'transparent',
            color: 'rgba(191, 15, 15, 0.8)',
            content: 'Delta',
            font: {
              size: 16,
              family: 'Cinzel',
              weight: 'bold'
            }
          },
          omegaLabel: {
            type: 'label',
            xValue: (context) => {
              const xAxis = context.chart.scales.x;
              return (xAxis.min + xAxis.min + xAxis.max) / 3;
            },
            yValue: (context) => {
              const yAxis = context.chart.scales.y;
              return (yAxis.min + yAxis.min + yAxis.max) / 3;
            },
            backgroundColor: 'transparent',
            color: 'rgba(191, 15, 15, 0.8)',
            content: 'Omega',
            font: {
              size: 16,
              family: 'Cinzel',
              weight: 'bold'
            }
          }
        }
      }
    }
  };

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Spring Tournament 2025 Analysis</h1>
      
      <div className="chart-container">
        <h2 className="chart-title">Faction Quadrant Analysis</h2>
        <p className="legend-text">Alpha: High Play Rate, High Win Rate | Delta: Low Play Rate, High Win Rate</p>
        <p className="legend-text">Beta: High Play Rate, Low Win Rate | Omega: Low Play Rate, Low Win Rate</p>
        <Scatter data={quadrantData} options={quadrantOptions} />
      </div>

      <div className="stats-tables">
        <div className="stats-table">
          <h3>Top Performing Factions</h3>
          <table>
            <thead>
              <tr>
                <th>Faction</th>
                <th>Win Rate</th>
                <th>Avg TP</th>
              </tr>
            </thead>
            <tbody>
              {topPerformingFactions.map(({ faction, winRate, avgTP }) => (
                <tr key={faction}>
                  <td>{faction}</td>
                  <td>{winRate.toFixed(1)}%</td>
                  <td>{avgTP.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="stats-table">
          <h3>Most Popular Factions</h3>
          <table>
            <thead>
              <tr>
                <th>Faction</th>
                <th>Play Rate</th>
                <th>Win Rate</th>
              </tr>
            </thead>
            <tbody>
              {mostPopularFactions.map(({ faction, playRate, avgWinRate }) => (
                <tr key={faction}>
                  <td>{faction}</td>
                  <td>{playRate.toFixed(1)}%</td>
                  <td>{avgWinRate.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="chart-container">
        <h2 className="chart-title">Average Tournament Points by Faction</h2>
        <Bar data={performanceData} options={chartOptions} />
      </div>

      <div className="chart-container">
        <h2 className="chart-title">Victory Points vs Win Rate by Faction</h2>
        <Scatter data={vpWinRateData} options={vpWinRateOptions} />
      </div>
    </div>
  );
}

export default App;
