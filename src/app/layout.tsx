import "./globals.css";

export const metadata = {
  title: "업무 배정 보드",
  description: "드래그&드랍으로 업무를 구성원에게 할당",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
