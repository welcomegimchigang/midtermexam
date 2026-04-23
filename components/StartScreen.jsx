'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './StartScreen.module.css';

export default function StartScreen({ onStart }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [leaving, setLeaving] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [lbLoading, setLbLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/scores?t=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => { setLeaderboard(Array.isArray(data) ? data : []); })
      .catch(() => {})
      .finally(() => setLbLoading(false));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('이름을 입력해주세요!'); return; }
    setLeaving(true);
    setTimeout(() => onStart(name.trim()), 500);
  };

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className={`${styles.container} ${leaving ? styles.leaving : ''}`}>
      <div className={styles.glow1} /><div className={styles.glow2} />

      <div className={styles.layout}>
        {/* 메인 카드 */}
        <div className={styles.card}>
          <div className={styles.header}>
            <span className={styles.badge}>🏫 인천대학교</span>
            <h1 className={styles.title}>INU 벽돌깨기</h1>
            <p className={styles.subtitle}>INU Brick Breaker Challenge</p>
          </div>

          <div className={styles.mascotWrap}>
            <div className={styles.mascotGlow} />
            <Image src="/Mascot.jpg" alt="횃불이 마스코트" width={180} height={180} className={styles.mascot} priority />
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.label} htmlFor="player-name">👤 플레이어 이름</label>
            <input
              id="player-name" type="text" className={styles.input}
              placeholder="이름을 입력하세요..." value={name} maxLength={20}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              autoComplete="off"
            />
            {error && <p className={styles.error}>⚠️ {error}</p>}
            <button id="start-game-btn" type="submit" className={styles.startBtn}>
              🎮 게임 시작
            </button>
          </form>

          <div className={styles.hints}>
            <div className={styles.hint}><span>⌨️</span><span>PC: 좌우 방향키</span></div>
            <div className={styles.hint}><span>👆</span><span>모바일: 스와이프</span></div>
            <div className={styles.hint}><span>🧱</span><span>빨간 블록 3개 → 승리</span></div>
            <div className={styles.hint}><span>❤️</span><span>생명 3개</span></div>
          </div>
        </div>

        {/* 랭킹 카드 */}
        <div className={styles.rankCard}>
          <h2 className={styles.rankTitle}>🏆 Top 3 랭킹</h2>
          {lbLoading ? (
            <div className={styles.rankLoading}>불러오는 중...</div>
          ) : leaderboard.length === 0 ? (
            <div className={styles.rankEmpty}>
              <p>아직 기록이 없습니다!</p>
              <p className={styles.rankEmptySub}>첫 번째 도전자가 되어보세요 🚀</p>
            </div>
          ) : (
            <div className={styles.rankList}>
              {leaderboard.map((entry, i) => (
                <div key={i} className={`${styles.rankRow} ${i === 0 ? styles.rankFirst : ''}`}>
                  <span className={styles.rankMedal}>{medals[i]}</span>
                  <span className={styles.rankName}>{entry.name}</span>
                  <span className={styles.rankTime}>{entry.time}</span>
                </div>
              ))}
            </div>
          )}
          <p className={styles.rankSub}>빨간 블록 3개 제거 기준 · 빠른 순</p>
        </div>
      </div>

      <footer className={styles.footer}>
        <p>경제학과 &nbsp;|&nbsp; 202200722 &nbsp;|&nbsp; 정성욱</p>
        <p className={styles.footerSub}>Incheon National University © 2026</p>
      </footer>
    </div>
  );
}
