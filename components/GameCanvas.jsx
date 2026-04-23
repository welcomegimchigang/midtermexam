'use client';
import { useEffect, useRef, memo } from 'react';
import styles from './GameCanvas.module.css';

const BRICK_ROWS = 5, BRICK_COLS = 8, BRICK_GAP = 6, TOP_OFFSET = 55, SIDE_OFFSET = 14;

const COLORS = {
  lightRed:    { fill:'#ffb3b3', stroke:'#ff8080', glow:'rgba(255,80,80,0.6)'   },
  lightOrange: { fill:'#ffd5a8', stroke:'#ffb060', glow:'rgba(255,160,60,0.5)'  },
  lightYellow: { fill:'#fff9a8', stroke:'#ffe050', glow:'rgba(255,220,50,0.5)'  },
  lightBlue:   { fill:'#a8d5ff', stroke:'#60aaff', glow:'rgba(60,160,255,0.5)'  },
  lightGreen:  { fill:'#a8ffb8', stroke:'#50e070', glow:'rgba(50,220,100,0.5)'  },
  lightPurple: { fill:'#d5a8ff', stroke:'#aa60ff', glow:'rgba(160,60,255,0.5)'  },
};
const OTHER_COLORS = ['lightOrange','lightYellow','lightBlue','lightGreen','lightPurple'];

function playHitSound() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(480, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.12);
  } catch (e) {}
}

function initGameState(cw, ch) {
  const total = BRICK_ROWS * BRICK_COLS;
  const redCount = Math.round(total * 0.3);
  const colorList = Array(redCount).fill('lightRed');
  for (let i = colorList.length; i < total; i++) colorList.push(OTHER_COLORS[(i - redCount) % OTHER_COLORS.length]);
  for (let i = colorList.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [colorList[i], colorList[j]] = [colorList[j], colorList[i]];
  }
  const bw = (cw - SIDE_OFFSET * 2 - BRICK_GAP * (BRICK_COLS - 1)) / BRICK_COLS;
  const bh = Math.max(18, Math.round(bw * 0.3));
  const bricks = colorList.map((color, idx) => ({
    x: SIDE_OFFSET + (idx % BRICK_COLS) * (bw + BRICK_GAP),
    y: TOP_OFFSET + Math.floor(idx / BRICK_COLS) * (bh + BRICK_GAP),
    w: bw, h: bh, color, alive: true,
  }));
  const paddleW = Math.min(120, Math.max(80, cw * 0.16));
  const spd = Math.max(3.5, cw * 0.006);
  return {
    cw, ch,
    paddle: { x: cw/2 - paddleW/2, y: ch - 36, w: paddleW, h: 12, speed: Math.max(7, cw * 0.012) },
    ball: { x: cw/2, y: ch - 60, r: Math.max(7, Math.min(11, cw * 0.014)), vx: spd*(Math.random()>0.5?1:-1), vy: -spd },
    bricks, particles: [], ballLaunched: false,
  };
}

function drawRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}

function renderGame(ctx, gs) {
  const { cw, ch, paddle, ball, bricks, particles } = gs;
  // Background
  const bg = ctx.createLinearGradient(0,0,0,ch);
  bg.addColorStop(0,'#0d0d1f'); bg.addColorStop(1,'#0a0a15');
  ctx.fillStyle = bg; ctx.fillRect(0,0,cw,ch);
  // Grid
  ctx.strokeStyle='rgba(255,255,255,0.03)'; ctx.lineWidth=1;
  for (let x=0;x<cw;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,ch);ctx.stroke();}
  for (let y=0;y<ch;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(cw,y);ctx.stroke();}
  // Bricks
  bricks.forEach(b => {
    if (!b.alive) return;
    const col = COLORS[b.color];
    drawRoundRect(ctx,b.x,b.y,b.w,b.h,5);
    const g=ctx.createLinearGradient(b.x,b.y,b.x,b.y+b.h);
    g.addColorStop(0,col.fill); g.addColorStop(1,col.stroke);
    ctx.fillStyle=g; ctx.fill();
    ctx.strokeStyle=col.stroke; ctx.lineWidth=1.5; ctx.stroke();
  });
  // Particles
  particles.forEach(p => {
    ctx.globalAlpha=p.alpha; ctx.fillStyle=p.color;
    ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
  });
  ctx.globalAlpha=1;
  // Paddle
  const pg=ctx.createLinearGradient(paddle.x,paddle.y,paddle.x,paddle.y+paddle.h);
  pg.addColorStop(0,'#818cf8'); pg.addColorStop(1,'#4f46e5');
  drawRoundRect(ctx,paddle.x,paddle.y,paddle.w,paddle.h,6);
  ctx.fillStyle=pg; ctx.fill();
  // Ball
  const bg2=ctx.createRadialGradient(ball.x-ball.r*0.3,ball.y-ball.r*0.3,1,ball.x,ball.y,ball.r);
  bg2.addColorStop(0,'#fef3c7'); bg2.addColorStop(1,'#f59e0b');
  ctx.beginPath(); ctx.arc(ball.x,ball.y,ball.r,0,Math.PI*2);
  ctx.fillStyle=bg2; ctx.fill();
}

