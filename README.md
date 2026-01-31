# MoveOverlay - Chess Vision UI

A smart, transparent overlay that uses YOLOv8 for chess piece detection and Stockfish for move analysis. It sits on top of your screen, captures the board, and draws tactical arrows without injecting any code into your browser.

## Features
- **Code-Injection Free**: Just a transparent overlay sitting on top of your browser.
- **YOLOv8 Detection**: Real-time chess piece and board detection.
- **Stockfish Integration**: Visualizes best moves directly on the board.
- **Next.js Dashboard**: Control panel for settings and game state.

## Getting Started

### 1. Prerequisites
- **Node.js**: v24+ 
- **Python**: v3.12+ 

### 2. Setup
Clone the repository and install dependencies:

```bash
# Frontend
npm install

# Backend
pip install -r detector-api/requirements.txt
```

### 3. Model Setup
Download the pre-trained YOLOv8 model (`best.pt`) from Hugging Face:
- [**Chess Detection YOLOv8m Model**](https://huggingface.co/KanisornPutta/chess-model-yolov8m)

Place the `best.pt` file in a folder named `yolov8m-chess-piece-detection` at the project root level.

### 4. Running the Project
In one terminal, start the Next.js dev server:
```bash
npm run dev
```

In a separate terminal, start the detection API and overlay:
```bash
python detector-api/start.py
```

## Learn More
- [Next.js Documentation](https://nextjs.org/docs)
- [Ultralytics YOLO](https://docs.ultralytics.com/)
- [Stockfish Engine](https://stockfishchess.org/)
