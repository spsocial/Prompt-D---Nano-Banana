// Utility functions for handling Thailand timezone (UTC+7)

/**
 * Get current date/time in Thailand timezone
 * @returns {Date} Date object representing current time in Thailand
 */
export function getThailandNow() {
  const now = new Date();
  // Convert to Thailand time (UTC+7)
  const thailandTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  return thailandTime;
}

/**
 * Get start of today (00:00:00) in Thailand timezone, returned as UTC
 * @returns {Date} Date object representing start of today in Thailand (UTC time)
 */
export function getThailandToday() {
  const now = getThailandNow();
  // Create date at midnight Thailand time, then convert to UTC
  const year = now.getFullYear();
  const month = now.getMonth();
  const date = now.getDate();

  // Create UTC date for Thailand midnight (Thailand is UTC+7)
  // So Thailand midnight = UTC time - 7 hours
  return new Date(Date.UTC(year, month, date, -7, 0, 0, 0));
}

/**
 * Get start of tomorrow (00:00:00) in Thailand timezone, returned as UTC
 * @returns {Date} Date object representing start of tomorrow in Thailand (UTC time)
 */
export function getThailandTomorrow() {
  const today = getThailandToday();
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return tomorrow;
}

/**
 * Get start of a specific date in Thailand timezone
 * @param {Date} date - The date to get the start of
 * @returns {Date} Date object representing start of the given date
 */
export function getThailandDayStart(date) {
  const d = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

/**
 * Get end of a specific date in Thailand timezone (23:59:59.999)
 * @param {Date} date - The date to get the end of
 * @returns {Date} Date object representing end of the given date
 */
export function getThailandDayEnd(date) {
  const d = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

/**
 * Get current month in YYYY-MM format (Thailand timezone)
 * @returns {string} Current month string
 */
export function getThailandCurrentMonth() {
  const now = getThailandNow();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Convert a date to Thailand timezone and format as YYYY-MM-DD
 * @param {Date} date - The date to format
 * @returns {string} Formatted date string
 */
export function formatThailandDate(date) {
  const d = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Get days ago date in Thailand timezone
 * @param {number} days - Number of days ago
 * @returns {Date} Date object representing the date N days ago
 */
export function getThailandDaysAgo(days) {
  const now = getThailandNow();
  const daysAgo = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return getThailandDayStart(daysAgo);
}

/**
 * Check if a date is today in Thailand timezone
 * @param {Date} date - The date to check
 * @returns {boolean} True if the date is today
 */
export function isTodayThailand(date) {
  const today = getThailandToday();
  const checkDate = getThailandDayStart(date);
  return today.getTime() === checkDate.getTime();
}
