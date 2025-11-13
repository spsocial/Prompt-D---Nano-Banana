import { useState, useEffect } from 'react';
import { Clock, RefreshCw, CheckCircle, XCircle, Download, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PendingVideos({ userId }) {
  const [pendingTasks, setPendingTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [failedTasks, setFailedTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState({});

  useEffect(() => {
    if (userId) {
      loadTasks();
      // Auto-refresh every 30 seconds
      const interval = setInterval(loadTasks, 30000);
      return () => clearInterval(interval);
    }
  }, [userId]);

  const loadTasks = async () => {
    try {
      const response = await fetch(`/api/video-tasks/list?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setPendingTasks(data.pending || []);
        setCompletedTasks(data.completed || []);
        setFailedTasks(data.failed || []);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async (taskId) => {
    setChecking(prev => ({ ...prev, [taskId]: true }));
    try {
      const response = await fetch('/api/video-tasks/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Status check result:', data);

        // Reload tasks to get updated status
        await loadTasks();

        // If completed, show success message
        if (data.status === 'completed') {
          alert(`✅ วิดีโอเสร็จแล้ว!\n\n${data.videoUrl}`);
        } else if (data.status === 'failed') {
          alert(`❌ เกิดข้อผิดพลาด\n\n${data.error}`);
        } else {
          alert('⏳ วิดีโอยังกำลังสร้างอยู่ กรุณารอสักครู่');
        }
      }
    } catch (error) {
      console.error('Error checking status:', error);
      alert('❌ ไม่สามารถเช็คสถานะได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setChecking(prev => ({ ...prev, [taskId]: false }));
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('th-TH', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  if (pendingTasks.length === 0 && completedTasks.length === 0 && failedTasks.length === 0) {
    return null; // Don't show anything if no pending/completed/failed tasks
  }

  return (
    <div className="space-y-4">
      {/* Pending Tasks */}
      {pendingTasks.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-yellow-800 mb-3 flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            วิดีโอที่กำลังสร้าง ({pendingTasks.length})
          </h3>
          <div className="space-y-2">
            {pendingTasks.map((task) => (
              <div
                key={task.id}
                className="bg-white rounded-lg p-3 flex items-center justify-between"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {task.prompt || 'Image to video'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {task.model} • {task.duration}s • {task.aspectRatio}
                    <span className="ml-2">สร้างเมื่อ {formatDate(task.createdAt)}</span>
                  </p>
                </div>
                <button
                  onClick={() => checkStatus(task.taskId)}
                  disabled={checking[task.taskId]}
                  className="ml-3 px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-300 text-white rounded-lg text-sm flex items-center transition-colors"
                >
                  {checking[task.taskId] ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-1" />
                      เช็คสถานะ
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Tasks (last 24h) */}
      {completedTasks.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-green-800 mb-3 flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            วิดีโอที่เสร็จแล้ว (24 ชม.ที่ผ่านมา)
          </h3>
          <div className="space-y-2">
            {completedTasks.map((task) => (
              <div
                key={task.id}
                className="bg-white rounded-lg p-3 flex items-center justify-between"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {task.prompt || 'Image to video'}
                  </p>
                  <p className="text-xs text-gray-500">
                    เสร็จเมื่อ {formatDate(task.updatedAt)}
                  </p>
                </div>
                {task.videoUrl && (
                  <a
                    href={task.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-3 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm flex items-center transition-colors"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    ดาวน์โหลด
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Failed Tasks */}
      {failedTasks.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-red-800 mb-3 flex items-center">
            <XCircle className="h-5 w-5 mr-2" />
            วิดีโอที่ล้มเหลว (เครดิตถูกคืนแล้ว)
          </h3>
          <div className="space-y-2">
            {failedTasks.map((task) => (
              <div
                key={task.id}
                className="bg-white rounded-lg p-3"
              >
                <p className="text-sm font-medium text-gray-800 truncate">
                  {task.prompt || 'Image to video'}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  {task.error || 'Unknown error'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  ล้มเหลวเมื่อ {formatDate(task.updatedAt)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
