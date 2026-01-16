# 옷 정보 분석기

사진 속 옷의 특징을 AI로 분석해주는 웹 애플리케이션입니다.

## 기능

- 이미지 업로드 (JPG, PNG 지원)
- 이미지 미리보기
- Gemini AI를 활용한 옷 정보 분석 (종류, 색상, 스타일)
- 모바일 퍼스트 반응형 디자인

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example` 파일을 `.env`로 복사하고 Gemini API 키를 설정하세요.

```bash
cp .env.example .env
```

`.env` 파일에 Gemini API 키를 입력하세요:

```
GEMINI_API_KEY=your_api_key_here
```

**Gemini API 키 발급 방법:**
1. [Google AI Studio](https://makersuite.google.com/app/apikey)에 접속
2. API 키 생성
3. 생성된 키를 `.env` 파일에 입력

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 기술 스택

- **Next.js 14** - React 프레임워크
- **TypeScript** - 타입 안정성
- **Tailwind CSS** - 스타일링
- **Google Gemini AI** - 이미지 분석

## 프로젝트 구조

```
.
├── app/
│   ├── api/
│   │   └── analyze/
│   │       └── route.ts      # Gemini API 호출
│   ├── globals.css           # 전역 스타일
│   ├── layout.tsx            # 레이아웃
│   └── page.tsx              # 메인 페이지
├── .env.example              # 환경 변수 예제
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## 사용 방법

1. 메인 화면에서 이미지 업로드 영역을 클릭하거나 드래그하여 이미지를 선택합니다.
2. 업로드된 이미지가 미리보기로 표시됩니다.
3. "분석하기" 버튼을 클릭합니다.
4. AI가 옷의 종류, 색상, 스타일을 분석하여 결과를 보여줍니다.
5. "새 이미지 업로드" 버튼으로 다른 이미지를 분석할 수 있습니다.

## 빌드

프로덕션 빌드를 위해:

```bash
npm run build
npm start
```

## 라이선스

MIT
