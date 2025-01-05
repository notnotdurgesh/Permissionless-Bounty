import React, { useEffect, useRef, useState } from 'react';

const AudioStreamPlayer = ({ transcript, meetingId, context, imagesData, setLast3Seconds }) => {
  const [audioData, setAudioData] = useState(new Array(32).fill(100));
  const [isProcessing, setIsProcessing] = useState(false);
  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const analyzerRef = useRef(null);
  const mediaSourceRef = useRef(null);
  const audioBufferRef = useRef(null);
  const visualizerFrameRef = useRef(null);

  useEffect(() => {
    const initializeAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        analyzerRef.current = audioContextRef.current.createAnalyser();
        analyzerRef.current.fftSize = 64;
        analyzerRef.current.connect(audioContextRef.current.destination);
      }

      // Ensure AudioContext is resumed on user interaction
      const resumeAudioContext = () => {
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume().catch((error) => {
            console.error('Failed to resume audio context:', error);
          });
        }
      };

      // Add event listeners for user interaction
      document.addEventListener('mousedown', resumeAudioContext, { once: true });
      document.addEventListener('touchstart', resumeAudioContext, { once: true });
    };

    const startStreaming = async () => {
      if (!transcript || !meetingId) return;
      
      try {
        setIsProcessing(true);
        initializeAudio();
        let response;
        if (imagesData && imagesData.length > 0){
          response = await fetch('http://localhost:3000/api/ai/analyze-image-stream', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              images: imagesData,
              meetingId,
              question: transcript,
            })
          });
          setLast3Seconds([])
  
        }
        else{
          response = await fetch('http://localhost:3000/api/ai/stream', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              data: transcript,
              meetingId,
              context
            })
          });
  
        }

        if (!response.ok) {
          throw new Error(`Stream request failed: ${response.status}`);
        }

        mediaSourceRef.current = new MediaSource();
        audioBufferRef.current = new Audio();
        audioBufferRef.current.src = URL.createObjectURL(mediaSourceRef.current);

        const reader = response.body.getReader();
        let sourceBuffer;

        mediaSourceRef.current.addEventListener('sourceopen', () => {
          sourceBuffer = mediaSourceRef.current.addSourceBuffer('audio/mpeg');
          processStream(reader, sourceBuffer);
        });

        audioBufferRef.current.play().catch(error => {
          console.error('Audio playback failed:', error);
        });

      } catch (error) {
        console.error('Streaming error:', error);
        setIsProcessing(false);
      }
    };

    const processStream = async (reader, sourceBuffer) => {
      const processChunk = async () => {
        try {
          const { value, done } = await reader.read();
          
          if (done) {
            mediaSourceRef.current.endOfStream();
            setIsProcessing(false);
            return;
          }

          if (value && value.length > 0) {
            await appendBuffer(sourceBuffer, value);
            await processAudioData(value);
          }

          processChunk();
        } catch (error) {
          console.error('Error processing chunk:', error);
          setIsProcessing(false);
        }
      };

      processChunk();
    };

    const appendBuffer = (sourceBuffer, chunk) => {
      return new Promise((resolve, reject) => {
        if (!sourceBuffer.updating) {
          sourceBuffer.appendBuffer(chunk);
          sourceBuffer.addEventListener('updateend', resolve, { once: true });
          sourceBuffer.addEventListener('error', reject, { once: true });
        } else {
          sourceBuffer.addEventListener('updateend', () => {
            sourceBuffer.appendBuffer(chunk);
            sourceBuffer.addEventListener('updateend', resolve, { once: true });
            sourceBuffer.addEventListener('error', reject, { once: true });
          }, { once: true });
        }
      });
    };

    const processAudioData = async (chunk) => {
      try {
        const audioBuffer = await audioContextRef.current.decodeAudioData(chunk.buffer.slice());
        sourceNodeRef.current = audioContextRef.current.createBufferSource();
        sourceNodeRef.current.buffer = audioBuffer;
        sourceNodeRef.current.connect(analyzerRef.current);
        sourceNodeRef.current.start(0);

        updateVisualizer();
      } catch (error) {
        console.error('Error processing audio data:', error);
      }
    };

    const updateVisualizer = () => {
      if (!analyzerRef.current) return;

      const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
      analyzerRef.current.getByteFrequencyData(dataArray);
      
      setAudioData(Array.from(dataArray).map(value => (value / 255) * 100));
      
      visualizerFrameRef.current = requestAnimationFrame(updateVisualizer);
    };

    startStreaming();

    return () => {
      if (visualizerFrameRef.current) {
        cancelAnimationFrame(visualizerFrameRef.current);
      }
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
      }
      if (analyzerRef.current) {
        analyzerRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (mediaSourceRef.current && audioBufferRef.current) {
        URL.revokeObjectURL(audioBufferRef.current.src);
      }
    };
  }, [transcript, meetingId, context]);

  return (
    <div className="audio-visualizer">
      <div className="visualization-bars" style={{ display: 'flex', alignItems: 'flex-end', height: '50px' }}>
        {audioData.map((value, index) => (
          <div
            key={index}
            style={{
              width: '3px',
              height: `${value}%`,
              backgroundColor: '#4CAF50',
              margin: '0 1px',
              transition: 'height 0.1s ease'
            }}
          />
        ))}
      </div>
      {isProcessing && <div className="processing-indicator">Processing audio...</div>}
    </div>
  );
};

export default AudioStreamPlayer;
