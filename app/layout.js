import './globals.css';

export const metadata = {
  title: 'INU 벽돌깨기',
  description: '인천대학교 벽돌깨기 게임 - INU Brick Breaker',
  keywords: 'INU, 인천대학교, 벽돌깨기, 게임',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
