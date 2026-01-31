<div align="center">

# MoveOverlay: Chess Vision AI
### Simple, effective, and completely injection-free.
[![GitHub license](https://img.shields.io/github/license/editzinter/moveOverlay)](https://github.com/editzinter/moveOverlay/blob/main/LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![Python](https://img.shields.io/badge/Python-3.12+-blue?logo=python)](https://www.python.org/)
[![Ultralytics](https://img.shields.io/badge/YOLO-v8-orange?logo=ultralytics)](https://ultralytics.com/)

---

**MoveOverlay** is a visual-first tool designed for players who want engine analysis without the risks of browser extensions or code injection. It works by "looking" at your screen just like you do, analyzing the board in real-time and drawing tactical advice directly on a transparent overlay.

[Features](#key-features) • [Installation](#setup-guide) • [How it Works](#how-it-works) • [Getting Started](#launching)

</div>

---

> [!CAUTION]
> **Educational Use Only**: I built this project to explore how computer vision (YOLOv8) can interact with real-time screen data. It’s meant for learning and research. Please be responsible and keep in mind the terms of service of the platforms you use.

---

## What makes it different?

Most chess tools try to dig into a website's internal code. **MoveOverlay doesn't.** 

- **Privacy & Safety First**: It analyzes pixels, not browser memory. This means it doesn't touch your browser's internal logic or personal data.
- **Smart Vision**: Uses a fine-tuned YOLOv8 model to "see" pieces and board boundaries exactly as they appear on your screen.
- **Live Guidance**: Once it detects the board, it talks to Stockfish to suggest the best moves and displays them as arrows on a transparent layer.
- **Clean Dashboard**: A simple Next.js interface lets you control everything—adjust engine depth, switch sides, or toggle the overlay on the fly.
- **Zero Configuration**: It automatically figures out if you're playing as White or Black by checking where your pawns are.

---

## How it works

MoveOverlay uses a decoupled architecture to ensure safety and performance. Here is how the magic happens:

### 🏗️ System Architecture

```mermaid
graph TD
    %% Styling
    classDef userLayer fill:#f9f9f9,stroke:#333,stroke-width:2px;
    classDef core fill:#e1f5fe,stroke:#0277bd,stroke-width:2px;
    classDef ai fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px,color:black;

    subgraph UserSpace ["User Environment"]
        Screen["🖥️ User Screen"]
        Browser["🌐 Web Browser / Chess App"]
    end

    subgraph Backend ["🐍 Python Vision Core"]
        Capture["📷 Screen Capture (MSS)"]
        YOLO["👁️ YOLOv8 Model"]
        API["🧠 Detection API (FastAPI)"]
        Overlay["🎯 Transparent Overlay (Tkinter)"]
    end

    subgraph Frontend ["⚛️ Next.js Dashboard"]
        UI["🎛️ Control Panel"]
        Stockfish["♟️ Stockfish Engine (WASM/Server)"]
    end

    %% Connections
    Browser -- "Displays Board" --> Screen
    Screen -- "Raw Pixels" --> Capture
    Capture -- "Frame Data" --> YOLO
    YOLO -- "Inference" --> API
    API -- "FEN String" --> UI
    UI -- "Analysis Request" --> Stockfish
    Stockfish -- "Best Move" --> UI
    UI -- "Visual Coordinates" --> Overlay
    Overlay -- "Draws on Top" --> Screen

    %% Assign Classes
    class Screen,Browser userLayer;
    class Capture,API,Overlay,UI core;
    class YOLO,Stockfish ai;
```

### 🔄 Real-Time Event Loop

Since the two systems run independently, they communicate continuously to keep the overlay in sync with the game.

```mermaid
sequenceDiagram
    participant Screen as 🖥️ Screen
    participant Python as 🐍 Vision System
    participant NextJS as ⚛️ Dashboard
    participant Engine as ♟️ Stockfish

    loop Every 500ms
        Python->>Screen: Capture Region
        Python->>Python: YOLO Inference (Get FEN)
        Python->>NextJS: POST /api/status (Update Board)
        
        par Analysis
            NextJS->>Engine: UCI Command (go depth 18)
            Engine-->>NextJS: Best Move: e2e4
        end

        NextJS-->>Python: Response (Draw Arrow e2->e4)
        Python-->>Screen: Render Overlay Arrow
    end
```

### The "Secret Sauce"
1.  **The Dashboard (Next.js)** acts as the brain. It holds the state and talks to the engine.
2.  **The Vision System (Python)** acts as the eyes. It just looks at pixels and asks the brain "What should I draw?"
3.  **The Overlay** acts as the hands. It paints the arrows without ever touching the browser itself.

---

## Setup Guide

### What you'll need
Before we start, make sure you have these installed:
- **Node.js** (v24 or newer)
- **Python** (v3.12 or newer)
- **Git**

### Step-by-step Installation

1. **Grab the code**
   ```bash
   git clone https://github.com/editzinter/moveOverlay.git
   cd moveOverlay
   ```

2. **Setup the Dashboard (Frontend)**
   ```bash
   npm install
   ```

3. **Setup the Brain (Backend)**
   ```bash
   pip install -r detector-api/requirements.txt
   ```

### Adding the AI Model
The tool needs the "vision weights" to recognize chess pieces.
1. Download `best.pt` from the **[NAKST Studio Hugging Face page](https://huggingface.co/NAKSTStudio/yolov8m-chess-piece-detection)**.
2. Create a folder called `yolov8m-chess-piece-detection` in the project root.
3. Move your downloaded `best.pt` file into that folder.

---

## Launching

### 1. Start the Dashboard
First, get the control panel running:
```bash
npm run dev
```
Then, open your browser to `http://localhost:3000`.

### 2. Start the Vision System
In a new terminal, run the launcher:
```bash
python detector-api/start.py
```

### 3. Point and Analyze
On the dashboard, hit **"Select Region"**. This will let you draw a box over your chess board. Once you've selected the area, the arrows will start appearing automatically!

---

## Contributing

Created something cool? Found a bug? Feel free to open an issue or send a pull request. I'm always happy to see how people improve this!

## Credits

This project stands on the shoulders of some amazing tools:
- **[NAKST Studio](https://huggingface.co/NAKSTStudio)**: For the fantastic YOLOv8m chess detection model.
- **[Ultralytics](https://ultralytics.com/)**: For making YOLOv8 so accessible.
- **[Stockfish](https://stockfishchess.org/)**: For the world-class engine evaluation.

## License

This project is open-source under the [MIT License](LICENSE).

---

<div align="center">
Built with 💙 by editzinter.
</div>
