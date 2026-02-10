# task-allocator (드래그&드랍 업무 배정)

## 1) 로컬 실행
1. Node.js 설치 확인: `node -v`
2. 의존성 설치:
   ```bash
   npm install
   ```
3. (선택) Firebase를 쓰려면 `.env.local` 파일을 만들고 아래 값을 채우세요.
   - Firebase Console → Project Settings → Web App 설정값
   ```bash
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
   NEXT_PUBLIC_FIREBASE_APP_ID=...
   ```
4. 실행:
   ```bash
   npm run dev
   ```
   브라우저에서 http://localhost:3000 열기

> Firebase 설정을 안 하면, "데모 모드(브라우저 메모리)"로 동작합니다.
> 즉, 새로고침하면 데이터가 초기화됩니다.

## 2) 링크로 공유(배포)
가장 쉬운 배포는 Vercel:
- GitHub에 올린 뒤 Vercel에서 Import
- Vercel Environment Variables에 `.env.local` 값을 동일하게 등록
- 배포 후 URL이 생기면 `/w/<workspaceId>` 형태로 공유

예: `https://yourapp.vercel.app/w/demo-team-2026`

## 3) 사용법
- 왼쪽 업무를 드래그해서 오른쪽 구성원 폴더에 드롭 → 할당
- 구성원 카드에서 요일별 가용시간(분)을 수정하고 저장
- 남은 시간이 부족하면 드롭이 거부됩니다.
