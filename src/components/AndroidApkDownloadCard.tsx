import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { motion } from 'motion/react';
import { toFaDigits } from '../utils/format';

interface ApkInfo {
  available: boolean;
  filename: string;
  sizeBytes: number;
}

const CHUNK_BYTES = 4 * 1024 * 1024; // 4 MB chunks — works cleanly through iframe & Cloud Run limits

const IconAndroidDownload: React.FC<{ size?: number; className?: string }> = ({
  size = 18,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 4.5V15.5" />
    <path d="M7.5 11.5L12 16L16.5 11.5" />
    <path d="M5 19.5H19" />
  </svg>
);

export const AndroidApkDownloadCard: React.FC<{
  variant?: 'card' | 'compact';
}> = ({ variant = 'card' }) => {
  const [info, setInfo] = useState<ApkInfo | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (isNative) return;
    let active = true;
    fetch('/api/apk-info')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ApkInfo | null) => {
        if (active && data?.available) {
          setInfo(data);
        }
      })
      .catch(() => {
        // Ignore if preview server isn't exposing APK
      });
    return () => {
      active = false;
    };
  }, [isNative]);

  if (isNative || !info?.available) return null;

  const sizeMb = Math.round((info.sizeBytes / (1024 * 1024)) * 10) / 10;

  const startDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    setProgress(2);
    setDone(false);
    setError(null);

    try {
      const total = info.sizeBytes;
      const chunks: BlobPart[] = [];
      let loaded = 0;

      while (loaded < total) {
        const end = Math.min(total - 1, loaded + CHUNK_BYTES - 1);
        const resp = await fetch('/downloads/sofreh-test-debug.apk', {
          headers: { Range: `bytes=${loaded}-${end}` },
          credentials: 'include',
        });

        if (!resp.ok && resp.status !== 206) {
          throw new Error('دانلود فایل اندروید متوقف شد.');
        }

        const buf = await resp.arrayBuffer();
        chunks.push(buf);
        loaded += buf.byteLength;
        setProgress(Math.min(100, Math.round((loaded / total) * 100)));

        // If server ignored Range and returned the entire file in one shot, finish immediately
        if (resp.status === 200) break;
      }

      const blob = new Blob(chunks, {
        type: 'application/vnd.android.package-archive',
      });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = info.filename || 'sofreh-test-debug.apk';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 15_000);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در دانلود فایل APK');
    } finally {
      setDownloading(false);
    }
  };

  if (variant === 'compact') {
    return (
      <div className="w-full mt-3 flex flex-col items-center gap-1">
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          disabled={downloading}
          onClick={startDownload}
          data-testid="download-android-apk-btn"
          className="h-11 px-5 rounded-full liquid-glass text-[#292B25] text-xs font-extrabold flex items-center justify-center gap-2 disabled:opacity-75"
        >
          <IconAndroidDownload size={16} className="text-[#F04438]" />
          {downloading ? (
            <span className="tabular-nums-fa">
              در حال دریافت نسخه اندروید… {toFaDigits(progress)}٪
            </span>
          ) : done ? (
            <span className="text-[#68734E]">فایل APK دانلود شد — دوباره دانلود</span>
          ) : (
            <span className="tabular-nums-fa">
              دانلود نسخه اندروید (APK · {toFaDigits(sizeMb)} مگابایت)
            </span>
          )}
        </motion.button>
        {error && <span className="text-[11px] font-bold text-[#F04438]">{error}</span>}
      </div>
    );
  }

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      disabled={downloading}
      onClick={startDownload}
      data-testid="download-android-apk-card"
      className="w-full liquid-glass-card rounded-[26px] p-4 flex items-center justify-between text-right gap-3 disabled:opacity-80"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-11 h-11 rounded-full bg-[#FFF0ED] text-[#F04438] flex items-center justify-center shrink-0">
          <IconAndroidDownload size={20} />
        </span>
        <div className="min-w-0">
          <div className="font-display font-black text-base text-[#292B25]">
            دانلود اپلیکیشن اندروید (APK)
          </div>
          <div className="text-xs font-bold text-[#75746E] tabular-nums-fa truncate">
            {downloading
              ? `در حال دانلود… ${toFaDigits(progress)}٪`
              : error
                ? error
                : done
                  ? 'فایل نصب دانلود شد'
                  : `نسخه تست · ${toFaDigits(sizeMb)} مگابایت`}
          </div>
        </div>
      </div>

      <span className="px-3.5 py-1.5 rounded-full coral-glass-pill text-white text-xs font-extrabold shrink-0 tabular-nums-fa">
        {downloading ? `${toFaDigits(progress)}٪` : 'دانلود'}
      </span>
    </motion.button>
  );
};
