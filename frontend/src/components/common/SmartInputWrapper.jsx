import React, { useState, useEffect, useRef } from "react";
import { Mic, Sparkles, Loader2, X, Globe } from "lucide-react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";

/**
 * SmartInputWrapper
 * Wraps any text input/textarea and adds AI + Voice capabilities.
 */
const SmartInputWrapper = ({ children, onValueChange, value, onAudioRecorded }) => {
  const [showToolbar, setShowToolbar] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [lang, setLang] = useState("bn-BD"); 
  const containerRef = useRef(null);
  
  // Use refs for recognition to avoid closure staleness
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunks = useRef([]);
  const lastBaseValue = useRef("");

  // Sync value to ref
  useEffect(() => {
    if (!isRecording) {
      lastBaseValue.current = value || "";
    }
  }, [value, isRecording]);

  const stopAll = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    setIsRecording(false);
  };

  const toggleSpeech = async () => {
    if (isRecording) {
      stopAll();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunks.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });
        if (onAudioRecorded) onAudioRecorded(audioFile);
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Voice recognition is not supported in this browser.");
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = lang;
      recognition.interimResults = true;
      recognition.continuous = true;

      recognition.onstart = () => setIsRecording(true);
      recognition.onend = () => setIsRecording(false);
      recognition.onerror = (event) => {
        console.error("Speech Recognition Error:", event.error);
        setIsRecording(false);
      };

      recognition.onresult = (event) => {
        let sessionTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          sessionTranscript += event.results[i][0].transcript;
        }
        
        const finalValue = lastBaseValue.current 
          ? `${lastBaseValue.current.trim()} ${sessionTranscript.trim()}`
          : sessionTranscript.trim();
        
        onValueChange(finalValue);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.error("Voice system failed:", err);
      setIsRecording(false);
    }
  };

  return (
    <div className="relative group" ref={containerRef}>
      <div onFocus={() => setShowToolbar(true)} className="w-full">
        {children}
      </div>

      <AnimatePresence>
        {showToolbar && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute -top-12 right-0 z-[9999] flex items-center gap-1.5 p-1.5 rounded-full bg-white shadow-2xl border border-teal-100"
          >
            <button
              onClick={(e) => {
                e.preventDefault();
                if (isRecording) return;
                setLang(prev => prev === "bn-BD" ? "en-US" : "bn-BD");
              }}
              className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-black rounded-full transition-all border ${
                lang === "bn-BD"
                  ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                  : "bg-white text-teal-600 border-teal-100"
              }`}
            >
              <Globe size={12} className={lang === "bn-BD" ? "animate-pulse" : ""} />
              {lang === "bn-BD" ? "বাংলা (বাং)" : "ENGLISH (EN)"}
            </button>

            <div className="w-[1px] h-4 bg-gray-100 mx-1" />

            <button
              onClick={(e) => {
                e.preventDefault();
                toggleSpeech();
              }}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                isRecording 
                ? "bg-red-500 text-white shadow-lg" 
                : "bg-teal-50 text-teal-700 hover:bg-teal-100"
              }`}
            >
              {isRecording ? <div className="w-2.5 h-2.5 rounded-full bg-white animate-ping" /> : <Mic size={14} />}
              {isRecording ? "LIVE" : "START VOICE"}
            </button>

            <button 
              onClick={(e) => {
                e.preventDefault();
                setShowToolbar(false);
              }}
              className="p-1.5 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SmartInputWrapper;
