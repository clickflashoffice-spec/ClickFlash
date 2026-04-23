import React, { useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { MessageSquare, Bot, X, Send } from "lucide-react";

interface Message {
  id: string;
  text: string;
  sender: "ai" | "user";
  timestamp: string;
}

const AIChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello! I am PixelFounder AI. How can I assist you with network governance today?",
      sender: "ai",
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: "user",
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    try {
      const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
      if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE") {
        throw new Error("Gemini API Key missing. Please configure VITE_GEMINI_API_KEY.");
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      
      // Attempt to use the latest model but fallback to stable v1 behavior
      // Using gemini-2.0-flash-exp (requested auto-select pattern) with deep search context
      const model = genAI.getGenerativeModel(
        { model: "gemini-3-flash" }, 
        { apiVersion: "v1" } // Critical fix for 404/SDK mismatch
      );

      // Prepend system instruction to ensure it's used even if top-level field fails
      const prompt = `System Instruction: You are PixelFounder AI, the governance intelligence for ClickFlash Photography. 
      Your goal is to help HQ manage a network of photography sites. Focus on yield optimization, fleet triage, regional training needs, and B2B growth. 
      Use a professional, authoritative, but helpful tone.
      IMPORTANT: Perform deep analysis on the following user input.
      
      User Question: ${inputValue}`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      const aiMsg: Message = {
        id: Date.now().toString(),
        text: responseText,
        sender: "ai",
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (error: any) {
      console.error("AI PixelFounder Error:", error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: `Analysis error: ${error.message || "Failed to reach intelligence layer. Check API key permissions or model availability."}`,
        sender: "ai",
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Open AI Chat"
        className="fixed bottom-10 right-10 w-16 h-16 bg-[#38bdf8] rounded-full flex items-center justify-center text-[#070b14] shadow-[0_10px_25px_rgba(56,189,248,0.4)] transition-all hover:scale-110 z-[1000] border-2 border-white/50"
      >
        <MessageSquare className="w-8 h-8" />
      </button>

      {isOpen && (
        <div className="fixed bottom-28 right-10 w-96 bg-white rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.3)] border border-[#e2e8f0] flex flex-col overflow-hidden z-[1000] animate-in slide-in-from-bottom-5 duration-300">
          <div className="bg-[#070b14] text-white p-4 font-bold flex justify-between items-center border-b-2 border-[#38bdf8]">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-[#38bdf8]" />
              <span>PixelFounder AI</span>
            </div>
            <button onClick={() => setIsOpen(false)} title="Close AI Chat">
              <X className="w-5 h-5 text-[#94a3b8] hover:text-white transition-colors" />
            </button>
          </div>

          <div className="p-5 h-[350px] overflow-y-auto flex flex-col gap-3 bg-[#f8fafc]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`max-w-[85%] p-3 rounded-2xl text-[13px] leading-relaxed font-medium ${
                  msg.sender === "ai"
                    ? "bg-white border border-[#e2e8f0] self-start rounded-bl-none shadow-[0_2px_4px_rgba(0,0,0,0.02)] text-[#1e293b]"
                    : "bg-[#38bdf8] text-[#070b14] self-end rounded-br-none font-bold"
                }`}
              >
                {msg.text}
                <div className={`text-[10px] mt-1 ${msg.sender === "ai" ? "text-[#94a3b8]" : "text-[#070b14]/60"}`}>
                  {msg.timestamp}
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-white border-top border-[#e2e8f0] flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Type your mandate..."
              className="flex-1 p-3 bg-[#f1f5f9] border border-[#e2e8f0] rounded-lg outline-none text-[13px] font-medium focus:border-[#38bdf8]"
            />
            <button
              onClick={handleSendMessage}
              title="Send Message"
              className="bg-[#38bdf8] text-[#070b14] w-12 rounded-lg flex items-center justify-center hover:bg-[#0ea5e9] transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatBot;
