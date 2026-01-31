const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'node_modules', 'stockfish', 'src');
const destDir = path.join(__dirname, 'public');

// Ensure destination directory exists (it should)
if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

// Files to copy. The package structure varies, usually 'stockfish.js' is in src or root.
// We will check locations.

const possibleSources = [
    path.join(__dirname, 'node_modules', 'stockfish', 'src', 'stockfish.js'),
    path.join(__dirname, 'node_modules', 'stockfish', 'stockfish.js'),
    path.join(__dirname, 'node_modules', 'stockfish', 'src', 'stockfish.wasm'), // If applicable
    path.join(__dirname, 'node_modules', 'stockfish', 'stockfish.wasm')
];

possibleSources.forEach(srcPath => {
    if (fs.existsSync(srcPath)) {
        const fileName = path.basename(srcPath);
        const destPath = path.join(destDir, fileName);
        fs.copyFileSync(srcPath, destPath);
        console.log(`Copied ${fileName} to public/`);
    }
});
