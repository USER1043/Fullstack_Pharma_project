/**
 * @file Reports & analytics page displaying sales revenue trends and AI forecast charts.
 * @module pages/Reports
 */
import { useState, useEffect } from 'react';
import axiosInstance from '../utils/axiosConfig';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, ResponsiveContainer } from 'recharts';

// Renders reports and analytics view.
const Reports = () => {
  const [salesData, setSalesData] = useState([]);
  const [demandForecast, setDemandForecast] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetches analytics data from backend API.
    const fetchReports = async () => {
      try {
        const res = await axiosInstance.get('/reports/dashboard/analytics');
        const analytics = res.data.analytics;
        setSalesData(analytics.salesTrend || []);
        setDemandForecast(analytics.forecastComparison || []);
      } catch (err) {
        console.error('Failed to load reports:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Reports & Analytics</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-lg font-bold text-gray-900 mb-4">30-Day Sales Revenue Trend</h3>
          {loading ? (
            <p className="text-gray-500 text-sm text-center py-10">Loading chart data...</p>
          ) : salesData.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-10">No sales data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenue" fill="#00684a" name="Sales Revenue (₹)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-lg font-bold text-gray-900 mb-4">AI Demand Forecast vs Actuals (7-Day)</h3>
          {loading ? (
            <p className="text-gray-500 text-sm text-center py-10">Loading chart data...</p>
          ) : demandForecast.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-10">No demand forecast data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={demandForecast}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="predicted" stroke="#00684a" name="AI Forecast Limit" strokeWidth={2} />
                <Line type="monotone" dataKey="actual" stroke="#82ca9d" name="Actual Consumption" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
