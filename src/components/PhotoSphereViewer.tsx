import { useEffect, useRef } from 'react';
import { Viewer } from '@photo-sphere-viewer/core';
import { AutorotatePlugin } from '@photo-sphere-viewer/autorotate-plugin';
import '@photo-sphere-viewer/core/index.css';

export default function PhotoSphereViewerComponent({ src }: { src: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);

  useEffect(() => {
    if (!containerRef.current || !src) return;

    viewerRef.current = new Viewer({
      container: containerRef.current,
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

    // Handle potential loading errors
    viewerRef.current.addEventListener('config-error', (e) => {
      console.error('Panorama config error:', e);
    });

    viewerRef.current.addEventListener('load-error', (e) => {
      console.error('Panorama failed to load:', e);
      alert('全景图加载失败，可能是跨域策略 (CORS) 限制。建议使用本地生成的图片。');
    });

    return () => {
      viewerRef.current?.destroy();
    };
  }, [src]);

  return (
    <div className="w-full h-[600px] rounded-2xl overflow-hidden shadow-2xl border border-zinc-800/50 relative group">
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute inset-0 pointer-events-none rounded-2xl ring-1 ring-inset ring-white/10" />
    </div>
  );
}
