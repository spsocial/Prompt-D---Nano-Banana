import AdminSettings from '../components/AdminSettings';

export default function AdminPage() {
  // Just render AdminSettings directly - it has its own authentication
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <AdminSettings />
      </div>
    </div>
  );
}