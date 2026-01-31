import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export async function POST(req: Request): Promise<NextResponse> {
    try {
        const body = await req.json();
        const { fen, depth = 15, multiPv = 1, threads = 1 } = body;

        if (!fen) {
            return NextResponse.json({ error: 'FEN is required' }, { status: 400 });
        }

        const stockfishPath = path.join(process.cwd(), 'stockfish-bin', 'stockfish', 'stockfish-windows-x86-64-bmi2.exe');

        // Check if file exists
        if (!fs.existsSync(stockfishPath)) {
            console.error('Stockfish not found at:', stockfishPath);
            return NextResponse.json({ error: 'Stockfish executable not found' }, { status: 500 });
        }

        // Spawn Stockfish process
        const stockfish = spawn(stockfishPath);

        let bestMoves: string[] = new Array(multiPv).fill('');
        let evaluation = '0.00';
        let isFinished = false;
        let outputBuffer = '';

        return new Promise<NextResponse>((resolve) => {
            // Timeout to prevent hanging
            const timeout = setTimeout(() => {
                if (!isFinished) {
                    isFinished = true;
                    stockfish.kill();
                    // Return whatever we have
                    resolve(NextResponse.json({
                        bestMoves: bestMoves.filter(m => m),
                        bestMove: bestMoves[0] || null,
                        evaluation
                    }));
                }
            }, 10000); // 10 second timeout

            stockfish.stdout.on('data', (data) => {
                outputBuffer += data.toString();
                const lines = outputBuffer.split('\n');
                outputBuffer = lines.pop() || ''; // Keep incomplete line in buffer

                for (const line of lines) {
                    // Parse evaluation from the deepest depth line
                    if (line.includes('score cp') || line.includes('score mate')) {
                        const scoreMatch = line.match(/score (cp|mate) (-?\d+)/);
                        if (scoreMatch) {
                            const type = scoreMatch[1];
                            const value = parseInt(scoreMatch[2]);
                            if (type === 'cp') {
                                evaluation = (value / 100).toFixed(2);
                                if (value > 0) evaluation = '+' + evaluation;
                            } else {
                                evaluation = value > 0 ? `#${value}` : `#${value}`;
                            }
                        }
                    }

                    // Parse MultiPV lines - format: info depth X ... multipv N ... pv e2e4 e7e5
                    if (line.includes(' pv ')) {
                        const pvMatch = line.match(/multipv (\d+)/);
                        const movesMatch = line.match(/ pv (.+)/);

                        if (movesMatch) {
                            const moves = movesMatch[1].trim().split(' ');
                            if (moves.length > 0 && moves[0].length >= 4) {
                                const pvIndex = pvMatch ? parseInt(pvMatch[1]) - 1 : 0;
                                if (pvIndex >= 0 && pvIndex < multiPv) {
                                    bestMoves[pvIndex] = moves[0];
                                }
                            }
                        }
                    }

                    // Check for bestmove (analysis complete)
                    if (line.startsWith('bestmove')) {
                        const match = line.match(/bestmove (\S+)/);
                        if (match && !bestMoves[0]) {
                            bestMoves[0] = match[1];
                        }

                        isFinished = true;
                        stockfish.kill();
                        clearTimeout(timeout);


                        const filteredMoves = bestMoves.filter(m => m && m !== '(none)');
                        console.log(`[Stockfish] Analyzed FEN: ${fen.substring(0, 20)}... Best Moves: ${filteredMoves.join(', ')}`);
                        resolve(NextResponse.json({
                            bestMoves: filteredMoves,
                            bestMove: filteredMoves[0] || null,
                            evaluation
                        }));
                        return;
                    }
                }
            });

            stockfish.stderr.on('data', (data) => {
                console.error(`Stockfish Error: ${data}`);
            });

            stockfish.on('error', (err) => {
                console.error('Failed to start Stockfish:', err);
                if (!isFinished) {
                    isFinished = true;
                    clearTimeout(timeout);
                    resolve(NextResponse.json({ error: 'Failed to start Stockfish' }, { status: 500 }));
                }
            });

            // Send UCI commands
            stockfish.stdin.write('uci\n');
            stockfish.stdin.write(`setoption name MultiPV value ${multiPv}\n`);
            stockfish.stdin.write(`setoption name Threads value ${threads}\n`);
            stockfish.stdin.write('isready\n');
            stockfish.stdin.write(`position fen ${fen}\n`);
            stockfish.stdin.write(`go depth ${depth}\n`);
        });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
