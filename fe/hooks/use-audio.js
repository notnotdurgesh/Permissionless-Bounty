import { useState, useRef, useCallback, useEffect } from "react"
export const useTranscription = () => {
    const [transcript, setTranscript] = useState('')
    const [isTranscribing, setIsTranscribing] = useState(false)
    const [error, setError] = useState(null)
    
    const recognitionRef = useRef(null)
    const pauseTimeoutRef = useRef(null)
    const transcriptBufferRef = useRef('')
    const restartTimeoutRef = useRef(null)
    
    const initializeRecognition = useCallback(() => {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        setError('Speech recognition is not supported in this browser')
        return null
      }
  
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition
      const recognition = new SpeechRecognition()
  
      // Configure recognition settings
      recognition.continuous = true
      recognition.interimResults = true
      recognition.maxAlternatives = 3
      recognition.lang = 'en-US'
  
      // Helper to handle recognition restart
      const handleRecognitionRestart = () => {
        if (restartTimeoutRef.current) {
          clearTimeout(restartTimeoutRef.current)
        }
        
        restartTimeoutRef.current = setTimeout(() => {
          if (!recognitionRef.current) return
          try {
            recognition.start()
          } catch (err) {
            if (err.name === 'NotAllowedError') {
              setError('Microphone access denied')
            } else {
              console.error('Recognition restart error:', err)
              setError('Failed to restart speech recognition')
            }
          }
        }, 1000)
      }
  
      recognition.onstart = () => {
        setIsTranscribing(true)
        setError(null)
      }
  
      recognition.onerror = (event) => {
        console.error('Recognition error:', event)
        
        switch (event.error) {
          case 'not-allowed':
            setError('Microphone access denied')
            break
          case 'audio-capture':
            setError('No microphone detected')
            break
          case 'network':
            setError('Network error occurred')
            handleRecognitionRestart()
            break
          case 'no-speech':
            // Don't set error, just restart
            handleRecognitionRestart()
            break
          case 'aborted':
            // Intentional stop, don't restart
            break
          default:
            setError(`Recognition error: ${event.error}`)
            handleRecognitionRestart()
        }
      }
  
      recognition.onend = () => {
        setIsTranscribing(false)
        handleRecognitionRestart()
      }
  
      // Advanced result handling with confidence scoring
      recognition.onresult = (event) => {
        let interimTranscript = ''
        let finalTranscript = ''
        let highestConfidence = 0
        let bestAlternative = ''
  
        if (pauseTimeoutRef.current) {
          clearTimeout(pauseTimeoutRef.current)
        }
  
        // Process all results
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          
          // Check all alternatives for the highest confidence
          for (let j = 0; j < result.length; j++) {
            if (result[j].confidence > highestConfidence) {
              highestConfidence = result[j].confidence
              bestAlternative = result[j].transcript
            }
          }
  
          if (result.isFinal) {
            finalTranscript = bestAlternative
            
            // Smart punctuation and formatting
            finalTranscript = finalTranscript
              .trim()
              .replace(/^\w/, c => c.toUpperCase()) // Capitalize first letter
              .replace(/\s+/g, ' ') // Remove extra spaces
              .replace(/\b(\w+)\s+\1\b/gi, '$1') // Remove immediate word repetition
            
            transcriptBufferRef.current += finalTranscript + ' '
          } else {
            interimTranscript = bestAlternative
          }
        }
  
        // Update the visible transcript
        setTranscript(transcriptBufferRef.current + interimTranscript)
  
        // Set timeout to detect natural pauses
        pauseTimeoutRef.current = setTimeout(() => {
          if (transcriptBufferRef.current.trim()) {
            // Here you could send the completed transcript chunk for processing
            // or trigger any other actions needed when a natural pause occurs
            console.log('Completed transcript chunk:', transcriptBufferRef.current)
            transcriptBufferRef.current = ''
            setTranscript('')
          }
        }, 2000) // 2 second natural pause detection
      }
  
      return recognition
    }, [])
  
    // Start transcription
    const startTranscription = useCallback(() => {
      if (!recognitionRef.current) {
        recognitionRef.current = initializeRecognition()
      }
  
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start()
        } catch (err) {
          if (err.name === 'NotAllowedError') {
            setError('Microphone access denied')
          } else {
            console.error('Start transcription error:', err)
            setError('Failed to start transcription')
          }
        }
      }
    }, [initializeRecognition])
  
    // Stop transcription
    const stopTranscription = useCallback(() => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
          recognitionRef.current = null
        } catch (err) {
          console.error('Stop transcription error:', err)
        }
      }
  
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current)
      }
  
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current)
      }
  
      transcriptBufferRef.current = ''
      setTranscript('')
      setIsTranscribing(false)
    }, [])
  
    // Cleanup
    useEffect(() => {
      return () => {
        stopTranscription()
      }
    }, [stopTranscription])
  
    return {
      transcript,
      isTranscribing,
      error,
      startTranscription,
      stopTranscription
    }
  }