'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NotFound() {
  const router = useRouter();
  const [glitchText, setGlitchText] = useState('404');
  const [currentQuote, setCurrentQuote] = useState(0);

  const legalQuotes = [
    "Objection! This page does not exist in the court of law.",
    "The evidence shows this page has been dismissed.",
    "This URL has been found guilty of non-existence.",
    "Case closed: Page not found in the legal database.",
    "The jury has ruled: This page is missing in action."
  ];

  const glitchVariations = ['404', '4∅4', '4□4', '40⧫', '※0※', '404'];

  // Glitch effect for the 404 text
  useEffect(() => {
    const glitchInterval = setInterval(() => {
      const randomGlitch = glitchVariations[Math.floor(Math.random() * glitchVariations.length)];
      setGlitchText(randomGlitch);
      
      // Reset to normal after a brief moment
      setTimeout(() => setGlitchText('404'), 150);
    }, 2000);

    return () => clearInterval(glitchInterval);
  }, []);

  // Cycle through legal quotes
  useEffect(() => {
    const quoteInterval = setInterval(() => {
      setCurrentQuote((prev) => (prev + 1) % legalQuotes.length);
    }, 3000);

    return () => clearInterval(quoteInterval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 relative overflow-hidden">
      {/* Animated background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-3/4 left-3/4 w-96 h-96 bg-violet-500/15 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Scanlines effect */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent animate-pulse"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6 text-center">
        
        {/* Glitch 404 */}
        <div className="mb-8">
          <h1 className={`text-9xl md:text-[12rem] font-black mb-4 transition-all duration-150 ${
            glitchText !== '404' 
              ? 'text-red-400 animate-pulse filter drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]' 
              : 'bg-gradient-to-r from-red-400 via-purple-400 to-blue-400 bg-clip-text text-transparent'
          }`}>
            {glitchText}
          </h1>
          
          {/* Subtitle with typewriter effect */}
          <div className="relative">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
              PAGE NOT FOUND
            </h2>
            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-1 bg-gradient-to-r from-red-400 to-blue-400 animate-pulse"></div>
          </div>
        </div>

        {/* Glass morphism card with legal quotes */}
        <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 max-w-2xl w-full mb-12 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/0 rounded-2xl"></div>
          
          <div className="relative z-10">
            {/* Legal scales icon */}
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-500/30 to-orange-500/30 rounded-full flex items-center justify-center mx-auto mb-6 border border-yellow-400/40">
              <span className="text-3xl">⚖️</span>
            </div>
            
            {/* Cycling legal quotes */}
            <p className="text-xl text-white/90 font-medium leading-relaxed min-h-[3rem] flex items-center justify-center">
              <span className="animate-fade-in">{legalQuotes[currentQuote]}</span>
            </p>
            
            {/* Case number */}
            <div className="mt-6 pt-4 border-t border-white/20">
              <p className="text-sm text-white/60 font-mono">
                Case #404-{new Date().getFullYear()}-NF • Status: DISMISSED
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
          <Link
            href="/"
            className="group relative overflow-hidden px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl border border-blue-500/30"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            <span className="relative flex items-center justify-center gap-2">
              🏠 Return Home
            </span>
          </Link>
          
          <button
            onClick={() => router.back()}
            className=" cursor-pointer group relative overflow-hidden px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl border border-purple-500/30"
          >
            <div className=" absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            <span className="relative flex items-center justify-center gap-2">
              ← Go Back
            </span>
          </button>
        </div>

        {/* Fun legal disclaimer */}
        <div className="mt-12 text-center max-w-lg">
          <p className="text-sm text-white/50 italic">
            "The court hereby declares this page missing without a trace. 
            Any resemblance to existing pages, living or dead, is purely coincidental."
          </p>
        </div>
      </div>

      {/* Custom styles for animations */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
