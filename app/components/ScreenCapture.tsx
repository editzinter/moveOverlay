"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { FaCamera, FaSpinner, FaCropSimple, FaXmark } from 'react-icons/fa6';

interface ScreenCaptureProps {
    onCapture: (imageBase64: string) => void;
    onClose: () => void;
    isDetecting: boolean;
}

const ScreenCapture: React.FC<ScreenCaptureProps> = ({ onCapture, onClose, isDetecting }) => {
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [selection, setSelection] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
    const [isSelecting, setIsSelecting] = useState(false);
    const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Start screen capture
    const startCapture = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    displaySurface: 'monitor',
                },
                audio: false,
            });

            setStream(mediaStream);
            setIsCapturing(true);

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                videoRef.current.play();
            }

            // Handle stream end
            mediaStream.getVideoTracks()[0].onended = () => {
                stopCapture();
            };
        } catch (err) {
            console.error('Error starting screen capture:', err);
        }
    };

    // Stop screen capture
    const stopCapture = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setIsCapturing(false);
        setSelection(null);
    }, [stream]);

    // Handle mouse events for selection
    const handleMouseDown = (e: React.MouseEvent) => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setStartPoint({ x, y });
        setIsSelecting(true);
        setSelection({ x, y, width: 0, height: 0 });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isSelecting || !startPoint || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;

        const x = Math.min(startPoint.x, currentX);
        const y = Math.min(startPoint.y, currentY);
        const width = Math.abs(currentX - startPoint.x);
        const height = Math.abs(currentY - startPoint.y);

        setSelection({ x, y, width, height });
    };

    const handleMouseUp = () => {
        setIsSelecting(false);
        setStartPoint(null);
    };

    // Capture the selected region
    const captureRegion = () => {
        if (!videoRef.current || !canvasRef.current || !selection || !containerRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const container = containerRef.current;

        // Calculate the scale between displayed video and actual video
        const displayWidth = container.offsetWidth;
        const displayHeight = container.offsetHeight;
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;

        const scaleX = videoWidth / displayWidth;
        const scaleY = videoHeight / displayHeight;

        // Scale selection to actual video coordinates
        const sourceX = selection.x * scaleX;
        const sourceY = selection.y * scaleY;
        const sourceWidth = selection.width * scaleX;
        const sourceHeight = selection.height * scaleY;

        // Set canvas size to selection size
        canvas.width = sourceWidth;
        canvas.height = sourceHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw the selected region
        ctx.drawImage(
            video,
            sourceX, sourceY, sourceWidth, sourceHeight,
            0, 0, sourceWidth, sourceHeight
        );

        // Convert to base64
        const imageBase64 = canvas.toDataURL('image/png');
        onCapture(imageBase64);

        // Stop capture after sending
        stopCapture();
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [stream]);

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-[#262522] rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-[#3d3b38]">
                    <h2 className="text-white text-lg font-bold flex items-center gap-2">
                        <FaCropSimple /> Select Chess Board Region
                    </h2>
                    <button
                        onClick={() => {
                            stopCapture();
                            onClose();
                        }}
                        className="text-[#989795] hover:text-white transition"
                    >
                        <FaXmark size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 p-4 overflow-auto">
                    {!isCapturing ? (
                        <div className="flex flex-col items-center justify-center h-64 gap-4">
                            <p className="text-[#989795] text-center">
                                Click the button below to share your screen.<br />
                                Then select the chess board region to capture.
                            </p>
                            <button
                                onClick={startCapture}
                                className="bg-[#81b64c] hover:bg-[#a2d371] text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition shadow-[0_4px_0_0_#45752c] active:translate-y-1 active:shadow-none"
                            >
                                <FaCamera /> Share Screen
                            </button>
                        </div>
                    ) : (
                        <div className="relative">
                            <div
                                ref={containerRef}
                                className="relative cursor-crosshair"
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                            >
                                <video
                                    ref={videoRef}
                                    className="w-full rounded-lg"
                                    autoPlay
                                    muted
                                    playsInline
                                />

                                {/* Selection overlay */}
                                {selection && selection.width > 0 && selection.height > 0 && (
                                    <div
                                        className="absolute border-2 border-[#81b64c] bg-[#81b64c]/20"
                                        style={{
                                            left: selection.x,
                                            top: selection.y,
                                            width: selection.width,
                                            height: selection.height,
                                        }}
                                    />
                                )}
                            </div>

                            {/* Instructions */}
                            <p className="text-[#989795] text-sm text-center mt-2">
                                Click and drag to select the chess board area
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {isCapturing && selection && selection.width > 50 && selection.height > 50 && (
                    <div className="p-4 border-t border-[#3d3b38] flex justify-end gap-2">
                        <button
                            onClick={() => setSelection(null)}
                            className="bg-[#3d3b38] hover:bg-[#4d4b48] text-white px-4 py-2 rounded font-bold transition"
                        >
                            Clear Selection
                        </button>
                        <button
                            onClick={captureRegion}
                            disabled={isDetecting}
                            className="bg-[#81b64c] hover:bg-[#a2d371] text-white px-6 py-2 rounded font-bold flex items-center gap-2 transition shadow-[0_4px_0_0_#45752c] active:translate-y-1 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isDetecting ? (
                                <>
                                    <FaSpinner className="animate-spin" /> Detecting...
                                </>
                            ) : (
                                <>
                                    <FaCamera /> Capture & Detect
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* Hidden canvas for image capture */}
            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
};

export default ScreenCapture;
