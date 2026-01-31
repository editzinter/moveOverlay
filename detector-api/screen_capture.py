import base64
import io
import json
import os
import subprocess
import sys
import threading
import time
from dataclasses import dataclass
from typing import Callable, Optional

# Ctypes for Click-Through Window (Windows Only)
import ctypes
from ctypes import windll

try:
    import mss
    import mss.tools
except ImportError:
    print("Installing mss...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "mss"])
    import mss
    import mss.tools

try:
    import tkinter as tk
    from tkinter import ttk
except ImportError:
    print("Error: tkinter is required. It should be included with Python.")
    sys.exit(1)

try:
    import requests
except ImportError:
    print("Installing requests...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "requests"])
    import requests

from PIL import Image


@dataclass
class Region:
    x: int
    y: int
    width: int
    height: int

    def to_dict(self):
        return {
            "left": self.x,
            "top": self.y,
            "width": self.width,
            "height": self.height,
        }


@dataclass
class EngineSettings:
    threads: int = 4
    depth: int = 15
    lines: int = 1


class ConfigManager:
    CONFIG_FILE = "config.json"

    @staticmethod
    def load():
        if os.path.exists(ConfigManager.CONFIG_FILE):
            try:
                with open(ConfigManager.CONFIG_FILE, "r") as f:
                    return json.load(f)
            except:
                pass
        return {}

    @staticmethod
    def save(data):
        try:
            with open(ConfigManager.CONFIG_FILE, "w") as f:
                json.dump(data, f, indent=4)
        except Exception as e:
            print(f"[Config] Failed to save: {e}")


class StockfishManager:
    def __init__(self, use_default_settings=True):
        # Path relative to this script
        base_dir = os.path.dirname(os.path.abspath(__file__))
        self.engine_path = os.path.join(
            base_dir, "..", "stockfish-bin", "stockfish", "stockfish-windows-x86-64-bmi2.exe"
        )
        self.process = None
        self.settings = EngineSettings()
        self.start_engine()

    def start_engine(self):
        if not os.path.exists(self.engine_path):
            print(f"[Stockfish] Error: Executable not found at {self.engine_path}")
            return

        try:
            if self.process:
                try:
                    self.process.terminate()
                except:
                    pass

            # hide console window
            startupinfo = subprocess.STARTUPINFO()
            startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW

            self.process = subprocess.Popen(
                self.engine_path,
                universal_newlines=True,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                startupinfo=startupinfo
            )
            self._write("uci")
            if not self._wait_for_ready():
                 print("[Stockfish] Failed to initialize (no readyok)")
                 return

            print("[Stockfish] Engine started.")
            self.update_settings()
        except Exception as e:
            print(f"[Stockfish] Failed to start: {e}")

    def _wait_for_ready(self, timeout=2.0):
        self._write("isready")
        start = time.time()
        while time.time() - start < timeout:
             line = self._read_line()
             if line and "readyok" in line:
                 return True
        return False

    def _read_line(self):
        if not self.process or not self.process.stdout: 
            return None
        try:
            return self.process.stdout.readline().strip()
        except:
            return None

    def is_alive(self):
        if self.process is None: return False
        return self.process.poll() is None

    def update_settings(self):
        if not self.is_alive(): return
        self._write(f"setoption name Threads value {self.settings.threads}")
        self._write(f"setoption name MultiPV value {self.settings.lines}")

    def _write(self, command):
        if not self.is_alive():
            print("[Stockfish] Engine dead, restarting...")
            self.start_engine()
            if not self.is_alive():
                return

        try:
            self.process.stdin.write(f"{command}\n")
            self.process.stdin.flush()
        except Exception as e:
            print(f"[Stockfish] Write error: {e}")
            self.start_engine()

    def get_best_moves(self, fen: str) -> list[tuple]:
        if not self.is_alive():
            self.start_engine()
        
        if not self.is_alive():
            return []

        self._write(f"position fen {fen}")
        self._write(f"go depth {self.settings.depth}")

        collected_moves = {} # multipv_id -> move_str
        start_time = time.time()
        
        while True:
            if time.time() - start_time > 3.0:
                print("[Stockfish] Timeout waiting for bestmove")
                self._write("stop")
                break

            line = self._read_line()
            if not line:
                if not self.is_alive():
                    break
                continue 
            
            if line.startswith("info") and " pv " in line:
                parts = line.split()
                try:
                    if "multipv" in parts:
                        mpv_idx = parts.index("multipv")
                        mpv_id = int(parts[mpv_idx + 1])
                    else:
                        mpv_id = 1
                    
                    # Extract Score
                    score_str = ""
                    if "score" in parts:
                        s_idx = parts.index("score")
                        type_ = parts[s_idx + 1] # cp or mate
                        val = int(parts[s_idx + 2])
                        
                        if type_ == "mate":
                            score_str = f"M{abs(val)}"
                            if val < 0: score_str = f"-M{abs(val)}"
                        else:
                            # CP
                            score_str = f"{val/100:.1f}"
                            if val > 0: score_str = f"+{score_str}"

                    if "pv" in parts:
                        pv_idx = parts.index("pv")
                        move = parts[pv_idx + 1]
                        collected_moves[mpv_id] = (move, score_str)
                except:
                    pass

            if line.startswith("bestmove"):
                if collected_moves:
                    # Return list of (move, score) tuples sorted by multipv_id
                    return [collected_moves[i] for i in sorted(collected_moves.keys())]
                
                parts = line.split()
                if len(parts) >= 2:
                    bm = parts[1]
                    if bm != "(none)":
                        return [(bm, "")]
                break
                
        return []

    def quit(self):
        if self.process:
            try:
                self._write("quit")
                self.process.terminate()
            except:
                pass


class OverlayWindow:
    def __init__(self, region: Region):
        self.region = region
        self.root = tk.Toplevel()
        self.transparent_color = "#ff00ff" 
        
        self.root.geometry(f"{region.width}x{region.height}+{region.x}+{region.y}")
        self.root.overrideredirect(True)
        self.root.attributes("-topmost", True)
        self.root.attributes("-transparentcolor", self.transparent_color)
        self.root.configure(bg=self.transparent_color)
        
        self.canvas = tk.Canvas(
            self.root, 
            width=region.width, 
            height=region.height, 
            bg=self.transparent_color, 
            highlightthickness=0
        )
        self.canvas.pack(fill=tk.BOTH, expand=True)

        self.root.update()
        self.root.update_idletasks()
        self.make_click_through()
        self.test_indicator()

    def make_click_through(self):
        try:
            hwnd = windll.user32.GetParent(self.root.winfo_id())
            old_style = windll.user32.GetWindowLongW(hwnd, -20)
            new_style = old_style | 0x80000 | 0x20 | 0x8
            windll.user32.SetWindowLongW(hwnd, -20, new_style)
            windll.user32.SetLayeredWindowAttributes(hwnd, 0x00FF00FF, 0, 0x1)
            print(f"[Overlay] Click-through applied to HWND: {hwnd}")
        except Exception as e:
            print(f"[Overlay] Failed to set click-through: {e}")
            
    def test_indicator(self):
        self.canvas.create_rectangle(2, 2, self.region.width-2, self.region.height-2, outline="#00ff00", width=4, tags="test_rect")
        self.root.after(3000, lambda: self.canvas.delete("test_rect"))

    def draw_arrows(self, moves_data: list, orientation: str):
        # moves_data is now list of (move_str, score_str)
        self.canvas.delete("all")
        if not moves_data: return

        cols = "abcdefgh"
        def get_coords(sq):
            if len(sq) != 2: return 0,0
            file_idx = cols.find(sq[0])
            if file_idx == -1: return 0,0
            try: rank_idx = int(sq[1]) - 1 
            except: return 0,0
            
            sq_w = self.region.width / 8
            sq_h = self.region.height / 8
            
            if orientation == "white":
                x = (file_idx + 0.5) * sq_w
                y = (7 - rank_idx + 0.5) * sq_h
            else:
                x = ((7 - file_idx) + 0.5) * sq_w
                y = (rank_idx + 0.5) * sq_h
            return x, y

        colors = ["#e74c3c", "#e67e22", "#f1c40f", "#2ecc71", "#3498db"]
        
        # Iterate backwards so best move (0) is drawn LAST (on top)
        for i in range(len(moves_data) - 1, -1, -1):
            move_data = moves_data[i]
            
            # Handle tuple or string for backward compatibility
            if isinstance(move_data, tuple):
                move_uci, score = move_data
            else:
                move_uci, score = move_data, ""

            if len(move_uci) < 4: continue
            
            color = colors[i] if i < len(colors) else "#95a5a6"
            width = 6 if i == 0 else 4
            
            x1, y1 = get_coords(move_uci[:2])
            x2, y2 = get_coords(move_uci[2:4])
            
            # Draw Arrow
            self.canvas.create_line(x1, y1, x2, y2, width=width, fill=color, arrow=tk.LAST, arrowshape=(16, 20, 6))
            
            # Draw Start Dot
            if i == 0: 
                self.canvas.create_oval(x1-5, y1-5, x1+5, y1+5, fill=color, outline="")
            
            # Draw Score Label (Midpoint)
            if score:
                mx, my = (x1 + x2) / 2, (y1 + y2) / 2
                # Offset slightly so it doesn't cover the line perfectly
                self.canvas.create_text(mx, my - 10, text=score, fill=color, font=("Segoe UI", 12, "bold"), tags="score")
                # Shadow for readability
                self.canvas.create_text(mx+1, my-9, text=score, fill="black", font=("Segoe UI", 12, "bold"), tags="score_shadow")
                self.canvas.tag_lower("score_shadow", "score")

    def close(self):
        self.root.destroy()


class RegionSelector:
    """Transparent overlay for selecting screen region."""

    def __init__(self, callback: Callable[[Region], None]):
        self.callback = callback
        self.start_x = 0
        self.start_y = 0
        self.current_rect = None

        # Create fullscreen transparent window
        self.root = tk.Tk()
        self.root.attributes("-fullscreen", True)
        self.root.attributes("-alpha", 0.3)
        self.root.attributes("-topmost", True)
        self.root.configure(bg="gray")

        # Create canvas for drawing selection
        self.canvas = tk.Canvas(self.root, bg="gray", highlightthickness=0)
        self.canvas.pack(fill=tk.BOTH, expand=True)

        # Instructions label
        self.label = tk.Label(
            self.root,
            text="Click and drag to select the chess board region. Press ESC to cancel.",
            font=("Arial", 16, "bold"),
            fg="white",
            bg="#333333",
            padx=20,
            pady=10,
        )
        self.label.place(relx=0.5, rely=0.05, anchor="center")

        # Bind events
        self.canvas.bind("<Button-1>", self.on_mouse_down)
        self.canvas.bind("<B1-Motion>", self.on_mouse_drag)
        self.canvas.bind("<ButtonRelease-1>", self.on_mouse_up)
        self.root.bind("<Escape>", lambda e: self.root.destroy())

    def on_mouse_down(self, event):
        self.start_x = event.x
        self.start_y = event.y
        if self.current_rect:
            self.canvas.delete(self.current_rect)

    def on_mouse_drag(self, event):
        if self.current_rect:
            self.canvas.delete(self.current_rect)
        self.current_rect = self.canvas.create_rectangle(
            self.start_x,
            self.start_y,
            event.x,
            event.y,
            outline="#00ff00",
            width=3,
            fill="#00ff00",
            stipple="gray25",
        )

    def on_mouse_up(self, event):
        x = min(self.start_x, event.x)
        y = min(self.start_y, event.y)
        width = abs(event.x - self.start_x)
        height = abs(event.y - self.start_y)

        if width > 50 and height > 50:
            region = Region(x=x, y=y, width=width, height=height)
            self.root.destroy()
            self.callback(region)
        else:
            # Too small, reset
            if self.current_rect:
                self.canvas.delete(self.current_rect)

    def run(self):
        self.root.mainloop()

class ChessDetector:
    def __init__(self):
        self.root = tk.Tk()
        self.region: Optional[Region] = None
        self.is_running = False
        self.capture_thread: Optional[threading.Thread] = None
        self.api_url = "http://localhost:8000/detect"
        self.capture_interval = 0.1
        self.last_fen = None
        
        self.overlay: Optional[OverlayWindow] = None
        self.stockfish = StockfishManager()
        self.use_overlay = tk.BooleanVar(value=True)
        
        # UI Variables
        self.turn_var = tk.StringVar(value="w")
        self.status_var = tk.StringVar(value="Ready")
        self.region_var = tk.StringVar(value="No region")
        self.fen_var = tk.StringVar(value="")
        
        self.threads_var = tk.IntVar(value=4)
        self.depth_var = tk.IntVar(value=15)
        self.lines_var = tk.IntVar(value=1)

        # Load Config
        self.load_config()

        self.setup_gui()

    def load_config(self):
        data = ConfigManager.load()
        if data:
            print("[Config] Loading saved settings...")
            r = data.get("region")
            if r:
                self.region = Region(r["x"], r["y"], r["width"], r["height"])
                self.region_var.set(f"{r['width']}×{r['height']} at ({r['x']}, {r['y']})")
            
            s = data.get("settings")
            if s:
                self.threads_var.set(s.get("threads", 4))
                self.depth_var.set(s.get("depth", 15))
                self.lines_var.set(s.get("lines", 1))
                self.apply_engine_settings()
        else:
            # Default requested by user
            print("[Config] Using default 824x825 region.")
            self.region = Region(217, 149, 824, 825)
            self.region_var.set("824x825 at (217, 149) (Default)")

    def save_config(self):
        data = {
            "region": {
                "x": self.region.x if self.region else 0,
                "y": self.region.y if self.region else 0,
                "width": self.region.width if self.region else 823,
                "height": self.region.height if self.region else 830,
            },
            "settings": {
                "threads": self.threads_var.get(),
                "depth": self.depth_var.get(),
                "lines": self.lines_var.get(),
            }
        }
        ConfigManager.save(data)
        print("[Config] Settings saved.")

    def setup_gui(self):
        self.root.title("Chess Board Detector")
        self.root.geometry("450x650") # Larger window
        self.root.configure(bg="#2d2d2d")
        
        # Styles
        style = ttk.Style()
        style.theme_use('clam')
        style.configure("Dark.TFrame", background="#2d2d2d")
        style.configure("Dark.TLabel", background="#2d2d2d", foreground="#ffffff", font=("Segoe UI", 10))
        style.configure("Dark.TButton", background="#3d3d3d", foreground="#ffffff", font=("Segoe UI", 10, "bold"), borderwidth=0)
        style.map("Dark.TButton", background=[("active", "#505050")])

        main_frame = ttk.Frame(self.root, padding="20", style="Dark.TFrame")
        main_frame.pack(fill=tk.BOTH, expand=True)

        # Header
        ttk.Label(main_frame, text="Chess Vision AI", font=("Segoe UI", 24, "bold"), style="Dark.TLabel").pack(pady=(0, 20))

        # 1. Capture Controls
        control_frame = tk.LabelFrame(main_frame, text="Capture Controls", font=("Segoe UI", 11, "bold"), bg="#2d2d2d", fg="#aaaaaa", padx=15, pady=15)
        control_frame.pack(fill="x", pady=(0, 15))

        tk.Label(control_frame, textvariable=self.region_var, font=("Consolas", 10), bg="#2d2d2d", fg="#4CAF50").pack(anchor="w")
        
        btn_box = tk.Frame(control_frame, bg="#2d2d2d")
        btn_box.pack(fill="x", pady=10)
        
        self.select_btn = tk.Button(btn_box, text="Select Region", bg="#444", fg="white", padx=15, pady=8, borderwidth=0, command=self.select_region)
        self.select_btn.pack(side=tk.LEFT, padx=(0, 10))
        
        self.toggle_btn = tk.Button(btn_box, text="Start Capture", bg="#2ecc71", fg="white", padx=15, pady=8, borderwidth=0, command=self.toggle_capture)
        self.toggle_btn.pack(side=tk.LEFT)

        tk.Label(control_frame, textvariable=self.status_var, bg="#2d2d2d", fg="#888").pack(anchor="w", pady=(5,0))

        # 2. Engine Settings
        engine_frame = tk.LabelFrame(main_frame, text="Engine Configuration", font=("Segoe UI", 11, "bold"), bg="#2d2d2d", fg="#aaaaaa", padx=15, pady=15)
        engine_frame.pack(fill="x", pady=(0, 15))

        # Grid for settings
        ef_grid = tk.Frame(engine_frame, bg="#2d2d2d")
        ef_grid.pack(fill="x")
        
        # Threads
        tk.Label(ef_grid, text="Threads", bg="#2d2d2d", fg="white").grid(row=0, column=0, sticky="w", padx=5)
        tk.Spinbox(ef_grid, from_=1, to=32, textvariable=self.threads_var, width=5, bg="#444", fg="white", buttonbackground="#444").grid(row=1, column=0, padx=5, pady=5)
        
        # Depth
        tk.Label(ef_grid, text="Depth", bg="#2d2d2d", fg="white").grid(row=0, column=1, sticky="w", padx=5)
        tk.Spinbox(ef_grid, from_=5, to=30, textvariable=self.depth_var, width=5, bg="#444", fg="white", buttonbackground="#444").grid(row=1, column=1, padx=5, pady=5)
        
        # Lines (MultiPV)
        tk.Label(ef_grid, text="Lines (Arrows)", bg="#2d2d2d", fg="white").grid(row=0, column=2, sticky="w", padx=5)
        tk.Spinbox(ef_grid, from_=1, to=5, textvariable=self.lines_var, width=5, bg="#444", fg="white", buttonbackground="#444").grid(row=1, column=2, padx=5, pady=5)

        # Apply Btn
        tk.Button(ef_grid, text="Update Engine", bg="#3498db", fg="white", padx=10, pady=2, borderwidth=0, command=self.apply_engine_settings).grid(row=1, column=3, padx=15)

        # Misc
        misc_frame = tk.Frame(main_frame, bg="#2d2d2d")
        misc_frame.pack(fill="x", pady=10)
        
        tk.Checkbutton(misc_frame, text="Show Arrow Overlay", variable=self.use_overlay, bg="#2d2d2d", fg="white", selectcolor="#2d2d2d", activebackground="#2d2d2d").pack(side=tk.LEFT)
        self.auto_turn_var = tk.BooleanVar(value=True)
        tk.Checkbutton(misc_frame, text="Auto-Switch Turn", variable=self.auto_turn_var, bg="#2d2d2d", fg="white", selectcolor="#2d2d2d", activebackground="#2d2d2d").pack(side=tk.LEFT, padx=10)
        
        turn_box = tk.Frame(misc_frame, bg="#2d2d2d")
        turn_box.pack(side=tk.RIGHT)
        tk.Label(turn_box, text="Turn:", bg="#2d2d2d", fg="white").pack(side=tk.LEFT)
        tk.Radiobutton(turn_box, text="W", variable=self.turn_var, value="w", bg="#2d2d2d", fg="white", selectcolor="#2d2d2d", activebackground="#2d2d2d").pack(side=tk.LEFT)
        tk.Radiobutton(turn_box, text="B", variable=self.turn_var, value="b", bg="#2d2d2d", fg="white", selectcolor="#2d2d2d", activebackground="#2d2d2d").pack(side=tk.LEFT)

        # FEN Display
        tk.Label(main_frame, text="Last Detected FEN:", bg="#2d2d2d", fg="#888").pack(anchor="w")
        tk.Entry(main_frame, textvariable=self.fen_var, bg="#222", fg="#ddd", borderwidth=0, state="readonly").pack(fill="x", pady=5)

    def apply_engine_settings(self):
        self.stockfish.settings.threads = int(self.threads_var.get())
        self.stockfish.settings.depth = int(self.depth_var.get())
        self.stockfish.settings.lines = int(self.lines_var.get())
        self.stockfish.update_settings()
        self.save_config()
        print(f"[Settings] Applied & Saved. Threads={self.stockfish.settings.threads}, Lines={self.stockfish.settings.lines}")

    def capture_loop(self):
        with mss.mss() as sct, requests.Session() as session:
            while self.is_running:
                try:
                    # Check if region valid
                    if not self.region or self.region.width <= 0:
                        time.sleep(1)
                        continue

                    screenshot = sct.grab(self.region.to_dict())
                    img = Image.frombytes("RGB", screenshot.size, screenshot.rgb)
                    img_small = img.resize((416, 416), Image.LANCZOS)
                    
                    buffer = io.BytesIO()
                    img_small.save(buffer, format="PNG")
                    img_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

                    response = session.post(
                        self.api_url,
                        json={
                            "image": img_base64,
                            "orientation": "auto",
                            "active_color": self.turn_var.get(),
                        },
                        timeout=5,
                    )

                    if response.ok:
                        data = response.json()
                        raw_fen = data.get("fen", "")
                        orientation = data.get("orientation", "white")
                        pieces = data.get("piece_count", 0)

                        if raw_fen and raw_fen != self.last_fen:
                            # Parse FENs to determine if a move actually COMPLETED
                            # We only switch turns if we see a piece land on a new square.
                            # Simply disappearing (dragging) should NOT trigger a switch.
                            
                            move_color = self.detect_who_moved(self.last_fen, raw_fen)
                            
                            if self.auto_turn_var.get() and move_color:
                                # If White moved, it's now Black's turn
                                current_turn = self.turn_var.get()
                                
                                if move_color == "w" and current_turn == "w":
                                    self.turn_var.set("b")
                                    print("[Game] White moved. Switching to Black.")
                                elif move_color == "b" and current_turn == "b":
                                    self.turn_var.set("w")
                                    print("[Game] Black moved. Switching to White.")

                            # Always use the current turn for the final FEN sent to Stockfish
                            # (We patch the active color in the FEN)
                            final_fen = f"{raw_fen.split(' ')[0]} {self.turn_var.get()} - - 0 1"
                            
                            self.last_fen = raw_fen
                            self.fen_var.set(final_fen)
                            self.status_var.set(f"Active | Pieces: {pieces} | Turn: {self.turn_var.get().upper()}")
                            
                            if self.use_overlay.get() and self.overlay:
                                best_moves = self.stockfish.get_best_moves(final_fen)
                                if best_moves:
                                    self.root.after(0, lambda: self.overlay.draw_arrows(best_moves, orientation))
                                else:
                                    self.root.after(0, lambda: self.overlay.canvas.delete("all"))
                    else:
                        self.status_var.set(f"API Error: {response.status_code}")

                except Exception as e:
                    self.status_var.set(f"Error: {str(e)[:20]}...")
                    # print(e)

                time.sleep(self.capture_interval)

    def detect_who_moved(self, old_fen: str, new_fen: str) -> Optional[str]:
        """
        Compare two FEN strings (board part only) to identify which side made a move.
        Returns 'w' if White moved, 'b' if Black moved, or None if inconclusive (e.g. dragging).
        """
        if not old_fen or not new_fen: return None
        
        # 1. Expand FEN to 64-char grid
        def expand_fen(fen):
            rows = fen.split(' ')[0].split('/')
            grid = []
            for row in rows:
                expanded = ""
                for char in row:
                    if char.isdigit():
                        expanded += "." * int(char)
                    else:
                        expanded += char
                grid.append(expanded)
            return "".join(grid)

        old_grid = expand_fen(old_fen)
        new_grid = expand_fen(new_fen)

        if old_grid == new_grid: return None

        # 2. Analyze differences
        # We look for source squares (piece was there, now empty)
        # and dest squares (something changed to specific color)
        
        w_source = 0
        w_dest = 0
        b_source = 0
        b_dest = 0
        
        diffs = []
        for i in range(64):
            o = old_grid[i]
            n = new_grid[i]
            if o != n:
                diffs.append((i, o, n))
                # Source detection (Disappeared)
                if o.isupper() and n == '.': w_source += 1
                if o.islower() and n == '.': b_source += 1
                
                # Destination detection (Appeared or Captured)
                # If n is White (Upper) and o was not White (could be empty or Black)
                if n.isupper() and not o.isupper(): w_dest += 1
                # If n is Black (Lower) and o was not Black
                if n.islower() and not o.islower(): b_dest += 1

        # 3. Decision Logic
        # A completed move usually means Source >= 1 AND Dest >= 1
        # (Castling involves 2 src/2 dest, Capture is 1 src/1 dest)
        
        # If we see a White piece appear (Dest > 0) and White source > 0 -> White moved
        if w_dest > 0 and w_source > 0:
            return "w"
        
        # If we see Black piece appear and Black source -> Black moved
        if b_dest > 0 and b_source > 0:
            return "b"

        # Special Case: Castling? 
        # (King moves 2 squares, Rook moves 2/3). Checks above handle it (src & dest exist).
        
        # Special Case: Dragging (Disappeared but not appeared)
        # If w_source > 0 but w_dest == 0 -> Piece is currently being held/invisible. 
        # DO NOT SWITCH.
        
        return None

    # select_region, toggle_capture, start_capture, stop_capture...
    def toggle_capture(self):
        if self.is_running:
            self.stop_capture()
        else:
            self.start_capture()

    # Need to update start_capture to instantiate overlay if using default config
    def start_capture(self):
        # Create overlay if not exists (for default config case)
        if not self.overlay and self.region:
            self.overlay = OverlayWindow(self.region)
        
        if not self.region:
             self.select_region()
             return

        self.is_running = True
        self.toggle_btn.config(text="Stop Capture", bg="#e74c3c")
        self.select_btn.config(state=tk.DISABLED)
        self.apply_engine_settings()
        
        self.capture_thread = threading.Thread(target=self.capture_loop, daemon=True)
        self.capture_thread.start()

    def stop_capture(self):
        self.is_running = False
        self.toggle_btn.config(text="Start Capture", bg="#2ecc71")
        self.select_btn.config(state=tk.NORMAL)
        if self.overlay: self.overlay.canvas.delete("all")

    # ... RegionSelector and select_region ...
    
    def select_region(self):
        self.root.withdraw()
        time.sleep(0.2)
        def on_region_selected(region: Region):
            self.region = region
            self.region_var.set(f"{region.width}×{region.height} at ({region.x}, {region.y})")
            self.save_config() # Save immediately
            
            if self.overlay: self.overlay.close()
            self.overlay = OverlayWindow(region)
            
            self.root.deiconify()
            self.toggle_btn.config(state=tk.NORMAL)

        selector = RegionSelector(on_region_selected)
        selector.run()
        if self.region is None: self.root.deiconify()

    def run(self):
        self.root.mainloop()
        if self.stockfish: self.stockfish.quit()

if __name__ == "__main__":
    print("Starting Chess Board Detector...")
    app = ChessDetector()
    app.run()
