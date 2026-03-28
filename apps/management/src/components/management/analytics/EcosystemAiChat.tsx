import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Bot,
  User,
  Sparkles,
  Loader2,
  Maximize2,
  Minimize2,
  X,
} from "lucide-react";
import { cloudApiService } from "../../../services/cloudApiService";
import { useSystemSetting } from "../../../hooks/useSystemSetting";

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  timestamp: Date;
}

interface AiSettingsType {
  provider: "openai" | "anthropic" | "gemini";
  apiKey: string;
  defaultModel: string;
  maxTokens: number;
  temperature: number;
  enabled: boolean;
}

const DEFAULT_AI_SETTINGS: AiSettingsType = {
  provider: "gemini",
  apiKey: "",
  defaultModel: "gemini-2.5-flash",
  maxTokens: 2048,
  temperature: 0.7,
  enabled: true,
};

export const EcosystemAiChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "ai",
      content:
        "Hello! I am the Ecosystem AI Assistant. I have access to all your Global Master databases, photographer performance, sales rates, and quality issues. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const { value: aiSettings } = useSystemSetting<AiSettingsType>(
    "aiSettings",
    DEFAULT_AI_SETTINGS,
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      // In Phase 70, this will call the dedicated /api/ai/chat endpoint in the hub
      const res = await cloudApiService.post("/api/ai/chat", {
        message: userMsg.content,
        history: messages
          .slice(-5)
          .map((m) => ({ role: m.role, content: m.content })),
        config: aiSettings, // Pass the globally configured credentials (Key, Provider, Model)
      });

      const aiResponseText =
        res.data?.response ||
        "I'm sorry, I couldn't process that request at this moment.";

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: aiResponseText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      console.error("AI Chat Error:", error);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content:
          "I'm sorry, I encountered a network error while trying to reach the intelligence core. Please ensure your AI API key is configured in settings.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        title="Open AI Assistant"
        aria-label="Open AI Assistant"
        className="fixed bottom-6 right-6 p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-2xl hover:shadow-cyan-500/20 transition-all flex items-center justify-center group z-50 focus:outline-none"
      >
        <Sparkles className="w-6 h-6 group-hover:scale-110 transition-transform" />
      </button>
    );
  }

  return (
    <div
      className={`fixed z-50 flex flex-col bg-white border border-slate-200 shadow-2xl overflow-hidden transition-all duration-300 ease-in-out ${
        isExpanded
          ? "inset-4 md:inset-10 rounded-2xl"
          : "bottom-6 right-6 w-[400px] h-[600px] rounded-2xl"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-600 to-indigo-800 text-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-base leading-tight">
              ClickFlash Intelligence
            </h3>
            <p className="text-xs text-indigo-200">Online and ready</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? "Minimize chat" : "Expand chat"}
            aria-label={isExpanded ? "Minimize chat" : "Expand chat"}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors focus:outline-none"
          >
            {isExpanded ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            title="Close AI Assistant"
            aria-label="Close AI Assistant"
            className="p-2 hover:bg-white/10 rounded-lg transition-colors focus:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "ai" && (
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mr-3 mt-1">
                <Bot className="w-4 h-4 text-indigo-600" />
              </div>
            )}

            <div
              className={`max-w-[80%] rounded-2xl px-5 py-3 ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white rounded-tr-sm"
                  : "bg-white border border-slate-200 text-slate-700 shadow-sm rounded-tl-sm"
              }`}
            >
              <div className="text-sm font-medium leading-relaxed whitespace-pre-wrap">
                {msg.content}
              </div>
              <div
                className={`text-[10px] mt-2 font-medium ${msg.role === "user" ? "text-indigo-200" : "text-slate-400"}`}
              >
                {msg.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>

            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0 ml-3 mt-1 text-slate-600">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex w-full justify-start">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mr-3 mt-1">
              <Bot className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="bg-white border border-slate-200 px-5 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
              <span className="text-sm text-slate-500 font-medium animate-pulse">
                Analyzing ecosystem data...
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100 shrink-0">
        <div className="flex flex-wrap gap-2 mb-3">
          {[
            "Top performer today?",
            "Low revenue hotels?",
            "Sync health status",
          ].map((prompt) => (
            <button
              key={prompt}
              onClick={() => {
                setInput(prompt);
                // Optional: auto-send if desired
                // handleSendMessage();
              }}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors border border-slate-200"
            >
              {prompt}
            </button>
          ))}
        </div>
        <div className="relative flex items-center">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Ask about photographer performance, hotel audits, or network stats..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-12 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
            rows={2}
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            title="Send message"
            aria-label="Send message"
            className="absolute right-3 p-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-lg transition-colors focus:outline-none"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="text-center mt-3">
          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
            Powered by {aiSettings?.defaultModel || "Gemini 2.5 Flash"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default EcosystemAiChat;
