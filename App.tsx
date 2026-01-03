
import React, { useState, useCallback, useRef } from 'react';
import { parseSRT, stringifySRT } from './utils/srtParser';
import { translateSrtChunks } from './services/geminiService';
import { SubtitleBlock, AppStatus } from './types';

// Theme configuration for easy customization
const PROGRESS_THEME = {
  container: 'bg-slate-900/50 border border-slate-800 shadow-inner',
  track: 'bg-slate-800/80',
  bar: 'bg-gradient-to-r from-indigo-600 via-violet-500 to-indigo-400',
  glow: 'shadow-[0_0_15px_rgba(99,102,241,0.4)]',
  accent: 'bg-white/10'
};

// Components
const Header: React.FC = () => (
  <header className="py-8 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
    <div className="container mx-auto px-4 flex justify-between items-center">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">ProSub <span className="text-indigo-400">Translator</span></h1>
      </div>
      <div className="hidden md:block text-slate-400 text-sm">
        专业级 · 1:1 对应 · 零时间轴偏差
      </div>
    </div>
  </header>
);

const Footer: React.FC = () => (
  <footer className="py-6 border-t border-slate-800 text-slate-500 text-center text-sm">
    &copy; {new Date().getFullYear()} ProSub Translator. Powered by Gemini 3 Pro.
  </footer>
);

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [originalBlocks, setOriginalBlocks] = useState<SubtitleBlock[]>([]);
  const [translatedBlocks, setTranslatedBlocks] = useState<SubtitleBlock[]>([]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      try {
        const blocks = parseSRT(content);
        if (blocks.length === 0) throw new Error("无法解析 SRT 文件，请确保格式正确。");
        setOriginalBlocks(blocks);
        setTranslatedBlocks([]);
        setStatus(AppStatus.IDLE);
        setProgress(0);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        setStatus(AppStatus.ERROR);
      }
    };
    reader.readAsText(file);
  };

  const startTranslation = async () => {
    if (originalBlocks.length === 0) return;
    
    setStatus(AppStatus.TRANSLATING);
    setError(null);
    setProgress(0);

    try {
      const results = await translateSrtChunks(originalBlocks, (count) => {
        setProgress(Math.round((count / originalBlocks.length) * 100));
      });
      setTranslatedBlocks(results);
      setStatus(AppStatus.COMPLETED);
    } catch (err: any) {
      setError(err.message || "翻译过程中发生错误");
      setStatus(AppStatus.ERROR);
    }
  };

  const downloadTranslated = () => {
    if (translatedBlocks.length === 0) return;
    const content = stringifySRT(translatedBlocks);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translated_${new Date().getTime()}.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-200">
      <Header />

      <main className="flex-grow container mx-auto px-4 py-8 max-w-6xl">
        <section className="bg-slate-900 rounded-2xl border border-slate-800 p-8 mb-8 shadow-2xl">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-4">顶级 SRT 字幕翻译引擎</h2>
            <p className="text-slate-400 mb-8 text-lg">
              采用 Gemini 3 Pro 深度学习模型，针对字幕场景优化。严格保持原编号、原时间轴。
              <br />
              <span className="text-indigo-400 font-medium">不合并、不拆分、不跨行、不串行。</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-white px-8 py-3 rounded-xl border border-slate-700 transition-all flex items-center gap-2 group">
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {originalBlocks.length > 0 ? '更换 SRT 文件' : '上传 SRT 文件'}
                <input 
                  type="file" 
                  accept=".srt" 
                  className="hidden" 
                  onChange={handleFileUpload}
                  ref={fileInputRef}
                />
              </label>

              {(originalBlocks.length > 0 && status !== AppStatus.TRANSLATING) && (
                <button 
                  onClick={startTranslation}
                  className={`${status === AppStatus.ERROR ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'} text-white px-8 py-3 rounded-xl shadow-lg transition-all flex items-center gap-2 font-semibold`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {status === AppStatus.ERROR ? '重新翻译' : '开始翻译'}
                </button>
              )}
              
              {status === AppStatus.COMPLETED && (
                <button 
                  onClick={downloadTranslated}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2"
                >
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  下载翻译好的 SRT
                </button>
              )}
            </div>

            {error && (
              <div className="mt-6 p-4 bg-red-900/30 border border-red-800 text-red-400 rounded-xl text-sm flex items-start gap-3 text-left">
                <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}
          </div>
        </section>

        {(status === AppStatus.TRANSLATING || status === AppStatus.COMPLETED || (status === AppStatus.ERROR && progress > 0)) && (
          <div className={`mb-12 p-6 rounded-2xl ${PROGRESS_THEME.container}`}>
            <div className="flex justify-between items-end mb-4">
              <div>
                <h3 className="text-white font-semibold text-sm uppercase tracking-wider">翻译进度</h3>
                <p className="text-slate-500 text-xs mt-1">
                  {status === AppStatus.COMPLETED ? '处理完成' : status === AppStatus.ERROR ? '翻译中断' : 'AI 正在精密校对中...'}
                </p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-bold text-white font-mono">{progress}%</span>
                <p className="text-slate-500 text-xs mt-1">{translatedBlocks.length} / {originalBlocks.length} 条目</p>
              </div>
            </div>
            <div className={`w-full h-4 ${PROGRESS_THEME.track} rounded-full overflow-hidden p-1 shadow-inner relative`}>
              <div 
                className={`h-full ${status === AppStatus.ERROR ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : PROGRESS_THEME.bar + ' ' + PROGRESS_THEME.glow} rounded-full transition-all duration-700 ease-out relative overflow-hidden`} 
                style={{ width: `${progress}%` }}
              >
                {status === AppStatus.TRANSLATING && (
                  <>
                    <div className={`absolute inset-0 ${PROGRESS_THEME.accent} animate-pulse`}></div>
                    <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:24px_24px] animate-[progress-bar-stripes_1s_linear_infinite]"></div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {(originalBlocks.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[600px]">
            <div className="flex flex-col bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-700 flex justify-between items-center">
                <span className="font-semibold text-slate-300">原始英文 (Original)</span>
                <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-400">{originalBlocks.length} 行</span>
              </div>
              <div className="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {originalBlocks.map((b, i) => (
                  <div key={i} className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/50 text-sm">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-indigo-400 font-mono text-xs">#{b.id}</span>
                      <span className="text-slate-500 font-mono text-xs">{b.timestamp}</span>
                    </div>
                    <div className="text-slate-300 leading-relaxed">{b.text}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-700 flex justify-between items-center">
                <span className="font-semibold text-slate-300">中文译文 (Result)</span>
                <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-400">{translatedBlocks.length} 行</span>
              </div>
              <div className="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-950/20">
                {translatedBlocks.length > 0 ? (
                  translatedBlocks.map((b, i) => (
                    <div key={i} className="bg-indigo-950/10 p-3 rounded-lg border border-indigo-900/20 text-sm animate-fade-in">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-indigo-400 font-mono text-xs">#{b.id}</span>
                        <span className="text-slate-500 font-mono text-xs">{b.timestamp}</span>
                      </div>
                      <div className="text-white font-medium leading-relaxed">{b.text}</div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-600 italic px-8 text-center">
                    {status === AppStatus.TRANSLATING ? "翻译生成中..." : 
                     status === AppStatus.ERROR ? "翻译出错，请点击上方按钮重试" : 
                     "等待开始翻译"}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes progress-bar-stripes {
          from { background-position: 24px 0; }
          to { background-position: 0 0; }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default App;
