import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const apiKey =
      process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "API 키가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // 사용 가능한 모델들을 테스트
    const modelNames = [
      "gemini-pro-vision",
      "gemini-pro",
      "gemini-1.5-flash",
      "gemini-1.5-pro",
    ];

    const results: Record<string, { available: boolean; error?: string }> = {};

    for (const modelName of modelNames) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        // 간단한 테스트 요청
        await model.generateContent({
          contents: [{ role: "user", parts: [{ text: "test" }] }],
        });
        results[modelName] = { available: true };
      } catch (error: any) {
        results[modelName] = {
          available: false,
          error: error.message || "Unknown error",
        };
      }
    }

    return NextResponse.json({
      message: "모델 가용성 확인 완료",
      results,
      recommendation: Object.entries(results)
        .find(([_, result]) => result.available)?.[0] || "사용 가능한 모델이 없습니다.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "모델 확인 중 오류 발생" },
      { status: 500 }
    );
  }
}
