import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import api from '../services/api';

const MayorChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: "Hello Mayor. I am your Smart Civic Assistant. I can generate an AI summary of recent city complaints. Which timeframe would you like to review?",
      showActions: true
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleTimeframeRequest = async (label, timeframe) => {
    // 1. Add user message
    const userMsg = {
      id: Date.now(),
      type: 'user',
      text: `I'd like the summary for ${label.toLowerCase()}.`
    };
    
    // Disable actions on previous bot messages
    setMessages(prev => prev.map(m => ({ ...m, showActions: false })).concat(userMsg));
    setIsLoading(true);

    try {
      // 2. Fetch from backend
      const response = await api.post('/mayor/chat-briefing', { timeframe });
      
      // 3. Add bot response
      const botMsg = {
        id: Date.now() + 1,
        type: 'bot',
        text: response.data.summary,
        showActions: true // Allow asking for another timeframe
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'bot',
        text: "I'm sorry Mayor, I encountered an error while analyzing the city data. Please try again later.",
        showActions: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const timeframeOptions = [
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' }
  ];

  return (
    <>
      {/* FAB - Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-teal-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-teal-700 transition-all z-50 group"
      >
        <MessageSquare className="group-hover:scale-110 transition-transform" />
        <span className="absolute -top-2 -right-2 flex h-5 w-5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-5 w-5 bg-teal-500 border-2 border-white items-center justify-center">
             <Sparkles size={10} className="text-white" />
          </span>
        </span>
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="fixed bottom-24 right-6 w-[380px] h-[550px] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden z-50"
          >
            {/* Header */}
            <div className="bg-teal-600 p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-500/50 rounded-full flex items-center justify-center border border-teal-400">
                  <Bot size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Smart Mayor Assistant</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    <span className="text-[10px] opacity-80 uppercase tracking-wider font-semibold">City Intelligence Active</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-teal-700 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 custom-scrollbar"
            >
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] flex gap-2 ${msg.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      msg.type === 'bot' ? 'bg-teal-100 text-teal-600' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {msg.type === 'bot' ? <Bot size={16} /> : <User size={16} />}
                    </div>
                    <div className="space-y-2">
                      <div className={`p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        msg.type === 'bot' 
                          ? 'bg-white text-gray-800 rounded-tl-none border border-gray-100' 
                          : 'bg-teal-600 text-white rounded-tr-none'
                      }`}>
                        {msg.text}
                      </div>
                      
                      {/* Bot Pill Actions */}
                      {msg.type === 'bot' && msg.showActions && !isLoading && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {timeframeOptions.map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => handleTimeframeRequest(opt.label, opt.value)}
                              className="px-3 py-1.5 bg-white border border-teal-200 text-teal-700 rounded-full text-xs font-semibold hover:bg-teal-50 hover:border-teal-300 transition-all shadow-sm flex items-center gap-1"
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center">
                      <Bot size={16} />
                    </div>
                    <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm flex items-center gap-2">
                      <Loader2 className="animate-spin text-teal-500" size={16} />
                      <span className="text-xs text-gray-500 font-medium italic">Analyzing city data...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-white">
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-xl text-gray-400 italic text-[11px]">
                Note: This AI uses Llama 3 to summarize the latest 50 complaints within the selected timeframe.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MayorChatbot;
