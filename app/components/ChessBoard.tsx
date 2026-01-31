"use client";

import React, { useState, useEffect } from "react";
import { Chess, Move, Square } from "chess.js";
import { Chessboard } from "react-chessboard";

// Arrow colors for different PV lines
const ARROW_COLORS = [
  "rgb(255, 170, 0)", // Orange - best move
  "rgb(100, 150, 255)", // Blue - 2nd best
  "rgb(100, 255, 100)", // Green - 3rd best
  "rgb(255, 100, 255)", // Pink - 4th best
  "rgb(255, 255, 100)", // Yellow - 5th best
];

interface ChessBoardProps {
  game: Chess;
  fen: string;
  bestMoves?: string[];
  onMove: (move: {
    from: string;
    to: string;
    promotion?: string;
  }) => Move | null;
  showEngineLines?: boolean;
  boardOrientation?: "white" | "black";
}

const ChessBoard: React.FC<ChessBoardProps> = ({
  game,
  fen,
  bestMoves = [],
  onMove,
  showEngineLines = true,
  boardOrientation = "white",
}) => {
  const [moveFrom, setMoveFrom] = useState<Square | null>(null);
  const [optionSquares, setOptionSquares] = useState<Record<string, any>>({});
  const [rightClickedSquares, setRightClickedSquares] = useState<
    Record<string, any>
  >({});
  const [engineArrows, setEngineArrows] = useState<
    { startSquare: string; endSquare: string; color: string }[]
  >([]);

  // Update engine arrows when bestMoves prop changes
  useEffect(() => {
    if (bestMoves && bestMoves.length > 0) {
      console.log("Updating arrows for moves:", bestMoves);
      const arrows = bestMoves
        .filter((move) => move && typeof move === "string" && move.length >= 4)
        .map((move, index) => ({
          startSquare: move.substring(0, 2),
          endSquare: move.substring(2, 4),
          color: ARROW_COLORS[index] || ARROW_COLORS[0],
        }));
      setEngineArrows(arrows);
    } else {
      setEngineArrows([]);
    }
  }, [bestMoves]);

  function getMoveOptions(square: Square) {
    const moves = game.moves({
      square,
      verbose: true,
    }) as Move[];

    if (moves.length === 0) {
      setOptionSquares({});
      return false;
    }

    const newSquares: Record<string, any> = {};
    moves.map((move) => {
      const piece = game.get(move.to as Square);
      const isCapture = piece && piece.color !== game.turn();

      newSquares[move.to] = {
        background: isCapture
          ? "radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)"
          : "radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)",
        borderRadius: "50%",
      };
      return move;
    });
    newSquares[square] = {
      background: "rgba(255, 255, 0, 0.4)",
    };
    setOptionSquares(newSquares);
    return true;
  }

  function onSquareClick(args: { square: string }) {
    const { square } = args;
    const sq = square as Square;

    setRightClickedSquares({});

    // from square
    if (!moveFrom) {
      const hasMoveOptions = getMoveOptions(sq);
      if (hasMoveOptions) setMoveFrom(sq);
      return;
    }

    // to square
    const moves = game.moves({
      square: moveFrom,
      verbose: true,
    }) as Move[];
    const foundMove = moves.find((m) => m.from === moveFrom && m.to === sq);

    // not a valid move
    if (!foundMove) {
      // check if clicked on new piece
      const hasMoveOptions = getMoveOptions(sq);
      if (hasMoveOptions) {
        setMoveFrom(sq);
      } else {
        setMoveFrom(null);
        setOptionSquares({});
      }
      return;
    }

    // valid move
    const move = onMove({
      from: moveFrom,
      to: sq,
      promotion: "q",
    });

    if (move === null) {
      setMoveFrom(null);
      setOptionSquares({});
      return;
    }

    setMoveFrom(null);
    setOptionSquares({});
  }

  function onSquareRightClick(args: { square: string }) {
    const { square } = args;
    const colour = "rgba(0, 0, 255, 0.4)";
    setRightClickedSquares({
      ...rightClickedSquares,
      [square]:
        rightClickedSquares[square] &&
          rightClickedSquares[square].backgroundColor === colour
          ? undefined
          : { backgroundColor: colour },
    });
  }

  // Check types from distilled interface
  const arrowsForBoard = showEngineLines ? engineArrows : [];

  return (
    <div className="w-full h-full max-w-[800px] aspect-square">
      <Chessboard
        options={{
          position: fen,
          boardOrientation: boardOrientation,
          onPieceDrop: ({ sourceSquare, targetSquare }) => {
            if (!targetSquare) return false;
            const move = onMove({
              from: sourceSquare,
              to: targetSquare,
              promotion: "q",
            });
            return move !== null;
          },
          onSquareClick: ({ square }) => {
            onSquareClick({ square });
          },
          onSquareRightClick: ({ square }) => {
            onSquareRightClick({ square });
          },
          squareStyles: {
            ...optionSquares,
            ...rightClickedSquares,
          },
          animationDurationInMs: 0,
          arrows: arrowsForBoard,
          darkSquareStyle: { backgroundColor: "#769656" },
          lightSquareStyle: { backgroundColor: "#eeeed2" },
        }}
      />
    </div>
  );
};

export default ChessBoard;
