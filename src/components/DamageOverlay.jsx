import React from 'react';

export default function DamageOverlay({ events, troops, enemies }) {
    // We map damage events to a simple absolute position logic
    // In a real app we'd track DOM coords, here we approximate based on list index
    return (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
            {events.map(ev => {
                // Find target index to determine left/right side
                const isAlly = troops.find(t => t.uid === ev.targetId);
                const isEnemy = enemies.find(e => e.id === ev.targetId);
                
                let positionClass = "";
                if(isAlly) positionClass = "left-1/4";
                else if(isEnemy) positionClass = "right-1/4";
                else positionClass = "left-1/2"; // Fallback

                const colorClass = ev.type === 'heal' ? 'text-green-400' : 'text-red-500';
                const sign = ev.type === 'heal' ? '+' : '-';

                return (
                    <div key={ev.id} className={`absolute top-1/2 ${positionClass} ${colorClass} font-bold text-2xl animate-float-up`}>
                        {sign}{ev.amount}
                    </div>
                );
            })}
        </div>
    );
}