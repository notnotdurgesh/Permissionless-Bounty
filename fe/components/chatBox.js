'use client'
import { useState, useEffect } from 'react'

const ChatDisplay = ({ userTranscript, isProcessing }) => {
  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-lg">
      {/* Static background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600" />
      
      {/* Decorative rotating rings */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-96 h-96 border-4 border-white/20 rounded-full animate-[spin_8s_linear_infinite]" />
        <div className="absolute w-72 h-72 border-4 border-white/30 rounded-full animate-[spin_6s_linear_infinite_reverse]" />
        <div className="absolute w-48 h-48 border-4 border-white/40 rounded-full animate-[spin_4s_linear_infinite]" />
      </div>
      
      {/* Content container */}
      <div className="relative z-10 w-full max-w-2xl p-6">
        <div className="bg-white/10 backdrop-blur-xl rounded-lg p-4 shadow-xl">
          {/* User transcript display */}
          <div className="mb-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-sm font-medium text-white">You</span>
              </div>
              <div className="flex-1">
                <p className="text-white text-lg">
                  {userTranscript || "Waiting for your input..."}
                </p>
              </div>
            </div>
          </div>

          {/* Processing indicator */}
          {isProcessing && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-sm font-medium text-white">AI</span>
              </div>
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-white rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-75" />
                <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-150" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ChatDisplay