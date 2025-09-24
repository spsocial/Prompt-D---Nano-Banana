import { useState, useEffect } from 'react';
import {
  Users, TrendingUp, DollarSign, Image,
  Calendar, Activity, Award, RefreshCw,
  Download, ChevronDown, ChevronUp
} from 'lucide-react';
import { getAnalyticsSummary, getDetailedStats, exportAnalyticsData } from '../lib/analytics';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    users: true,
    revenue: true,
    activity: true,
    topUsers: false,
    transactions: false
  });
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadStats();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const summary = getAnalyticsSummary();
      setStats(summary);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const data = exportAnalyticsData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8 text-center text-gray-500">
        ไม่สามารถโหลดข้อมูลสถิติได้
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Activity className="h-7 w-7 mr-2 text-yellow-500" />
          📊 Admin Dashboard
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={loadStats}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            รีเฟรช
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users Card */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl text-white shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-blue-100 text-sm">ผู้ใช้ทั้งหมด</p>
              <p className="text-3xl font-bold mt-1">{stats.users.total}</p>
              <p className="text-blue-100 text-xs mt-2">
                ใหม่วันนี้: +{stats.users.newToday}
              </p>
            </div>
            <Users className="h-8 w-8 text-blue-200" />
          </div>
        </div>

        {/* Active Users Card */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-2xl text-white shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-green-100 text-sm">ผู้ใช้งาน (24 ชม.)</p>
              <p className="text-3xl font-bold mt-1">{stats.users.activeToday}</p>
              <p className="text-green-100 text-xs mt-2">
                7 วัน: {stats.users.activeWeek} | 30 วัน: {stats.users.activeMonth}
              </p>
            </div>
            <Activity className="h-8 w-8 text-green-200" />
          </div>
        </div>

        {/* Revenue Today Card */}
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 p-6 rounded-2xl text-white shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-yellow-100 text-sm">รายได้วันนี้</p>
              <p className="text-3xl font-bold mt-1">{formatCurrency(stats.revenue.today)}</p>
              <p className="text-yellow-100 text-xs mt-2">
                {stats.revenue.transactionsToday} รายการ
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-yellow-200" />
          </div>
        </div>

        {/* Total Revenue Card */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-2xl text-white shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-purple-100 text-sm">รายได้ทั้งหมด</p>
              <p className="text-3xl font-bold mt-1">{formatCurrency(stats.revenue.total)}</p>
              <p className="text-purple-100 text-xs mt-2">
                เดือนนี้: {formatCurrency(stats.revenue.month)}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-200" />
          </div>
        </div>
      </div>

      {/* Detailed Sections */}

      {/* User Statistics */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200">
        <div
          className="p-6 flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('users')}
        >
          <h3 className="text-lg font-semibold flex items-center">
            <Users className="h-5 w-5 mr-2 text-blue-500" />
            สถิติผู้ใช้งาน
          </h3>
          {expandedSections.users ? <ChevronUp /> : <ChevronDown />}
        </div>
        {expandedSections.users && (
          <div className="px-6 pb-6 border-t">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">ผู้ใช้ทั้งหมด</p>
                <p className="text-2xl font-bold text-blue-600">{stats.users.total}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Active วันนี้</p>
                <p className="text-2xl font-bold text-green-600">{stats.users.activeToday}</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Active 7 วัน</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.users.activeWeek}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Active 30 วัน</p>
                <p className="text-2xl font-bold text-purple-600">{stats.users.activeMonth}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Revenue Statistics */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200">
        <div
          className="p-6 flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('revenue')}
        >
          <h3 className="text-lg font-semibold flex items-center">
            <DollarSign className="h-5 w-5 mr-2 text-green-500" />
            สถิติรายได้
          </h3>
          {expandedSections.revenue ? <ChevronUp /> : <ChevronDown />}
        </div>
        {expandedSections.revenue && (
          <div className="px-6 pb-6 border-t">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">รายได้วันนี้</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.revenue.today)}</p>
                <p className="text-xs text-gray-500">{stats.revenue.transactionsToday} รายการ</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">รายได้เดือนนี้</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.revenue.month)}</p>
                <p className="text-xs text-gray-500">{stats.revenue.transactionsMonth} รายการ</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">รายได้ปีนี้</p>
                <p className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.revenue.year)}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">รายได้รวมทั้งหมด</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats.revenue.total)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Activity Statistics */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200">
        <div
          className="p-6 flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('activity')}
        >
          <h3 className="text-lg font-semibold flex items-center">
            <Image className="h-5 w-5 mr-2 text-purple-500" />
            กิจกรรมวันนี้
          </h3>
          {expandedSections.activity ? <ChevronUp /> : <ChevronDown />}
        </div>
        {expandedSections.activity && (
          <div className="px-6 pb-6 border-t">
            <div className="mt-4">
              <div className="bg-purple-50 p-4 rounded-lg mb-4">
                <p className="text-sm text-gray-600">ภาพที่สร้างวันนี้</p>
                <p className="text-3xl font-bold text-purple-600">{stats.images.today}</p>
              </div>
              {Object.keys(stats.images.styleBreakdown).length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">แยกตามสไตล์:</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.entries(stats.images.styleBreakdown).map(([style, count]) => (
                      <div key={style} className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-600">{style}</p>
                        <p className="text-lg font-semibold text-gray-800">{count}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Top Users */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200">
        <div
          className="p-6 flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('topUsers')}
        >
          <h3 className="text-lg font-semibold flex items-center">
            <Award className="h-5 w-5 mr-2 text-yellow-500" />
            Top 10 ผู้ใช้งาน
          </h3>
          {expandedSections.topUsers ? <ChevronUp /> : <ChevronDown />}
        </div>
        {expandedSections.topUsers && (
          <div className="px-6 pb-6 border-t">
            <div className="overflow-x-auto mt-4">
              <table className="min-w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-600">
                    <th className="pb-2">User ID</th>
                    <th className="pb-2">ภาพที่สร้าง</th>
                    <th className="pb-2">ยอดใช้จ่าย</th>
                    <th className="pb-2">ใช้งานล่าสุด</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topUsers.map((user, index) => (
                    <tr key={user.id} className="border-t">
                      <td className="py-2">
                        <span className="font-mono text-sm">
                          {index === 0 && '🥇 '}
                          {index === 1 && '🥈 '}
                          {index === 2 && '🥉 '}
                          {user.id}
                        </span>
                      </td>
                      <td className="py-2">{user.generated}</td>
                      <td className="py-2">{formatCurrency(user.spent)}</td>
                      <td className="py-2 text-sm text-gray-600">
                        {formatDate(user.lastActive)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200">
        <div
          className="p-6 flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('transactions')}
        >
          <h3 className="text-lg font-semibold flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-indigo-500" />
            รายการล่าสุด
          </h3>
          {expandedSections.transactions ? <ChevronUp /> : <ChevronDown />}
        </div>
        {expandedSections.transactions && (
          <div className="px-6 pb-6 border-t">
            <div className="overflow-x-auto mt-4">
              <table className="min-w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-600">
                    <th className="pb-2">Transaction ID</th>
                    <th className="pb-2">User ID</th>
                    <th className="pb-2">แพ็คเกจ</th>
                    <th className="pb-2">จำนวน</th>
                    <th className="pb-2">เวลา</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentTransactions.map((tx) => (
                    <tr key={tx.id} className="border-t">
                      <td className="py-2 font-mono text-sm">{tx.id}</td>
                      <td className="py-2 font-mono text-sm">{tx.userId}</td>
                      <td className="py-2">{tx.package}</td>
                      <td className="py-2 font-semibold">{formatCurrency(tx.amount)}</td>
                      <td className="py-2 text-sm text-gray-600">
                        {formatDate(tx.timestamp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}