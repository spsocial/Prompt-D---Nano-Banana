import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Cog,
  Lock,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  ChevronLeft
} from 'lucide-react';

export default function AdminSettings() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [adminKey, setAdminKey] = useState('');

  // Settings state
  const [settings, setSettings] = useState({
    geminiApiKey: '',
    replicateApiKey: '',
    adminPassword: '',
    maxCreditsPerUser: 100,
    enableAnalytics: true,
    enableMockMode: false
  });
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    // Check if already authenticated from sessionStorage
    const storedKey = sessionStorage.getItem('admin_key');
    if (storedKey) {
      setAdminKey(storedKey);
      setIsAuthenticated(true);
      loadSettings();
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Simple password check
    const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'nano@admin2024';

    if (password === ADMIN_PASSWORD) {
      const key = 'nano-admin-2024';
      setAdminKey(key);
      sessionStorage.setItem('admin_key', key);
      setIsAuthenticated(true);
      loadSettings();
    } else {
      setError('รหัสผ่านไม่ถูกต้อง');
    }

    setLoading(false);
  };

  const loadSettings = async () => {
    try {
      // Load settings from environment or localStorage
      const savedSettings = localStorage.getItem('admin_settings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      } else {
        // Load from environment variables
        setSettings({
          geminiApiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '',
          replicateApiKey: process.env.NEXT_PUBLIC_REPLICATE_API_KEY || '',
          adminPassword: '',
          maxCreditsPerUser: 100,
          enableAnalytics: true,
          enableMockMode: false
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSaveSettings = async () => {
    setSaveStatus('saving');

    try {
      // Save to localStorage
      localStorage.setItem('admin_settings', JSON.stringify(settings));

      // If API keys changed, update in Zustand store
      if (window.useStore) {
        const store = window.useStore.getState();
        store.setApiKeys({
          gemini: settings.geminiApiKey,
          replicate: settings.replicateApiKey,
          openai: ''
        });
      }

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveStatus('error');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_key');
    setIsAuthenticated(false);
    setAdminKey('');
    setPassword('');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-2xl">
            <div className="flex justify-center mb-6">
              <div className="p-3 bg-purple-500/20 rounded-full">
                <Lock className="w-8 h-8 text-purple-300" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-white text-center mb-6">
              Admin Settings
            </h1>

            <form onSubmit={handleLogin}>
              <div className="mb-6">
                <label className="block text-purple-200 text-sm font-medium mb-2">
                  รหัสผ่านแอดมิน
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-purple-400/30 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:border-purple-400"
                    placeholder="กรอกรหัสผ่าน"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-300 hover:text-purple-200"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors disabled:opacity-50"
              >
                {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
              </button>
            </form>

            <button
              onClick={() => router.push('/')}
              className="mt-4 w-full py-2 text-purple-300 hover:text-purple-200 transition-colors flex items-center justify-center gap-2"
            >
              <ChevronLeft size={20} />
              กลับหน้าหลัก
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-pink-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 mb-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Cog className="w-6 h-6 text-purple-300" />
                </div>
                <h1 className="text-2xl font-bold text-white">Admin Settings</h1>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-4 py-2 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-colors"
                >
                  Dashboard
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors"
                >
                  ออกจากระบบ
                </button>
              </div>
            </div>
          </div>

          {/* API Settings */}
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 mb-6 shadow-2xl">
            <h2 className="text-xl font-semibold text-white mb-4">API Configuration</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-purple-200 text-sm font-medium mb-2">
                  Gemini API Key
                </label>
                <input
                  type="password"
                  value={settings.geminiApiKey}
                  onChange={(e) => setSettings({...settings, geminiApiKey: e.target.value})}
                  className="w-full px-4 py-2 bg-white/10 border border-purple-400/30 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:border-purple-400"
                  placeholder="AIzaSy..."
                />
              </div>

              <div>
                <label className="block text-purple-200 text-sm font-medium mb-2">
                  Replicate API Key (Optional)
                </label>
                <input
                  type="password"
                  value={settings.replicateApiKey}
                  onChange={(e) => setSettings({...settings, replicateApiKey: e.target.value})}
                  className="w-full px-4 py-2 bg-white/10 border border-purple-400/30 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:border-purple-400"
                  placeholder="r8_..."
                />
              </div>
            </div>
          </div>

          {/* System Settings */}
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 mb-6 shadow-2xl">
            <h2 className="text-xl font-semibold text-white mb-4">System Settings</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-purple-200 text-sm font-medium mb-2">
                  Max Credits Per User
                </label>
                <input
                  type="number"
                  value={settings.maxCreditsPerUser}
                  onChange={(e) => setSettings({...settings, maxCreditsPerUser: parseInt(e.target.value) || 100})}
                  className="w-full px-4 py-2 bg-white/10 border border-purple-400/30 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enableAnalytics}
                    onChange={(e) => setSettings({...settings, enableAnalytics: e.target.checked})}
                    className="w-5 h-5 rounded border-purple-400/30 bg-white/10 text-purple-500 focus:ring-purple-500"
                  />
                  <span className="text-purple-200">Enable Analytics Tracking</span>
                </label>
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enableMockMode}
                    onChange={(e) => setSettings({...settings, enableMockMode: e.target.checked})}
                    className="w-5 h-5 rounded border-purple-400/30 bg-white/10 text-purple-500 focus:ring-purple-500"
                  />
                  <span className="text-purple-200">Enable Mock Mode (for testing)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 mb-6 shadow-2xl">
            <h2 className="text-xl font-semibold text-white mb-4">Security</h2>

            <div>
              <label className="block text-purple-200 text-sm font-medium mb-2">
                Change Admin Password
              </label>
              <input
                type="password"
                value={settings.adminPassword}
                onChange={(e) => setSettings({...settings, adminPassword: e.target.value})}
                className="w-full px-4 py-2 bg-white/10 border border-purple-400/30 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:border-purple-400"
                placeholder="ใส่รหัสผ่านใหม่ (เว้นว่างถ้าไม่ต้องการเปลี่ยน)"
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-4">
            {saveStatus && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                saveStatus === 'saved' ? 'bg-green-500/20 text-green-300' :
                saveStatus === 'saving' ? 'bg-yellow-500/20 text-yellow-300' :
                'bg-red-500/20 text-red-300'
              }`}>
                {saveStatus === 'saved' ? <CheckCircle size={20} /> :
                 saveStatus === 'saving' ? <AlertCircle size={20} /> :
                 <AlertCircle size={20} />}
                <span>
                  {saveStatus === 'saved' ? 'บันทึกสำเร็จ' :
                   saveStatus === 'saving' ? 'กำลังบันทึก...' :
                   'เกิดข้อผิดพลาด'}
                </span>
              </div>
            )}

            <button
              onClick={handleSaveSettings}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors"
            >
              บันทึกการตั้งค่า
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}