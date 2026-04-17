/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ALL_CARDS, shuffleDeck } from './data/allCards';
import { Card, SpreadType, SPREADS } from './types';
import { Sparkles, Wand2, Send, ChevronRight, HelpCircle, MessageSquareQuote, Loader2 } from 'lucide-react';
import { generateTarotSummary } from './services/geminiService';

// --- Components ---

const StarField = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const stars: { x: number; y: number; size: number; speed: number; opacity: number }[] = [];
    const starCount = 200;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const initStars = () => {
      stars.length = 0;
      for (let i = 0; i < starCount; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 1.5,
          speed: 0.005 + Math.random() * 0.01,
          opacity: Math.random(),
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach((star) => {
        ctx.fillStyle = `rgba(201, 168, 76, ${star.opacity})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();

        star.opacity += star.speed;
        if (star.opacity > 1 || star.opacity < 0) star.speed = -star.speed;
      });
      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    resize();
    initStars();
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
};

const TypewriterText = ({ text, delay = 20 }: { text: string; delay?: number }) => {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    if (!text) return;
    setDisplayedText('');
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        const nextChar = text.charAt(i);
        setDisplayedText((prev) => prev + nextChar);
        i++;
      } else {
        clearInterval(timer);
      }
    }, delay);
    return () => clearInterval(timer);
  }, [text, delay]);

  return <span className="whitespace-pre-wrap">{displayedText}</span>;
};

const TarotCard = ({ 
  card, 
  isReversed, 
  isRevealed, 
  onReveal, 
  positionTitle, 
  index 
}: { 
  card: Card; 
  isReversed: boolean; 
  isRevealed: boolean; 
  onReveal: () => void;
  positionTitle: string;
  index: number;
}) => {
  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[200px] perspective-1000">
      <div className="text-[#a78bca] text-xs font-serif uppercase tracking-widest text-center">{positionTitle}</div>
      <motion.div
        initial={{ rotateY: 0 }}
        animate={{ rotateY: isRevealed ? 180 : 0 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        onClick={!isRevealed ? onReveal : undefined}
        className="relative w-40 h-72 cursor-pointer transform-style-3d group"
      >
        {/* Back of Card */}
        <div className="absolute inset-0 backface-hidden rounded-xl border-4 border-[#c9a84c] bg-[#1a0a2e] flex items-center justify-center p-2 shadow-2xl group-hover:shadow-[0_0_20px_rgba(201,168,76,0.4)] transition-all">
          <div className="w-full h-full border border-[#c9a84c]/40 rounded-lg flex items-center justify-center overflow-hidden">
             <div className="w-full h-full opacity-30" style={{
               backgroundImage: `radial-gradient(#c9a84c 1px, transparent 1px)`,
               backgroundSize: '15px 15px'
             }}></div>
          </div>
        </div>

        {/* Front of Card */}
        <div 
          className="absolute inset-0 backface-hidden rounded-xl border-4 border-[#c9a84c] overflow-hidden flex flex-col items-center justify-between py-8 rotate-y-180"
          style={{ 
            background: `linear-gradient(135deg, ${card.colors[0]}, ${card.colors[1]})` 
          }}
        >
          <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${isReversed ? 'bg-[#c84c6e] text-white' : 'bg-[#c9a84c] text-[#0d0d1a]'}`}>
            {isReversed ? '逆位' : '正位'}
          </div>
          <div className={`text-6xl ${isReversed ? 'rotate-180' : ''}`}>{card.symbol}</div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-sm font-serif text-black/60">{card.number} · {card.element}</span>
            <span className="text-xl font-bold font-serif text-black">{card.name}</span>
          </div>
        </div>
      </motion.div>
      
      <AnimatePresence>
        {isRevealed && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mt-2 px-2"
          >
            <div className="flex flex-wrap justify-center gap-1 mb-2">
              {(isReversed ? card.reversed : card.upright).map(tag => (
                <span key={tag} className="text-[#a78bca] text-[11px] font-serif italic">
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  const [spread, setSpread] = useState<SpreadType>('single');
  const [question, setQuestion] = useState('');
  const [phase, setPhase] = useState<'idle' | 'shuffling' | 'reading' | 'summary'>('idle');
  const [drawnCards, setDrawnCards] = useState<{ card: Card; isReversed: boolean; isRevealed: boolean }[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  
  const [summary, setSummary] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [copied, setCopied] = useState(false);

  const startDivination = () => {
    setPhase('shuffling');
    setRevealedCount(0);
    setActiveIndex(0);
    setSummary('');
    
    setTimeout(() => {
      const shuffled = shuffleDeck(ALL_CARDS);
      const limit = SPREADS[spread].length;
      const selection = shuffled.slice(0, limit).map(card => ({
        card,
        isReversed: Math.random() > 0.5,
        isRevealed: false
      }));
      setDrawnCards(selection);
      setPhase('reading');
    }, 1500);
  };

  const revealCard = (index: number) => {
    const newCards = [...drawnCards];
    if (newCards[index].isRevealed) {
      setActiveIndex(index);
      return;
    }
    newCards[index].isRevealed = true;
    setDrawnCards(newCards);
    setRevealedCount(prev => prev + 1);
    setActiveIndex(index);
  };

  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    setPhase('summary');
    
    const formattedCards = drawnCards.map((d, i) => ({
      card: d.card,
      isReversed: d.isReversed,
      position: SPREADS[spread][i].title
    }));

    const result = await generateTarotSummary(question, formattedCards);
    setSummary(result);
    setIsGeneratingSummary(false);
  };

  const reset = () => {
    setPhase('idle');
    setDrawnCards([]);
    setRevealedCount(0);
    setActiveIndex(0);
    setSummary('');
  };

  const activeCardData = drawnCards[activeIndex];

  return (
    <div className="min-h-screen bg-[#0d0d1a] text-[#e0d8d0] selection:bg-[#c9a84c]/30 selection:text-[#c9a84c] font-serif overflow-x-hidden relative flex flex-col">
      <StarField />
      
      {/* Header */}
      <header className="relative z-10 pt-8 pb-6 text-center space-y-6">
        <div className="inline-flex gap-1 bg-[#a78bca]/10 p-1 rounded-full border border-[#c9a84c]/30 backdrop-blur-sm">
          {(Object.keys(SPREADS) as SpreadType[]).map((type) => (
            <button
              key={type}
              onClick={() => setSpread(type)}
              disabled={phase !== 'idle'}
              className={`px-6 py-2 rounded-full text-xs transition-all uppercase tracking-widest ${
                spread === type 
                  ? 'bg-[#c9a84c] text-[#0d0d1a] font-bold shadow-lg' 
                  : 'text-[#a78bca] hover:text-white disabled:opacity-50'
              }`}
            >
              {type === 'single' ? '单牌' : type === 'three' ? '三牌阵' : '凯尔特十字'}
            </button>
          ))}
        </div>

        {phase === 'idle' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center px-4">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="请输入您此刻心中的问题..."
              className="bg-[#1a0a2e]/60 border border-[#c9a84c] text-[#c9a84c] px-6 py-2.5 w-full max-w-md rounded-sm italic text-center focus:outline-none focus:ring-1 focus:ring-[#c9a84c] transition-all placeholder:text-[#c9a84c]/40"
            />
          </motion.div>
        )}
      </header>

      <main className="relative z-10 flex-1 w-full max-w-[1200px] mx-auto px-6 py-4 flex flex-col items-center overflow-y-auto">
        {phase === 'idle' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-12">
            <button
              onClick={startDivination}
              className="group relative px-12 py-3 border border-[#c9a84c] text-[#c9a84c] uppercase tracking-[3px] text-sm overflow-hidden hover:text-[#0d0d1a] transition-colors"
            >
              <span className="relative z-10">✦ 开始占卜 ✦</span>
              <div className="absolute inset-0 bg-[#c9a84c] translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            </button>
          </motion.div>
        )}

        {phase === 'shuffling' && (
          <div className="h-[50vh] flex items-center justify-center">
             <div className="relative">
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ 
                    rotate: [ -30 + i * 5, 0, -30 + i * 5],
                    x: [ -i * 5, 0, -i * 5],
                    y: [ 0, -10, 0]
                  }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute top-0 left-0 w-32 h-56 border-4 border-[#c9a84c] rounded-xl bg-[#1a0a2e] origin-bottom shadow-2xl"
                />
              ))}
              <div className="mt-80 text-center text-[#c9a84c] uppercase tracking-widest text-sm animate-pulse">屏气凝神 · 链接宇宙</div>
            </div>
          </div>
        )}

        {phase === 'reading' && (
          <div className="w-full flex flex-col gap-16 pb-20">
            <div className={`grid gap-x-12 gap-y-16 justify-center ${
              spread === 'single' ? 'grid-cols-1' : 
              spread === 'three' ? 'grid-cols-1 md:grid-cols-3' : 
              'grid-cols-2 lg:grid-cols-5'
            }`}>
              {drawnCards.map((data, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className={`${activeIndex === i ? 'ring-2 ring-[#c9a84c]/40 ring-offset-8 ring-offset-[#0d0d1a] rounded-xl' : ''}`}
                >
                  <TarotCard
                    card={data.card}
                    isReversed={data.isReversed}
                    isRevealed={data.isRevealed}
                    onReveal={() => revealCard(i)}
                    positionTitle={SPREADS[spread][i].title}
                    index={i}
                  />
                </motion.div>
              ))}
            </div>
            
            {revealedCount === drawnCards.length && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-center"
              >
                <button
                  onClick={handleGenerateSummary}
                  className="px-8 py-3 bg-[#c9a84c] text-[#0d0d1a] font-bold uppercase tracking-widest text-sm rounded-full flex items-center gap-2 hover:scale-[1.05] transition-all"
                >
                  <MessageSquareQuote className="w-5 h-5" />
                  生成综合启示总结
                </button>
              </motion.div>
            )}
          </div>
        )}

        {phase === 'summary' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-3xl bg-[#1a0a2e]/80 border border-[#c9a84c]/40 rounded-3xl p-8 backdrop-blur-xl shrink-0 shadow-[0_0_50px_rgba(201,168,76,0.15)] mx-4 mb-20"
          >
            {/* Header with Title & Reset */}
            <div className="flex justify-between items-center mb-10">
              <div className="space-y-1">
                <h2 className="text-[#c9a84c] text-3xl font-serif italic tracking-tighter flex items-center gap-3">
                   <Sparkles className="w-6 h-6" />
                   占卜报告
                </h2>
                <div className="flex items-center gap-3">
                  <span className="w-12 h-[1px] bg-[#c9a84c]/30"></span>
                  <p className="text-[#a78bca] text-[10px] uppercase font-sans tracking-[0.2em]">Divine Reading Report</p>
                </div>
              </div>
              <button 
                onClick={reset}
                className="p-3 bg-[#c9a84c]/5 border border-[#c9a84c]/20 rounded-full hover:bg-[#c9a84c] hover:text-[#0d0d1a] text-[#c9a84c] transition-all duration-500 group"
                title="开启新占卜"
              >
                <Wand2 className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
              </button>
            </div>

            <div className="grid md:grid-cols-[1fr_1.5fr] gap-12">
              {/* Left Column: Visuals & Question */}
              <div className="space-y-8">
                {/* Question Section */}
                <div className="bg-[#1a0a2e]/40 p-5 border border-[#c9a84c]/10 rounded-xl">
                  <div className="text-[#a78bca] text-[10px] uppercase tracking-widest mb-3 flex items-center gap-2">
                    <HelpCircle className="w-3 h-3" />
                    心中所向
                  </div>
                  <p className="text-[#c9a84c] italic font-serif leading-relaxed">
                    “{question || '当下全貌与未来指引'}”
                  </p>
                </div>

                {/* Compact Cards View */}
                <div className="space-y-4">
                  <div className="text-[#a78bca] text-[10px] uppercase tracking-widest mb-2">牌面揭示</div>
                  <div className="flex flex-wrap gap-3">
                    {drawnCards.map((data, i) => (
                      <div key={i} className="flex flex-col items-center gap-2">
                        <div 
                          className="w-16 h-28 rounded-lg border-2 border-[#c9a84c]/60 flex flex-col items-center justify-center p-1 shadow-lg overflow-hidden group relative"
                          style={{ background: `linear-gradient(135deg, ${data.card.colors[0]}, ${data.card.colors[1]})` }}
                        >
                          <div className={`text-2xl ${data.isReversed ? 'rotate-180' : ''}`}>{data.card.symbol}</div>
                          <div className="mt-1 text-[8px] font-bold text-black text-center leading-tight">{data.card.name}</div>
                          {data.isReversed && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#c84c6e] rounded-full"></div>}
                        </div>
                        <span className="text-[10px] text-[#a78bca] opacity-60 font-serif">{SPREADS[spread][i].title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Interpretation */}
              <div className="relative min-h-[300px] border-l border-[#c9a84c]/10 pl-0 md:pl-10">
                {isGeneratingSummary ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
                    <Loader2 className="w-8 h-8 text-[#c9a84c] animate-spin" />
                    <p className="text-[#c9a84c]/60 text-xs italic">正在解读灵性讯息...</p>
                  </div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-6"
                  >
                     <div className="text-[#c9a84c] text-xs uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <MessageSquareQuote className="w-4 h-4" />
                        综合解读
                     </div>
                     <div className="text-[#e0d8d0] leading-relaxed text-lg font-serif">
                       <TypewriterText key={summary} text={summary} delay={20} />
                     </div>

                     <div className="pt-8 flex justify-end">
                       <div className="text-[10px] uppercase tracking-[0.2em] text-[#a78bca]/40">
                         {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                       </div>
                     </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Decorative Corner Ornaments */}
            <div className="absolute top-4 left-4 w-6 h-6 border-t border-l border-[#c9a84c]/30"></div>
            <div className="absolute top-4 right-4 w-6 h-6 border-t border-r border-[#c9a84c]/30"></div>
            <div className="absolute bottom-4 left-4 w-6 h-6 border-b border-l border-[#c9a84c]/30"></div>
            <div className="absolute bottom-4 right-4 w-6 h-6 border-b border-r border-[#c9a84c]/30"></div>
          </motion.div>
        )}
      </main>

      {/* Info Panel Integration */}
      {phase === 'reading' && revealedCount > 0 && activeCardData && activeCardData.isRevealed && (
        <motion.div 
          initial={{ y: 100 }} 
          animate={{ y: 0 }}
          className="relative z-20 h-72 glass-panel border-t-2 border-[#c9a84c] p-8 grid md:grid-cols-[1fr_2fr] gap-12 shrink-0 overflow-y-auto"
        >
          <div className="space-y-4">
            <div>
              <div className="text-[#c9a84c] text-xs uppercase tracking-widest mb-1">位置：{SPREADS[spread][activeIndex].title}</div>
              <div className="text-[#a78bca] text-xl font-bold uppercase tracking-widest">牌名：{activeCardData.card.number} · {activeCardData.card.name}</div>
            </div>
            <div>
              <div className={`inline-block px-3 py-1 text-[10px] uppercase tracking-widest mb-2 ${
                activeCardData.isReversed ? 'bg-[#c84c6e] text-white' : 'bg-[#c9a84c] text-[#0d0d1a]'
              }`}>关键词</div>
              <div className="text-sm opacity-90 leading-relaxed font-serif">
                {(activeCardData.isReversed ? activeCardData.card.reversed : activeCardData.card.upright).join(' · ')}
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="text-[#c9a84c] text-xs uppercase tracking-widest border-b border-[#c9a84c]/20 pb-2">启示解读</div>
            <div className={`text-lg leading-relaxed font-serif opacity-90`}>
              <TypewriterText key={activeIndex} text={activeCardData.isReversed ? activeCardData.card.reversedMeaning : activeCardData.card.uprightMeaning} />
            </div>
          </div>
        </motion.div>
      )}

      <footer className="relative z-10 py-6 text-center opacity-30 text-[10px] tracking-[4px] uppercase font-serif h-12 flex items-center justify-center">
        Digital Tarot · Geometric Balance
      </footer>
    </div>
  );
}
