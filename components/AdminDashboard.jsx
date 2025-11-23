import { useState, useEffect } from 'react';
import {
  Users, TrendingUp, DollarSign, Image,
  Calendar, Activity, Award, RefreshCw,
  Download, ChevronDown, ChevronUp, Film, AlertTriangle,
  BarChart3, Clock, TrendingDown, Wallet, Mic
} from 'lucide-react';
import { getAnalyticsSummary, getDetailedStats, exportAnalyticsData } from '../lib/analytics-client';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [historicalData, setHistoricalData] = useState(null);
  const [historicalRange, setHistoricalRange] = useState('7');
  const [loadingHistorical, setLoadingHistorical] = useState(false);
  const [monthlyData, setMonthlyData] = useState(null);
  const [monthlyRange, setMonthlyRange] = useState('12');
  const [loadingMonthly, setLoadingMonthly] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    users: true,
    revenue: true,
    activity: true,
    videos: true,
    voices: false,
    historical: false,
    monthly: false,
    transactions: false,
    topUsers: false
  });
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadStats();
    loadHistoricalData();
    loadMonthlyData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadHistoricalData = async (range = historicalRange) => {
    try {
      setLoadingHistorical(true);
      const response = await fetch(`/api/analytics/historical?range=${range}`);
      if (response.ok) {
        const data = await response.json();
        setHistoricalData(data);
      }
    } catch (error) {
      console.error('Error loading historical data:', error);
    } finally {
      setLoadingHistorical(false);
    }
  };

  const handleRangeChange = (range) => {
    setHistoricalRange(range);
    loadHistoricalData(range);
  };

  const loadMonthlyData = async (months = monthlyRange) => {
    try {
      setLoadingMonthly(true);
      const response = await fetch(`/api/analytics/monthly?months=${months}`);
      if (response.ok) {
        const data = await response.json();
        setMonthlyData(data);
      }
    } catch (error) {
      console.error('Error loading monthly data:', error);
    } finally {
      setLoadingMonthly(false);
    }
  };

  const handleMonthlyRangeChange = (months) => {
    setMonthlyRange(months);
    loadMonthlyData(months);
  };

  const loadStats = async () => {
    try {
      setLoading(true);
      const summary = await getAnalyticsSummary(); // This fetches from database via API

      if (summary) {
        // Get manual credit statistics from API
        try {
          const response = await fetch('/api/credits/stats');
          if (response.ok) {
            const creditData = await response.json();
            summary.manualCredits = creditData;
          } else {
            // Fallback: calculate from transactions
            const todayTransactions = summary.recentTransactions?.filter(t => {
              const transDate = new Date(t.timestamp || t.createdAt);
              const today = new Date();
              return transDate.toDateString() === today.toDateString();
            }) || [];

            const totalManualCredits = todayTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

            summary.manualCredits = {
              todayTotal: totalManualCredits,
              todayCount: todayTransactions.length,
              freeCredits: 0, // Will be tracked separately in future
              paidCredits: totalManualCredits
            };
          }
        } catch (error) {
          console.log('Could not fetch credit stats:', error);
          summary.manualCredits = {
            todayTotal: 0,
            todayCount: 0,
            freeCredits: 0,
            paidCredits: 0
          };
        }
      }

      setStats(summary);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    const data = await exportAnalyticsData(); // Add await since it's now async
    if (data) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
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
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Activity className="h-7 w-7 mr-2 text-yellow-500" />
            📊 Admin Dashboard
          </h2>
          <p className="text-xs text-gray-500 mt-1 ml-9">
            <Clock className="h-3 w-3 inline mr-1" />
            ข้อมูลรีเซ็ตทุกวันเวลา 00:00 น. (เวลาไทย UTC+7) | ต้นทุนคำนวณจาก API จริง
          </p>
        </div>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
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

        {/* Profit Card */}
        <div className={`bg-gradient-to-br p-6 rounded-2xl text-white shadow-lg ${
          stats.profit?.today >= 0
            ? 'from-emerald-500 to-emerald-600'
            : 'from-red-500 to-red-600'
        }`}>
          <div className="flex justify-between items-start">
            <div>
              <p className={`text-sm ${stats.profit?.today >= 0 ? 'text-emerald-100' : 'text-red-100'}`}>
                กำไรวันนี้
              </p>
              <p className="text-3xl font-bold mt-1">{formatCurrency(stats.profit?.today || 0)}</p>
              <p className={`text-xs mt-2 ${stats.profit?.today >= 0 ? 'text-emerald-100' : 'text-red-100'}`}>
                margin: {stats.profit?.marginToday || 0}%
              </p>
            </div>
            <Wallet className={`h-8 w-8 ${stats.profit?.today >= 0 ? 'text-emerald-200' : 'text-red-200'}`} />
          </div>
        </div>

        {/* Manual Credits Card */}
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-6 rounded-2xl text-white shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-indigo-100 text-sm">เครดิตที่เติม (Manual)</p>
              <p className="text-2xl font-bold mt-1">
                {stats.manualCredits?.todayTotal || 0} <span className="text-sm">เครดิต</span>
              </p>
              <p className="text-indigo-100 text-xs mt-2">
                ฟรี: {stats.manualCredits?.freeCredits || 0} | จ่าย: {stats.manualCredits?.paidCredits || 0}
              </p>
            </div>
            <Award className="h-8 w-8 text-indigo-200" />
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

            {/* Costs and Profit Section */}
            {stats.costs && stats.profit && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-md font-semibold text-gray-700 mb-4">📊 ต้นทุนและกำไร (วันนี้)</h4>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Cost Cards */}
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <p className="text-sm text-gray-600">ต้นทุนภาพ</p>
                    <p className="text-xl font-bold text-orange-600">{formatCurrency(stats.costs.imagesToday || 0)}</p>
                    <p className="text-xs text-gray-500">
                      API: Nano Banana ({stats.images.today} ภาพ)
                    </p>
                    <p className="text-xs text-emerald-600 font-medium">✓ ใช้ต้นทุนจริงจาก API</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <p className="text-sm text-gray-600">ต้นทุนวิดีโอ</p>
                    <p className="text-xl font-bold text-red-600">{formatCurrency(stats.costs.videosToday || 0)}</p>
                    <p className="text-xs text-gray-500">
                      API: KIE Sora 2 ({stats.videos?.today || 0} คลิป)
                    </p>
                    <p className="text-xs text-emerald-600 font-medium">✓ ใช้ต้นทุนจริงจาก API</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-300">
                    <p className="text-sm text-gray-600">ต้นทุนรวมวันนี้</p>
                    <p className="text-xl font-bold text-gray-700">{formatCurrency(stats.costs.totalToday || 0)}</p>
                  </div>
                  <div className={`p-4 rounded-lg border-2 ${
                    (stats.profit.today || 0) >= 0
                      ? 'bg-emerald-50 border-emerald-300'
                      : 'bg-red-50 border-red-300'
                  }`}>
                    <p className="text-sm text-gray-600">กำไรสุทธิวันนี้</p>
                    <p className={`text-xl font-bold ${
                      (stats.profit.today || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(stats.profit.today || 0)}
                    </p>
                    <p className="text-xs text-gray-600">
                      Margin: {stats.profit.marginToday || 0}%
                    </p>
                  </div>
                </div>

                {/* Summary Formula */}
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">สูตร:</span> กำไร = รายได้ ({formatCurrency(stats.revenue.today)})
                    - ต้นทุนภาพ ({formatCurrency(stats.costs.imagesToday || 0)})
                    - ต้นทุนวิดีโอ ({formatCurrency(stats.costs.videosToday || 0)})
                    = <span className={`font-bold ${
                      (stats.profit.today || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(stats.profit.today || 0)}
                    </span>
                  </p>
                </div>
              </div>
            )}
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
            กิจกรรมภาพวันนี้
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

      {/* Video Statistics */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200">
        <div
          className="p-6 flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('videos')}
        >
          <h3 className="text-lg font-semibold flex items-center">
            <Film className="h-5 w-5 mr-2 text-red-500" />
            กิจกรรมวิดีโอวันนี้
          </h3>
          {expandedSections.videos ? <ChevronUp /> : <ChevronDown />}
        </div>
        {expandedSections.videos && stats.videos && (
          <div className="px-6 pb-6 border-t">
            <div className="mt-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">วิดีโอที่สร้างวันนี้</p>
                  <p className="text-3xl font-bold text-red-600">{stats.videos.today}</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">วิดีโอ Error วันนี้</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.videos.errors}</p>
                  <p className="text-xs text-orange-500 mt-1">
                    เครดิตจะถูกคืนอัตโนมัติ
                  </p>
                </div>
              </div>
              {Object.keys(stats.videos.modelBreakdown).length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">แยกตามโมเดล:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(stats.videos.modelBreakdown).map(([model, count]) => (
                      <div key={model} className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-600">{model}</p>
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

      {/* Voice Generation Statistics */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200">
        <div
          className="p-6 flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('voices')}
        >
          <h3 className="text-lg font-semibold flex items-center">
            <Mic className="h-5 w-5 mr-2 text-cyan-500" />
            🎙️ สถิติการสร้างเสียง (Voice Generation)
          </h3>
          {expandedSections.voices ? <ChevronUp /> : <ChevronDown />}
        </div>
        {expandedSections.voices && stats.voices && (
          <div className="px-6 pb-6 border-t">
            <div className="mt-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-cyan-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">เสียงที่สร้างวันนี้</p>
                  <p className="text-3xl font-bold text-cyan-600">{stats.voices.today || 0}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">ElevenLabs วันนี้</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.voices.elevenLabsToday || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">เสียงคุณภาพสูง</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Gemini วันนี้</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.voices.geminiToday || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">เสียงมาตรฐาน</p>
                </div>
              </div>

              {/* All-time statistics */}
              <div className="border-t pt-4 mt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">📊 สถิติรวมตลอดกาล</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">เสียงทั้งหมด</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.voices.total || 0}</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">ElevenLabs รวม</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.voices.elevenLabsTotal || 0}</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Gemini รวม</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.voices.geminiTotal || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Historical Data */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200">
        <div
          className="p-6 flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('historical')}
        >
          <h3 className="text-lg font-semibold flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-cyan-500" />
            📈 สถิติย้อนหลัง
          </h3>
          {expandedSections.historical ? <ChevronUp /> : <ChevronDown />}
        </div>
        {expandedSections.historical && (
          <div className="px-6 pb-6 border-t">
            <div className="mt-4">
              {/* Range Selector */}
              <div className="flex space-x-2 mb-4">
                <button
                  onClick={() => handleRangeChange('7')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    historicalRange === '7'
                      ? 'bg-cyan-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  7 วัน
                </button>
                <button
                  onClick={() => handleRangeChange('30')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    historicalRange === '30'
                      ? 'bg-cyan-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  30 วัน
                </button>
                <button
                  onClick={() => handleRangeChange('all')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    historicalRange === 'all'
                      ? 'bg-cyan-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  ทั้งหมด
                </button>
              </div>

              {loadingHistorical ? (
                <div className="flex items-center justify-center p-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-cyan-500" />
                </div>
              ) : historicalData ? (
                <div>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">ภาพทั้งหมด</p>
                      <p className="text-2xl font-bold text-purple-600">{historicalData.totals.images}</p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">วิดีโอทั้งหมด</p>
                      <p className="text-2xl font-bold text-red-600">{historicalData.totals.videos}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">รายได้</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(historicalData.totals.revenue)}</p>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">ต้นทุน</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {formatCurrency(historicalData.chartData.reduce((sum, d) => sum + (d.cost || 0), 0))}
                      </p>
                    </div>
                    <div className={`p-4 rounded-lg ${
                      historicalData.chartData.reduce((sum, d) => sum + (d.profit || 0), 0) >= 0
                        ? 'bg-emerald-50'
                        : 'bg-red-50'
                    }`}>
                      <p className="text-sm text-gray-600">กำไร</p>
                      <p className={`text-2xl font-bold ${
                        historicalData.chartData.reduce((sum, d) => sum + (d.profit || 0), 0) >= 0
                          ? 'text-emerald-600'
                          : 'text-red-600'
                      }`}>
                        {formatCurrency(historicalData.chartData.reduce((sum, d) => sum + (d.profit || 0), 0))}
                      </p>
                    </div>
                  </div>

                  {/* Video Models Breakdown */}
                  <div className="mb-6">
                    <p className="text-sm font-medium text-gray-700 mb-2">วิดีโอแยกตามโมเดล:</p>
                    <div className="grid grid-cols-1 gap-2">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-600">Sora 2 (All)</p>
                        <p className="text-lg font-semibold text-gray-800">{historicalData.totals.videosSora2}</p>
                      </div>
                    </div>
                  </div>

                  {/* Daily Data Table */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">ข้อมูลรายวัน:</p>
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                      <table className="min-w-full text-sm">
                        <thead className="sticky top-0 bg-gray-100">
                          <tr className="text-left text-xs text-gray-600">
                            <th className="p-2">วันที่</th>
                            <th className="p-2">ภาพ</th>
                            <th className="p-2">วิดีโอ</th>
                            <th className="p-2">เสียง</th>
                            <th className="p-2">Error</th>
                            <th className="p-2">รายได้</th>
                            <th className="p-2">ต้นทุน</th>
                            <th className="p-2 font-semibold">กำไร</th>
                            <th className="p-2">User ใหม่</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historicalData.chartData.slice().reverse().map((day, index) => {
                            const profit = day.profit || 0;
                            const profitColor = profit >= 0 ? 'text-emerald-600' : 'text-red-600';

                            return (
                              <tr key={day.date} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="p-2 font-mono text-xs">{day.date}</td>
                                <td className="p-2">{day.images}</td>
                                <td className="p-2 font-semibold text-red-600">{day.videos}</td>
                                <td className="p-2 font-semibold text-cyan-600">{day.voices || 0}</td>
                                <td className="p-2 text-orange-600">{day.videoErrors}</td>
                                <td className="p-2 text-green-600">{formatCurrency(day.revenue)}</td>
                                <td className="p-2 text-orange-600">{formatCurrency(day.cost || 0)}</td>
                                <td className={`p-2 font-bold ${profitColor}`}>{formatCurrency(profit)}</td>
                                <td className="p-2">{day.newUsers}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-4">ไม่มีข้อมูลย้อนหลัง</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Historical Data */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200">
        <div
          className="p-6 flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('historical')}
        >
          <h3 className="text-lg font-semibold flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-cyan-500" />
            📊 สถิติย้อนหลัง
          </h3>
          {expandedSections.historical ? <ChevronUp /> : <ChevronDown />}
        </div>
        {expandedSections.historical && (
          <div className="px-6 pb-6 border-t">
            <div className="mt-4">
              {/* Range Selector */}
              <div className="flex space-x-2 mb-4">
                <button
                  onClick={() => handleRangeChange('7')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    historicalRange === '7'
                      ? 'bg-cyan-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  7 วัน
                </button>
                <button
                  onClick={() => handleRangeChange('30')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    historicalRange === '30'
                      ? 'bg-cyan-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  30 วัน
                </button>
                <button
                  onClick={() => handleRangeChange('all')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    historicalRange === 'all'
                      ? 'bg-cyan-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  ทั้งหมด
                </button>
              </div>

              {loadingHistorical ? (
                <div className="flex items-center justify-center p-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-cyan-500" />
                </div>
              ) : historicalData ? (
                <div>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">ภาพทั้งหมด</p>
                      <p className="text-2xl font-bold text-purple-600">{historicalData.totals.images}</p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">วิดีโอทั้งหมด</p>
                      <p className="text-2xl font-bold text-red-600">{historicalData.totals.videos}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">รายได้</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(historicalData.totals.revenue)}</p>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">ต้นทุน</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {formatCurrency(historicalData.chartData.reduce((sum, d) => sum + (d.cost || 0), 0))}
                      </p>
                    </div>
                    <div className={`p-4 rounded-lg ${
                      historicalData.chartData.reduce((sum, d) => sum + (d.profit || 0), 0) >= 0
                        ? 'bg-emerald-50'
                        : 'bg-red-50'
                    }`}>
                      <p className="text-sm text-gray-600">กำไร</p>
                      <p className={`text-2xl font-bold ${
                        historicalData.chartData.reduce((sum, d) => sum + (d.profit || 0), 0) >= 0
                          ? 'text-emerald-600'
                          : 'text-red-600'
                      }`}>
                        {formatCurrency(historicalData.chartData.reduce((sum, d) => sum + (d.profit || 0), 0))}
                      </p>
                    </div>
                  </div>

                  {/* Video Models Breakdown */}
                  <div className="mb-6">
                    <p className="text-sm font-medium text-gray-700 mb-2">วิดีโอแยกตามโมเดล:</p>
                    <div className="grid grid-cols-1 gap-2">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-600">Sora 2 (All)</p>
                        <p className="text-lg font-semibold text-gray-800">{historicalData.totals.videosSora2}</p>
                      </div>
                    </div>
                  </div>

                  {/* Daily Data Table */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">ข้อมูลรายวัน:</p>
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                      <table className="min-w-full text-sm">
                        <thead className="sticky top-0 bg-gray-100">
                          <tr className="text-left text-xs text-gray-600">
                            <th className="p-2">วันที่</th>
                            <th className="p-2">ภาพ</th>
                            <th className="p-2">วิดีโอ</th>
                            <th className="p-2">เสียง</th>
                            <th className="p-2">Error</th>
                            <th className="p-2">รายได้</th>
                            <th className="p-2">ต้นทุน</th>
                            <th className="p-2 font-semibold">กำไร</th>
                            <th className="p-2">User ใหม่</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historicalData.chartData.slice().reverse().map((day, index) => {
                            const profit = day.profit || 0;
                            const profitColor = profit >= 0 ? 'text-emerald-600' : 'text-red-600';

                            return (
                              <tr key={day.date} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="p-2 font-mono text-xs">{day.date}</td>
                                <td className="p-2">{day.images}</td>
                                <td className="p-2 font-semibold text-red-600">{day.videos}</td>
                                <td className="p-2 font-semibold text-cyan-600">{day.voices || 0}</td>
                                <td className="p-2 text-orange-600">{day.videoErrors}</td>
                                <td className="p-2 text-green-600">{formatCurrency(day.revenue)}</td>
                                <td className="p-2 text-orange-600">{formatCurrency(day.cost || 0)}</td>
                                <td className={`p-2 font-bold ${profitColor}`}>{formatCurrency(profit)}</td>
                                <td className="p-2">{day.newUsers}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-4">ไม่มีข้อมูลย้อนหลัง</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Monthly Revenue Data */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200">
        <div
          className="p-6 flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('monthly')}
        >
          <h3 className="text-lg font-semibold flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
            💰 รายได้รายเดือนย้อนหลัง
          </h3>
          {expandedSections.monthly ? <ChevronUp /> : <ChevronDown />}
        </div>
        {expandedSections.monthly && (
          <div className="px-6 pb-6 border-t">
            <div className="mt-4">
              {/* Range Selector */}
              <div className="flex space-x-2 mb-4">
                <button
                  onClick={() => handleMonthlyRangeChange('6')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    monthlyRange === '6'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  6 เดือน
                </button>
                <button
                  onClick={() => handleMonthlyRangeChange('12')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    monthlyRange === '12'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  12 เดือน
                </button>
                <button
                  onClick={() => handleMonthlyRangeChange('24')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    monthlyRange === '24'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  24 เดือน
                </button>
              </div>

              {loadingMonthly ? (
                <div className="flex items-center justify-center p-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-green-500" />
                </div>
              ) : monthlyData && monthlyData.months ? (
                <div>
                  {/* Monthly Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">รายได้รวม</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(monthlyData.months.reduce((sum, m) => sum + m.revenue, 0))}
                      </p>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">ต้นทุนรวม</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {formatCurrency(monthlyData.months.reduce((sum, m) => sum + (m.cost || 0), 0))}
                      </p>
                    </div>
                    <div className={`p-4 rounded-lg ${
                      monthlyData.months.reduce((sum, m) => sum + (m.profit || 0), 0) >= 0
                        ? 'bg-emerald-50'
                        : 'bg-red-50'
                    }`}>
                      <p className="text-sm text-gray-600">กำไรรวม</p>
                      <p className={`text-2xl font-bold ${
                        monthlyData.months.reduce((sum, m) => sum + (m.profit || 0), 0) >= 0
                          ? 'text-emerald-600'
                          : 'text-red-600'
                      }`}>
                        {formatCurrency(monthlyData.months.reduce((sum, m) => sum + (m.profit || 0), 0))}
                      </p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">รายการทั้งหมด</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {monthlyData.months.reduce((sum, m) => sum + m.transactions, 0)}
                      </p>
                    </div>
                  </div>

                  {/* Monthly Data Table */}
                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <table className="min-w-full text-sm">
                      <thead className="sticky top-0 bg-gray-100">
                        <tr className="text-left text-xs text-gray-600">
                          <th className="p-2">เดือน</th>
                          <th className="p-2">รายได้</th>
                          <th className="p-2">ต้นทุน</th>
                          <th className="p-2 font-semibold">กำไร</th>
                          <th className="p-2">Margin</th>
                          <th className="p-2">รายการ</th>
                          <th className="p-2">ภาพ</th>
                          <th className="p-2">วิดีโอ</th>
                          <th className="p-2">เสียง</th>
                          <th className="p-2">Error</th>
                          <th className="p-2">User ใหม่</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyData.months.slice().reverse().map((month, index) => {
                          // Format month display (2025-01 -> มกราคม 2568)
                          const [year, monthNum] = month.month.split('-');
                          const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
                                             'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
                          const monthDisplay = `${thaiMonths[parseInt(monthNum) - 1]} ${parseInt(year) + 543}`;

                          const profit = month.profit || 0;
                          const profitColor = profit >= 0 ? 'text-emerald-600' : 'text-red-600';

                          return (
                            <tr key={month.month} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="p-2 font-mono text-xs">{monthDisplay}</td>
                              <td className="p-2 font-semibold text-green-600">{formatCurrency(month.revenue)}</td>
                              <td className="p-2 text-orange-600">{formatCurrency(month.cost || 0)}</td>
                              <td className={`p-2 font-bold ${profitColor}`}>{formatCurrency(profit)}</td>
                              <td className="p-2 text-xs text-gray-600">{month.profitMargin || 0}%</td>
                              <td className="p-2">{month.transactions}</td>
                              <td className="p-2">{month.images}</td>
                              <td className="p-2 font-semibold text-red-600">{month.videos}</td>
                              <td className="p-2 font-semibold text-cyan-600">{month.voices || 0}</td>
                              <td className="p-2 text-orange-600">{month.videoErrors}</td>
                              <td className="p-2">{month.newUsers}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-4">ไม่มีข้อมูลรายเดือน</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Top 10 Users */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200">
        <div
          className="p-6 flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('topUsers')}
        >
          <h3 className="text-lg font-semibold flex items-center">
            <Award className="h-5 w-5 mr-2 text-yellow-500" />
            🏆 Top 10 ผู้ใช้งาน
          </h3>
          {expandedSections.topUsers ? <ChevronUp /> : <ChevronDown />}
        </div>
        {expandedSections.topUsers && stats.topUsers && (
          <div className="px-6 pb-6 border-t">
            <div className="overflow-x-auto mt-4">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100">
                  <tr className="text-left text-xs text-gray-600">
                    <th className="p-2">อันดับ</th>
                    <th className="p-2">User ID</th>
                    <th className="p-2">ภาพสร้าง</th>
                    <th className="p-2">วิดีโอสร้าง</th>
                    <th className="p-2">ยอดใช้จ่าย</th>
                    <th className="p-2">เครดิตคงเหลือ</th>
                    <th className="p-2">วันที่เข้าใช้ล่าสุด</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topUsers.map((user, index) => (
                    <tr key={user.userId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="p-2 font-bold">
                        {index === 0 && '🥇'}
                        {index === 1 && '🥈'}
                        {index === 2 && '🥉'}
                        {index > 2 && `${index + 1}`}
                      </td>
                      <td className="p-2 font-mono text-xs">{user.userId}</td>
                      <td className="p-2 text-blue-600 font-semibold">{user.totalGenerated || 0}</td>
                      <td className="p-2 text-red-600 font-semibold">{user.videosGenerated || 0}</td>
                      <td className="p-2 text-green-600 font-semibold">{formatCurrency(user.totalSpent || 0)}</td>
                      <td className="p-2">{user.credits || 0}</td>
                      <td className="p-2 text-xs text-gray-600">{formatDate(user.lastActive)}</td>
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