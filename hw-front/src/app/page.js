"use client";
import dynamic from 'next/dynamic';
import { useState, useRef, useEffect } from 'react';
const Sketch = dynamic(() => import('react-p5'), { ssr: false });

export default function Home() {
  const [smoothness, setSmoothness] = useState(0);
  const [angle, setAngle] = useState(0);
  const [flashProb, setFlashProb] = useState(0); // 1~100
  const [isFlashing, setIsFlashing] = useState(false);
  const flashRef = useRef(false);
  const [canvasSize, setCanvasSize] = useState({ w: 400, h: 400 });
  const [wsMessages, setWsMessages] = useState([]);
  const wsRef = useRef(null);
  const [heartPos, setHeartPos] = useState(null);
  const [echoHistory, setEchoHistory] = useState([]);
  const [corrosionHistory, setCorrosionHistory] = useState([]);
  const [gptResponse, setGptResponse] = useState("");
  const [virtueResult, setVirtueResult] = useState(null);
  const beatAudioRef = useRef(null);
  const noiseAudioRef = useRef(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const prevGreenSin = useRef(0);

  // ウィンドウリサイズでcanvasサイズを更新
  useEffect(() => {
    const updateSize = () => {
      const w = Math.min(window.innerWidth, 600);
      const h = Math.min(window.innerHeight, 600);
      setCanvasSize({ w, h });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // 1秒ごとに確率判定
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() < flashProb / 100) {
        setIsFlashing(true);
        flashRef.current = true;
        setTimeout(() => setIsFlashing(false), 180);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [flashProb]);

  useEffect(() => {
    // WebSocket接続
    const ws = new window.WebSocket('ws://localhost:4567/ws');
    wsRef.current = ws;
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (typeof data.gpt === 'string') {
          setGptResponse(data.gpt);
          return; // GPTレスポンス受信時は以降の処理をスキップ
        }
        // 新しいgpt善性判定レスポンス
        if (data.gptVirtueResult) {
          let msgForVirtue = data.gptVirtueMessage;
          if (!msgForVirtue || msgForVirtue === '') {
            if (typeof data.message === 'string' && data.message !== '') {
              msgForVirtue = data.message;
            } else {
              msgForVirtue = event.data;
            }
          }
          setVirtueResult({
            message: msgForVirtue,
            result: data.gptVirtueResult,
            pending: false
          });
          if (typeof data.gptVirtueResult.echo === 'number' && typeof data.gptVirtueResult.corrosion === 'number') {
            setSmoothness(prev => Math.min(200, prev + data.gptVirtueResult.echo));
            setFlashProb(prev => Math.min(100, prev + data.gptVirtueResult.corrosion));
          }
          return;
        }
        if (data.systemPrompt || data.from === 'client' || data.gptVirtue) {
          return;
        }
        if (typeof data.x === 'number' && typeof data.y === 'number') {
          setHeartPos({ x: data.x, y: data.y });
          return;
        }
      } catch (e) {
        // JSONでなければ無視
      }
      setWsMessages(msgs => [...msgs.slice(-49), event.data]);
      // メッセージ受信時に緑の箱へ判定中表示
      setVirtueResult({ message: event.data, result: null, pending: true });
      let msgText = event.data;
      try {
        const data = JSON.parse(event.data);
        if (typeof data.message === 'string') {
          msgText = data.message;
          setVirtueResult({ message: data.message, result: null, pending: true });
        }
      } catch {}
      callGptForVirtue(msgText);
    };
    return () => ws.close();
  }, []);

  // Echo（smoothness）とCorrosion（flashProb）の値が変化したタイミングで履歴に追加
  useEffect(() => {
    setEchoHistory(hist => {
      if (hist.length === 0 || hist[hist.length - 1] !== smoothness) {
        return [...hist.slice(-29), smoothness];
      }
      return hist;
    });
  }, [smoothness]);
  useEffect(() => {
    setCorrosionHistory(hist => {
      if (hist.length === 0 || hist[hist.length - 1] !== flashProb) {
        return [...hist.slice(-29), flashProb];
      }
      return hist;
    });
  }, [flashProb]);

  // p5.jsスケッチ内で鼓動アニメーション用の変数を管理
  let heartScale = 1;
  let scaleVelocity = 0;
  let greenPulseBase = 1;
  let greenPulseTarget = 1;
  let greenPulseCooldown = 0;
  let prevIsFlashing = useRef(false);

  const setup = (p5, canvasParentRef) => {
    p5.createCanvas(canvasSize.w, canvasSize.h, p5.WEBGL).parent(canvasParentRef);
  };

  const windowResized = (p5) => {
    p5.resizeCanvas(canvasSize.w, canvasSize.h);
  };

  const draw = (p5) => {
    p5.background('#222');
    // ライトは回転前に設定
    if (isFlashing) {
      p5.ambientLight(120, 30, 30); // 暗めの赤
      p5.directionalLight(120, 30, 30, 0, 0, -1);
      p5.pointLight(120, 30, 30, 0, 0, 400);
      p5.specularMaterial(180, 60, 60);
    } else {
      p5.ambientLight(80, 255, 80);
      p5.directionalLight(80, 255, 80, 0, 0, -1);
      p5.pointLight(80, 255, 80, 0, 0, 400);
      p5.specularMaterial(120, 255, 120);
    }
    p5.shininess(120);

    // ハートの基準サイズを画面の高さの半分に
    const baseHeartSize = canvasSize.h * 0.5;
    // 緑鼓動: sin波で周期的にスケール変化
    const period = 1200; // 1.2秒周期
    const t = p5.millis() % period;
    let greenSin = Math.sin(Math.PI * t / period);
    let greenScale = 1 + 1.5 * Math.abs(greenSin);

    // 赤点滅時はさらに大きく
    if (flashRef.current) {
      heartScale = 1.9;
      scaleVelocity = 0;
      // サウンド再生: 赤点滅時はnoise.mp3
      if (audioEnabled && noiseAudioRef.current) {
        noiseAudioRef.current.currentTime = 0;
        noiseAudioRef.current.play();
      }
      flashRef.current = false;
    } else {
      // 緑鼓動の山を超えた瞬間にbeat音
      if (audioEnabled && beatAudioRef.current && prevGreenSin.current > 0.7 && greenSin <= 0.7) {
        beatAudioRef.current.currentTime = 0;
        beatAudioRef.current.play();
      }
    }
    prevGreenSin.current = greenSin;

    // heartScaleの補間アニメーションを復元
    let target = isFlashing ? heartScale : greenScale;
    if (heartScale > target) {
      scaleVelocity += (target - heartScale) * 0.13;
      heartScale += scaleVelocity;
      scaleVelocity *= 0.7;
      if (heartScale < target) heartScale = target;
    } else if (heartScale < target) {
      scaleVelocity += (target - heartScale) * 0.13;
      heartScale += scaleVelocity;
      scaleVelocity *= 0.7;
      if (heartScale > target) heartScale = target;
    } else {
      scaleVelocity = 0;
    }

    // 赤点滅時だけ一時的にEchoを下げて描画
    const drawSmoothness = isFlashing ? Math.max(0, smoothness - 15) : smoothness;

    // ハートの描画位置を決定
    let posX = 0;
    let posY = 0;
    if (heartPos && typeof heartPos.x === 'number' && typeof heartPos.y === 'number') {
      // heartPosはcanvas左上基準、p5jsの中心座標系に変換
      posX = heartPos.x - canvasSize.w / 2;
      posY = heartPos.y - canvasSize.h / 2;
    }
    p5.push();
    p5.translate(posX, posY, 0);
    p5.rotateX(p5.PI);
    p5.rotateY(angle);
    p5.scale(heartScale * (baseHeartSize / 200)); // 200は元のハートサイズ基準
    if (drawSmoothness <= 1) {
      p5.box(80);
    } else {
      drawHeart(p5, drawSmoothness / 2);
    }
    p5.pop();
    setAngle(a => a + 0.01);
  };

  function drawHeart(p5, smoothness) {
    const depth = 40;
    const numPoints = (smoothness === 100) ? 500 : Math.max(5, smoothness * 5);
    const scaleFactor = 5;
    const heartX = t => scaleFactor * (16 * Math.pow(Math.sin(t), 3));
    const heartY = t => scaleFactor * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    let frontPoints = [];
    let backPoints = [];
    const imperfectionFactor = (100 - smoothness) / 100;
    const maxImperfectionOffset = 10;
    for (let i = 0; i < numPoints; i++) {
      const t = p5.map(i, 0, numPoints, 0, p5.TWO_PI);
      let x = heartX(t);
      let y = heartY(t);
      if (smoothness < 100) {
        const offsetX = p5.random(-maxImperfectionOffset, maxImperfectionOffset) * imperfectionFactor;
        const offsetY = p5.random(-maxImperfectionOffset, maxImperfectionOffset) * imperfectionFactor;
        x += offsetX;
        y += offsetY;
      }
      frontPoints.push(p5.createVector(x, y, -depth / 2));
      backPoints.push(p5.createVector(x, y, depth / 2));
    }
    p5.beginShape(p5.TRIANGLE_STRIP);
    for (let i = 0; i < numPoints; i++) {
      const p1 = frontPoints[i];
      const p2 = backPoints[i];
      p5.vertex(p1.x, p1.y, p1.z);
      p5.vertex(p2.x, p2.y, p2.z);
    }
    p5.vertex(frontPoints[0].x, frontPoints[0].y, frontPoints[0].z);
    p5.vertex(backPoints[0].x, backPoints[0].y, backPoints[0].z);
    p5.endShape();
    p5.beginShape();
    for (const p of frontPoints) {
      p5.vertex(p.x, p.y, p.z);
    }
    p5.endShape(p5.CLOSE);
    p5.beginShape();
    for (const p of backPoints) {
      p5.vertex(p.x, p.y, p.z);
    }
    p5.endShape(p5.CLOSE);
  }

  // 新しいgpt呼び出し関数
  async function callGptForVirtue(message) {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({
        message: message,
        gptVirtue: true
      }));
    }
  }

  // 音声ON/OFF切り替え時に自動再生許可を得る
  useEffect(() => {
    if (audioEnabled) {
      // ユーザー操作直後であれば再生許可が得られる
      if (beatAudioRef.current) {
        beatAudioRef.current.play().then(() => {
          beatAudioRef.current.pause();
          beatAudioRef.current.currentTime = 0;
        }).catch(() => {});
      }
      if (noiseAudioRef.current) {
        noiseAudioRef.current.play().then(() => {
          noiseAudioRef.current.pause();
          noiseAudioRef.current.currentTime = 0;
        }).catch(() => {});
      }
    }
  }, [audioEnabled]);

  return (
    <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#222', position: 'relative'}}>
      {/* 音声ON/OFF切り替えボタン（上部中央・目立たないデザイン） */}
      <button
        onClick={() => setAudioEnabled(v => !v)}
        style={{
          position: 'absolute',
          top: 18,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(34,34,34,0.5)',
          color: '#fff',
          border: '1px solid #888',
          borderRadius: 16,
          padding: '4px 18px',
          fontSize: 15,
          opacity: 0.65,
          zIndex: 30,
          cursor: 'pointer',
          transition: 'opacity 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = 1}
        onMouseLeave={e => e.currentTarget.style.opacity = 0.65}
        aria-label={audioEnabled ? 'Sound ON' : 'Sound OFF'}
      >
        {audioEnabled ? 'Sound ON' : 'Sound OFF'}
      </button>
      {/* WebSocketメッセージ表示（左上・全件・新着上・fade-inアニメーション） */}
      <div style={{
        position: 'absolute',
        top: 24,
        left: 24,
        background: 'rgba(34,34,34,0.85)',
        color: '#fff',
        padding: '12px 18px',
        borderRadius: 12,
        minWidth: 180,
        maxWidth: 320,
        fontSize: 16,
        zIndex: 10,
        boxShadow: '0 2px 8px #0007',
        fontFamily: 'sans-serif',
        pointerEvents: 'none',
        whiteSpace: 'pre-line',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        maxHeight: 'calc(70vh - 48px)',
        overflowY: 'auto',
        border: '1.2px solid #4caf50',
        borderRadius: 8,
      }}>
        {wsMessages.length > 0 ? (
          [...wsMessages].slice(-50).reverse().map((msg, i) => (
            <div key={wsMessages.length - 1 - i} style={{
              marginBottom: 2,
              wordBreak: 'break-word',
              opacity: 0,
              animation: 'fadein-msg 0.7s ease',
              animationFillMode: 'forwards',
              animationDelay: `${i * 0.07}s`,
            }}>{`id=${wsMessages.length - i} `}{msg}</div>
          ))
        ) : <span style={{color:'#888'}}>Messages will appear here</span>}
        <style>{`
          @keyframes fadein-msg {
            from { opacity: 0; transform: translateY(16px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
      {/* WebSocketメッセージ表示（右上・最新1件） */}
      <div style={{
        position: 'absolute',
        top: 24,
        right: 24,
        background: 'rgba(34,34,34,0.85)',
        color: '#fff',
        padding: '12px 18px',
        borderRadius: 12,
        minWidth: 180,
        maxWidth: 320,
        fontSize: 16,
        zIndex: 10,
        boxShadow: '0 2px 8px #0007',
        fontFamily: 'sans-serif',
        pointerEvents: 'none',
        whiteSpace: 'pre-line',
        border: '1.2px solid #4caf50',
      }}>
        {wsMessages.length > 0 ? (
          <div style={{marginBottom: 4, wordBreak: 'break-word'}}>{`User: ${wsMessages[wsMessages.length-1]}`}</div>
        ) : <span style={{color:'#888'}}>Messages will appear here</span>}
      </div>
      <Sketch setup={setup} draw={draw} windowResized={windowResized} />
      <audio ref={beatAudioRef} src="/sound/beat.mp3" preload="auto" />
      <audio ref={noiseAudioRef} src="/sound/noise.mp3" preload="auto" />
      {/* <div style={{marginTop: 20, color: '#fff', fontFamily: 'sans-serif', textAlign: 'center'}}>
        <label htmlFor="smoothnessInput">滑らかさ (1-200): </label>
        <input
          id="smoothnessInput"
          type="number"
          min={1}
          max={200}
          value={smoothness}
          onChange={e => setSmoothness(Math.max(1, Math.min(200, Number(e.target.value))))}
          style={{marginLeft: 10, padding: 5, border: '1px solid #ccc', borderRadius: 4, width: 50, textAlign: 'center'}}
        />
      </div>
      <div style={{marginTop: 10, color: '#fff', fontFamily: 'sans-serif', textAlign: 'center'}}>
        <label htmlFor="flashProbInput">赤点滅確率 (1-100): </label>
        <input
          id="flashProbInput"
          type="number"
          min={1}
          max={100}
          value={flashProb}
          onChange={e => setFlashProb(Math.max(1, Math.min(100, Number(e.target.value))))}
          style={{marginLeft: 10, padding: 5, border: '1px solid #ccc', borderRadius: 4, width: 50, textAlign: 'center'}}
        />
      </div> */}
      {/* 左下に滑らかさと赤点滅確率を横並びで表示するボックス */}
      <div style={{
        position: 'absolute',
        left: 24,
        bottom: 24,
        background: 'rgba(34,34,34,0.85)',
        color: '#fff',
        padding: '12px 24px',
        borderRadius: 8,
        fontSize: 18,
        zIndex: 10,
        boxShadow: '0 2px 8px #0007',
        fontFamily: 'sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 8,
        minWidth: 220,
        border: '1.2px solid #4caf50',
      }}>
        <div style={{display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 32}}>
          <span style={{color: '#4caf50'}}>Echo: <b>{smoothness}</b></span>
          <span style={{color: '#ff5252'}}>Corrosion: <b>{flashProb}</b></span>
        </div>
        {/* グラフ表示 */}
        <svg width="320" height="100" style={{marginTop: 8, background: 'rgba(0,0,0,0.08)', borderRadius: 6}}>
          {/* Echo 折れ線（緑） */}
          {echoHistory.length > 1 && (
            <polyline
              fill="none"
              stroke="#4caf50"
              strokeWidth="2"
              points={echoHistory.map((v, i) => `${16 + i * 10},${90 - v * 0.8}`).join(' ')}
            />
          )}
          {/* Corrosion 折れ線（赤） */}
          {corrosionHistory.length > 1 && (
            <polyline
              fill="none"
              stroke="#ff5252"
              strokeWidth="2"
              points={corrosionHistory.map((v, i) => `${16 + i * 10},${90 - v * 0.8}`).join(' ')}
            />
          )}
          {/* ラベル */}
          <text x="16" y="20" fontSize="14" fill="#4caf50">Echo</text>
          <text x="16" y="40" fontSize="14" fill="#ff5252">Corrosion</text>
        </svg>
      </div>
      {/* 右下に大きめのBox（仮配置用→GPTレスポンス表示用） */}
      <div style={{
        position: 'absolute',
        right: 24,
        bottom: 24,
        width: 520,
        minHeight: 400,
        maxHeight: '70vh',
        height: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        zIndex: 20,
      }}>
        {/* 上に緑の箱を追加 */}
        <div style={{
          width: '100%',
          minHeight: 40,
          height: 'auto',
          background: 'rgba(76, 175, 80, 0.85)', // 緑
          border: '1.2px solid #4caf50',
          borderRadius: 8,
          boxShadow: '0 2px 8px #0007',
          color: '#fff',
          fontFamily: 'sans-serif',
          fontSize: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          padding: '10px 0',
        }}>
          {!virtueResult ? (
            <div style={{color: '#fff', fontWeight: 'bold'}}>Waiting for virtue evaluation...</div>
          ) : virtueResult.pending ? (
            <>
              <div style={{
                fontWeight: 'bold',
                fontSize: 16,
                marginBottom: 8,
                maxWidth: '90%',
                textAlign: 'center',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>{virtueResult.message && virtueResult.message !== '' ? virtueResult.message : '(Unknown message)'}</div>
              <div style={{marginTop: 4, fontSize: 16}}>Evaluating...</div>
            </>
          ) : virtueResult.result && virtueResult.result.echo != null && virtueResult.result.corrosion != null ? (
            <>
              <div style={{
                fontWeight: 'bold',
                fontSize: 16,
                marginBottom: 18,
                maxWidth: '90%',
                textAlign: 'center',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>{virtueResult.message && virtueResult.message !== '' ? virtueResult.message : '(Unknown message)'}</div>
              <div style={{
                width: 40,
                height: 2,
                background: '#fff',
                borderRadius: 2,
                margin: '0 auto 12px auto',
              }} />
              <div style={{marginTop: 8}}>echo: {virtueResult.result.echo} / corrosion: {virtueResult.result.corrosion}</div>
            </>
          ) : (
            <div style={{color: '#ff1744', fontWeight: 'bold', textShadow: '0 0 6px #ff1744'}}>Error: Failed to get echo/corrosion values</div>
          )}
        </div>
        {/* GPTレスポンス表示用の箱 */}
        <div style={{
          width: '100%',
          flex: 1,
          minHeight: 120,
          maxHeight: 'calc(70vh - 100px)',
          background: 'rgba(255,255,255,0.08)',
          border: '1.2px solid #fff',
          borderRadius: 8,
          boxShadow: '0 2px 12px #0007',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          color: '#fff',
          fontFamily: 'sans-serif',
          textAlign: 'left',
          padding: 24,
          overflowY: 'auto',
        }}>
          {gptResponse ? (
            <div style={{
              whiteSpace: 'pre-wrap',
              width: '100%',
              height: '100%',
              overflowY: 'auto',
              fontSize: `${Math.max(14, Math.min(32, 340 / (gptResponse.length + 1)))}px`,
              lineHeight: 1.4,
              wordBreak: 'break-word',
            }}>{gptResponse}</div>
          ) : <span style={{color:'#aaa'}}>AI response will appear here</span>}
        </div>
      </div>
    </div>
  );
}
