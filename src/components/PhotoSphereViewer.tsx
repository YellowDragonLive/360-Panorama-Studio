import { useEffect, useRef, useState } from 'react';
import { Viewer } from '@photo-sphere-viewer/core';
import { AutorotatePlugin } from '@photo-sphere-viewer/autorotate-plugin';
import { Loader2, AlertCircle } from 'lucide-react';
import '@photo-sphere-viewer/core/index.css';

export default function PhotoSphereViewerComponent({ src }: { src: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !src) return;

    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    // Destroy existing viewer instance immediately when src changes
    if (viewerRef.current) {
      viewerRef.current.destroy();
      viewerRef.current = null;
    }

    const preloadImage = async (url: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('图片加载失败'));
        img.src = url;
      });
    };

    const initViewer = async () => {
      try {
        // Wait for image to be fully loaded in browser memory
        await preloadImage(src);
        
        if (isCancelled) return;

        viewerRef.current = new Viewer({
          container: containerRef.current!,
          panorama: src,
          touchmoveTwoFingers: false,
          mousewheel: true,
          navbar: ['autorotate', 'zoom', 'move', 'download', 'fullscreen'],
          plugins: [
            [AutorotatePlugin, {
              autostartDelay: 1000,
              autostartOnIdle: true,
              autorotateSpeed: '1rpm',
            }]
          ]
        });

        viewerRef.current.addEventListener('ready', () => {
          if (!isCancelled) setIsLoading(false);
        }, { once: true });

        viewerRef.current.addEventListener('load-error', (e) => {
          console.error('Panorama load error:', e);
          if (!isCancelled) {
            setError('全景图渲染失败，请检查图片格式或跨域设置。');
            setIsLoading(false);
          }
        });

      } catch (err: any) {
        console.error('Failed to init PhotoSphereViewer:', err);
        if (!isCancelled) {
          setError(err.message || '加载全景图时出错');
          setIsLoading(false);
        }
      }
    };

    initViewer();

    return () => {
      isCancelled = true;
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [src]);

  return (
    <div className="w-full h-[600px] rounded-2xl overflow-hidden shadow-2xl border border-zinc-800/50 relative group bg-zinc-950">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-sm transition-opacity duration-300">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
          <p className="text-zinc-400 text-sm font-medium animate-pulse">正在准备 360° 环境...</p>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-zinc-950/90 p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h3 className="text-white font-bold mb-2">加载出错了</h3>
          <p className="text-zinc-400 text-sm max-w-xs mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm transition-colors border border-zinc-700"
          >
            刷新页面
          </button>
        </div>
      )}

      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute inset-0 pointer-events-none rounded-2xl ring-1 ring-inset ring-white/10" />
    </div>
  );
}

