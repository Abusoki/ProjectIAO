import React from 'react';
import { Repeat, Gift } from 'lucide-react';
import { getEffectiveStats } from '../utils/mechanics';
import ProgressBar from '../components/ui/ProgressBar';
import DamageOverlay from '../components/DamageOverlay';

export default function Combat({ troops, enemies, gameState, setGameState, setView, autoBattle, setAutoBattle, combatLog, damageEvents, currentLoot }) {

    return (
        <div className="h-full flex flex-col relative">
            {/* Visual Effects Overlay */}
            <DamageOverlay events={damageEvents} troops={troops} enemies={enemies} />

            {/* Combat Header / Controls */}
            <div className="flex justify-between items-center mb-4">
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${gameState === 'fighting' ? 'bg-red-900/50 text-red-200 border-red-800 animate-pulse' : 'bg-green-900/50 text-green-200 border-green-800'}`}>
                    {gameState === 'fighting' ? 'COMBAT ACTIVE' : gameState.toUpperCase()}
                </span>

                {gameState !== 'fighting' ? (
                    <button
                        onClick={() => {
                            setGameState('idle');
                            setView('mission_select');
                            setAutoBattle(false);
                        }}
                        className="bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded text-xs font-bold text-white border border-slate-500"
                    >
                        Leave Battlefield
                    </button>
                ) : (
                    <button
                        onClick={() => setAutoBattle(!autoBattle)}
                        className={`text-xs font-bold px-3 py-1 rounded border flex items-center gap-1 transition-all ${autoBattle ? 'bg-amber-600 border-amber-500 text-white animate-pulse' : 'bg-slate-800 border-slate-600 text-slate-400'}`}
                    >
                        <Repeat size={12} /> Auto: {autoBattle ? 'ON' : 'OFF'}
                    </button>
                )}
            </div>

            {/* The Battlefield Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Allies Column */}
                <div className="space-y-2">
                    {troops.filter(t => t.inCombat || t.activity === 'fighting').map((u, idx) => (
                        <div key={idx} className={`p-2 rounded border border-slate-700 bg-slate-800 relative overflow-hidden transition-all duration-300`}>
                            <div className="flex justify-between z-10 relative">
                                <span className="font-bold text-sm truncate">{u.name}</span>
                                <span className="text-xs">{u.currentHp}</span>
                            </div>

                            {/* HP Bar */}
                            <ProgressBar
                                current={u.currentHp}
                                max={getEffectiveStats(u).maxHp}
                                color={u.currentHp < getEffectiveStats(u).maxHp * 0.3 ? "bg-red-500" : "bg-green-500"}
                            />

                            {/* Action Gauge */}
                            <div className="absolute bottom-0 left-0 h-0.5 bg-amber-400 transition-all duration-300" style={{ width: `${Math.min(100, u.actionGauge || 0)}%` }} />
                        </div>
                    ))}
                </div>

                {/* Enemies Column */}
                <div className="space-y-2">
                    {enemies.map((e, idx) => (
                        <div key={idx} className={`p-2 rounded border border-red-900/30 bg-red-900/10 text-right relative overflow-hidden`}>
                            <div className="flex justify-between z-10 relative flex-row-reverse">
                                <span className="font-bold text-sm text-red-300 truncate">{e.name}</span>
                                <span className="text-xs text-red-400">{e.currentHp}</span>
                            </div>

                            {/* Enemy HP */}
                            <ProgressBar current={e.currentHp} max={e.maxHp} color="bg-red-500" />

                            {/* Enemy Action Gauge */}
                            <div className="absolute bottom-0 right-0 h-0.5 bg-red-500 transition-all duration-300" style={{ width: `${Math.min(100, e.actionGauge || 0)}%` }} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Combat Log */}
            <div className="flex-1 bg-black/40 rounded-lg p-3 overflow-y-auto font-mono text-xs text-slate-300 h-48 border border-slate-800 shadow-inner flex flex-col-reverse">
                {[...combatLog].reverse().map((logItem, i) => {
                    const text = logItem.text || logItem; // Fallback for old strings
                    const source = logItem.source || 'system';
                    let color = 'text-slate-300';
                    if (source === 'player') color = 'text-green-300';
                    if (source === 'enemy') color = 'text-orange-400';

                    const isSpecial = text.includes("died") || text.includes("VICTORY");

                    return (
                        <div key={i} className={`mb-1 ${color} ${isSpecial ? "font-bold" : ""}`}>
                            {">"} {text}
                        </div>
                    );
                })}
            </div>

            {/* End of Battle Overlay */}
            {gameState !== 'fighting' && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6 animate-fade-in">
                    <h2 className={`text-4xl font-extrabold mb-4 tracking-widest ${gameState === 'victory' ? 'text-amber-400 drop-shadow-glow' : 'text-red-600'}`}>
                        {gameState.toUpperCase()}
                    </h2>

                    {gameState === 'victory' && (
                        <div className="text-center mb-6">
                            <div className="text-slate-300 mb-2">Battle Complete</div>
                            {autoBattle && <div className="text-xs text-amber-500 animate-pulse">Auto-battle: Finding next target...</div>}
                        </div>
                    )}

                    {gameState === 'victory' && currentLoot && currentLoot.length > 0 && (
                        <div className="mb-6 w-full max-w-xs bg-slate-800/80 p-3 rounded border border-slate-700">
                            <div className="text-sm font-bold text-amber-500 mb-2 flex items-center justify-center gap-2">
                                <Gift size={16} /> Loot Discovered
                            </div>
                            <div className="space-y-1">
                                {currentLoot.map((item, i) => (
                                    <div key={i} className="text-xs text-slate-200 flex justify-between items-center bg-black/20 p-2 rounded">
                                        <span>{item.name}</span>
                                        <span className="text-slate-500 italic ml-2">{item.type}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-4">
                        <button
                            onClick={() => {
                                setGameState('idle');
                                setView('mission_select');
                                setAutoBattle(false);
                            }}
                            className="bg-slate-700 hover:bg-slate-600 px-6 py-2 rounded font-bold text-white border border-slate-500 shadow-lg"
                        >
                            Return to Base
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}