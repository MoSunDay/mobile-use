import React, { useEffect, useRef, useState } from 'react';

interface DeviceStreamProps {
  sessionId: string;
  width?: string | number;
  height?: string | number;
  forceStop?: boolean;
}

export default function DeviceStream({
  sessionId,
  width,
  height,
  forceStop = false,
}: DeviceStreamProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const retryCountRef = useRef<number>(0);
  const MAX_RETRIES = 10;

  // Media Recorder related refs and state
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const canvasStreamRef = useRef<MediaStream | null>(null);
  const [recordedVideo, setRecordedVideo] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  // Function for stopping recording - declaring it here so it can be used by cleanupStreams
  const stopRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;

    try {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      console.log('MediaRecorder stopped');

      // Create video blob and URL
      setTimeout(() => {
        if (recordedChunksRef.current.length > 0) {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          const videoURL = URL.createObjectURL(blob);
          setRecordedVideo(videoURL);
          console.log('Video ready for playback:', videoURL);
        }
      }, 100); // Small delay to ensure all chunks are processed
    } catch (err) {
      console.error('Error stopping MediaRecorder:', err);
    }
  };

  // Function to clean up streams and create video
  const cleanupStreams = () => {
    // Close SSE connection
    if (eventSourceRef.current) {
      console.log('DeviceStream: Closing SSE connection');
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    }

    // Stop recording and finalize video
    stopRecording();
  };

  // Handle force stop from parent component
  useEffect(() => {
    if (forceStop && isConnected) {
      console.log('DeviceStream: Force stop requested');
      cleanupStreams();
    }
  }, [forceStop, isConnected]);

  useEffect(() => {
    // Connect to SSE stream
    const connectEventSource = () => {
      const eventSource = new EventSource(`/api/play?sessionId=${sessionId}`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('DeviceStream: SSE connected');
        setIsConnected(true);
        setError(null);
        // Reset retry counter on successful connection
        retryCountRef.current = 0;

        // Start recording when connected
        startRecording();
      };

      eventSource.onmessage = event => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        try {
          const img = new Image();
          img.src = event.data;
          img.onload = () => {
            const imgWidth = img.width;
            const imgHeight = img.height;
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;

            // Calculate scaling factors to maintain aspect ratio
            const scaleX = canvasWidth / imgWidth;
            const scaleY = canvasHeight / imgHeight;
            const scale = Math.min(scaleX, scaleY);

            // Calculate the new dimensions of the image
            const newWidth = imgWidth * scale;
            const newHeight = imgHeight * scale;

            // Calculate the position to center the image on the canvas
            const x = (canvasWidth - newWidth) / 2;
            const y = (canvasHeight - newHeight) / 2;

            ctx.clearRect(0, 0, canvasWidth, canvasHeight); // Clear the canvas
            ctx.drawImage(img, x, y, newWidth, newHeight); // Draw the scaled image
          };
        } catch (err) {
          console.error('Error processing event:', err);
        }
      };

      eventSource.onerror = () => {
        console.error('DeviceStream: SSE connection error');
        setIsConnected(false);
        eventSource.close();

        // Increment retry counter
        retryCountRef.current += 1;

        if (retryCountRef.current <= MAX_RETRIES) {
          // Try to reconnect after a delay with backoff
          const delay = Math.min(1000 * Math.pow(1.5, retryCountRef.current - 1), 5000);
          console.log(`DeviceStream: Retry ${retryCountRef.current}/${MAX_RETRIES} in ${delay}ms`);
          setError(`DeviceStream: Retrying (${retryCountRef.current}/${MAX_RETRIES})...`);

          setTimeout(() => {
            if (
              !eventSourceRef.current ||
              eventSourceRef.current.readyState === EventSource.CLOSED
            ) {
              connectEventSource();
            }
          }, delay);
        } else {
          // Max retries reached, stop attempting to reconnect
          console.error('DeviceStream: Max retry attempts reached');
          setError(
            'Connection failed after multiple attempts. Showing recorded session playback...'
          );

          // Stop recording and prepare video for playback
          stopRecording();
        }
      };
    };

    // Start recording from canvas
    const startRecording = () => {
      if (!canvasRef.current) return;

      try {
        // Get media stream from canvas
        canvasStreamRef.current = canvasRef.current.captureStream(30); // 30 FPS

        if (!canvasStreamRef.current) {
          console.error('Failed to get canvas stream');
          return;
        }

        // Create media recorder
        const mediaRecorder = new MediaRecorder(canvasStreamRef.current, {
          mimeType: 'video/webm;codecs=vp9',
          videoBitsPerSecond: 1500000, // 1.5 Mbps
        });

        mediaRecorderRef.current = mediaRecorder;
        recordedChunksRef.current = [];

        // Handle data available event
        mediaRecorder.ondataavailable = event => {
          if (event.data && event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        // Start recording
        mediaRecorder.start(1000); // Collect data every second
        setIsRecording(true);
        console.log('MediaRecorder started');
      } catch (err) {
        console.error('Error starting MediaRecorder:', err);
      }
    };

    // Reset retry counter and start the connection
    retryCountRef.current = 0;
    connectEventSource();

    // Cleanup function
    return () => {
      cleanupStreams();

      // Stop canvas stream
      if (canvasStreamRef.current) {
        canvasStreamRef.current.getTracks().forEach(track => track.stop());
      }

      // Revoke video URL
      if (recordedVideo) {
        URL.revokeObjectURL(recordedVideo);
      }
    };
  }, [sessionId]);

  // Adjust canvas size when window resizes
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const container = canvas.parentElement;
      if (!container) return;

      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };

    window.addEventListener('resize', handleResize);
    // Initial size
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div style={{ width, height, position: 'relative' }}>
      {/* Canvas for streaming content */}
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: recordedVideo ? 'none' : 'block',
        }}
      />

      {/* Video player for recorded content */}
      {recordedVideo && (
        <video
          src={recordedVideo}
          style={{
            width: '100%',
            height: '100%',
          }}
          controls
          autoPlay={false}
          loop={false}
        />
      )}

      {!isConnected && !recordedVideo && (
        <div style={{ position: 'absolute', top: 0, display: 'flex', alignItems: 'center' }}>
          {error ? error : 'Connecting to device session...'}
        </div>
      )}

      {isRecording && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            backgroundColor: 'rgba(255,0,0,0.7)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
          }}
        >
          REC
        </div>
      )}
    </div>
  );
}
