'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Mic, MicOff, Video, VideoOff, PhoneOff, RefreshCw } from 'lucide-react'
import ChatDisplay from '@/components/chatBox'
import { useRouter } from 'next/navigation'
import AudioStreamPlayer from '@/components/AudioStreamPlayer';

export default function VideoRoom() {
  const router = useRouter()
  const [localStream, setLocalStream] = useState(null)
  const [isAudioMuted, setIsAudioMuted] = useState(true)
  const [isVideoOff, setIsVideoOff] = useState(true)
  const [isCameraLoading, setIsCameraLoading] = useState(false)
  const [error, setError] = useState(null)
  const [transcript, setTranscript] = useState('')
  const [finalTranscript, setFinalTranscript] = useState('hello boss')
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [recognitionErrors, setRecognitionErrors] = useState(0)
  const [ isProcessing, setIsProcessing] = useState(false)
  const [meetingData, setMeetingData] = useState({ meetingId: '', context: '' })
  const [cameraFacingMode, setCameraFacingMode] = useState('user') // Store camera facing mode (front/back)


  const localVideoRef = useRef(null)
  const streamCleanupRef = useRef(null)
  const recognitionRef = useRef(null)
  const pauseTimeoutRef = useRef(null)
  const audioContextRef = useRef(null)
  const audioAnalyserRef = useRef(null)
  const audioDataRef = useRef(new Uint8Array(1024))
  const recognitionRetryTimeoutRef = useRef(null)
  const [last3secFrames, setLast3secFrames] = useState([]) // State to hold frames
  const frameIntervalRef = useRef(null) // Ref to manage the interval


  const MAX_RECOGNITION_RETRIES = 3
  const NOISE_THRESHOLD = 30 
  const PAUSE_THRESHOLD = 1250 
  
  useEffect(() => {
    try {
      const userData = sessionStorage.getItem('userData')
      if (userData) {
        const parsedData = JSON.parse(userData)
        setMeetingData({
          meetingId: parsedData.meetingId || '',
          context: parsedData.context || ''
        })
      }
    } catch (err) {
      console.error('Error accessing session storage:', err)
      setError('Failed to load meeting data')
    }
  }, [])
  
  const toggleCamera = useCallback(() => {
    setCameraFacingMode(prevMode => (prevMode === 'user' ? 'environment' : 'user')) // Toggle between front and back camera
  }, [])


  const setupAudioAnalyser = useCallback((stream) => {
    try {
      if (!stream) return

      // Cleanup existing audio context
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }

      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const analyser = audioContext.createAnalyser()
      const source = audioContext.createMediaStreamSource(stream)
      
      analyser.fftSize = 2048
      analyser.smoothingTimeConstant = 0.8
      source.connect(analyser)
      
      audioContextRef.current = audioContext
      audioAnalyserRef.current = analyser

      // Start monitoring audio levels
      const checkAudioLevel = () => {
        if (audioAnalyserRef.current && !isAudioMuted) {
          audioAnalyserRef.current.getByteFrequencyData(audioDataRef.current)
          const average = audioDataRef.current.reduce((a, b) => a + b) / audioDataRef.current.length
          setAudioLevel(average)
          
          // Use audio level for intelligent pause detection
          if (average < NOISE_THRESHOLD) {
            startPauseDetection()
          }
        }
        requestAnimationFrame(checkAudioLevel)
      }
      
      checkAudioLevel()
    } catch (err) {
      console.error('Error setting up audio analyser:', err)
    }
  }, [isAudioMuted])

  const startPauseDetection = useCallback(() => {
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current)
    }

    pauseTimeoutRef.current = setTimeout(() => {
      if (transcript.trim()) {
        console.log('Natural pause detected, finalizing transcript:', transcript)
        
        // send the transcript to the endpoint /api/ai/stream the transcription should be passes in the data frield of this and the streamed audio should be handled as soon as it comes, it should play and interact with the AIWaitingAnimation which has a animation that responds to the audio 
      }
    }, PAUSE_THRESHOLD)
  }, [transcript])

  const errorMessages = {
    NotAllowedError: 'Camera access denied. Please allow camera and microphone access in your browser settings.',
    NotFoundError: 'No camera or microphone found. Please check your device connections.',
    NotReadableError: 'Camera or microphone is already in use by another application.',
    OverconstrainedError: 'Your device does not support the requested video quality.',
    TypeError: 'Your browser does not support video calls. Please use a modern browser.',
    SecurityError: 'Security error occurred. Please ensure you\'re using HTTPS.',
  }

  const initializeSpeechRecognition = useCallback(() => {
    if (!('webkitSpeechRecognition' in window)) {
      console.error('Speech recognition not supported')
      setError('Speech recognition not supported in this browser')
      return
    }

    const recognition = new window.webkitSpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      setIsTranscribing(true)
      setRecognitionErrors(0)
      console.log('Speech recognition started')
    }

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      setRecognitionErrors(prev => prev + 1)

      if (event.error === 'not-allowed') {
        setError('Microphone access denied for transcription')
      } else if (event.error === 'audio-capture') {
        setError('No microphone detected')
      } else if (recognitionErrors < MAX_RECOGNITION_RETRIES) {
        // Attempt to restart recognition after error
          recognitionRetryTimeoutRef.current = setTimeout(() => {
            if (!isAudioMuted && recognitionRef.current) {
              console.log('Attempting to restart speech recognition')
                recognition.start()
            }
          }, 1000)
      } else {
        setError('Speech recognition failed multiple times. Please refresh the page.')
      }
    }

    recognition.onend = () => {
      setIsTranscribing(false)
      console.log('Speech recognition ended')

      // Restart if not manually stopped and mic is still on
      if (!isAudioMuted && recognitionRef.current && recognitionErrors < MAX_RECOGNITION_RETRIES) {
        console.log('Restarting speech recognition')
        try {
          recognition.start()
        } catch (err) {
          console.error('Failed to restart recognition:', err)
        }
      }
    }

    recognition.onresult = (event) => {
      let interimTranscript = ''
      let finalTranscript = ''

      // Process results with confidence scores
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        const confidence = event.results[i][0].confidence

        if (confidence > 0.7) { // Only accept high-confidence results
          if (event.results[i].isFinal) {
            finalTranscript += addPunctuation(transcript)
          } else {
            interimTranscript += transcript
          }
        }
      }

      const currentTranscript = finalTranscript || interimTranscript
      setTranscript(currentTranscript)

      if (finalTranscript) {
        console.log('Final transcript:', finalTranscript)
        setFinalTranscript(finalTranscript)
        setIsProcessing((prev) => !prev)
        setTimeout(() => {
          setIsAudioMuted(true);
        }, PAUSE_THRESHOLD)
        console.log("recorded frames", last3secFrames)
      }
    }

    recognitionRef.current = recognition
    console.log('Speech recognition initialized')

    // Start recognition if audio is not muted
    if (!isAudioMuted) {
      try {
        recognition.start()
      } catch (err) {
        console.error('Failed to start recognition:', err)
      }
    }
  }, [isAudioMuted])

    // Helper function to add basic punctuation
    const addPunctuation = (text) => {
        // Add period if sentence ends without punctuation
        text = text.trim()
        if (!/[.!?]$/.test(text)) {
            text += '.'
        }
        // Capitalize first letter
        return text.charAt(0).toUpperCase() + text.slice(1)
        }
    
  // Clean up function
      const cleanupSpeechRecognition = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop()
          recognitionRef.current = null
        }
    
        if (recognitionRetryTimeoutRef.current) {
          clearTimeout(recognitionRetryTimeoutRef.current)
        }
    
        if (pauseTimeoutRef.current) {
          clearTimeout(pauseTimeoutRef.current)
        }
    
        if (audioContextRef.current) {
          audioContextRef.current.close()
          audioContextRef.current = null
        }
    
        setTranscript('')
        setIsTranscribing(false)
        setAudioLevel(0)
        setRecognitionErrors(0)
      }, [])
      
  const stopMediaTracks = useCallback(() => {
    console.log('Stopping media tracks')
    if (streamCleanupRef.current) {
      streamCleanupRef.current.getTracks().forEach(track => {
        console.log(`Stopping track: ${track.kind}`)
        track.stop()
      })
      streamCleanupRef.current = null
      setLocalStream(null)
    }

    if (recognitionRef.current) {
      console.log('Stopping speech recognition')
      recognitionRef.current.stop()
      recognitionRef.current = null
    }

    if (pauseTimeoutRef.current) {
      console.log('Clearing pause timeout')
      clearTimeout(pauseTimeoutRef.current)
    }
  }, [])

  const getMediaConstraints = (includeVideo = true, includeAudio = true) => {
    const constraints = {
      video: includeVideo ? {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: cameraFacingMode,
        frameRate: { ideal: 30 }
      } : false,
      audio: includeAudio ? {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      } : false
    }
    console.log('Media constraints:', constraints)
    return constraints
  }

  useEffect(() => {
    if (!localStream || !localVideoRef.current) return
    
    console.log('Setting up video element with local stream')
    const videoElement = localVideoRef.current
    videoElement.srcObject = localStream
    videoElement.muted = true
    
    const playVideo = async () => {
      try {
        await videoElement.play()
        console.log('Video playback started successfully')
      } catch (err) {
        console.error('Failed to play video:', err)
        setError('Failed to play video stream')
      }
    }

    videoElement.onloadedmetadata = playVideo

    const captureFrames = () => {
      const video = localVideoRef.current;
      if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;
  
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
  
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frameData = canvas.toDataURL('image/png');
      console.log(frameData.substring(0,30))
      setLast3secFrames((prevFrames) => {
        const newFrames = [...prevFrames, frameData];
        // Keep only the last 15 frames (approx. 3 seconds at 5 frames per second)
        return newFrames.slice(-1);
      });
    };
  
    frameIntervalRef.current = setInterval(captureFrames, 200);

    return () => {
      console.log('Cleaning up video element')
      videoElement.srcObject = null
      clearInterval(frameIntervalRef.current);
    }
  }, [localStream])


    // Effect for handling audio state changes
    useEffect(() => {
        if (!isAudioMuted) {
          initializeSpeechRecognition()
          if (localStream) {
            setupAudioAnalyser(localStream)
          }
        } else {
          cleanupSpeechRecognition()
        }
    
        return cleanupSpeechRecognition
      }, [isAudioMuted, localStream, initializeSpeechRecognition, setupAudioAnalyser, cleanupSpeechRecognition])
    
  const startLocalStream = useCallback(async (withVideo = true, withAudio = true) => {
    console.log('Starting local stream:', { withVideo, withAudio })
    if (!navigator.mediaDevices?.getUserMedia) {
      console.error('getUserMedia not supported')
      setError('Your browser does not support video calls')
      return
    }

    try {
      setIsCameraLoading(true)
      setError(null)
      stopMediaTracks()

      if (withVideo || withAudio) {
        console.log('Requesting media access')
        const stream = await navigator.mediaDevices.getUserMedia(getMediaConstraints(withVideo, withAudio))
        console.log('Media access granted')
        streamCleanupRef.current = stream
        setLocalStream(stream)
      } else {
        console.log('No media requested, clearing stream')
        streamCleanupRef.current = null
        setLocalStream(null)
      }
      
      setIsVideoOff(!withVideo)
      setIsAudioMuted(!withAudio)

    } catch (error) {
      console.error('Media access error:', error)
      setError(errorMessages[error.name] || error.message || 'Failed to start media devices')
      setIsVideoOff(true)
      setLast3secFrames([])
      setIsAudioMuted(true)
      streamCleanupRef.current = null
      setLocalStream(null)
    } finally {
      setIsCameraLoading(false)
    }
  }, [stopMediaTracks])

  useEffect(() => {
    console.log('Initial stream setup')
    startLocalStream(!isVideoOff, !isAudioMuted)
    return stopMediaTracks
  }, [startLocalStream, stopMediaTracks])
  
  const toggleAudio = useCallback(() => {
    console.log('Toggling audio:', { currentState: isAudioMuted })
    startLocalStream(!isVideoOff, isAudioMuted)
  }, [isVideoOff, isAudioMuted, startLocalStream])

  const toggleVideo = useCallback(() => {
    console.log('Toggling video:', { currentState: isVideoOff })
    startLocalStream(isVideoOff, !isAudioMuted)
    if (isVideoOff) setLast3secFrames([]);
  }, [isVideoOff, isAudioMuted, startLocalStream])

  return (
    <div className="w-full h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white relative overflow-hidden">
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        {error && (
          <button
            onClick={() => {
              console.log('Retrying media access')
              startLocalStream(!isVideoOff, !isAudioMuted)
            }}
            className="bg-blue-500 hover:bg-blue-400 text-white p-2 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
            aria-label="Retry camera"
          >
            <RefreshCw size={24} />
          </button>
        )}
      </div>
      <div className="flex flex-col h-full">
        <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
          <div className="relative rounded-2xl overflow-hidden shadow-lg bg-gradient-to-br from-blue-500 to-purple-600">
            {isCameraLoading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
              </div>
            ) : error ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                <div className="text-center p-4">
                  <p className="text-red-500 font-bold mb-2">Camera Error</p>
                  <p className="text-sm">{error}</p>
                  <button
                    onClick={() => startLocalStream(!isVideoOff, !isAudioMuted)}
                    className="mt-4 bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded-full text-sm"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : isVideoOff ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                <div className="w-32 h-32 rounded-full bg-gray-700 flex items-center justify-center text-4xl font-bold">
                  You
                </div>
              </div>
            ) : (
              <video 
                ref={localVideoRef}
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover mirror"
              />
            )}
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-3 py-1 rounded-full text-sm font-medium">
              You
            </div>
            {isAudioMuted && (
              <div className="absolute top-2 right-2 bg-red-500 p-1 rounded-full">
                <MicOff size={16} />
              </div>
            )}
            {!isAudioMuted && (
              <div className="absolute bottom-12 left-0 right-0 bg-black bg-opacity-50 p-2 transition-opacity duration-300">
                <p className="text-sm text-white">
                  {transcript || (isTranscribing ? 'Listening...' : 'Say something...')}
                </p>
              </div>
            )}
          </div>
          <div className="relative rounded-2xl overflow-hidden shadow-lg bg-gradient-to-br from-green-500 to-teal-600">

          <ChatDisplay userTranscript = {transcript} isProcessing={isProcessing} />
          <AudioStreamPlayer meetingId={meetingData.meetingId} context={meetingData.context} transcript={finalTranscript} imagesData = {last3secFrames} setLast3Seconds = {setLast3secFrames}/>
          </div>
        </div>
        <div className="bg-gray-800 bg-opacity-75 backdrop-blur-md p-6">
          <div className="flex justify-center space-x-6">
            <button
              onClick={toggleAudio}
              disabled={isCameraLoading}
              className={`p-4 rounded-full transition-all duration-200 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                isAudioMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
              } ${isCameraLoading && 'opacity-50 cursor-not-allowed'}`}
              aria-label={isAudioMuted ? 'Unmute audio' : 'Mute audio'}
            >
              {isAudioMuted ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
            <button
              onClick={toggleVideo}
              disabled={isCameraLoading}
              className={`p-4 rounded-full transition-all duration-200 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
              } ${isCameraLoading && 'opacity-50 cursor-not-allowed'}`}
              aria-label={isVideoOff ? 'Turn on video' : 'Turn off video'}
            >
              {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
            </button>
            <button
            onClick={toggleCamera}
            disabled={isCameraLoading}
            className={`p-4 rounded-full transition-all duration-200 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
              isCameraLoading && 'opacity-50 cursor-not-allowed'
            }`}
            aria-label="Flip camera"
          >
            <RefreshCw size={24} />
          </button>
            <button
              onClick={() => {
                console.log('Ending call and navigating to home')
                stopMediaTracks()
                router.push('/')
              }}
              className="bg-red-500 hover:bg-red-600 text-white p-4 rounded-full transition-all duration-200 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-red-400"
              aria-label="End call"
            >
              <PhoneOff size={24} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}