'use client';

import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import Image from 'next/image';
import { toPng } from 'html-to-image';

type PartType = 'top' | 'bottom' | 'accessory' | string;

interface CelebrityItem {
  id: string;
  part: PartType;
  brand: string;
  productName: string;
  price: string; // "350,000"
  styleKeywords?: string[];
}

interface BudgetItem {
  id: string;
  part: PartType;
  brand: string;
  productName: string;
  price: string; // "49,000"
  styleKeywords?: string[];
  similarityScore?: number;
}

interface ComparisonResult {
  celebrityItems: CelebrityItem[];
  budgetItems: BudgetItem[];
  totalCelebPrice: number;
  totalBudgetPrice: number;
  savingAmount: number;
  savingText: string;
  captionTitle: string;
  captionHashtags: string[];
}

interface AutomateApiResponse extends ComparisonResult {}

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [captionCopied, setCaptionCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const comparisonRef = useRef<HTMLDivElement | null>(null);

  const parsePriceToNumber = (price: string): number => {
    const num = parseInt(price.replace(/[^0-9]/g, ''), 10);
    return isNaN(num) ? 0 : num;
  };

  const formatPrice = (n: number) => n.toLocaleString() + '원';

  const handleImageSelect = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setComparison(null);
        setErrorMessage(null);
        setCaptionCopied(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageSelect(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageSelect(file);
  };

  const handleAnalyze = async () => {
    if (!imageFile || !selectedImage) return;
    setIsAnalyzing(true);
    setErrorMessage(null);
    setComparison(null);
    setCaptionCopied(false);

    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const response = await fetch('/api/automate', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const message =
          errorData?.error || '이미지 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
        throw new Error(message);
      }

      const data = (await response.json()) as AutomateApiResponse;

      // 가격 합/절약값이 없거나 이상하면 프론트에서 한 번 더 계산
      let celebTotal =
        data.totalCelebPrice ||
        data.celebrityItems.reduce(
          (sum, item) => sum + parsePriceToNumber(item.price),
          0
        );
      let budgetTotal =
        data.totalBudgetPrice ||
        data.budgetItems.reduce(
          (sum, item) => sum + parsePriceToNumber(item.price),
          0
        );
      let saving = celebTotal - budgetTotal;
      if (saving < 0) saving = 0;

      const savingText =
        data.savingText || `총 ${saving.toLocaleString()}원 절약!`;

      setComparison({
        celebrityItems: data.celebrityItems,
        budgetItems: data.budgetItems,
        totalCelebPrice: celebTotal,
        totalBudgetPrice: budgetTotal,
        savingAmount: saving,
        savingText,
        captionTitle: data.captionTitle,
        captionHashtags: data.captionHashtags,
      });
    } catch (error: any) {
      console.error('Automate analyze error:', error);
      setErrorMessage(error.message ?? '이미지 분석에 실패했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setImageFile(null);
    setComparison(null);
    setErrorMessage(null);
    setCaptionCopied(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownloadImage = async () => {
    if (!comparisonRef.current) return;
    setIsDownloading(true);
    try {
      const node = comparisonRef.current;
      // comparisonRef만 정확히 캡처 (고정 크기로)
      const dataUrl = await toPng(node, {
        cacheBust: true,
        width: 1080,
        height: 1350,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        // 스크롤바 등 불필요한 요소 제외
        includeQueryParams: false,
      });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = 'insta-comparison.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
      setErrorMessage('이미지 생성 중 오류가 발생했습니다.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyItemLink = async (item: BudgetItem) => {
    // 각 아이템별 링크 생성 (실제 쇼핑몰 링크로 대체 가능)
    const itemLink = `https://example.com/product/${encodeURIComponent(item.brand)}-${encodeURIComponent(item.productName)}?price=${item.price}`;
    const linkText = `[${item.brand}] ${item.productName}\n${item.price}\n${itemLink}`;
    
    try {
      await navigator.clipboard.writeText(linkText);
      setCaptionCopied(true);
      setTimeout(() => setCaptionCopied(false), 2000);
    } catch {
      setErrorMessage('링크 복사에 실패했습니다. 직접 선택해서 복사해주세요.');
    }
  };

  const handleCopyAllItemLinks = async () => {
    if (!comparison) return;
    
    const allLinks = comparison.budgetItems.map((item) => {
      const itemLink = `https://example.com/product/${encodeURIComponent(item.brand)}-${encodeURIComponent(item.productName)}?price=${item.price}`;
      return `[${item.brand}] ${item.productName}\n${item.price}\n${itemLink}\n`;
    }).join('\n---\n\n');
    
    try {
      await navigator.clipboard.writeText(allLinks);
      setCaptionCopied(true);
      setTimeout(() => setCaptionCopied(false), 2000);
    } catch {
      setErrorMessage('링크 복사에 실패했습니다.');
    }
  };

  const handleCopyCaption = async () => {
    if (!comparison) return;
    const caption =
      comparison.captionTitle +
      '\n\n' +
      (comparison.captionHashtags || []).join(' ');
    try {
      await navigator.clipboard.writeText(caption);
      setCaptionCopied(true);
      setTimeout(() => setCaptionCopied(false), 2000);
    } catch {
      setErrorMessage('캡션 복사에 실패했습니다. 직접 선택해서 복사해주세요.');
    }
  };

  const renderPartLabel = (part: PartType) => {
    if (part === 'top') return '상의';
    if (part === 'bottom') return '하의';
    if (part === 'accessory') return '액세서리';
    return '기타';
  };

  const renderStyleKeywords = (keywords?: string[]) => {
    if (!keywords || !keywords.length) return null;
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {keywords.map((k) => (
          <span
            key={k}
            className="px-2 py-0.5 rounded-full bg-gray-100 text-[10px] text-gray-500"
          >
            {k}
          </span>
        ))}
      </div>
    );
  };

  const totalCelebPrice = comparison?.totalCelebPrice ?? 0;
  const totalBudgetPrice = comparison?.totalBudgetPrice ?? 0;
  const savingAmount = comparison?.savingAmount ?? 0;

  const captionPreview =
    comparison &&
    (comparison.captionTitle +
      '\n\n' +
      (comparison.captionHashtags || []).join(' '));

  return (
    <main className="min-h-screen bg-white">
      {/* 상단 네비게이션 */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-50 safe-area-top">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-[#111111]">
            연예인룩 가성비 비교
          </h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 pb-20 safe-area-bottom space-y-6">
        {/* 업로드 섹션 */}
        <section>
          <h2 className="text-2xl font-bold text-[#111111] mb-2 leading-tight">
            오늘 본 그 연예인룩,
            <br />
            5만원 이하로 따라 입어볼까요?
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            캡처한 공항룩/시사회 사진을 올리면,
            <br />
            AI가 원본 룩과 가성비 대체템을 한 번에 만들어줘요.
          </p>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full border border-gray-200 rounded-2xl p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-[#ff4b96] bg-pink-50 scale-[1.02]'
                : 'bg-white hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex flex-col items-center gap-3">
              <div
                className={`p-3 rounded-full ${
                  isDragging ? 'bg-pink-100' : 'bg-gray-100'
                }`}
              >
                <svg
                  className="h-8 w-8 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <p className="text-[#111111] font-semibold text-base mb-1">
                  {isDragging
                    ? '여기에 이미지를 놓으세요'
                    : '연예인 사진을 업로드하세요'}
                </p>
                <p className="text-xs text-gray-400">
                  클릭하거나 드래그 앤 드롭 • JPG, PNG 지원
                </p>
              </div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
          />

          {selectedImage && (
            <div className="mt-4 flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 relative">
                  <Image
                    src={selectedImage}
                    alt="선택한 이미지"
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="text-xs text-gray-500">선택된 이미지</p>
                  <p className="text-sm font-medium text-[#111111]">
                    공항룩 분석 준비 완료
                  </p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                변경
              </button>
            </div>
          )}
        </section>

        {/* 분석 버튼 */}
        {selectedImage && (
          <section>
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="w-full bg-[#111111] text-white py-4 rounded-lg font-bold text-base shadow-lg hover:bg-[#333333] transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {isAnalyzing ? 'AI가 룩을 분석 중입니다...' : '가성비 대체템 찾기'}
            </button>
          </section>
        )}

        {/* 로딩 스켈레톤 */}
        {isAnalyzing && (
          <section className="space-y-3">
            <div className="h-4 w-32 skeleton rounded" />
            <div className="aspect-[4/5] skeleton rounded-2xl" />
          </section>
        )}

        {/* 비교 섹션 - 인스타용 */}
        {comparison && selectedImage && (
          <>
            <section className="flex justify-center">
              <div
                ref={comparisonRef}
                className="bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden aspect-[4/5] flex flex-col"
                style={{ 
                  width: '1080px', 
                  height: '1350px',
                  maxWidth: '100%',
                }}
              >
                <div className="flex-1 px-4 pb-4 flex flex-col">
                  <div className="grid grid-cols-2 gap-3 flex-1 mt-2">
                    {/* 왼쪽: 연예인 원본 */}
                    <div className="flex flex-col bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                      <div className="px-3 py-2 flex items-center justify-between border-b border-gray-100 bg-white">
                        <span className="text-xs font-semibold text-gray-700">
                          연예인 원본
                        </span>
                      </div>
                      <div className="flex-1 flex flex-col">
                        <div className="relative flex-1 bg-gray-100">
                          <Image
                            src={selectedImage}
                            alt="연예인 원본"
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="px-3 py-2 bg-white border-t border-gray-100">
                          <div className="mt-2 space-y-1.5 max-h-24 overflow-hidden">
                            {comparison.celebrityItems.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center gap-2"
                              >
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-900 text-white">
                                  {renderPartLabel(item.part)}
                                </span>
                                <div className="flex-1">
                                  <p className="text-[10px] font-semibold text-gray-900 line-clamp-1">
                                    {item.brand} {item.productName}
                                  </p>
                                  <p className="text-[10px] text-gray-500">
                                    {formatPrice(parsePriceToNumber(item.price))}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 오른쪽: 가성비 대체템 */}
                    <div className="flex flex-col bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                      <div className="px-3 py-2 flex items-center justify-between border-b border-gray-100 bg-white">
                        <span className="text-xs font-semibold text-gray-700">
                          가성비 대체템
                        </span>
                      </div>
                      <div className="flex-1 flex flex-col">
                        <div className="flex-1 px-3 pt-2 pb-2 space-y-1.5 overflow-hidden">
                          {comparison.budgetItems.map((item) => (
                            <div
                              key={item.id}
                              className="bg-white rounded-lg border border-gray-100 px-2.5 py-1.5"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#111111] text-white">
                                    {renderPartLabel(item.part)}
                                  </span>
                                  <span className="text-[9px] text-gray-500 uppercase font-semibold">
                                    {item.brand}
                                  </span>
                                </div>
                                {typeof item.similarityScore === 'number' && (
                                  <span className="text-[9px] text-gray-500">
                                    유사도 {Math.round(item.similarityScore)}%
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-[11px] font-semibold text-gray-900 line-clamp-2">
                                {item.productName}
                              </p>
                              <p className="mt-0.5 text-[11px] font-bold text-[#111111]">
                                {formatPrice(parsePriceToNumber(item.price))}
                              </p>
                              {renderStyleKeywords(item.styleKeywords)}
                            </div>
                          ))}
                        </div>
                        <div className="px-3 py-2 bg-white border-t border-gray-100">
                          <p className="text-[10px] text-gray-500">
                            연예인 룩과 분위기는 비슷하지만,
                            <br />
                            가격은 5만원 이하로 맞춘 가성비템
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 하단 절약 배지 */}
                  <div className="mt-3 flex items-center justify-between bg-[#111111] rounded-xl px-4 py-3 text-white">
                    <div>
                      <p className="text-[11px] text-gray-300">
                        연예인 룩 vs 가성비 템
                      </p>
                      <p className="text-sm font-bold">
                        {comparison.savingText}
                      </p>
                    </div>
                    <div className="text-right text-[11px]">
                      <p className="text-gray-400 line-through">
                        원래는 {formatPrice(totalCelebPrice)}
                      </p>
                      <p className="text-white font-semibold">
                        지금은 {formatPrice(totalBudgetPrice)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 인스타 이미지 다운로드 & 링크 */}
            <section className="space-y-3">
              <button
                onClick={handleDownloadImage}
                disabled={isDownloading}
                className="w-full bg-[#111111] text-white py-3 rounded-lg text-sm font-semibold hover:bg-[#333333] transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDownloading
                  ? '인스타용 이미지를 생성 중입니다...'
                  : '인스타 이미지 다운로드'}
              </button>

              <button
                onClick={handleCopyAllItemLinks}
                className="w-full bg-pink-500 text-white py-3 rounded-lg text-sm font-semibold hover:bg-pink-600 transition-colors active:scale-[0.98]"
              >
                {captionCopied ? '✓ 전체 링크 복사 완료' : '전체 아이템 링크 복사'}
              </button>

            </section>
          </>
        )}

        {errorMessage && (
          <p className="text-xs text-red-500 mt-2">{errorMessage}</p>
        )}
      </div>
    </main>
  );
}

