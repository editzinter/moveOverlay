"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Chess } from "chess.js";
import ChessBoard from "./components/ChessBoard";
import EnginePanel from "./components/EnginePanel";

export default function Home() {
  const gameRef = useRef(new Chess());
  const [fen, setFen] = useState(gameRef.current.fen());
  const [boardOrientation, setBoardOrientation] = useState<"white" | "black">(
    "white",
  );

  // Engine State
  const [evalScore, setEvalScore] = useState("0.00");
  const [bestMoves, setBestMoves] = useState<string[]>([]);
  const [engineDepth, setEngineDepth] = useState(15);
  const [engineLines, setEngineLines] = useState(1);
  const [engineThreads, setEngineThreads] = useState(4); // Default to 4 threads for performance
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Run Stockfish Analysis on FEN change
  useEffect(() => {
    const analyzePosition = async () => {
      if (gameRef.current.isGameOver()) return;

      setIsAnalyzing(true);

      try {
        const response = await fetch("/api/stockfish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fen: fen,
            depth: engineDepth,
            multiPv: engineLines,
            threads: engineThreads,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.bestMoves && Array.isArray(data.bestMoves)) {
            setBestMoves(data.bestMoves);
          } else if (data.bestMove) {
            setBestMoves([data.bestMove]);
          }
          if (data.evaluation) {
            setEvalScore(data.evaluation);
          }
        }
      } catch (error) {
        console.error("Stockfish analysis failed:", error);
      } finally {
        setIsAnalyzing(false);
      }
    };

    const timeoutId = setTimeout(analyzePosition, 300);
    return () => clearTimeout(timeoutId);
  }, [fen, engineDepth, engineLines, engineThreads]);

  // -- Game Actions --
  const makeMove = useCallback(
    (move: { from: string; to: string; promotion?: string }) => {
      try {
        const result = gameRef.current.move(move);
        if (result) {
          setFen(gameRef.current.fen());
          return result;
        }
      } catch {
        return null;
      }
      return null;
    },
    [],
  );

  const handleUndo = useCallback(() => {
    const move = gameRef.current.undo();
    if (move) {
      setFen(gameRef.current.fen());
    }
  }, []);

  const handleFlip = useCallback(() => {
    setBoardOrientation((prev) => (prev === "white" ? "black" : "white"));
  }, []);

  const handleNewGame = useCallback(() => {
    gameRef.current = new Chess();
    setFen(gameRef.current.fen());
    setEvalScore("0.00");
    setBestMoves([]);
  }, []);

  // Detection State
  const [isPolling, setIsPolling] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState("");
  const lastTimestampRef = useRef(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // -- Detection Polling --
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return;

    setIsPolling(true);
    setDetectionStatus("Listening for updates...");

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch("http://localhost:8000/latest");
        if (response.ok) {
          const data = await response.json();

          if (
            data.has_detection &&
            data.timestamp > lastTimestampRef.current &&
            data.fen
          ) {
            lastTimestampRef.current = data.timestamp;

            // Smart Move Detection Logic
            try {
              // 1. Compare piece placement only (first part of FEN)
              const currentFen = gameRef.current.fen();
              const detectedPlacement = data.fen.split(' ')[0];
              const currentPlacement = currentFen.split(' ')[0];

              if (detectedPlacement !== currentPlacement) {
                // The board has changed! let's see if it was a legal move
                const moves = gameRef.current.moves({ verbose: true });
                const matchingMove = moves.find(move => {
                  const tempGame = new Chess(currentFen);
                  try {
                    tempGame.move(move);
                    return tempGame.fen().split(' ')[0] === detectedPlacement;
                  } catch {
                    return false;
                  }
                });

                if (matchingMove) {
                  // Found a valid move that leads to this position!
                  console.log(`[SmartDetect] Inferred move: ${matchingMove.san}`);
                  gameRef.current.move(matchingMove);
                  setFen(gameRef.current.fen());
                  setDetectionStatus(`✓ Move detected: ${matchingMove.san}`);

                  // Auto-flip orientation if needed (optional, maybe keep user preference?)
                  // For now, let's respect the USER's chosen orientation unless they want auto-flip.
                } else {
                  // Board changed, but no single legal move explains it.
                  // Could be a setup change, takeback, or multi-piece movement.
                  // Fallback: Force update state to match detection
                  console.log("[SmartDetect] No legal move found. Syncing to raw FEN.");

                  // We need to respect the turn if possible. 
                  // Detected FEN usually has 'w' as active color unless specified.
                  // Let's try to preserve the current turn if we are forcing state? 
                  // Actually, if we force state, we reset to what detection says.

                  setFen(data.fen);
                  gameRef.current = new Chess(data.fen);
                  setDetectionStatus(`✓ Sync: ${data.piece_count} pieces`);
                }
              }

              // Update status
              if (!detectionStatus.startsWith("✓ Move")) {
                setDetectionStatus(`✓ Listening... (${data.piece_count} pieces)`);
              }

            } catch (err) {
              // Fallback for invalid states
              if (data.fen !== gameRef.current.fen()) {
                setFen(data.fen);
                try { gameRef.current = new Chess(data.fen); } catch { }
              }
            }
          }
        }
      } catch (err) {
        console.error("[Polling] Connection error:", err);
        setDetectionStatus("Cannot connect to detection API");
      }
    }, 50);
  }, [detectionStatus]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsPolling(false);
    setDetectionStatus("");
  }, []);

  const togglePolling = useCallback(() => {
    if (isPolling) {
      stopPolling();
    } else {
      startPolling();
    }
  }, [isPolling, startPolling, stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#302e2b] text-[#c3c2c1] font-sans flex items-center justify-center p-4">
      <main className="flex flex-col lg:flex-row items-stretch justify-center gap-6 w-full max-w-[1200px] h-[90vh]">
        {/* Left Side: Chess Board */}
        <div className="flex-1 flex justify-center items-center h-full max-h-[800px] aspect-square">
          <ChessBoard
            game={gameRef.current}
            fen={fen}
            bestMoves={bestMoves}
            onMove={makeMove}
            showEngineLines={true}
            boardOrientation={boardOrientation}
          />
        </div>

        {/* Right Side: Engine Panel + Detection */}
        <div className="w-full lg:w-[400px] flex-shrink-0 h-full max-h-[800px] flex flex-col gap-4 overflow-auto">
          <EnginePanel
            evalScore={isAnalyzing ? "..." : evalScore}
            bestMove={isAnalyzing ? "Analyzing..." : bestMoves[0] || "-"}
            engineDepth={engineDepth}
            setEngineDepth={setEngineDepth}
            engineLines={engineLines}
            setEngineLines={setEngineLines}
            engineThreads={engineThreads}
            setEngineThreads={setEngineThreads}
            onNewGame={handleNewGame}
            onUndo={handleUndo}
            onRedo={() => { }}
            onFlip={handleFlip}
            onDetect={togglePolling}
          />

          {/* Detection Panel */}
          <div className="bg-[#262522] rounded-lg p-4 border border-[#3d3b38]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-bold">🔍 Live Detection</h3>
              <span
                className={`text-xs px-2 py-1 rounded ${isPolling ? "bg-green-600 text-white animate-pulse" : "bg-[#3d3b38] text-[#989795]"}`}
              >
                {isPolling ? "● LIVE" : "OFF"}
              </span>
            </div>

            {detectionStatus && (
              <p className="text-[#81b64c] text-sm mb-3">{detectionStatus}</p>
            )}

            <div className="text-[#666] text-xs space-y-1 bg-[#1e1d1b] p-3 rounded">
              <p className="text-[#989795] font-bold mb-2">Quick Start:</p>

              <p>
                1. <code>cd detector-api</code>
              </p>

              <p>
                2. <code>python start.py</code>
              </p>

              <p>3. Select chess board region</p>

              <p>4. Click "Detect Position" above</p>
            </div>

            {/* Debug Info */}

            <div className="mt-4 p-3 bg-[#1e1d1b] rounded border border-[#3d3b38]">
              <h4 className="text-[#989795] text-xs font-bold mb-2">
                Debug Info
              </h4>

              <div className="space-y-2">
                <div>
                  <label className="text-[10px] text-[#666] uppercase block">
                    Current FEN
                  </label>

                  <input
                    type="text"
                    value={fen}
                    readOnly
                    className="w-full bg-[#111] text-[#81b64c] text-xs p-1 border border-[#333] rounded font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-[#666] uppercase block">
                    Best Moves (Engine)
                  </label>

                  <div className="w-full bg-[#111] text-[#c3c2c1] text-xs p-1 border border-[#333] rounded font-mono break-all">
                    {bestMoves.length > 0 ? bestMoves.join(", ") : "None"}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-[#666] uppercase block">
                    Orientation
                  </label>

                  <div className="text-xs text-[#c3c2c1]">
                    {boardOrientation}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
