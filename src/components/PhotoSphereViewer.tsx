import { useEffect, useRef } from 'react';
import { Viewer } from '@photo-sphere-viewer/core';
import '@photo-sphere-viewer/core/index.css';

export default function PhotoSphereViewerComponent({ src }: { src: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);

  useEffect(() => {
    if (!containerRef.current || !src) return;

    viewerRef.current = new Viewer({
      container: containerRef.current,
      panorama: src,
      navbar: ['zoom', 'move', 'download', 'fullscreen'],
    });

    return () => {
      viewerRef.current?.destroy();
    };
  }, [src]);

  return <div ref={containerRef} className="w-full h-[500px] rounded-lg overflow-hidden" />;
}
