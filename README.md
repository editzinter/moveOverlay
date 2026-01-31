<div align="center">

# MoveOverlay: Chess Vision AI
### Professional, Injection-Free Chess Tactical Overlay
[![GitHub license](https://img.shields.io/github/license/editzinter/moveOverlay)](https://github.com/editzinter/moveOverlay/blob/main/LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![Python](https://img.shields.io/badge/Python-3.12+-blue?logo=python)](https://www.python.org/)
[![Ultralytics](https://img.shields.io/badge/YOLO-v8-orange?logo=ultralytics)](https://ultralytics.com/)

---

**MoveOverlay** is a high-performance, visual-first chess tool designed to bridge the gap between engine analysis and live browser-based chess without the risks of code injection. By utilizing a transparent, click-through overlay, it provides real-time tactical feedback directly onto your board.

[Key Features](#key-features) • [Installation](#installation) • [Architecture](#architecture) • [Getting Started](#getting-started)

</div>

---

> [!CAUTION]
> **Disclaimer**: This project is for **educational purposes only**. It is intended to showcase the integration of computer vision (YOLOv8) with real-time overlays and engine analysis. Use this tool responsibly and in accordance with the terms of service of any platform you interact with.

---

## Key Features

- **Zero-Injection Safety**: Does not modify browser memory or website source code. It purely analyzes visual output.
- **YOLOv8 Powered**: State-of-the-art object detection identifies pieces and board boundaries with high precision.
- **Tactical Visualization**: Draws dynamic Stockfish arrows and score evaluations directly over your screen.
- **Real-Time Control**: A sleek Next.js dashboard allows you to toggle detection, adjust engine depth, and switch turns instantly.
- **Auto-Orientation**: Detects whether you are playing as White or Black based on pawn positioning.

---

## Architecture

MoveOverlay operates using a distributed service model for maximum efficiency:

1.  **Web Dashboard (Next.js)**: The command center for managing engine settings and viewing game state.
2.  **Detection API (FastAPI)**: A lightweight backend that processes screen captures via YOLOv8.
3.  **Visual Overlay (Python/Tkinter)**: A transparent, click-through window that renders tactical arrows.
4.  **Stockfish Core**: The world-class engine providing deep position evaluation.

---

## Installation Guide

### Prerequisites
Ensure you have the following installed on your system:
- **Node.js** (v24 or higher)
- **Python** (v3.12 or higher)
- **Git**

### Installation Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/editzinter/moveOverlay.git
   cd moveOverlay
   ```

2. **Frontend Setup**
   ```bash
   npm install
   ```

3. **Backend Setup**
   ```bash
   pip install -r detector-api/requirements.txt
   ```

### Model Configuration
MoveOverlay requires pre-trained weights to function properly.
1. Download `best.pt` from the official **[NAKST Studio Hugging Face Repo](https://huggingface.co/NAKSTStudio/yolov8m-chess-piece-detection)**.
2. Create a folder named `yolov8m-chess-piece-detection` at the project root.
3. Place the `best.pt` file inside that folder.

---

## Usage

### 1. Launch the Frontend
Start the Next.js control panel:
```bash
npm run dev
```
Navigate to `http://localhost:3000` to access the dashboard.

### 2. Launch the Vision System
Run the launcher script to start the API and Overlay:
```bash
python detector-api/start.py
```

### 3. Select your Board
Click **"Select Region"** in the tool to highlight your chess board. Once selected, tactical analysis will begin automatically.

---

## Contributing

Contributions are welcome. If you have ideas for improvements or new features, feel free to open an issue or submit a pull request.

## Credits

Special thanks to the following projects and creators:
- **[NAKST Studio](https://huggingface.co/NAKSTStudio)**: For the exceptional YOLOv8m chess piece detection model.
- **[Ultralytics](https://ultralytics.com/)**: For the YOLOv8 framework.
- **[Stockfish](https://stockfishchess.org/)**: For the world-leading chess engine.

## License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">
Built with 💙 by editzinter. Powered by Ultralytics and Stockfish.
</div>
