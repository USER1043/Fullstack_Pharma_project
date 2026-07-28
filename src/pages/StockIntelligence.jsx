/**
 * @file Stock intelligence page displaying AI insights, movement categories, and reorder recommendations.
 * @module pages/StockIntelligence
 */
import { useState, useEffect } from 'react';
import axiosInstance from '../utils/axiosConfig';

// Renders stock intelligence view.
const StockIntelligence = () => {
  const [stockIntelligence, setStockIntelligence] = useState({
    fastMoving: [],
    slowMoving: [],
    critical: [],
    recommendations: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetches intelligence insights from backend API.
    const fetchIntelligence = async () => {
      try {
        const res = await axiosInstance.get('/inventory/intelligence');
        setStockIntelligence(res.data.data || {
          fastMoving: [], slowMoving: [], critical: [], recommendations: []
        });
      } catch (err) {
        console.error('Failed to load stock intelligence:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchIntelligence();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Stock Intelligence</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Fast Moving</h3>
          {loading ? (
            <p className="text-gray-500 text-sm">Loading...</p>
          ) : stockIntelligence.fastMoving.length === 0 ? (
            <p className="text-gray-500 text-sm">No data available</p>
          ) : (
            <ul className="space-y-2">
              {stockIntelligence.fastMoving.map((item, idx) => (
                <li key={idx} className="text-sm bg-green-50 p-2 rounded">{item}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Slow Moving</h3>
          {loading ? (
            <p className="text-gray-500 text-sm">Loading...</p>
          ) : stockIntelligence.slowMoving.length === 0 ? (
            <p className="text-gray-500 text-sm">No data available</p>
          ) : (
            <ul className="space-y-2">
              {stockIntelligence.slowMoving.map((item, idx) => (
                <li key={idx} className="text-sm bg-yellow-50 p-2 rounded">{item}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Critical Stock</h3>
          {loading ? (
            <p className="text-gray-500 text-sm">Loading...</p>
          ) : stockIntelligence.critical.length === 0 ? (
            <p className="text-gray-500 text-sm">No critical stock</p>
          ) : (
            <ul className="space-y-2">
              {stockIntelligence.critical.map((item, idx) => (
                <li key={idx} className="text-sm bg-red-50 p-2 rounded">{item}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md">
        <h3 className="text-lg font-bold text-gray-900 mb-4">AI Recommendations</h3>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Medicine</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Action</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Quantity</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Priority</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan="4" className="px-4 py-8 text-center text-gray-500">Loading recommendations...</td>
              </tr>
            ) : stockIntelligence.recommendations.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-4 py-8 text-center text-gray-500">No AI recommendations currently</td>
              </tr>
            ) : stockIntelligence.recommendations.map((rec, idx) => (
              <tr key={idx}>
                <td className="px-4 py-3">{rec.medicine}</td>
                <td className="px-4 py-3">{rec.action}</td>
                <td className="px-4 py-3">{rec.quantity || '-'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                    rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                    {rec.priority}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StockIntelligence;
