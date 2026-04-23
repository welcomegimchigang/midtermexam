// Next.js API Route - Apps Script 프록시
// 브라우저 → Next.js API → Apps Script (CORS 우회)

const SHEETS_URL = process.env.NEXT_PUBLIC_SHEETS_URL || '';

// timeSeconds 숫자값으로 MM:SS 재계산 (Sheets 날짜 자동변환 우회)
function secsToDisplay(secs) {
  const n = Number(secs);
  if (isNaN(n) || n < 0) return '00:00';
  const m = String(Math.floor(n / 60)).padStart(2, '0');
  const s = String(Math.floor(n % 60)).padStart(2, '0');
  return `${m}:${s}`;
}

export async function GET() {
  if (!SHEETS_URL) {
    return Response.json([]);
  }
  try {
    const res = await fetch(`${SHEETS_URL}?t=${Date.now()}`, {
      cache: 'no-store',
    });
    const text = await res.text();
    if (text.trim().startsWith('<')) {
      console.error('Apps Script HTML 응답:', text.slice(0, 200));
      return Response.json([]);
    }
    const data = JSON.parse(text);
    if (!Array.isArray(data)) return Response.json([]);

    // time 필드가 날짜로 변환됐을 경우 timeSeconds로 재계산
    const fixed = data.map(entry => ({
      name: entry.name || '',
      timeSeconds: Number(entry.timeSeconds),
      time: secsToDisplay(entry.timeSeconds), // 항상 숫자에서 재계산
    }));
    return Response.json(fixed);
  } catch (e) {
    console.error('리더보드 조회 실패:', e.message);
    return Response.json([]);
  }
}

export async function POST(request) {
  if (!SHEETS_URL) {
    return Response.json({ status: 'no-url' });
  }
  try {
    const body = await request.json();
    const res = await fetch(SHEETS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    console.log('점수 저장 응답:', text.slice(0, 100));
    return Response.json({ status: 'ok' });
  } catch (e) {
    console.error('점수 저장 실패:', e.message);
    return Response.json({ status: 'error', message: e.message });
  }
}
