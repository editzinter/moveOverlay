"use client";

import React from 'react';
import {
    FaBolt,
    FaRobot,
    FaHandshake,
    FaTrophy,
    FaChessBoard,
    FaUserGraduate,
    FaChartLine,
    FaList
} from "react-icons/fa6";

const PlayOption = ({
    icon,
    title,
    description
}: {
    icon: React.ReactNode,
    title: string,
    description: string
}) => {
    return (
        <button className="w-full flex items-center gap-4 bg-[#262421] hover:bg-[#3d3b38] transition-colors p-4 rounded-lg group text-left">
            <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
                {icon}
            </div>
            <div>
                <div className="text-white font-bold text-lg leading-tight group-hover:text-white/90">{title}</div>
                <div className="text-[#989795] text-sm leading-tight group-hover:text-[#b4b3b2]">{description}</div>
            </div>
        </button>
    );
};

const PlayMenu = () => {
    return (
        <div className="bg-[#262522] w-full max-w-sm rounded-lg overflow-hidden flex flex-col h-fit shadow-lg">
            {/* Header */}
            <div className="bg-[#211F1C] p-4 text-center border-b border-[#302e2b]">
                <h2 className="text-white text-3xl font-black flex items-center justify-center gap-2">
                    <FaChessPawnIcon className="text-[#d8d8d8] text-3xl" /> Play Chess
                </h2>
            </div>

            <div className="p-4 flex flex-col gap-3">

                <PlayOption
                    icon={(
                        <div className="w-full h-full bg-[#f1ad2d] rounded flex items-center justify-center shadow-inner pt-1">
                            <FaBolt className="text-white text-xl" />
                        </div>
                    )}
                    title="Play Online"
                    description="Play vs a person of similar skill"
                />

                <PlayOption
                    icon={(
                        <div className="w-full h-full bg-[#48535d] rounded flex items-center justify-center shadow-inner pt-1">
                            <FaRobot className="text-white text-xl" />
                        </div>
                    )}
                    title="Play Bots"
                    description="Challenge a bot from Easy to Master"
                />

                <PlayOption
                    icon={(
                        <div className="w-full h-full bg-[#3d3b38] rounded flex items-center justify-center overflow-hidden shadow-inner pt-1">
                            <FaUserGraduate className="text-[#868686] text-xl" />
                        </div>
                    )}
                    title="Play Coach"
                    description="Learn as you play a game with Coach"
                />

                <PlayOption
                    icon={(
                        <div className="w-full h-full bg-[#6a5c4e] rounded flex items-center justify-center overflow-hidden shadow-inner pt-1">
                            <FaHandshake className="text-white text-xl" />
                        </div>
                    )}
                    title="Play a Friend"
                    description="Invite a friend to a game of chess"
                />

                <PlayOption
                    icon={(
                        <div className="w-full h-full bg-[#eeba2b] rounded flex items-center justify-center overflow-hidden shadow-inner pt-1">
                            <FaTrophy className="text-white text-xl" />
                        </div>
                    )}
                    title="Tournaments"
                    description="Join an Arena where anyone can win"
                />

                <PlayOption
                    icon={(
                        <div className="w-full h-full bg-[#2a4d2a] rounded flex items-center justify-center overflow-hidden shadow-inner pt-1">
                            <FaChessBoard className="text-white text-xl" />
                        </div>
                    )}
                    title="Chess Variants"
                    description="Find fun new ways to play chess"
                />

            </div>

            {/* Footer Links */}
            <div className="p-4 flex justify-center gap-6 mt-auto">
                <button className="flex items-center gap-2 text-[#989795] hover:text-white transition-colors text-xs font-semibold">
                    <FaList /> Game History
                </button>
                <button className="flex items-center gap-2 text-[#989795] hover:text-white transition-colors text-xs font-semibold">
                    <FaChartLine /> Leaderboard
                </button>
            </div>
        </div>
    );
};

