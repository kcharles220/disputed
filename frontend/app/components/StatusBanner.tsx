'use client';

import { useStatus } from "../lib/status-provider";
import { useState } from "react";

export default function StatusBanner() {
  const { serverDown } = useStatus();
  const [isDismissed, setIsDismissed] = useState(false);
  
  if (!serverDown || isDismissed) return null;

  const serverUrl = process.env.NEXT_PUBLIC_HTTPS_SERVER_URL + ':' + process.env.HTTPS_PORT;

  const handleVisitServer = () => {
    window.open(`${serverUrl}/fix`, '_blank');
  };
  
  const handleDismiss = () => {
    setIsDismissed(true);
  };

  return (
    <div className="fixed top-0 left-0 w-full z-[9999] animate-slideDown">
      {/* Gradient Background with Animated Border */}
      <div className="relative bg-gradient-to-r from-red-600 via-red-700 to-red-800 border-b-4 border-red-400 shadow-2xl">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/20 to-transparent animate-shimmer"></div>
        
        {/* Main Content */}
        <div className="relative px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
          {/* Icon and Message */}
          <div className="flex items-center space-x-4 flex-1">
            {/* Animated Warning Icon */}
            <div className="relative">
              <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center ">
                <svg className="w-6 h-6 text-red-800" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              {/* Pulsing Ring */}
              <div className="absolute inset-0 w-10 h-10 border-2 border-yellow-400 rounded-full animate-ping opacity-30"></div>
            </div>

            {/* Text Content */}
            <div className="text-white">
              <div className="font-bold text-lg mb-1 flex items-center">
                🔒 SSL Certificate Required
                <span className="ml-2 px-2 py-1 bg-yellow-400 text-red-800 text-xs font-semibold rounded-full ">
                  ACTION NEEDED
                </span>
              </div>
              <div className="text-red-100 text-sm leading-relaxed max-w-2xl">
                Your browser needs to trust our self-signed certificate to connect securely. 
                <span className="font-semibold text-yellow-200"> Click the button to proceed safely!</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3 ml-6">
            {/* Primary Action Button */}
            <button
              onClick={handleVisitServer}
              className="group relative px-6 py-3 bg-gradient-to-r from-yellow-400 to-yellow-500 text-red-900 font-bold rounded-lg transform transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95"
            >
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 group-hover:rotate-12 transition-transform duration-200" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                <span>Fix Connection</span>
              </div>
              {/* Button Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-lg blur opacity-30 group-hover:opacity-50 transition-opacity duration-200 -z-10"></div>
            </button>

            {/* Dismiss Button */}
            <button
              onClick={handleDismiss}
              className="p-2 text-red-200 hover:text-white hover:bg-red-600 rounded-lg transition-all duration-200 hover:scale-110"
              title="Dismiss notification"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {/* Progress Bar Animation */}
        <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400 animate-progress"></div>
      </div>
    </div>
  );
}
