import { useEffect, useState } from 'react';

type UpdateStatus = 'idle' | 'available' | 'downloading' | 'downloaded' | 'error';

export function useUpdater() {
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [version, setVersion] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const w = window.updater;
    if (!w) return; // Không chạy trong browser

    w.onUpdateAvailable((info: any) => {
      setVersion(info.version);
      setStatus('available');
    });

    w.onDownloadProgress((p: any) => {
      setProgress(Math.round(p.percent));
      setStatus('downloading');
    });

    w.onUpdateDownloaded(() => setStatus('downloaded'));
    w.onError((msg: string) => {
      setError(msg);
      setStatus('error');
    });
  }, []);

  return {
    status, progress, version, error,
    startDownload: () => window.updater.startDownload(),
    installUpdate: () => window.updater.installUpdate(),
  };
}