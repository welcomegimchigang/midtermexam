'use client';
import { useState, useEffect, useMemo } from 'react';
import StartScreen from './StartScreen';
import GameScreen from './GameScreen';
import styles from './GameApp.module.css';

export default function GameApp() {
  const [screen, setScreen] = useState('start'); // 'start' | 'game'
  const [playerName, setPlayerName] = useState('');
  const [stars, setStars] = useState([]);

  useEffect(() => {
    setStars(
      Array.from({ length: 60 }).map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        delay: `${Math.random() * 3}s`,
        duration: `${1.5 + Math.random() * 2}s`,
        width: `${1 + Math.random() * 2}px`,
        height: `${1 + Math.random() * 2}px`,
      }))
    );
  }, []);

  const handleStart = (name) => {
    setPlayerName(name);
    setScreen('game');
  };

  const handleRestart = () => {
    setPlayerName('');
    setScreen('start');
  };

  return (
    <div className={styles.app}>
      {/* Background stars */}
      <div className={styles.stars}>
        {stars.map((s) => (
          <div
            key={s.id}
            className={styles.star}
            style={{
              left: s.left,
              top: s.top,
              animationDelay: s.delay,
              animationDuration: s.duration,
              width: s.width,
              height: s.height,
            }}
          />
        ))}
      </div>

      {screen === 'start' && (
        <StartScreen onStart={handleStart} />
      )}
      {screen === 'game' && (
        <GameScreen playerName={playerName} onRestart={handleRestart} />
      )}
    </div>
  );
}
