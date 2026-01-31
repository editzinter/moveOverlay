"""
Chess Piece Detection Module
Uses YOLO model to detect chess pieces and generate FEN notation.
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import numpy as np

# YOLO class ID to FEN piece mapping
CLASS_TO_FEN = {
    1: "K",  # white_king
    2: "Q",  # white_queen
    3: "R",  # white_rook
    4: "B",  # white_bishop
    5: "N",  # white_knight
    6: "P",  # white_pawn
    7: "k",  # black_king
    8: "q",  # black_queen
    9: "r",  # black_rook
    10: "b",  # black_bishop
    11: "n",  # black_knight
    12: "p",  # black_pawn
}


@dataclass
class Detection:
    """Represents a single piece detection."""

    class_id: int
    class_name: str
    confidence: float
    x_center: float
    y_center: float
    width: float
    height: float
    fen_char: str = ""

    def __post_init__(self):
        if self.class_id in CLASS_TO_FEN:
            self.fen_char = CLASS_TO_FEN[self.class_id]


@dataclass
class BoardDetection:
    """Represents the detected board boundaries."""

    x1: float
    y1: float
    x2: float
    y2: float
    confidence: float

    @property
    def width(self) -> float:
        return self.x2 - self.x1

    @property
    def height(self) -> float:
        return self.y2 - self.y1

    @property
    def square_size(self) -> float:
        return self.width / 8


def map_piece_to_square(
    piece: Detection, board: BoardDetection, orientation: str = "white"
) -> Tuple[int, int]:
    """
    Map a piece detection to a board square (row, col).
    Row 0 = rank 8 (top), Col 0 = file a (left).
    """
    # Calculate relative position within board
    rel_x = (piece.x_center - board.x1) / board.width
    rel_y = (piece.y_center - board.y1) / board.height

    # Debug output
    # print(f"  Mapping {piece.fen_char}: center=({piece.x_center:.1f}, {piece.y_center:.1f}), rel=({rel_x:.3f}, {rel_y:.3f})")

    # Clamp to valid range
    rel_x = max(0, min(0.999, rel_x))
    rel_y = max(0, min(0.999, rel_y))

    # Convert to grid coordinates (0-7)
    col = int(rel_x * 8)
    row = int(rel_y * 8)

    # Handle board orientation
    if orientation == "black":
        row = 7 - row
        col = 7 - col

    return row, col


def detect_board_orientation(pieces: List[Detection], board: BoardDetection) -> str:
    """
    Detect board orientation based on pawn positions.
    White pawns should be on ranks 2-4 (rows 4-6 from top) if white at bottom.
    """
    white_pawn_rows = []
    black_pawn_rows = []

    for piece in pieces:
        if piece.class_id == 6:  # white_pawn
            rel_y = (piece.y_center - board.y1) / board.height
            white_pawn_rows.append(rel_y)
        elif piece.class_id == 12:  # black_pawn
            rel_y = (piece.y_center - board.y1) / board.height
            black_pawn_rows.append(rel_y)

    print(f"[Orientation] White pawns at y: {[f'{y:.2f}' for y in white_pawn_rows]}")
    print(f"[Orientation] Black pawns at y: {[f'{y:.2f}' for y in black_pawn_rows]}")

    if not white_pawn_rows and not black_pawn_rows:
        print("[Orientation] No pawns found, defaulting to white")
        return "white"  # Default to white at bottom
    
    # If only one color of pawns, try to infer from their position
    if not white_pawn_rows:
        avg_black = sum(black_pawn_rows) / len(black_pawn_rows)
        # If black pawns are in upper half, white is at bottom
        orientation = "white" if avg_black < 0.5 else "black"
        print(f"[Orientation] Only black pawns, avg_y={avg_black:.2f}, orientation={orientation}")
        return orientation
    
    if not black_pawn_rows:
        avg_white = sum(white_pawn_rows) / len(white_pawn_rows)
        # If white pawns are in lower half, white is at bottom
        orientation = "white" if avg_white > 0.5 else "black"
        print(f"[Orientation] Only white pawns, avg_y={avg_white:.2f}, orientation={orientation}")
        return orientation

    avg_white = sum(white_pawn_rows) / len(white_pawn_rows)
    avg_black = sum(black_pawn_rows) / len(black_pawn_rows)

    # If white pawns are lower (higher y), white is at bottom
    orientation = "white" if avg_white > avg_black else "black"
    print(f"[Orientation] avg_white_y={avg_white:.2f}, avg_black_y={avg_black:.2f}, orientation={orientation}")
    return orientation


def generate_fen(
    detections: List[Detection],
    board: Optional[BoardDetection],
    orientation: str = "auto",
    active_color: str = "w",
) -> str:
    """
    Generate FEN string from piece detections.
    """
    if not board:
        print("[FEN] No board detected, checking for fallback...")
        if not pieces:
            print("[FEN] No pieces detected either, returning empty")
            return f"8/8/8/8/8/8/8/8 {active_color} - - 0 1"
        
        # Fallback: Use the full image size as the board
        # This assumes the user selected the board region efficiently
        # We need to know the original image size here, but we don't pass it in detect_pieces
        print("[FEN] No board detected, but generate_fen called. Assuming full image was intended if fallback failed upstream.")
        # If we are here, main.py's fallback might have failed or not been passed?
        # But actually main.py passes 'board' object.
        # If board is None here, it's a critical error.
        return f"8/8/8/8/8/8/8/8 {active_color} - - 0 1"

    # Filter out board detection, keep only pieces
    pieces = [d for d in detections if d.class_id != 0 and d.class_id in CLASS_TO_FEN]

    # Debug: Print all detected pieces and their classes to verify mapping
    print(f"[FEN] Processing {len(pieces)} pieces for FEN generation:")
    for p in pieces:
       print(f"  - ID {p.class_id} ({p.class_name}) -> {CLASS_TO_FEN.get(p.class_id, '?')} at ({p.x_center:.1f}, {p.y_center:.1f})")

    if not pieces:
        print("[FEN] No pieces detected, returning empty")
        return f"8/8/8/8/8/8/8/8 {active_color} - - 0 1"

    # Detect orientation if auto
    if orientation == "auto":
        orientation = detect_board_orientation(pieces, board)

    print(f"[FEN] Board: ({board.x1:.1f}, {board.y1:.1f}) to ({board.x2:.1f}, {board.y2:.1f}), size: {board.width:.1f}x{board.height:.1f}")
    print(f"[FEN] Orientation: {orientation}, Pieces: {len(pieces)}")

    # Initialize 8x8 board grid
    grid = [[None for _ in range(8)] for _ in range(8)]

    # Place pieces on grid
    for piece in pieces:
        row, col = map_piece_to_square(piece, board, orientation)
        if 0 <= row < 8 and 0 <= col < 8:
            # Handle conflicts (take higher confidence)
            if grid[row][col] is None or piece.confidence > grid[row][col].confidence:
                grid[row][col] = piece
                # print(f"  Placed {piece.fen_char} at row={row}, col={col}")

    # Convert grid to FEN
    fen_rows = []
    for row in grid:
        fen_row = ""
        empty_count = 0
        for cell in row:
            if cell is None:
                empty_count += 1
            else:
                if empty_count > 0:
                    fen_row += str(empty_count)
                    empty_count = 0
                fen_row += cell.fen_char
        if empty_count > 0:
            fen_row += str(empty_count)
        fen_rows.append(fen_row)

    # Combine rows with '/'
    fen_board = "/".join(fen_rows)

    # Add game state (active color, no castling info, no en passant)
    return f"{fen_board} {active_color} - - 0 1"


def parse_yolo_results(
    results, model
) -> Tuple[List[Detection], Optional[BoardDetection]]:
    """
    Parse YOLO results into Detection objects.
    """
    detections = []
    board = None

    for result in results:
        boxes = result.boxes
        for box in boxes:
            class_id = int(box.cls[0])
            confidence = float(box.conf[0])
            x1, y1, x2, y2 = box.xyxy[0].tolist()

            x_center = (x1 + x2) / 2
            y_center = (y1 + y2) / 2
            width = x2 - x1
            height = y2 - y1

            class_name = model.names.get(class_id, f"class_{class_id}")

            if class_id == 0:  # Board detection
                if board is None or confidence > board.confidence:
                    board = BoardDetection(
                        x1=x1, y1=y1, x2=x2, y2=y2, confidence=confidence
                    )
            else:
                detections.append(
                    Detection(
                        class_id=class_id,
                        class_name=class_name,
                        confidence=confidence,
                        x_center=x_center,
                        y_center=y_center,
                        width=width,
                        height=height,
                    )
                )

    return detections, board
