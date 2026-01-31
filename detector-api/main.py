"""
FastAPI Chess Detection Server
Provides YOLO-based chess piece detection via REST API.
"""

import base64
import io
import time
from pathlib import Path
from typing import Optional

from detector import BoardDetection, generate_fen, parse_yolo_results, detect_board_orientation
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from pydantic import BaseModel
from ultralytics import YOLO

# Configuration
MODEL_PATH = (
    Path(__file__).parent.parent.parent / "yolov8m-chess-piece-detection" / "best.pt"
)
IMAGE_SIZE = 416  # YOLO input size (Reduced from 640 for speed)

# Initialize FastAPI app
app = FastAPI(
    title="Chess Detection API",
    description="YOLO-based chess piece detection from screen captures",
    version="1.0.0",
)

# CORS middleware for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model instance
model: Optional[YOLO] = None

# Store latest detection for polling
latest_detection = {
    "fen": None,
    "orientation": "white",
    "piece_count": 0,
    "timestamp": 0,
    "board_detected": False,
}


def get_model() -> YOLO:
    """Load YOLO model (lazy loading singleton)."""
    global model
    if model is None:
        if not MODEL_PATH.exists():
            raise HTTPException(
                status_code=500, detail=f"Model file not found at {MODEL_PATH}"
            )
        print(f"[Detection API] Loading YOLO model from {MODEL_PATH}")
        model = YOLO(str(MODEL_PATH))
        print(f"[Detection API] Model loaded successfully")
    return model


class DetectionRequest(BaseModel):
    """Request body for detection endpoint."""
    image: str  # Base64 encoded image
    orientation: str = "auto"  # 'white', 'black', or 'auto'
    active_color: str = "w"  # 'w' or 'b'


class DetectionResponse(BaseModel):
    """Response from detection endpoint."""
    fen: str
    orientation: str
    piece_count: int
    board_detected: bool
    detections: list


class LatestResponse(BaseModel):
    """Response from latest detection endpoint."""
    fen: Optional[str]
    orientation: str
    piece_count: int
    board_detected: bool
    timestamp: float
    has_detection: bool


@app.get("/")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "message": "Chess Detection API is running"}


@app.get("/latest", response_model=LatestResponse)
async def get_latest_detection():
    """Get the most recent detection result (for polling)."""
    return LatestResponse(
        fen=latest_detection["fen"],
        orientation=latest_detection["orientation"],
        piece_count=latest_detection["piece_count"],
        board_detected=latest_detection["board_detected"],
        timestamp=latest_detection["timestamp"],
        has_detection=latest_detection["fen"] is not None,
    )


@app.post("/detect", response_model=DetectionResponse)
def detect_pieces(request: DetectionRequest):
    """
    Detect chess pieces from base64 encoded image.
    Returns FEN notation and detection details.
    """
    global latest_detection

    try:
        # Decode base64 image
        try:
            # Handle data URL format (data:image/png;base64,...)
            if "," in request.image:
                image_data = request.image.split(",")[1]
            else:
                image_data = request.image

            image_bytes = base64.b64decode(image_data)
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid image data: {str(e)}")

        # Resize to IMAGE_SIZE x IMAGE_SIZE with padding
        original_size = image.size
        # If client already resized, we can skip complex resize, though logic holds
        ratio = min(IMAGE_SIZE / original_size[0], IMAGE_SIZE / original_size[1])
        new_size = (int(original_size[0] * ratio), int(original_size[1] * ratio))
        
        if new_size != original_size:
            image_resized = image.resize(new_size, Image.LANCZOS)
        else:
            image_resized = image

        # Create padded image
        padded_image = Image.new("RGB", (IMAGE_SIZE, IMAGE_SIZE), (128, 128, 128))
        paste_x = (IMAGE_SIZE - new_size[0]) // 2
        paste_y = (IMAGE_SIZE - new_size[1]) // 2
        padded_image.paste(image_resized, (paste_x, paste_y))

        # Run YOLO inference
        yolo_model = get_model()
        
        t0 = time.time()
        results = yolo_model(padded_image, verbose=False)
        t1 = time.time()
        print(f"[Performance] Inference took {(t1 - t0):.3f}s")
        
        # Debug: Save the padded image (Disabled for performance)
        # debug_path = Path(__file__).parent / "debug_capture.jpg"
        # padded_image.save(debug_path)
        # print(f"[Detection] Saved debug image to {debug_path}")
        print(f"[Detection] Original size: {original_size}, Ratio: {ratio:.3f}, Paste offset: ({paste_x}, {paste_y})")

        # Parse results
        detections, board = parse_yolo_results(results, yolo_model)
        
        print(f"[Detection] Raw detections: {len(detections)} pieces, board: {board is not None}")
        if board:
            print(f"[Detection] Board bounds (raw): ({board.x1:.1f}, {board.y1:.1f}) to ({board.x2:.1f}, {board.y2:.1f})")

        # TRANSFORM COORDINATES: Map 640x640 YOLO coords back to Original Image coords
        for det in detections:
            det.x_center = (det.x_center - paste_x) / ratio
            det.y_center = (det.y_center - paste_y) / ratio
            det.width = det.width / ratio
            det.height = det.height / ratio

        if board:
            # Also scale the detected board box back to original space
            board.x1 = (board.x1 - paste_x) / ratio
            board.y1 = (board.y1 - paste_y) / ratio
            board.x2 = (board.x2 - paste_x) / ratio
            board.y2 = (board.y2 - paste_y) / ratio
        else:
            # Fallback: If YOLO didn't find a "board" class, assume the User's Crop IS the board
            # We use the original_size because we already scaled the pieces back to this space above
            board = BoardDetection(
                x1=0,
                y1=0,
                x2=original_size[0],
                y2=original_size[1],
                confidence=1.0
            )

        # Determine orientation
        orientation = request.orientation
        if orientation == "auto" and board and detections:
            orientation = detect_board_orientation(detections, board)
        elif orientation == "auto":
            orientation = "white"

        # Generate FEN
        fen = generate_fen(
            detections, board, orientation, active_color=request.active_color
        )
        
        print(f"[Detection] Generated FEN: {fen}")
        print(f"[Detection] Orientation: {orientation}, Pieces: {len(detections)}")
        for d in detections[:5]:  # Print first 5 pieces
            print(f"  - {d.class_name} ({d.fen_char}) at ({d.x_center:.1f}, {d.y_center:.1f}) conf={d.confidence:.2f}")

        # Update latest detection for polling
        latest_detection = {
            "fen": fen,
            "orientation": orientation,
            "piece_count": len(detections),
            "board_detected": board is not None,
            "timestamp": time.time(),
        }

        # Prepare response
        detection_list = [
            {
                "class_id": d.class_id,
                "class_name": d.class_name,
                "fen_char": d.fen_char,
                "confidence": round(d.confidence, 3),
                "x_center": round(d.x_center, 1),
                "y_center": round(d.y_center, 1),
            }
            for d in detections
        ]

        return DetectionResponse(
            fen=fen,
            orientation=orientation,
            piece_count=len(detections),
            board_detected=board is not None,
            detections=detection_list,
        )

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Detection failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
