import React, { useState, useEffect, useRef } from "react";
import { Bot, X, Send, Sparkles } from "lucide-react";
import { useManagement } from "../../context/ManagementContext";
import { sendChatMessage } from "../../services/pixelFounderService";
import { logger } from "../../utils/logger";

interface Message {
  id: string;
  text: string;
  sender: "ai" | "user";
  timestamp: string;
}

const QUICK_PROMPTS = [
  "Push latest media loop to Kiosks",
  "Analyze why Resort revenue is down",
  "Reboot stalled cameras",
];

const AIChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello! I am PixelFounder, your autonomous AI fleet manager. I am connected to live telemetry and can execute operational commands on your behalf.",
      sender: "ai",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const { selectedContext } = useManagement();

  const handleSendMessage = async (textToSend?: string | React.MouseEvent) => {
    const prompt = typeof textToSend === "string" ? textToSend : inputValue;
    if (!prompt.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: prompt,
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (typeof textToSend !== "string") setInputValue("");
    setIsTyping(true);

    try {
      const responseText = await sendChatMessage(prompt, { selectedContext });

      const aiMsg: Message = {
        id: Date.now().toString(),
        text: responseText,
        sender: "ai",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (error: unknown) {
      logger.error("PixelFounder Error", { error });
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: `Analysis error: ${error instanceof Error ? error.message : "Failed to reach the Management intelligence service."}`,
        sender: "ai",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Open PixelFounder"
        className={`fixed bottom-8 right-8 w-16 h-16 rounded-full flex items-center justify-center shadow-[0_10px_40px_rgba(56,189,248,0.5)] transition-all duration-300 z-[1000] border border-white/20 hover:scale-110 active:scale-95 ${
          isOpen ? 'bg-slate-800 text-slate-300' : 'bg-gradient-to-br from-[#38bdf8] to-[#0ea5e9] text-white'
        }`}
      >
        {isOpen ? <X className="w-8 h-8" /> : <Sparkles className="w-8 h-8" />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-28 right-8 w-96 h-[550px] max-h-[80vh] bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-200/50 flex flex-col overflow-hidden z-[1000] animate-in slide-in-from-bottom-5 fade-in duration-300">
          
          {/* Header */}
          <div className="bg-slate-900 text-white p-5 flex justify-between items-center relative overflow-hidden shrink-0">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#38bdf8]/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
            
            <div className="flex items-center gap-3 relative z-10">
              <div className="bg-[#38bdf8]/20 p-2 rounded-xl backdrop-blur-sm border border-[#38bdf8]/30">
                <Bot className="w-5 h-5 text-[#38bdf8]" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold tracking-tight text-white">PixelFounder</span>
                <span className="text-[10px] text-[#38bdf8] font-medium tracking-wider uppercase">Governance Guidance</span>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)} 
              title="Close PixelFounder"
              className="relative z-10 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-slate-300 hover:text-white" />
            </button>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 bg-gradient-to-b from-slate-50/50 to-white/50 dark:from-slate-900 dark:to-slate-900/90 custom-scrollbar">
            <div className="flex flex-wrap gap-1.5 pb-2 border-b border-slate-200/50 dark:border-white/10">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSendMessage(prompt)}
                  disabled={isTyping}
                  className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-all disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[85%] ${
                  msg.sender === "ai" ? "self-start" : "self-end items-end"
                } animate-in fade-in slide-in-from-bottom-2 duration-300`}
              >
                <div
                  className={`p-3.5 rounded-2xl text-[14px] leading-relaxed shadow-sm ${
                    msg.sender === "ai"
                      ? "bg-white border border-slate-100 rounded-tl-sm text-slate-700"
                      : "bg-gradient-to-br from-[#38bdf8] to-[#0284c7] border border-[#0ea5e9]/50 rounded-tr-sm text-white font-medium"
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[10px] font-medium text-slate-400 mt-1.5 px-1">
                  {msg.timestamp}
                </span>
              </div>
            ))}
            
            {/* Typing Indicator */}
            {isTyping && (
              <div className="self-start flex flex-col max-w-[85%] animate-in fade-in duration-300">
                <div className="p-4 bg-white border border-slate-100 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white/80 backdrop-blur-md border-t border-slate-100 shrink-0">
            <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl focus-within:border-[#38bdf8] focus-within:ring-2 focus-within:ring-[#38bdf8]/20 transition-all shadow-sm">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Ask PixelFounder..."
                className="flex-1 bg-transparent p-3.5 pr-12 outline-none text-[14px] text-slate-700 placeholder:text-slate-400"
                disabled={isTyping}
              />
              <button
                onClick={handleSendMessage}
                disabled={isTyping || !inputValue.trim()}
                title="Send Message"
                className="absolute right-2 p-2 bg-[#38bdf8] hover:bg-[#0ea5e9] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm"
              >
                <Send className="w-4 h-4 translate-x-[-1px] translate-y-[1px]" />
              </button>
            </div>
            <div className="mt-2 text-center">
              <span className="text-[10px] text-slate-400 font-medium tracking-wide">
                Uses supplied ClickFlash telemetry. Verify important operational data.
              </span>
            </div>
          </div>
          
        </div>
      )}
    </>
  );
};

export default AIChatBot;