// Internal icon component for the header since we need a specific single icon
const FaChessPawnIcon = ({ className }: { className?: string }) => (
    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 384 512" className={className} height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
        <path d="M241.5 216C239.5 216 238.1 216.7 236.9 217.7C235.1 218.1 234.3 220 234.2 222C236.8 226.2 238.2 231 238.2 235.1C238.2 255.8 222.1 271.1 202.2 271.1C182.4 271.1 166.3 255.8 166.3 235.1C166.3 231 167.7 226.2 170.3 222C170.2 220 168.4 218.1 167.6 217.7C166.4 216.7 165 216 163 216C138.8 216 119.2 235.6 119.2 259.8C119.2 278.1 130.4 294.2 146.4 300.9C150.8 302.7 153.3 307.7 151.8 312.2C130 377.9 123.4 382.9 83.1 391.8C86.73 397.7 91.86 402.7 97.87 406.3L286.2 406.3C292.1 402.7 297.3 397.7 300.8 391.8C260.6 382.9 253.1 377.9 232.2 312.2C230.7 307.7 233.2 302.7 237.6 300.9C253.6 294.2 264.8 278.1 264.8 259.8C264.8 235.6 245.2 216 241.5 216V216zM157.6 127.3C157.3 115.5 160.7 103.9 167.4 93.98C174.1 84.11 183.8 76.4 195 72.13C206.2 67.86 218.4 67.27 230 70.47C241.5 73.66 251.8 80.45 259.2 89.69C266.6 98.92 270.7 110.1 270.9 121.9C271.2 133.7 267.5 145.2 260.5 154.9C253.6 164.6 243.7 171.9 232.2 175.8C220.8 179.7 208.4 179.9 196.8 176.4C189.6 174.2 182.9 170.6 177.1 165.7C177.3 170.8 179.9 175.6 184 178.6C188.1 181.7 193.3 182.7 198.3 181.4C210.8 178.3 223.8 179 235.8 183.4C247.7 187.8 258 195.8 265.1 206.1C272.2 216.4 275.9 228.6 275.5 241.1C275.1 253.6 270.8 265.7 263.1 275.9C255.4 286 244.7 293.7 232.5 297.8C220.3 301.9 207.2 302.1 194.9 298.5C182.5 294.9 171.5 287.6 163.4 277.6C155.3 267.6 150.6 255.4 149.9 242.6C148.9 224.7 155.1 207.3 166.7 193.9C164.5 192 162.7 189.9 161.4 187.5C149.3 175.7 141.4 160.7 139.1 144.3C136.7 127.8 139.9 111.1 148.2 96.65C156.4 82.2 169.3 70.88 184.8 64.97C200.2 59.07 217.4 58.91 232.9 64.53C248.5 70.15 261.6 81.25 270.1 95.59C278.6 109.9 281.9 126.7 279.7 143.1C277.5 159.6 269.8 174.6 257.9 186.6C261 188.9 263.8 191.6 266.1 194.7C275.8 207.9 281.2 223.7 281.5 240.1C281.9 256.5 277.2 272.6 267.9 286.3C258.6 300 245.2 310.6 229.7 316.6C214.2 322.5 197.3 323.5 181.3 319.2C165.3 315 151 305.8 140.4 292.9C129.8 280 123.5 264.1 122.4 247.6C121.7 235.6 123.9 223.8 128.8 213C124.9 214.1 120.9 214.7 116.8 214.7C106 214.7 95.69 210.6 87.82 203.2C70.14 186.7 70.14 159.3 87.82 142.8C95.69 135.4 106 131.3 116.8 131.3C121.2 131.3 125.4 132 129.4 133.3C132.3 103.3 150.1 76.53 177.3 60.98C125.7 64.84 81.32 99.4 64.91 146.4C48.5 193.4 62.43 246.3 100 279.2C103.7 312.4 122.1 342.3 150.6 361.6C122.3 365 96.94 378.7 80.32 400C58.85 400 39.51 409.8 27.24 425.5C-13.82 478.1 4.545 512 4.545 512H379.5C379.5 512 397.8 478.1 356.8 425.5C344.5 409.8 325.2 400 303.7 400C287.1 378.7 261.7 365 233.4 361.6C262.1 342.2 280.5 312.1 284 278.8C321.6 246 335.5 193.1 319.1 146.1C302.7 99.09 258.3 64.53 206.7 60.67C201.2 48.01 192.3 37.16 181.1 29.49C178.6 27.8 175.7 26.65 172.9 25.86V0H147.1V25.86C144.3 26.65 141.4 27.8 138.9 29.49C121.7 41.28 114.7 63.38 120.4 83.19C124.6 97.66 135.5 109.4 149.2 115.6C151.7 119.3 154.5 123.5 157.6 127.3V127.3z" />
    </svg>
)

export default PlayMenu;
