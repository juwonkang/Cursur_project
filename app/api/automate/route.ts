import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

type PartType = 'top' | 'bottom' | 'accessory' | string;

interface CelebrityItem {
  id?: string;
  part: PartType;
  brand: string;
  productName: string;
  price: string; // "350,000" 형식
  styleKeywords?: string[];
}

interface BudgetItem {
  id?: string;
  part: PartType;
  brand: string;
  productName: string;
  price: string; // "49,000" 형식
  styleKeywords?: string[];
  similarityScore?: number;
}

interface AutomateComparisonResponse {
  celebrityItems: CelebrityItem[];
  budgetItems: BudgetItem[];
  totalCelebPrice: number;
  totalBudgetPrice: number;
  savingAmount: number;
  savingText: string;
  captionTitle: string;
  captionHashtags: string[];
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;

    if (!imageFile) {
      return NextResponse.json(
        { error: '이미지가 제공되지 않았습니다.' },
        { status: 400 }
      );
    }

    const apiKey =
      process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API 키가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    const arrayBuffer = await imageFile.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = imageFile.type || 'image/jpeg';

    const genAI = new GoogleGenerativeAI(apiKey);

    // 사용 가능한 모델 목록 확인 시도
    let availableModels: string[] = [];
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.models && Array.isArray(data.models)) {
          availableModels = data.models
            .map((m: any) => m.name?.replace("models/", "") || "")
            .filter((name: string) => name && !name.includes("embedding"));
          console.log("사용 가능한 모델:", availableModels);
        }
      }
    } catch (error) {
      console.log("모델 목록 확인 실패, 기본 모델 목록 사용");
    }

    const prompt = `
당신은 K-패션 인스타그램 계정을 운영하는 AI 스타일리스트입니다.
이미지 속 연예인의 착장을 분석해 아래 JSON 형식으로만 답변하세요.
설명 문장은 절대 쓰지 말고, 반드시 JSON만 반환하세요.

1단계: 연예인 착장 분석
- 상의(top), 하의(bottom), 액세서리(accessory)를 중심으로 아이템을 나눕니다.
- 각 아이템에 대해 아래 정보를 만듭니다:
  - part: "top" | "bottom" | "accessory"
  - brand: 브랜드명 (모르면 "알 수 없음")
  - productName: 제품명 또는 간단한 설명
  - price: 예상 가격 (원 단위, 쉼표 포함된 문자열 예: "350,000")
  - styleKeywords: ["오버핏", "스트릿", "미니멀"] 처럼 2~4개의 스타일 키워드

2단계: 가성비 추천템 생성 (5만원 이하)
- 각 연예인 아이템마다 유사한 스타일의 가성비 대체템을 1개씩 만듭니다.
- 가성비 아이템은 아래 정보를 가집니다:
  - part: "top" | "bottom" | "accessory"
  - brand: 실제일 필요는 없지만 그럴듯한 브랜드명
  - productName: 제품명
  - price: "49,000" 이하의 문자열 (예: "39,000")
  - styleKeywords: 연예인 착장과 비슷한 키워드 2~4개
  - similarityScore: 0~100 사이 숫자 (유사도)

3단계: 가격 요약 및 캡션
- 모든 연예인 아이템 가격을 합산한 totalCelebPrice (숫자, 원 단위)
- 모든 가성비 아이템 가격을 합산한 totalBudgetPrice (숫자, 원 단위)
- savingAmount = totalCelebPrice - totalBudgetPrice (숫자)
- savingText: 예) "총 1,420,000원 절약!"
- captionTitle: 예)
  "제니 손민수템 찾았다! 150만원짜리 셔츠 3만원에 사는 법"
- captionHashtags: 한국어 해시태그 5~10개 배열 (예: ["#제니룩", "#가성비템", "#손민수", "#OOTD", "#공항패션"])

반환 형식(JSON):
{
  "celebrityItems": [
    {
      "id": "top-1",
      "part": "top",
      "brand": "브랜드명",
      "productName": "제품명",
      "price": "350,000",
      "styleKeywords": ["키워드1", "키워드2"]
    }
  ],
  "budgetItems": [
    {
      "id": "budget-top-1",
      "part": "top",
      "brand": "브랜드명",
      "productName": "가성비 제품명",
      "price": "39,000",
      "styleKeywords": ["키워드1", "키워드2"],
      "similarityScore": 92
    }
  ],
  "totalCelebPrice": 1500000,
  "totalBudgetPrice": 120000,
  "savingAmount": 1380000,
  "savingText": "총 1,380,000원 절약!",
  "captionTitle": "제니 손민수템 찾았다! 150만원짜리 셔츠 3만원에 사는 법",
  "captionHashtags": ["#제니룩", "#가성비템", "#손민수", "#OOTD", "#공항패션"]
}
`.trim();

    // 이미지 분석이 가능한 모델들을 우선 시도
    // 사용 가능한 모델이 있으면 그것을 우선 사용, 없으면 기본 목록 사용
    const modelNames = availableModels.length > 0 
      ? availableModels.filter((name: string) => 
          name.includes("flash") || name.includes("pro") || name.includes("vision")
        ).slice(0, 5)
      : [
          "gemini-2.0-flash-exp",  // 최신 실험 모델
          "gemini-1.5-flash-002",   // 버전 명시
          "gemini-1.5-flash",       // 기본
          "gemini-pro-vision",       // Vision 모델
          "gemini-pro",              // 기본 모델
        ];
    
    let result;
    let lastError;
    let triedModels: string[] = [];

    for (const modelName of modelNames) {
      if (!modelName) continue;
      triedModels.push(modelName);
      try {
        console.log(`모델 ${modelName} 시도 중...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        result = await model.generateContent({
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    data: base64Image,
                    mimeType,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
          },
        });
        console.log(`모델 ${modelName} 성공!`);
        break; // 성공하면 루프 종료
      } catch (error: any) {
        lastError = error;
        console.error(`모델 ${modelName} 실패:`, error.message);
        continue;
      }
    }

    if (!result) {
      const errorMsg = `시도한 모델들 (${triedModels.join(", ")}) 모두 실패했습니다. 
      
가능한 해결 방법:
1. Google AI Studio (https://aistudio.google.com/)에서 새 API 키 생성
2. 결제 계정 연결 (일부 모델은 유료 계정 필요)
3. 다른 지역에서 시도

에러 상세: ${lastError?.message || "알 수 없는 오류"}`;
      console.error(errorMsg, lastError);
      throw lastError || new Error(errorMsg);
    }

    const response = await result.response;
    const text = response.text();

    let parsed: AutomateComparisonResponse;
    try {
      parsed = JSON.parse(text) as AutomateComparisonResponse;
    } catch (e) {
      console.error('Failed to parse Gemini JSON response:', e, text);
      return NextResponse.json(
        { error: 'AI 응답을 해석하는 데 실패했습니다.' },
        { status: 500 }
      );
    }

    if (
      !parsed.celebrityItems ||
      !Array.isArray(parsed.celebrityItems) ||
      !parsed.budgetItems ||
      !Array.isArray(parsed.budgetItems)
    ) {
      return NextResponse.json(
        { error: 'AI 응답 형식이 올바르지 않습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('Automate API Error:', error);
    
    // 더 자세한 에러 메시지 제공
    let errorMessage = '자동 콘텐츠 생성 중 오류가 발생했습니다.';
    
    if (error?.message) {
      if (error.message.includes('API_KEY_INVALID') || error.message.includes('401')) {
        errorMessage = 'Gemini API 키가 유효하지 않습니다. API 키를 확인해주세요.';
      } else if (error.message.includes('QUOTA_EXCEEDED') || error.message.includes('429')) {
        errorMessage = 'API 사용량 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
      } else if (error.message.includes('SAFETY')) {
        errorMessage = '이미지가 안전 필터에 의해 차단되었습니다.';
      } else {
        errorMessage = `API 오류: ${error.message}`;
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

