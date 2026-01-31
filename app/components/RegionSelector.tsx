"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { FaCamera, FaSpinner, FaCropSimple, FaXmark, FaCheck, FaDisplay } from 'react-icons/fa6';

interface RegionSelectorProps {
    onRegionSet: (region: { x: number; y: number; width: number; height: number }) => void;
    onCapture: () => void;
    onClose: () => void;
    isDetecting: boolean;
    savedRegion: { x: number; y: number; width: number; height: number } | null;
}

const RegionSelector: React.FC<RegionSelectorProps> = ({
    onRegionSet,
    onCapture,
    onClose,
    isDetecting,
    savedRegion
}) => {
    const [isSelectingRegion, setIsSelectingRegion] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [selection, setSelection] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
    const [imageScale, setImageScale] = useState(1);

    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    // Capture screen preview
    const captureScreenPreview = async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: { displaySurface: 'monitor' },
                audio: false,
            });

            // Create video element
            const video = document.createElement('video');
            video.srcObject = stream;
            await video.play();
            await new Promise(resolve => setTimeout(resolve, 200));

            // Capture frame
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(video, 0, 0);

            // Stop stream immediately
            stream.getTracks().forEach(track => track.stop());

            // Set preview
            setPreviewImage(canvas.toDataURL('image/jpeg', 0.8));
            setIsSelectingRegion(true);
            setSelection(null);

        } catch (error) {
            console.error('Failed to capture screen:', error);
            if ((error as Error).name !== 'NotAllowedError') {
                alert('Could not capture screen. Please try again.');
            }
        }
    };

    // Handle drawing selection on preview
    const handleMouseDown = (e: React.MouseEvent) => {
        if (!containerRef.current || !imageRef.current) return;

        const rect = imageRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / imageScale;
        const y = (e.clientY - rect.top) / imageScale;

        setStartPoint({ x, y });
        setIsDrawing(true);
        setSelection({ x, y, width: 0, height: 0 });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDrawing || !startPoint || !imageRef.current) return;

        const rect = imageRef.current.getBoundingClientRect();
        const currentX = (e.clientX - rect.left) / imageScale;
        const currentY = (e.clientY - rect.top) / imageScale;

        const x = Math.min(startPoint.x, currentX);
        const y = Math.min(startPoint.y, currentY);
        const width = Math.abs(currentX - startPoint.x);
        const height = Math.abs(currentY - startPoint.y);

        setSelection({ x, y, width, height });
    };

    const handleMouseUp = () => {
        setIsDrawing(false);
        setStartPoint(null);
    };

    // Calculate scale when image loads
    const handleImageLoad = () => {
        if (imageRef.current && containerRef.current) {
            const scale = imageRef.current.width / imageRef.current.naturalWidth;
            setImageScale(scale);
        }
    };

    const handleConfirmRegion = () => {
        if (selection && selection.width > 50 && selection.height > 50) {
            // Round to integers
            const region = {
                x: Math.round(selection.x),
                y: Math.round(selection.y),
                width: Math.round(selection.width),
                height: Math.round(selection.height),
            };
            onRegionSet(region);
            setIsSelectingRegion(false);
            setPreviewImage(null);
        }
    };

    const handleCancel = () => {
        setIsSelectingRegion(false);
        setPreviewImage(null);
        setSelection(null);
    };

    return (
        <div className="bg-[#262522] rounded-lg p-4 border border-[#3d3b38]">
            <h3 className="text-white font-bold flex items-center gap-2 mb-4">
                <FaCropSimple className="text-[#989795]" /> Board Detection
            </h3>

            {!isSelectingRegion ? (
                <div className="space-y-3">
                    {savedRegion ? (
                        <div className="text-[#989795] text-sm bg-[#1e1d1b] p-2 rounded font-mono">
                            ✓ Region: {savedRegion.width}×{savedRegion.height} at ({savedRegion.x}, {savedRegion.y})
                        </div>
                    ) : (
                        <div className="text-[#989795] text-sm">
                            No region selected. Capture your screen to set the board area.
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button
                            onClick={captureScreenPreview}
                            className="flex-1 bg-[#3d3b38] hover:bg-[#4d4b48] text-white p-3 rounded flex items-center justify-center gap-2 font-bold transition"
                        >
                            <FaDisplay /> {savedRegion ? 'Change Region' : 'Select Region'}
                        </button>

                        {savedRegion && (
                            <button
                                onClick={onCapture}
                                disabled={isDetecting}
                                className="flex-1 bg-gradient-to-r from-[#5c7cfa] to-[#845ef7] hover:from-[#748ffc] hover:to-[#9775fa] text-white p-3 rounded flex items-center justify-center gap-2 font-bold transition disabled:opacity-50"
                            >
                                {isDetecting ? (
                                    <><FaSpinner className="animate-spin" /> Detecting...</>
                                ) : (
                                    <><FaCamera /> Capture</>
                                )}
                            </button>
                        )}
                    </div>

                    <p className="text-[#666] text-xs">
                        Tip: Position chess.com where you want it, then click "Select Region" to capture and mark the board.
                    </p>
                </div>
            ) : (
                <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
                    {/* Header */}
                    <div className="bg-[#262522] p-4 flex items-center justify-between border-b border-[#3d3b38]">
                        <h2 className="text-white font-bold">Draw a box around the chess board</h2>
                        <button onClick={handleCancel} className="text-[#989795] hover:text-white">
                            <FaXmark size={24} />
                        </button>
                    </div>

                    {/* Preview Area */}
                    <div
                        ref={containerRef}
                        className="flex-1 overflow-auto p-4 flex items-center justify-center cursor-crosshair"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    >
                        {previewImage && (
                            <div className="relative inline-block">
                                <img
                                    ref={imageRef}
                                    src={previewImage}
                                    alt="Screen capture"
                                    className="max-w-full max-h-[70vh] object-contain"
                                    onLoad={handleImageLoad}
                                    draggable={false}
                                />

                                {/* Selection overlay */}
                                {selection && selection.width > 0 && selection.height > 0 && (
                                    <div
                                        className="absolute border-4 border-[#81b64c] bg-[#81b64c]/20 pointer-events-none"
                                        style={{
                                            left: selection.x * imageScale,
                                            top: selection.y * imageScale,
                                            width: selection.width * imageScale,
                                            height: selection.height * imageScale,
                                        }}
                                    >
                                        {/* Grid lines 8x8 */}
                                        <div className="absolute inset-0 grid grid-cols-8 grid-rows-8">
                                            {Array.from({ length: 64 }).map((_, i) => (
                                                <div key={i} className="border border-[#81b64c]/40" />
                                            ))}
                                        </div>

                                        {/* Size label */}
                                        <div className="absolute -top-6 left-0 bg-[#81b64c] text-white text-xs px-2 py-1 rounded font-mono">
                                            {Math.round(selection.width)}×{Math.round(selection.height)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="bg-[#262522] p-4 border-t border-[#3d3b38] flex justify-center gap-4">
                        <button
                            onClick={handleCancel}
                            className="bg-[#3d3b38] hover:bg-[#4d4b48] text-white px-6 py-3 rounded-lg font-bold transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirmRegion}
                            disabled={!selection || selection.width < 50 || selection.height < 50}
                            className="bg-[#81b64c] hover:bg-[#a2d371] text-white px-6 py-3 rounded-lg font-bold transition shadow-[0_4px_0_0_#45752c] active:translate-y-1 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <FaCheck className="inline mr-2" /> Confirm Selection
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RegionSelector;
