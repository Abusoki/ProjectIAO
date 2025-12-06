import React from 'react';
import { Repeat } from 'lucide-react';
import { getEffectiveStats } from '../utils/mechanics';
import ProgressBar from '../components/ui/ProgressBar';

export default function Combat({ troops, enemies, gameState, setGameState, setView, autoBattle, setAutoBattle, combatLog }) {
    
    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${gameState === 'fighting' ? 'bg-red-900/50 text-red-200 border-red-800 animate-pulse' : 'bg-green-900/50 text-green-200 border-green-800'}`}>
                    {gameState === 'fighting' ? 'COMBAT ACTIVE' : gameState.toUpperCase()}
                </span>
                
                {gameState !== 'fighting' ? (
                    <button onClick={() => { 
                        setGameState('idle'); 
                        setView('mission_select');
                        setAutoBattle(false);
                    }} className="bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded text-xs font-bold text-white border border-slate-500">Leave Battlefield</button>
                ) : (
                    <button onClick={() => setAutoBattle(!autoBattle)} className={`text-xs font-bold px-3 py-1 rounded border flex items-center gap-1 transition-all ${autoBattle ? 'bg-amber-600 border-amber-500 text-white animate-pulse' : 'bg-slate-800 border-slate-600 text-slate-400'}`}><Repeat size={12} /> Auto: {autoBattle ? 'ON' : 'OFF'}</button>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Allies */}
                <div className="space-y-2">
                    {troops.filter(t => t.inCombat || t.activity === 'fighting').map((u, idx) => (
                        <div key={idx} className={`p-2 rounded border border-slate-700 bg-slate-800 relative overflow-hidden`}>
                            <div className="flex justify-between z-10 relative"><span className="font-bold text-sm">{u.name}</span><span className="text-xs">{u.currentHp}</span></div>
                            <ProgressBar current={u.currentHp} max={getEffectiveStats(u).maxHp} color={u.currentHp < getEffectiveStats(u).maxHp * 0.3 ? "bg-red-500" : "bg-green-500"} />
                            <div className="absolute bottom-0 left-0 h-0.5 bg-amber-400 transition-all duration-300" style={{ width: `${u.actionGauge}%`}} />
                        </div>
                    ))}
                </div>
                {/* Enemies */}
                <div className="space-y-2">
                    {enemies.map((e, idx) => (
                        <div key={idx} className={`p-2 rounded border border-red-900/30 bg-red-900/10 text-right relative`}>
                            <div className="flex justify-between z-10 relative flex-row-reverse"><span className="font-bold text-sm text-red-300">{e.name}</span><span className="text-xs text-red-400">{e.currentHp}</span></div>
                            <ProgressBar current={e.currentHp} max={e.maxHp} color="bg-red-500" />
                            <div className="absolute bottom-0 right-0 h-0.5 bg-red-500 transition-all duration-300" style={{ width: `${e.actionGauge}%`}} />
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex-1 bg-black/40 rounded-lg p-3 overflow-y-auto font-mono text-xs text-slate-300 h-48 border border-slate-800 shadow-inner flex flex-col-reverse">
                {[...combatLog].reverse().map((log, i) => (<div key={i} className="mb-1">{">"} {log}</div>))}
            </div>
            
            {gameState !== 'fighting' && (
                <div className="mt-4 flex flex-col gap-2">
                    {gameState === 'victory' && autoBattle && <div className="text-center text-xs text-amber-400 animate-pulse mb-1">Next battle starting soon...</div>}
                </div>
            )}
        </div>
    );
}
