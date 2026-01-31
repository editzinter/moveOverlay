"use client";

import React from 'react';
import {
    FaArrowRotateLeft,
    FaArrowRotateRight,
    FaArrowsRotate,
    FaPlus,
    FaGear,
    FaCamera
} from "react-icons/fa6";

interface EnginePanelProps {
    evalScore: string;
    bestMove: string;
    onUndo?: () => void;
    onRedo?: () => void;
    onFlip?: () => void;
    onNewGame?: () => void;
    onDetect?: () => void;
    engineDepth?: number;
    setEngineDepth?: (depth: number) => void;
    engineLines?: number;
    setEngineLines?: (lines: number) => void;
    engineThreads?: number;
    setEngineThreads?: (threads: number) => void;
}

const EnginePanel: React.FC<EnginePanelProps> = ({
    evalScore,
    bestMove,
    onUndo,
    onRedo,
    onFlip,
    onNewGame,
    onDetect,
    engineDepth = 15,
    setEngineDepth,
    engineLines = 1,
    setEngineLines,
    engineThreads = 1,
    setEngineThreads
}) => {
    return (
        <div className="bg-[#262522] w-full max-w-sm rounded-lg overflow-hidden flex flex-col h-full shadow-lg border border-[#302e2b]">
            {/* Header / Eval */}
            <div className="bg-[#211F1C] p-6 text-center border-b border-[#302e2b]">
                <div className="text-[#989795] text-xs font-bold tracking-widest uppercase mb-1">Evaluation</div>
                <div className={`text-4xl font-black ${evalScore.startsWith('+') ? 'text-green-500' : evalScore.startsWith('-') ? 'text-red-500' : 'text-white'}`}>
                    {evalScore || "0.00"}
                </div>
                <div className="text-[#989795] text-xs mt-2">
                    Best Move: <span className="text-white font-mono bg-[#3d3b38] px-1 rounded">{bestMove || "-"}</span>
                </div>
            </div>

            <div className="p-4 flex-1 flex flex-col gap-6 overflow-y-auto">

                {/* Detect Position Button */}
                <button
                    onClick={onDetect}
                    className="bg-gradient-to-r from-[#5c7cfa] to-[#845ef7] hover:from-[#748ffc] hover:to-[#9775fa] text-white p-4 rounded-lg flex items-center justify-center gap-3 font-bold transition shadow-lg"
                >
                    <FaCamera size={20} /> Detect Position from Screen
                </button>

                {/* Controls */}
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={onUndo} className="bg-[#3d3b38] hover:bg-[#4d4b48] text-white p-3 rounded flex items-center justify-center gap-2 font-bold transition">
                        <FaArrowRotateLeft /> Undo
                    </button>
                    <button onClick={onRedo} className="bg-[#3d3b38] hover:bg-[#4d4b48] text-white p-3 rounded flex items-center justify-center gap-2 font-bold transition">
                        <FaArrowRotateRight /> Redo
                    </button>
                    <button onClick={onFlip} className="bg-[#3d3b38] hover:bg-[#4d4b48] text-white p-3 rounded flex items-center justify-center gap-2 font-bold transition">
                        <FaArrowsRotate /> Flip Board
                    </button>
                    <button onClick={onNewGame} className="bg-[#81b64c] hover:bg-[#a2d371] text-white p-3 rounded flex items-center justify-center gap-2 font-bold transition shadow-[0_4px_0_0_#45752c] active:translate-y-1 active:shadow-none">
                        <FaPlus /> New Game
                    </button>
                </div>

                {/* Engine Settings */}
                <div className="bg-[#211F1C] p-4 rounded-lg">
                    <h3 className="text-white font-bold flex items-center gap-2 mb-4">
                        <FaGear className="text-[#989795]" /> Engine Settings
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <label className="text-[#989795] text-xs font-bold block mb-2">DEPTH (STRENGTH)</label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="range"
                                    min="1"
                                    max="25"
                                    value={engineDepth}
                                    onChange={(e) => setEngineDepth?.(Number(e.target.value))}
                                    className="w-full accent-[#81b64c]"
                                />
                                <span className="text-white text-sm font-bold w-6">{engineDepth}</span>
                            </div>
                        </div>

                        <div>
                            <label className="text-[#989795] text-xs font-bold block mb-2">LINES (ARROWS)</label>
                            <select
                                value={engineLines}
                                onChange={(e) => setEngineLines?.(Number(e.target.value))}
                                className="w-full bg-[#302e2b] text-white p-2 rounded text-sm border-none outline-none cursor-pointer"
                            >
                                <option value={1}>1 Line (Best Move)</option>
                                <option value={2}>2 Lines</option>
                                <option value={3}>3 Lines</option>
                                <option value={4}>4 Lines</option>
                                <option value={5}>5 Lines</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-[#989795] text-xs font-bold block mb-2">THREADS (CPU)</label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="range"
                                    min="1"
                                    max="16"
                                    value={engineThreads}
                                    onChange={(e) => setEngineThreads?.(Number(e.target.value))}
                                    className="w-full accent-[#81b64c]"
                                />
                                <span className="text-white text-sm font-bold w-6">{engineThreads}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EnginePanel;
