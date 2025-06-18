// app/dashboard/reports/sales/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'; // ถ้าต้องการใช้ Chart

interface SaleReportData {
  id: string;
  totalAmount: number;
  discount: number;
  finalAmount: number;
  saleDate: string; // ISO string
  user: { username: string };
  customer?: { name: string; isMember: boolean };
  items: {
    quantity: number;
    price: number;
    product: { name: string };
  }[];
}

interface ReportSummary {
  totalSalesCount: number;
  totalRevenue: number;
  totalDiscountGiven: number;
}

export default function SalesReportPage() {
  const [sales, setSales] = useState<SaleReportData[]>([]);
  const [summary, setSummary] = useState<ReportSummary>({
    totalSalesCount: 0,
    totalRevenue: 0,
    totalDiscountGiven: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]); // วันนี้
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]); // วันนี้
  const router = useRouter();

  useEffect(() => {
    fetchSalesReport();
  }, [startDate, endDate]); // Trigger fetch เมื่อ startDate หรือ endDate เปลี่ยน

  const fetchSalesReport = async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const response = await fetch(`/api/reports/sales?startDate=${startDate}&endDate=${endDate}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setSales(data.sales);
        setSummary(data.summary);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to fetch sales report');
        if (response.status === 401 || response.status === 403) {
            router.push('/login');
        }
      }
    } catch (err) {
      console.error('Fetch sales report error:', err);
      setError('Network error or server unavailable');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) return <p>Loading sales report...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Sales Report</h1>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <label htmlFor="startDate" className="block text-gray-700 text-sm font-bold mb-2">Start Date:</label>
          <input
            type="date"
            id="startDate"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="endDate" className="block text-gray-700 text-sm font-bold mb-2">End Date:</label>
          <input
            type="date"
            id="endDate"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-blue-100 p-4 rounded-lg shadow-sm text-center">
          <h3 className="font-semibold text-lg text-blue-800">Total Sales Transactions</h3>
          <p className="text-4xl font-bold text-blue-600">{summary.totalSalesCount}</p>
        </div>
        <div className="bg-green-100 p-4 rounded-lg shadow-sm text-center">
          <h3 className="font-semibold text-lg text-green-800">Total Revenue</h3>
          <p className="text-4xl font-bold text-green-600">${summary.totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-yellow-100 p-4 rounded-lg shadow-sm text-center">
          <h3 className="font-semibold text-lg text-yellow-800">Total Discount Given</h3>
          <p className="text-4xl font-bold text-yellow-600">${summary.totalDiscountGiven.toFixed(2)}</p>
        </div>
      </div>

      {/* Optional: Chart (ต้องติดตั้ง recharts ก่อน: npm install recharts)
      <h2 className="text-2xl font-bold mb-4">Sales Trend</h2>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <LineChart
            data={sales.map(s => ({ name: formatDate(s.saleDate), revenue: s.finalAmount }))}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="revenue" stroke="#8884d8" activeDot={{ r: 8 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      */}

      <h2 className="text-2xl font-bold mt-8 mb-4">Detailed Sales Transactions</h2>
      {sales.length === 0 ? (
        <p className="text-gray-500">No sales found for the selected period.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
            <thead className="bg-gray-200">
              <tr>
                <th className="py-2 px-4 text-left">Sale ID</th>
                <th className="py-2 px-4 text-left">Date</th>
                <th className="py-2 px-4 text-left">Staff</th>
                <th className="py-2 px-4 text-left">Customer</th>
                <th className="py-2 px-4 text-left">Items</th>
                <th className="py-2 px-4 text-right">Total Amount</th>
                <th className="py-2 px-4 text-right">Discount</th>
                <th className="py-2 px-4 text-right">Final Amount</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-2 px-4 text-sm">{sale.id.substring(0, 8)}...</td>
                  <td className="py-2 px-4 text-sm">{formatDate(sale.saleDate)}</td>
                  <td className="py-2 px-4">{sale.user.username}</td>
                  <td className="py-2 px-4">{sale.customer ? `${sale.customer.name} ${sale.customer.isMember ? '(M)' : ''}` : 'Walk-in'}</td>
                  <td className="py-2 px-4 text-sm">
                    {sale.items.map(item => (
                      <div key={item.product.name}>
                        {item.product.name} (x{item.quantity}) - ${item.price.toFixed(2)}
                      </div>
                    ))}
                  </td>
                  <td className="py-2 px-4 text-right">${sale.totalAmount.toFixed(2)}</td>
                  <td className="py-2 px-4 text-right text-green-600">-${sale.discount.toFixed(2)}</td>
                  <td className="py-2 px-4 text-right font-semibold">${sale.finalAmount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}