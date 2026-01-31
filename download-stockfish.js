const fs = require('fs');
const https = require('https');
const path = require('path');

const files = [
    {
        url: 'https://raw.githubusercontent.com/nmrugg/stockfish.js/master/stockfish.js',
        dest: 'public/stockfish.js'
    },
    {
        url: 'https://raw.githubusercontent.com/nmrugg/stockfish.js/master/stockfish.wasm',
        dest: 'public/stockfish.wasm'
    }
];

files.forEach(file => {
    const destPath = path.join(__dirname, file.dest);
    const fileStream = fs.createWriteStream(destPath);

    console.log(`Downloading ${file.url} to ${destPath}...`);

    https.get(file.url, (response) => {
        if (response.statusCode !== 200) {
            console.error(`Failed to download ${file.url}: Status Code ${response.statusCode}`);
            return;
        }
        response.pipe(fileStream);
        fileStream.on('finish', () => {
            fileStream.close();
            console.log(`Download completed: ${destPath}`);
        });
    }).on('error', (err) => {
        fs.unlink(destPath, () => { }); // Delete the file async. (But we don't check the result)
        console.error(`Error downloading ${file.url}: ${err.message}`);
    });
});
