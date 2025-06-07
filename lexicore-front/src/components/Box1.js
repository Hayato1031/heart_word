'use client';
import dynamic from 'next/dynamic';
import { useRef, useEffect, useState } from 'react';
const Sketch = dynamic(() => import('react-p5'), { ssr: false });

export default function Box1() {
  const containerRef = useRef(null);
  const [size, setSize] = useState(300);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const w = containerRef.current.offsetWidth;
        setSize(Math.max(100, w));
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const setup = (p5, canvasParentRef) => {
    p5.createCanvas(size, size).parent(canvasParentRef);
  };
  const draw = (p5) => {
    p5.background(30);
    p5.noFill();
    p5.stroke(180, 255, 80);
    p5.rect(0, 0, size-2, size-2);
  };
  return <div ref={containerRef} style={{width: '100%', height: '100%'}}><Sketch setup={setup} draw={draw} /></div>;
} 