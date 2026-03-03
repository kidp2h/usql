// components/UpdateBanner.tsx
'use client';

import { useUpdater } from '@/hooks/use-updater';

export function UpdateBanner() {
  const { status, progress, version, error } = useUpdater();

  if (status === 'idle') return null;

  return (
    <div className="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg w-80 z-50">

      {status === 'available' && (
        <p>🆕 Phiên bản <strong>{version}</strong> có sẵn! Đang tải tự động...</p>
      )}

      {status === 'downloading' && (
        <>
          <p>⬇️ Đang tải... {progress}%</p>
          <div className="w-full bg-blue-400 rounded mt-2 h-2">
            <div className="bg-white h-2 rounded transition-all" style={{ width: `${progress}%` }} />
          </div>
        </>
      )}

      {status === 'downloaded' && (
        <p>✅ Tải xong! App sẽ tự cài khi bạn đóng.</p>
      )}

      {status === 'error' && (
        <p>❌ Lỗi cập nhật: {error}</p>
      )}

    </div>
  );
}