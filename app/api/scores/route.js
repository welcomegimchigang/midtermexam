// Next.js API Route - Apps Script 프록시
// 브라우저 → Next.js API → Apps Script (CORS 우회)

const SHEETS_URL = process.env.NEXT_PUBLIC_SHEETS_URL || '';

export async function GET() {
  if (!SHEETS_URL) {
    return Response.json([]);
  }
  try {
    const res = await fetch(`${SHEETS_URL}?t=${Date.now()}`, {
      cache: 'no-store',
    });
    const text = await res.text();
    // HTML 에러페이지 방어
    if (text.trim().startsWith('<')) {
      console.error('Apps Script HTML 응답:', text.slice(0, 200));
      return Response.json([]);
    }
    const data = JSON.parse(text);
    return Response.json(Array.isArray(data) ? data : []);
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
