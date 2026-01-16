import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // API 키 확인
    const apiKey =
      process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error("Gemini API 키가 설정되지 않았습니다.");
      return NextResponse.json(
        { error: "Gemini API 키가 설정되지 않았습니다. .env.local 파일을 확인해주세요." },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const imageFile = formData.get("image") as File;

    if (!imageFile) {
      return NextResponse.json({ error: "이미지가 없습니다." }, { status: 400 });
    }

    // Gemini API 초기화
    const genAI = new GoogleGenerativeAI(apiKey);
    
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = imageFile.type || "image/jpeg";

    // AI에게 보낼 명령
    const prompt = "이 사진 속 연예인의 착장 정보(브랜드, 예상 가격)와 비슷한 스타일의 5만원 이하 가성비 아이템을 추천해줘. 반드시 한국어로 답변해줘.";

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
              role: "user",
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

    return NextResponse.json({ result: text });

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    // 더 자세한 에러 메시지 제공
    let errorMessage = "AI 분석 중 오류가 발생했습니다.";
    
    if (error?.message) {
      if (error.message.includes("API_KEY_INVALID") || error.message.includes("401")) {
        errorMessage = "Gemini API 키가 유효하지 않습니다. API 키를 확인해주세요.";
      } else if (error.message.includes("QUOTA_EXCEEDED") || error.message.includes("429")) {
        errorMessage = "API 사용량 한도를 초과했습니다. 잠시 후 다시 시도해주세요.";
      } else if (error.message.includes("SAFETY")) {
        errorMessage = "이미지가 안전 필터에 의해 차단되었습니다.";
      } else {
        errorMessage = `API 오류: ${error.message}`;
      }
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}