export default function GameCanvas({ running, onLifeLost, onRedBrickDestroyed, resetKey }) {
  const canvasRef = useRef(null);
  const wrapRef   = useRef(null);
  const rafRef    = useRef(null);
  const gsRef     = useRef(null);
  const runRef    = useRef(false);
  const keysRef   = useRef({ left: false, right: false });
  const touchRef  = useRef({ lastX: 0, active: false });
  // Stable callback refs — updated every render, never cause re-mounts
  const onLifeLostRef           = useRef(onLifeLost);
  const onRedBrickDestroyedRef  = useRef(onRedBrickDestroyed);
  useEffect(() => { onLifeLostRef.current = onLifeLost; }, [onLifeLost]);
  useEffect(() => { onRedBrickDestroyedRef.current = onRedBrickDestroyed; }, [onRedBrickDestroyed]);
  useEffect(() => { runRef.current = running; }, [running]);

  // Launch ball when game becomes running
  useEffect(() => {
    if (running && gsRef.current) gsRef.current.ballLaunched = true;
  }, [running]);

  // Reset game state when resetKey changes
  useEffect(() => {
    const canvas = canvasRef.current, wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const w = wrap.clientWidth, h = Math.round(w * 0.68);
    canvas.width = w; canvas.height = h;
    gsRef.current = initGameState(w, h);
  }, [resetKey]);

  // Main loop — runs ONCE on mount, never restarts
  useEffect(() => {
    const canvas = canvasRef.current, wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const w = wrap.clientWidth, h = Math.round(w * 0.68);
    canvas.width = w; canvas.height = h;
    gsRef.current = initGameState(w, h);
    const ctx = canvas.getContext('2d');

    const tick = () => {
      const gs = gsRef.current;
      if (gs && runRef.current) {
        const { paddle, ball, bricks, particles } = gs;
        if (keysRef.current.left)  paddle.x = Math.max(0, paddle.x - paddle.speed);
        if (keysRef.current.right) paddle.x = Math.min(gs.cw - paddle.w, paddle.x + paddle.speed);

        if (gs.ballLaunched) {
          ball.x += ball.vx; ball.y += ball.vy;
          if (ball.x - ball.r < 0)     { ball.x = ball.r;      ball.vx =  Math.abs(ball.vx); }
          if (ball.x + ball.r > gs.cw) { ball.x = gs.cw-ball.r; ball.vx = -Math.abs(ball.vx); }
          if (ball.y - ball.r < 0)     { ball.y = ball.r;      ball.vy =  Math.abs(ball.vy); }

          // Paddle collision
          if (ball.vy>0 && ball.x>paddle.x && ball.x<paddle.x+paddle.w &&
              ball.y+ball.r>paddle.y && ball.y-ball.r<paddle.y+paddle.h) {
            const hit=(ball.x-(paddle.x+paddle.w/2))/(paddle.w/2);
            const spd=Math.sqrt(ball.vx*ball.vx+ball.vy*ball.vy);
            ball.vx=spd*Math.sin(hit*60*Math.PI/180);
            ball.vy=-spd*Math.cos(hit*60*Math.PI/180);
            ball.y=paddle.y-ball.r;
          }

          // Ball out of bounds
          if (ball.y - ball.r > gs.ch) {
            onLifeLostRef.current();
            const spd=Math.max(3.5,gs.cw*0.006);
            ball.x=gs.cw/2; ball.y=gs.ch-60;
            ball.vx=spd*(Math.random()>0.5?1:-1); ball.vy=-spd;
            gs.ballLaunched=false;
            // Auto-relaunch after 1.5s if still playing
            setTimeout(()=>{ if(gsRef.current && runRef.current) gsRef.current.ballLaunched=true; },1500);
          }

          // Brick collision
          for (let i=0; i<bricks.length; i++) {
            const b=bricks[i];
            if (!b.alive) continue;
            if (ball.x+ball.r>b.x && ball.x-ball.r<b.x+b.w &&
                ball.y+ball.r>b.y && ball.y-ball.r<b.y+b.h) {
              b.alive=false; playHitSound();
              const col=COLORS[b.color];
              for (let p=0;p<8;p++) particles.push({
                x:b.x+b.w/2, y:b.y+b.h/2,
                vx:(Math.random()-.5)*4, vy:(Math.random()-.5)*4,
                r:Math.random()*3+1, color:col.fill, alpha:1,
              });
              if (b.color==='lightRed') onRedBrickDestroyedRef.current();
              if (ball.x<b.x||ball.x>b.x+b.w) ball.vx*=-1; else ball.vy*=-1;
              break;
            }
          }
          for (let i=particles.length-1;i>=0;i--) {
            const p=particles[i];
            p.x+=p.vx; p.y+=p.vy; p.vy+=0.1; p.alpha-=0.04;
            if(p.alpha<=0) particles.splice(i,1);
          }
        }
      }
      if (gs) renderGame(ctx, gs);
      rafRef.current = requestAnimationFrame(tick);
    };

    const onKeyDown=(e)=>{
      if(e.key==='ArrowLeft'){keysRef.current.left=true;e.preventDefault();}
      if(e.key==='ArrowRight'){keysRef.current.right=true;e.preventDefault();}
    };
    const onKeyUp=(e)=>{
      if(e.key==='ArrowLeft') keysRef.current.left=false;
      if(e.key==='ArrowRight') keysRef.current.right=false;
    };
    const onTouchStart=(e)=>{ touchRef.current={lastX:e.touches[0].clientX,active:true}; };
    const onTouchMove=(e)=>{
      if(!touchRef.current.active||!gsRef.current) return;
      const dx=e.touches[0].clientX-touchRef.current.lastX;
      touchRef.current.lastX=e.touches[0].clientX;
      const gs=gsRef.current;
      gs.paddle.x=Math.max(0,Math.min(gs.cw-gs.paddle.w,gs.paddle.x+dx*1.2));
      e.preventDefault();
    };
    const onTouchEnd=()=>{ touchRef.current.active=false; };
    const onResize=()=>{
      const c=canvasRef.current,wp=wrapRef.current;
      if(!c||!wp) return;
      const nw=wp.clientWidth,nh=Math.round(nw*0.68);
      c.width=nw; c.height=nh;
      gsRef.current=initGameState(nw,nh);
    };

    window.addEventListener('keydown',onKeyDown);
    window.addEventListener('keyup',onKeyUp);
    canvas.addEventListener('touchstart',onTouchStart,{passive:true});
    canvas.addEventListener('touchmove',onTouchMove,{passive:false});
    canvas.addEventListener('touchend',onTouchEnd);
    window.addEventListener('resize',onResize);
    rafRef.current=requestAnimationFrame(tick);

    return ()=>{
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown',onKeyDown);
      window.removeEventListener('keyup',onKeyUp);
      canvas.removeEventListener('touchstart',onTouchStart);
      canvas.removeEventListener('touchmove',onTouchMove);
      canvas.removeEventListener('touchend',onTouchEnd);
      window.removeEventListener('resize',onResize);
    };
  }, []); // 절대로 재실행 안 됨

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
