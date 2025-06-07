'use client';
import dynamic from 'next/dynamic';
import { useRef, useEffect, useState } from 'react';
const Sketch = dynamic(() => import('react-p5'), { ssr: false });

export default function Box5() {
  const containerRef = useRef(null);
  const [size, setSize] = useState({w: 600, h: 40});

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const w = containerRef.current.offsetWidth;
        setSize({w: Math.max(120, w), h: Math.max(24, w * 0.07)});
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const setup = (p5, canvasParentRef) => {
    p5.createCanvas(size.w, size.h).parent(canvasParentRef);
  };
  const draw = (p5) => {
    p5.background(30);
    p5.noFill();
    p5.stroke(180, 255, 80);
    p5.rect(0, 0, size.w-2, size.h-2);
  };
  return <div ref={containerRef} style={{width: '100%', height: '100%'}}><Sketch setup={setup} draw={draw} /></div>;
} 