'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { toPng } from 'html-to-image';

// --- 타입 정의 ---
type PartType = 'top' | 'bottom' | 'accessory' | string;
interface CelebrityItem { id: string; part: PartType; brand: string; productName: string; price: string; }
interface BudgetItem { id: string; part: PartType; brand: string; productName: string; price: string; similarityScore?: number; }
interface ComparisonResult { celebrityItems: CelebrityItem[]; budgetItems: BudgetItem[]; totalCelebPrice: number; totalBudgetPrice: number; savingText: string; }

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null); // 복사 상태 확인용

  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  const parsePriceToNumber = (p: string) => parseInt(p.replace(/[^0-9]/g, ''), 10) || 0;
  const formatPrice = (n: number) => n.toLocaleString() + '원';
  const renderPartLabel = (p: PartType) => p === 'top' ? '상의' : p === 'bottom' ? '하의' : p === 'accessory' ? '액세서리' : '기타';

  const handleImageSelect = (file: File) => {
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setSelectedImage(reader.result as string);
    reader.readAsDataURL(file);
    setComparison(null);
  };

  const handleAnalyze = async () => {
    if (!imageFile) return;
    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      const res = await fetch('/api/automate', { method: 'POST', body: formData });
      const data = await res.json();
      setComparison(data);
    } catch (e) { setErrorMessage('분석 실패'); }
    finally { setIsAnalyzing(false); }
  };

  // --- 개별 아이템 링크 복사 함수 ---
  const handleCopyItemLink = async (item: BudgetItem) => {
    // 실제 서비스 시 item.id 등을 활용한 쇼핑몰 상세 페이지 URL로 대체하세요
    const dummyLink = `https://shopping-mall.com/product/${item.id}`;
    const textToCopy = `[${item.brand}] ${item.productName}\n가격: ${item.price}\n구매링크: ${dummyLink}`;
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedItemId(item.id);
      setTimeout(() => setCopiedItemId(null), 2000); // 2초 후 상태 초기화
    } catch (err) {
      alert('링크 복사에 실패했습니다.');
    }
  };

  const handleDownloadImage = async () => {
    if (!exportRef.current) return;
    setIsDownloading(true);
    try {
      const dataUrl = await toPng(exportRef.current, {
        width: 1080,
        height: 1350,
        pixelRatio: 1,
        backgroundColor: '#ffffff',
      });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `ootd-comparison.png`;
      link.click();
    } catch (e) { setErrorMessage('저장 실패'); }
    finally { setIsDownloading(false); }
  };

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        <h1 className="text-2xl font-black text-center mb-8">연예인룩 가성비 비교</h1>
        
        {!comparison && (
          <div onClick={() => fileInputRef.current?.click()} className="w-full aspect-square border-2 border-dashed border-gray-300 rounded-3xl flex items-center justify-center bg-white overflow-hidden relative cursor-pointer">
            {selectedImage ? <Image src={selectedImage} alt="preview" fill className="object-cover" /> : <span className="text-gray-400">사진 업로드</span>}
            <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageSelect(e.target.files[0])} />
          </div>
        )}

        {selectedImage && !comparison && (
          <button onClick={handleAnalyze} disabled={isAnalyzing} className="w-full bg-black text-white py-4 rounded-2xl font-bold transition-opacity disabled:opacity-50">
            {isAnalyzing ? 'AI 분석 중...' : '결과 보기'}
          </button>
        )}

        {comparison && selectedImage && (
          <div className="space-y-4">
            <div className="w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 p-4 space-y-4">
               <div className="flex justify-between gap-2 h-64">
                  <div className="w-1/2 relative rounded-xl overflow-hidden bg-gray-100">
                    <Image src={selectedImage} fill className="object-cover" alt="celeb" />
                  </div>
                  {/* 가성비 리스트 UI (복사 버튼 추가됨) */}
                  <div className="w-1/2 space-y-2 overflow-y-auto pr-1">
                    {comparison.budgetItems.map(item => (
                      <div key={item.id} className="bg-gray-50 p-2 rounded-lg border border-gray-100 relative group">
                        <p className="text-[10px] font-bold text-pink-500">{item.brand}</p>
                        <p className="text-[11px] font-bold truncate">{item.productName}</p>
                        <p className="text-[12px] font-black">{formatPrice(parsePriceToNumber(item.price))}</p>
                        {/* 링크 복사 버튼 */}
                        <button 
                          onClick={() => handleCopyItemLink(item)}
                          className={`mt-1 w-full text-[10px] py-1 rounded transition-colors ${copiedItemId === item.id ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                        >
                          {copiedItemId === item.id ? '복사 완료! ✓' : '링크 복사'}
                        </button>
                      </div>
                    ))}
                  </div>
               </div>
               <div className="bg-black p-4 rounded-xl text-white">
                  <p className="text-xs text-gray-400">총 절약 금액</p>
                  <p className="text-xl font-black text-pink-500">{comparison.savingText}</p>
               </div>
            </div>

            <button onClick={handleDownloadImage} disabled={isDownloading} className="w-full bg-pink-500 text-white py-4 rounded-2xl font-bold shadow-lg active:scale-95 transition-transform">
              {isDownloading ? '이미지 생성 중...' : '인스타용 고화질 이미지 저장'}
            </button>
            <button onClick={() => setComparison(null)} className="w-full text-gray-400 text-sm">다시 하기</button>
          </div>
        )}
      </div>

      {/* 저장 전용 숨겨진 템플릿 (기존 유지) */}
      {comparison && selectedImage && (
        <div style={{ position: 'absolute', left: '-9999px', top: '0' }}>
          <div ref={exportRef} style={{ width: '1080px', height: '1350px', backgroundColor: 'white', display: 'flex', flexDirection: 'column', padding: '60px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px', borderBottom: '4px solid black', paddingBottom: '20px' }}>
              <span style={{ fontSize: '40px', fontWeight: '900' }}>CELEB ORIGIN</span>
              <span style={{ fontSize: '40px', fontWeight: '900', color: '#ec4899' }}>BUDGET PICK</span>
            </div>
            <div style={{ flex: 1, display: 'flex', gap: '40px', minHeight: '0' }}>
              <div style={{ width: '480px', position: 'relative', borderRadius: '30px', overflow: 'hidden', backgroundColor: '#f3f4f6' }}>
                <img src={selectedImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="celeb" />
                <div style={{ position: 'absolute', bottom: 0, width: '100%', padding: '20px', background: 'linear-gradient(transparent, rgba(0,0,0,0.5))', color: 'white' }}>
                   {comparison.celebrityItems.slice(0,3).map(i => (
                     <p key={i.id} style={{ fontSize: '18px', margin: '5px 0' }}>• {i.brand}</p>
                   ))}
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '25px', justifyContent: 'center' }}>
                {comparison.budgetItems.slice(0, 4).map(item => (
                  <div key={item.id} style={{ backgroundColor: 'white', borderRadius: '25px', padding: '35px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', border: '2px solid #f3f4f6' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                      <span style={{ background: '#ec4899', color: 'white', padding: '8px 20px', borderRadius: '50px', fontSize: '18px', fontWeight: 'bold' }}>{renderPartLabel(item.part)}</span>
                      <span style={{ fontSize: '20px', color: '#9ca3af' }}>유사도 {Math.round(item.similarityScore || 90)}%</span>
                    </div>
                    <p style={{ fontSize: '22px', fontWeight: 'bold', color: '#6b7280', marginBottom: '8px' }}>{item.brand}</p>
                    <p style={{ fontSize: '28px', fontWeight: '900', marginBottom: '10px' }}>{item.productName}</p>
                    <p style={{ fontSize: '32px', fontStyle: 'italic', fontWeight: '900', color: '#ec4899' }}>{formatPrice(parsePriceToNumber(item.price))}</p>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ marginTop: '50px', backgroundColor: 'black', borderRadius: '40px', padding: '50px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' }}>
               <div>
                 <p style={{ fontSize: '24px', color: '#9ca3af', fontWeight: 'bold', marginBottom: '10px' }}>TOTAL SAVINGS</p>
                 <p style={{ fontSize: '64px', fontWeight: '900', color: '#ec4899', letterSpacing: '-2px' }}>{comparison.savingText}</p>
               </div>
               <div style={{ textAlign: 'right' }}>
                 <p style={{ fontSize: '24px', color: '#4b5563', textDecoration: 'line-through' }}>{formatPrice(comparison.totalCelebPrice)}</p>
                 <p style={{ fontSize: '48px', fontWeight: '900' }}>{formatPrice(comparison.totalBudgetPrice)}</p>
               </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}