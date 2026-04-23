'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import styles from './GameScreen.module.css';

const GameCanvas = dynamic(() => import('./GameCanvas'), { ssr: false });

const SHEETS_URL = process.env.NEXT_PUBLIC_SHEETS_URL || '';

function formatTime(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(Math.floor(secs % 60)).padStart(2, '0');
  return `${m}:${s}`;
}

async function saveScore(name, timeDisplay, timeSeconds) {
  try {
    const res = await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, time: timeDisplay, timeSeconds }),
    });
    const data = await res.json();
    console.log('점수 저장 결과:', data);
  } catch (e) { console.error('점수 저장 실패:', e); }
}

async function fetchLeaderboard() {
  try {
    const res = await fetch(`/api/scores?t=${Date.now()}`, { cache: 'no-store' });
    const data = await res.json();
    console.log('리더보드:', data);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error('리더보드 실패:', e);
    return [];
  }
}

function Confetti() {
  useEffect(() => {
    import('canvas-confetti').then((m) => {
      const confetti = m.default;
      const colors = ['#a78bfa','#f59e0b','#34d399','#f87171','#60a5fa'];
      const end = Date.now() + 4500;
      const frame = () => {
        confetti({ particleCount: 4, angle: 60,  spread: 55, origin:{x:0}, colors });
        confetti({ particleCount: 4, angle: 120, spread: 55, origin:{x:1}, colors });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    });
  }, []);
  return null;
}

export default function GameScreen({ playerName, onRestart }) {
  const [phase, setPhase] = useState('countdown'); // countdown|playing|paused|gameover|victory
  const [countdown, setCountdown] = useState(3);
  const [lives, setLives] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const [redCount, setRedCount] = useState(0);
  const [finalTime, setFinalTime] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [resetKey, setResetKey] = useState(0);

  const audioRef   = useRef(null);
  const timerRef   = useRef(null);
  const phaseRef   = useRef('countdown');
  const elapsedRef = useRef(0); // ref for stale-closure-safe elapsed
  const savedScoreRef = useRef(false); // 점수 중복 저장 방지

  phaseRef.current = phase;

  // Background music
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (phase === 'playing') {
      audio.volume = 0.28; audio.loop = true;
      audio.play().catch(() => {});
    } else if (phase === 'gameover' || phase === 'victory') {
      audio.pause(); audio.currentTime = 0;
    } else if (phase === 'paused') {
      audio.pause();
    }
  }, [phase]);

  // Timer — updates both state and ref
  useEffect(() => {
    if (phase === 'playing') {
      timerRef.current = setInterval(() => {
        elapsedRef.current += 1;
        setElapsed(t => t + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [phase]);

  // Countdown 3→2→1→start
  useEffect(() => {
    if (phase !== 'countdown') return;
    setCountdown(3);
    const id = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(id); setPhase('playing'); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, resetKey]);

  // Stable callbacks — use refs to avoid stale closures
  const handleLifeLost = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    setLives(l => {
      const next = l - 1;
      if (next <= 0) setPhase('gameover');
      return next;
    });
  }, []);

  const handleRedBrickDestroyed = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    setRedCount(c => {
      const next = c + 1;
      if (next >= 3 && !savedScoreRef.current) {
        savedScoreRef.current = true;
        setPhase('victory');
        const secs = elapsedRef.current;
        const t = formatTime(secs);
        setFinalTime(t);
        saveScore(playerName, t, secs);
        fetchLeaderboard().then(setLeaderboard);
      }
      return next;
    });
  }, [playerName]);

  const handlePause  = () => { if (phase === 'playing') setPhase('paused'); };
  const handleResume = () => { if (phase === 'paused')  setPhase('playing'); };



  return (
    <div className={styles.screen}>
      <audio ref={audioRef} src="/Hyper_Speed_Run.mp3" preload="auto" />

      {/* HUD */}
      <div className={styles.hud}>
        <div className={styles.hudItem}>
          <span>👤</span><span className={styles.hudVal}>{playerName}</span>
        </div>
        <div className={styles.hudItem}>
          <span>⏱</span>
          <span className={styles.hudTimer}>{formatTime(elapsed)}</span>
        </div>
        <div className={styles.hudItem}>
          <span className={styles.redBrick}>🧱</span>
          <span className={styles.hudVal}>{redCount}/3</span>
          <span className={styles.sep}>|</span>
          {Array.from({length:3}).map((_,i)=>(
            <span key={i} style={{opacity: i<lives?1:0.2, filter:i<lives?'none':'grayscale(1)'}}>❤️</span>
          ))}
        </div>
      </div>

      {/* Canvas + Overlays */}
      <div className={styles.canvasWrap}>
        <GameCanvas
          running={phase === 'playing'}
          onLifeLost={handleLifeLost}
          onRedBrickDestroyed={handleRedBrickDestroyed}
          resetKey={resetKey}
        />

        {phase === 'countdown' && (
          <div className={styles.overlay}>
            <div className={styles.cdBox}>
              <p className={styles.cdLabel}>준비하세요!</p>
              <div className={styles.cdNum} key={countdown}>{countdown}</div>
            </div>
          </div>
        )}

        {phase === 'paused' && (
          <div className={styles.overlay}>
            <div className={styles.card}>
              <div className={styles.cardIcon}>⏸</div>
              <h2 className={styles.cardTitle}>일시 정지</h2>
              <button className={styles.btnPrimary} onClick={handleResume}>▶ 계속하기</button>
            </div>
          </div>
        )}

        {phase === 'gameover' && (
          <div className={styles.overlay}>
            <div className={styles.card}>
              <div className={styles.cardIcon}>💔</div>
              <h2 className={styles.cardTitle}>게임 미션 실패</h2>
              <p className={styles.cardMsg}>아쉽네요! 다시 도전해보세요.</p>
              <div className={styles.btnRow}>
                <button className={styles.btnPrimary} onClick={onRestart}>🔄 다시 시작</button>
              </div>
            </div>
          </div>
        )}

        {phase === 'victory' && (
          <>
            <Confetti />
            <div className={styles.overlay}>
              <div className={`${styles.card} ${styles.victoryCard}`}>
                <div className={styles.cardIcon}>🎉</div>
                <h2 className={styles.victoryTitle}>미션 성공!</h2>
                <div className={styles.timeBox}>
                  <p className={styles.timeMsg}>
                    <span className={styles.timeName}>{playerName}</span>님의 클리어 기록
                  </p>
                  <div className={styles.timeRow}>
                    <span className={styles.timeClock}>⏱</span>
                    <span className={styles.timeVal}>{finalTime}</span>
                  </div>
                  <p className={styles.timeDesc}>걸린 시간 (분 : 초)</p>
                </div>
                {leaderboard.length > 0 && (
                  <div className={styles.lb}>
                    <h3 className={styles.lbTitle}>🏆 Top 3</h3>
                    {leaderboard.map((e,i)=>(
                      <div key={i} className={`${styles.lbRow} ${e.name === playerName ? styles.lbMe : ''}`}>
                        <span>{['🥇','🥈','🥉'][i]}</span>
                        <span className={styles.lbName}>{e.name}{e.name === playerName ? ' 👈' : ''}</span>
                        <span className={styles.lbTime}>{e.time}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className={styles.btnRow}>
                  <button className={styles.btnPrimary} onClick={onRestart}>🔄 다시 시작</button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        {phase === 'playing' && <button id="pause-btn"  className={styles.ctrl} onClick={handlePause}>⏸ 멈춤</button>}
        {phase === 'paused'  && <button id="resume-btn" className={styles.ctrl} onClick={handleResume}>▶ 계속</button>}
        <button id="restart-btn" className={`${styles.ctrl} ${styles.ctrlWarn}`} onClick={onRestart}>🔄 다시 시작</button>
      </div>
    </div>
  );
}
