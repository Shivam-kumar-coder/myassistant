import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Camera, 
  X, 
  Smartphone, 
  Play, 
  Square, 
  Bot,
  Sparkles,
  Maximize2,
  Minimize2,
  Image as ImageIcon,
  Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as htmlToImage from 'html-to-image';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  image?: string;
  timestamp: Date;
}

export default function App() {
  const [isAssistantStarted, setIsAssistantStarted] = useState(false);
  const [isBubbleOpen, setIsBubbleOpen] = useState(false);
  const [isChatMaximized, setIsChatMaximized] = useState(false);
  const [chatSize, setChatSize] = useState({ width: 320, height: 450 });
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      text: "Namaste! I'm active. How can I help you navigate this screen today?",
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [showCapturePrompt, setShowCapturePrompt] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [credits, setCredits] = useState(5);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userId = 'user_123';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showCapturePrompt]);

  const toggleAssistant = (state: boolean) => {
    setIsAssistantStarted(state);
    if (!state) {
      setIsBubbleOpen(false);
    }
  };

  const sendMessage = async (attachScreenshot: boolean = false) => {
    if (!inputText.trim() && !attachScreenshot) return;

    let screenshotBase64 = undefined;
    if (attachScreenshot) {
      try {
        const element = document.getElementById('main-screen-content');
        if (element) {
          // Try toPng first
          try {
            screenshotBase64 = await htmlToImage.toPng(element, {
              quality: 0.8,
              skipFonts: true,
              cacheBust: true,
              backgroundColor: '#ffffff',
            });
          } catch (e) {
            console.warn("toPng failed, trying toJpeg:", e);
            // Fallback to toJpeg which is sometimes more robust with complex CSS
            screenshotBase64 = await htmlToImage.toJpeg(element, {
              quality: 0.7,
              skipFonts: true,
              backgroundColor: '#ffffff',
            });
          }
        }
      } catch (err) {
        console.error("Screenshot capture failed:", err);
        // We still proceed, but the user will know or the assistant will respond based on text only
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: inputText,
      image: screenshotBase64,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputText;
    setInputText('');
    setShowCapturePrompt(false);
    setIsAnalyzing(true);

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: currentInput || "Please analyze this screen.", 
          image: screenshotBase64 || null,
          userId 
        }),
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("Failed to parse JSON. Response text:", responseText);
        throw new Error(`Server returned invalid response structure. Status: ${response.status}`);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: data.text,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      if (data.creditsLeft !== undefined) setCredits(data.creditsLeft);
    } catch (error: any) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        text: error.message.includes('No credits') 
          ? "You've run out of credits! Please restart the app or watch an ad (coming soon) to get more."
          : "I'm sorry, I'm having trouble processing that right now. Please check your connection or try again.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleInitialSend = () => {
    if (!inputText.trim()) return;
    setShowCapturePrompt(true);
  };

  return (
    <div className="h-screen w-full bg-slate-50 font-sans flex items-center justify-center overflow-hidden">
      
      {/* MAIN HOME PAGE UI */}
      <div id="main-screen-content" className="w-full max-w-md h-screen bg-white shadow-2xl flex flex-col relative border-x border-slate-200">
        
        {/* Header */}
        <header className="p-6 pt-12 text-center">
          <div className="w-20 h-20 bg-yellow-400 rounded-3xl mx-auto flex items-center justify-center shadow-lg mb-4 transform -rotate-6">
            <Smartphone className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">My Assistant</h1>
          <p className="text-slate-500 text-sm mt-1">Smart Screen Navigation Helper</p>
        </header>

        {/* Status Card */}
        <main className="flex-1 px-8 py-10 flex flex-col gap-6">
          <div className={`p-6 rounded-3xl border-2 transition-all duration-500 ${
            isAssistantStarted 
              ? 'bg-emerald-50 border-emerald-200 shadow-emerald-100 shadow-lg' 
              : 'bg-slate-50 border-slate-200 shadow-none'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Current Status</span>
              <div className={`w-3 h-3 rounded-full animate-pulse ${isAssistantStarted ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
            </div>
            <h2 className={`text-2xl font-bold ${isAssistantStarted ? 'text-emerald-900' : 'text-slate-400'}`}>
              {isAssistantStarted ? 'Service Active' : 'Service Stopped'}
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              {isAssistantStarted 
                ? 'Floating bubble is now visible on your screen.' 
                : 'Tap "Start" to enable the floating assistant overlay.'}
            </p>
            {isAssistantStarted && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                <p className="text-[10px] text-amber-700 font-medium">
                  <Sparkles className="inline-block w-3 h-3 mr-1" />
                  PRO TIP: On real Android, this bubble stays on top of ANY app. In this web preview, we simulate the behavior for testing.
                </p>
              </div>
            )}
          </div>

          {/* Toggle Buttons */}
          <div className="flex flex-col gap-4">
            <button
              onClick={() => toggleAssistant(true)}
              disabled={isAssistantStarted}
              className={`flex items-center justify-center gap-3 py-5 rounded-2xl font-bold text-lg transition-all active:scale-95 ${
                isAssistantStarted 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                  : 'bg-emerald-500 text-white shadow-xl shadow-emerald-200 hover:bg-emerald-600'
              }`}
            >
              <Play fill="currentColor" size={24} />
              Start Assistant
            </button>

            <button
              onClick={() => toggleAssistant(false)}
              disabled={!isAssistantStarted}
              className={`flex items-center justify-center gap-3 py-5 rounded-2xl font-bold text-lg transition-all active:scale-95 ${
                !isAssistantStarted 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                  : 'bg-rose-500 text-white shadow-xl shadow-rose-200 hover:bg-rose-600'
              }`}
            >
              <Square fill="currentColor" size={24} />
              Stop Assistant
            </button>
          </div>
        </main>

        {/* AdMob Banner - MAIN HOME PAGE ONLY */}
        <footer className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-center">
          <div className="w-full h-14 bg-slate-200 rounded-lg flex items-center justify-center border border-dashed border-slate-300 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]"></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AdMob Banner Space</span>
          </div>
        </footer>
      </div>

      {/* SYSTEM-WIDE FLOATING BUBBLE (Simulated) */}
      <AnimatePresence>
        {isAssistantStarted && !isBubbleOpen && (
          <motion.div
            drag
            dragMomentum={false}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsBubbleOpen(true)}
            className="fixed bottom-24 right-10 z-[100] cursor-move active:scale-90 transition-transform"
          >
            <div className="relative group">
              {/* Outer Glow */}
              <div className="absolute inset-0 bg-yellow-400 rounded-full blur-xl opacity-40 group-hover:opacity-60 transition-opacity animate-pulse"></div>
              
              {/* Bubble Body */}
              <div className="w-16 h-16 bg-gradient-to-br from-slate-900 to-slate-800 rounded-full flex items-center justify-center shadow-2xl border-4 border-white/10 relative overflow-hidden">
                {/* Visual Accent */}
                <div className="absolute top-0 left-0 w-full h-1/2 bg-white/5 -skew-y-12 transition-transform group-hover:translate-y-1"></div>
                
                <Bot className="text-yellow-400 w-8 h-8 relative z-10" />
                
                {/* Active Indicator */}
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full shadow-md"></div>
              </div>
              
              {/* Hover Label */}
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-slate-700 shadow-lg">
                AI ASSISTANT
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EXPANDABLE & RESIZABLE CHAT WINDOW */}
      <AnimatePresence>
        {isBubbleOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              width: isChatMaximized ? '100vw' : chatSize.width,
              height: isChatMaximized ? '100vh' : chatSize.height,
              bottom: isChatMaximized ? 0 : '80px',
              right: isChatMaximized ? 0 : '40px',
              borderRadius: isChatMaximized ? 0 : '24px'
            }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`fixed bg-white shadow-[0_20px_50px_rgba(0,0,0,0.2)] flex flex-col z-[101] overflow-hidden border border-slate-200 transition-all duration-300`}
          >
            {/* Chat Header (Clean, no ads) */}
            <div className="bg-slate-900 p-4 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-tr from-yellow-400 to-yellow-200 rounded-lg flex items-center justify-center shadow-inner">
                  <Cpu className="text-slate-900 w-5 h-5" />
                </div>
                <div>
                  <span className="font-black text-white text-xs tracking-widest uppercase block">My Assistant</span>
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse"></span>
                    ONLINE
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsChatMaximized(!isChatMaximized)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  {isChatMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>
                <button 
                  onClick={() => setIsBubbleOpen(false)}
                  className="bg-slate-800 text-slate-300 hover:text-white rounded-lg p-1"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 scrollbar-hide">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm border ${
                    msg.role === 'user' 
                      ? 'bg-slate-900 text-white border-slate-800' 
                      : 'bg-white text-slate-800 border-slate-100'
                  }`}>
                    {msg.image && (
                      <img src={msg.image} alt="screenshot" className="w-full h-auto rounded-lg mb-2 border border-slate-700" />
                    )}
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                    <span className="text-[10px] opacity-40 mt-1 block text-right">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
              
              {isAnalyzing && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm text-xs font-bold text-slate-400 italic flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce"></div>
                    AI is analyzing screen...
                  </div>
                </div>
              )}

              {/* Screenshot Auto-Capture Prompt */}
              {showCapturePrompt && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mx-auto mt-4 w-full bg-yellow-50 border-2 border-yellow-200 p-5 rounded-2xl text-center"
                >
                  <div className="w-10 h-10 bg-yellow-200 rounded-full mx-auto flex items-center justify-center mb-3">
                    <Camera className="text-yellow-700" size={20} />
                  </div>
                  <h4 className="text-sm font-black text-yellow-900 leading-tight">Better Assistant?</h4>
                  <p className="text-[11px] text-yellow-700 mt-1 mb-4">Would you like to auto-capture and attach a screenshot of your current screen for better assistance?</p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => sendMessage(true)}
                      className="flex-1 bg-yellow-400 text-yellow-900 font-bold py-2 rounded-xl text-xs active:scale-95 shadow-sm"
                    >
                      Yes, capture
                    </button>
                    <button 
                      onClick={() => sendMessage(false)}
                      className="flex-1 bg-white border border-yellow-200 text-yellow-700 font-bold py-2 rounded-xl text-xs active:scale-95"
                    >
                      No, thanks
                    </button>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-slate-100 bg-white">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2 focus-within:border-yellow-400 focus-within:bg-white transition-all">
                <input
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleInitialSend()}
                  placeholder="Ask for guidance..."
                  className="flex-1 bg-transparent border-none outline-none text-sm py-2 text-slate-800 placeholder:text-slate-400"
                />
                <button 
                  onClick={handleInitialSend}
                  disabled={!inputText.trim()}
                  className={`p-2 rounded-xl transition-all active:scale-90 ${
                    inputText.trim() ? 'bg-yellow-400 text-slate-900 shadow-md' : 'text-slate-300'
                  }`}
                >
                  <Send size={20} />
                </button>
              </div>
            </div>

            {/* Manual Resize Handle (Only visible when not maximized) */}
            {!isChatMaximized && (
              <div 
                className="absolute bottom-0 right-0 w-6 h-6 cursor-nw-resize flex items-center justify-center hover:bg-slate-100 rounded-tl-xl transition-colors"
                onMouseDown={(e) => {
                  e.preventDefault();
                  const startX = e.clientX;
                  const startY = e.clientY;
                  const startWidth = chatSize.width;
                  const startHeight = chatSize.height;

                  const handleMouseMove = (moveEvent: MouseEvent) => {
                    setChatSize({
                      width: Math.max(280, startWidth + (moveEvent.clientX - startX)),
                      height: Math.max(300, startHeight + (moveEvent.clientY - startY))
                    });
                  };

                  const handleMouseUp = () => {
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                  };

                  document.addEventListener('mousemove', handleMouseMove);
                  document.addEventListener('mouseup', handleMouseUp);
                }}
              >
                <div className="w-3 h-3 border-r-2 border-b-2 border-slate-300 rounded-br-[2px]"></div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
