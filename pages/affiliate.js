import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

export default function AffiliateDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [stats, setStats] = useState(null);
  const [commissions, setCommissions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Withdraw form state
  const [withdrawForm, setWithdrawForm] = useState({
    amount: '',
    bankName: '',
    bankAccount: '',
    accountName: ''
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    } else if (status === 'authenticated') {
      loadAffiliateData();
    }
  }, [status]);

  async function loadAffiliateData() {
    try {
      const userId = session?.user?.userId;
      if (!userId) return;

      // Load stats
      const statsRes = await fetch(`/api/affiliate/stats?userId=${userId}`);
      const statsData = await statsRes.json();

      if (statsData.success) {
        setStats(statsData);

        // ถ้ายังไม่มี referral code ให้สร้างให้อัตโนมัติ
        if (!statsData.hasReferralCode) {
          await generateReferralCode();
        }
      }

      // Load commissions
      const commissionsRes = await fetch(`/api/affiliate/commissions?userId=${userId}&limit=10`);
      const commissionsData = await commissionsRes.json();
      if (commissionsData.success) {
        setCommissions(commissionsData.commissions);
      }

      // Load withdrawals
      const withdrawalsRes = await fetch(`/api/affiliate/withdraw?userId=${userId}&limit=5`);
      const withdrawalsData = await withdrawalsRes.json();
      if (withdrawalsData.success) {
        setWithdrawals(withdrawalsData.withdrawals);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading affiliate data:', error);
      setLoading(false);
    }
  }

  async function generateReferralCode() {
    try {
      setGenerating(true);
      const res = await fetch('/api/affiliate/generate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session?.user?.userId })
      });

      const data = await res.json();
      if (data.success) {
        // Reload stats
        await loadAffiliateData();
      }
    } catch (error) {
      console.error('Error generating referral code:', error);
    } finally {
      setGenerating(false);
    }
  }

  function copyReferralLink() {
    const link = `${window.location.origin}/?ref=${stats.referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleWithdraw(e) {
    e.preventDefault();

    try {
      const res = await fetch('/api/affiliate/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session?.user?.userId,
          amount: parseFloat(withdrawForm.amount),
          bankName: withdrawForm.bankName,
          bankAccount: withdrawForm.bankAccount,
          accountName: withdrawForm.accountName
        })
      });

      const data = await res.json();
      if (data.success) {
        alert('ส่งคำขอถอนเงินสำเร็จ! รอ admin ตรวจสอบ');
        setShowWithdrawModal(false);
        setWithdrawForm({ amount: '', bankName: '', bankAccount: '', accountName: '' });
        await loadAffiliateData();
      } else {
        alert(data.message || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      console.error('Error withdrawing:', error);
      alert('เกิดข้อผิดพลาดในการขอถอนเงิน');
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (!stats?.hasReferralCode && generating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังสร้างรหัสแนะนำ...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Affiliate Dashboard - PD Studio</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Affiliate Dashboard</h1>
              <p className="text-gray-600 mt-1">แนะนำเพื่อนมาใช้งาน รับค่าคอมมิชชั่น 5-12%</p>
            </div>
            <Link href="/">
              <button className="px-4 py-2 bg-white rounded-lg shadow hover:shadow-md transition">
                ← กลับหน้าหลัก
              </button>
            </Link>
          </div>

          {/* Referral Link Card */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">🔗 ลิงก์แนะนำของคุณ</h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/?ref=${stats?.referralCode}`}
                readOnly
                className="flex-1 px-4 py-3 border-2 border-purple-200 rounded-lg bg-purple-50 font-mono text-sm"
              />
              <button
                onClick={copyReferralLink}
                className={`px-6 py-3 rounded-lg font-semibold transition ${
                  copied
                    ? 'bg-green-500 text-white'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                {copied ? '✓ คัดลอกแล้ว' : 'คัดลอก'}
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              รหัสแนะนำ: <span className="font-mono font-bold text-purple-600">{stats?.referralCode}</span>
            </p>
          </div>

          {/* Current Tier Card */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl shadow-2xl p-6 mb-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-purple-100 text-sm">ระดับปัจจุบัน</p>
                <h2 className="text-3xl font-bold flex items-center gap-2">
                  <span>{stats?.currentTier?.icon}</span>
                  <span>{stats?.currentTier?.name}</span>
                </h2>
              </div>
              <div className="text-5xl opacity-20">{stats?.currentTier?.icon}</div>
            </div>
            <div className="bg-white/20 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm">ค่าคอมมิชชั่น</span>
                <span className="text-2xl font-bold">{(stats?.currentTier?.rate * 100) || 0}%</span>
              </div>
              {stats?.nextTier && (
                <>
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span>ถึง {stats.nextTier.name}</span>
                      <span>{stats?.stats?.activeReferralsThisMonth || 0} / {stats.nextTier.minReferrals} คน</span>
                    </div>
                    <div className="w-full bg-white/30 rounded-full h-2">
                      <div
                        className="bg-white rounded-full h-2 transition-all duration-500"
                        style={{
                          width: `${Math.min(100, ((stats?.stats?.activeReferralsThisMonth || 0) / stats.nextTier.minReferrals) * 100)}%`
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-purple-100 mt-1">
                      อีก {Math.max(0, stats.nextTier.minReferrals - (stats?.stats?.activeReferralsThisMonth || 0))} คน → {stats.nextTier.name} ({(stats.nextTier.rate * 100)}%)
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">แนะนำทั้งหมด</p>
                  <p className="text-3xl font-bold text-gray-800 mt-1">{stats?.stats?.totalReferrals || 0}</p>
                  <p className="text-xs text-gray-400 mt-1">คนที่สมัครผ่านลิงก์</p>
                </div>
                <div className="text-4xl">👥</div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">ซื้อแล้วทั้งหมด</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">{stats?.stats?.activeReferrals || 0}</p>
                  <p className="text-xs text-gray-400 mt-1">คนที่ซื้อ credits</p>
                </div>
                <div className="text-4xl">✅</div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">ซื้อในเดือนนี้</p>
                  <p className="text-3xl font-bold text-blue-600 mt-1">{stats?.stats?.activeReferralsThisMonth || 0}</p>
                  <p className="text-xs text-gray-400 mt-1">คนที่ซื้อเดือนนี้</p>
                </div>
                <div className="text-4xl">📊</div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-100">ถอนได้เลย</p>
                  <p className="text-3xl font-bold mt-1">{stats?.stats?.availableToWithdraw?.toFixed(2) || 0}฿</p>
                  <p className="text-xs text-blue-100 mt-1">คงเหลือพร้อมถอน</p>
                </div>
                <div className="text-4xl">💳</div>
              </div>
            </div>
          </div>

          {/* Commission Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-100">ค่าคอมทั้งหมด</p>
                  <p className="text-3xl font-bold mt-1">{stats?.stats?.totalCommission?.toFixed(2) || 0}฿</p>
                  <p className="text-xs text-purple-100 mt-1">รวมตลอดกาล</p>
                </div>
                <div className="text-4xl">💰</div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-100">รอถอน</p>
                  <p className="text-3xl font-bold mt-1">{stats?.stats?.pendingCommission?.toFixed(2) || 0}฿</p>
                  <p className="text-xs text-yellow-100 mt-1">พร้อมถอนได้</p>
                </div>
                <div className="text-4xl">⏳</div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-100">ถอนไปแล้ว</p>
                  <p className="text-3xl font-bold mt-1">{stats?.stats?.withdrawnCommission?.toFixed(2) || 0}฿</p>
                  <p className="text-xs text-green-100 mt-1">โอนเข้าบัญชี</p>
                </div>
                <div className="text-4xl">🏦</div>
              </div>
            </div>
          </div>

          {/* Tier System Explanation */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">🏆 ระบบระดับค่าคอมมิชชั่น</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { name: 'Bronze', icon: '🥉', min: 1, max: 10, rate: 5, color: 'from-orange-400 to-orange-600' },
                { name: 'Silver', icon: '🥈', min: 11, max: 30, rate: 7, color: 'from-gray-300 to-gray-500' },
                { name: 'Gold', icon: '🥇', min: 31, max: 50, rate: 10, color: 'from-yellow-400 to-yellow-600' },
                { name: 'Platinum', icon: '💎', min: 51, max: '∞', rate: 12, color: 'from-purple-400 to-purple-600' }
              ].map((tier) => (
                <div
                  key={tier.name}
                  className={`bg-gradient-to-br ${tier.color} rounded-xl p-4 text-white relative overflow-hidden ${
                    stats?.currentTier?.name === tier.name ? 'ring-4 ring-white shadow-2xl' : 'opacity-75'
                  }`}
                >
                  {stats?.currentTier?.name === tier.name && (
                    <div className="absolute top-2 right-2 bg-white text-xs px-2 py-1 rounded-full text-gray-800 font-bold">
                      ระดับคุณ
                    </div>
                  )}
                  <div className="text-3xl mb-2">{tier.icon}</div>
                  <h3 className="font-bold text-lg">{tier.name}</h3>
                  <p className="text-sm opacity-90 mb-2">{tier.min}-{tier.max} คน/เดือน</p>
                  <div className="text-2xl font-bold">{tier.rate}%</div>
                  <p className="text-xs opacity-75 mt-1">ค่าคอมมิชชั่น</p>
                </div>
              ))}
            </div>
            <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
              <p className="text-sm text-blue-800">
                <span className="font-bold">💰 ระบบมาตรฐาน:</span> คิดค่าคอมทุกยอดเติมเงิน ตาม % ของ Tier ที่คุณอยู่ตอนนั้น
              </p>
            </div>
          </div>

          {/* Withdraw Button */}
          <div className="mb-6">
            <button
              onClick={() => setShowWithdrawModal(true)}
              disabled={!stats?.stats?.availableToWithdraw || stats?.stats?.availableToWithdraw < 100}
              className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              💸 ถอนเงิน (ขั้นต่ำ 100฿)
            </button>
            {stats?.stats?.availableToWithdraw < 100 && (
              <p className="text-sm text-gray-500 mt-2">
                คุณต้องมีเงินอย่างน้อย 100฿ ถึงจะถอนได้ (ขาดอีก {(100 - (stats?.stats?.availableToWithdraw || 0)).toFixed(2)}฿)
              </p>
            )}
          </div>

          {/* Recent Referrals */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">👥 คนที่แนะนำล่าสุด</h2>
            {stats?.recentReferrals?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">ชื่อ</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">วันที่สมัคร</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">ยอดซื้อรวม</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentReferrals.map((ref, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">{ref.name}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {new Date(ref.joinedDate).toLocaleDateString('th-TH')}
                        </td>
                        <td className="py-3 px-4 text-sm">{ref.totalSpent}฿</td>
                        <td className="py-3 px-4">
                          {ref.isActive ? (
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                              ✓ ซื้อแล้ว
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
                              ยังไม่ซื้อ
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">ยังไม่มีคนสมัครผ่านลิงก์ของคุณ</p>
            )}
          </div>

          {/* Commission History */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">💰 ประวัติค่าคอมมิชชั่น</h2>
            {commissions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">วันที่</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">ผู้ซื้อ</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">แพ็คเกจ</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">ยอดซื้อ</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">อัตรา</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">ค่าคอม</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissions.map((comm) => (
                      <tr key={comm.commissionId} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {new Date(comm.createdAt).toLocaleDateString('th-TH')}
                        </td>
                        <td className="py-3 px-4">{comm.referredUserName}</td>
                        <td className="py-3 px-4 text-sm">{comm.packageName}</td>
                        <td className="py-3 px-4">{comm.packageAmount}฿</td>
                        <td className="py-3 px-4 text-sm">{(comm.commissionRate * 100).toFixed(0)}%</td>
                        <td className="py-3 px-4 font-semibold text-green-600">{comm.commissionAmount.toFixed(2)}฿</td>
                        <td className="py-3 px-4">
                          {comm.status === 'pending' && (
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                              รอ approve
                            </span>
                          )}
                          {comm.status === 'approved' && (
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                              อนุมัติแล้ว
                            </span>
                          )}
                          {comm.status === 'paid' && (
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                              จ่ายแล้ว
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">ยังไม่มีค่าคอมมิชชั่น</p>
            )}
          </div>
        </div>

        {/* Withdraw Modal */}
        {showWithdrawModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">💸 ถอนเงิน</h2>
              <form onSubmit={handleWithdraw}>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">จำนวนเงิน (บาท)</label>
                  <input
                    type="number"
                    value={withdrawForm.amount}
                    onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                    min="100"
                    max={stats?.stats?.availableToWithdraw}
                    step="0.01"
                    required
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 outline-none"
                    placeholder="100.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    ถอนได้สูงสุด: {stats?.stats?.availableToWithdraw?.toFixed(2)}฿
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">ธนาคาร</label>
                  <select
                    value={withdrawForm.bankName}
                    onChange={(e) => setWithdrawForm({ ...withdrawForm, bankName: e.target.value })}
                    required
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 outline-none"
                  >
                    <option value="">เลือกธนาคาร</option>
                    <option value="ธนาคารกสิกรไทย">ธนาคารกสิกรไทย</option>
                    <option value="ธนาคารกรุงเทพ">ธนาคารกรุงเทพ</option>
                    <option value="ธนาคารไทยพาณิชย์">ธนาคารไทยพาณิชย์</option>
                    <option value="ธนาคารกรุงไทย">ธนาคารกรุงไทย</option>
                    <option value="ธนาคารทหารไทยธนชาต">ธนาคารทหารไทยธนชาต</option>
                    <option value="ธนาคารกรุงศรีอยุธยา">ธนาคารกรุงศรีอยุธยา</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">เลขบัญชี</label>
                  <input
                    type="text"
                    value={withdrawForm.bankAccount}
                    onChange={(e) => setWithdrawForm({ ...withdrawForm, bankAccount: e.target.value })}
                    required
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 outline-none"
                    placeholder="xxx-x-xxxxx-x"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">ชื่อบัญชี</label>
                  <input
                    type="text"
                    value={withdrawForm.accountName}
                    onChange={(e) => setWithdrawForm({ ...withdrawForm, accountName: e.target.value })}
                    required
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 outline-none"
                    placeholder="นาย/นาง ..."
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowWithdrawModal(false)}
                    className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:shadow-lg transition"
                  >
                    ยืนยันถอนเงิน
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
