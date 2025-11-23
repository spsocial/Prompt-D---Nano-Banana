// Affiliate Commission Calculator with Tier System

/**
 * Commission Tier System (Standard)
 *
 * Tier 1 (Bronze):   1-10 referrals/month    → 5%
 * Tier 2 (Silver):   11-30 referrals/month   → 7%
 * Tier 3 (Gold):     31-50 referrals/month   → 10%
 * Tier 4 (Platinum): 51+ referrals/month     → 12%
 *
 * ระบบมาตรฐาน:
 * - คิดค่าคอมทุกยอดเติมเงิน
 * - % ขึ้นอยู่กับ Tier ของนายหน้าตอนนั้น
 * - ไม่มีโบนัสพิเศษ
 */

const COMMISSION_TIERS = [
  { name: 'Bronze', minReferrals: 1, maxReferrals: 10, rate: 0.05, icon: '🥉', color: '#cd7f32' },
  { name: 'Silver', minReferrals: 11, maxReferrals: 30, rate: 0.07, icon: '🥈', color: '#c0c0c0' },
  { name: 'Gold', minReferrals: 31, maxReferrals: 50, rate: 0.10, icon: '🥇', color: '#ffd700' },
  { name: 'Platinum', minReferrals: 51, maxReferrals: Infinity, rate: 0.12, icon: '💎', color: '#e5e4e2' }
];

/**
 * คำนวณ tier ของ affiliate ตามจำนวนคนที่แนะนำในเดือนนี้
 * @param {number} activeReferralsThisMonth - จำนวนคนที่ซื้อในเดือนนี้
 * @returns {object} tier info
 */
export function getCommissionTier(activeReferralsThisMonth) {
  for (const tier of COMMISSION_TIERS) {
    if (activeReferralsThisMonth >= tier.minReferrals && activeReferralsThisMonth <= tier.maxReferrals) {
      return tier;
    }
  }
  return COMMISSION_TIERS[0]; // Default: Bronze
}

/**
 * คำนวณค่าคอมมิชชั่น (Standard - ไม่มี bonus)
 * @param {number} purchaseAmount - ยอดซื้อ (บาท)
 * @param {number} activeReferralsThisMonth - จำนวนคนที่ซื้อในเดือนนี้
 * @param {boolean} isFirstPurchase - เป็นการซื้อครั้งแรกหรือไม่ (ไม่ใช้แล้ว แต่เก็บไว้เพื่อ backward compatibility)
 * @returns {object} { commissionRate, commissionAmount, bonus, totalCommission, tier }
 */
export function calculateCommission(purchaseAmount, activeReferralsThisMonth, isFirstPurchase = false) {
  const tier = getCommissionTier(activeReferralsThisMonth);
  const commissionAmount = purchaseAmount * tier.rate;

  // ระบบมาตรฐาน: คิดแค่ % ตาม Tier เท่านั้น ไม่มี bonus
  const bonus = 0;
  const totalCommission = commissionAmount;

  return {
    commissionRate: tier.rate,
    commissionAmount: commissionAmount,
    bonus: bonus,
    totalCommission: totalCommission,
    tier: {
      name: tier.name,
      icon: tier.icon,
      color: tier.color,
      rate: tier.rate
    }
  };
}

/**
 * คำนวณจำนวนคนที่ซื้อในเดือนนี้ของ affiliate
 * @param {Array} commissions - รายการ commissions ของ affiliate
 * @returns {number} จำนวนคนที่ซื้อในเดือนนี้
 */
export function getActiveReferralsThisMonth(commissions) {
  const now = new Date();
  const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const commissionsThisMonth = commissions.filter(
    c => new Date(c.createdAt) >= firstDayThisMonth
  );

  // นับจำนวน unique users ที่ซื้อในเดือนนี้
  const uniqueUsers = new Set(commissionsThisMonth.map(c => c.referredUserId));
  return uniqueUsers.size;
}

/**
 * ดึงข้อมูล tier ทั้งหมด (สำหรับแสดงในหน้า Dashboard)
 * @returns {Array} tier list
 */
export function getAllTiers() {
  return COMMISSION_TIERS;
}

/**
 * คำนวณว่าต้องแนะนำอีกกี่คนถึง tier ถัดไป
 * @param {number} activeReferralsThisMonth - จำนวนคนที่ซื้อในเดือนนี้
 * @returns {object} { currentTier, nextTier, referralsToNextTier }
 */
export function getReferralsToNextTier(activeReferralsThisMonth) {
  const currentTier = getCommissionTier(activeReferralsThisMonth);
  const currentIndex = COMMISSION_TIERS.findIndex(t => t.name === currentTier.name);
  const nextTier = COMMISSION_TIERS[currentIndex + 1];

  if (!nextTier) {
    return {
      currentTier,
      nextTier: null,
      referralsToNextTier: 0,
      isMaxTier: true
    };
  }

  return {
    currentTier,
    nextTier,
    referralsToNextTier: nextTier.minReferrals - activeReferralsThisMonth,
    isMaxTier: false
  };
}
