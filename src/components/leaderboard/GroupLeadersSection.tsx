"use client";

import { useState } from "react";
import { Trophy } from "lucide-react";
import GroupDetailsModal from "./GroupDetailsModal";

const GROUP_COLORS: Record<string, string> = {
  A: "#ef4444", B: "#f97316", C: "#eab308", D: "#22c55e",
  E: "#14b8a6", F: "#3b82f6", G: "#8b5cf6", H: "#ec4899",
  I: "#6366f1", J: "#f59e0b", K: "#10b981", L: "#64748b",
};

interface Props {
  eventId: string;
  groupLetters: string[];
  groupLeaders: Record<string, { name: string; pts: number }[]>;
}

export default function GroupLeadersSection({ eventId, groupLetters, groupLeaders }: Props) {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-white flex items-center gap-2">
        <Trophy size={16} className="text-yellow-400" />
        מובילי הבתים (5% לכל מנצח)
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {groupLetters.map((letter) => {
          const leaders = groupLeaders[letter] ?? [];
          const leader = leaders[0];
          const color = GROUP_COLORS[letter];
          return (
            <button
              key={letter}
              onClick={() => setSelectedGroup(letter)}
              className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-right transition-all hover:border-gray-600 hover:bg-gray-800/60 active:scale-95 cursor-pointer"
              style={{ borderTopColor: color, borderTopWidth: 2 }}
            >
              <div className="text-xs font-medium mb-2" style={{ color }}>
                בית {letter}
              </div>
              {leader && leader.pts > 0 ? (
                <>
                  <div className="text-white font-semibold text-sm truncate">{leader.name}</div>
                  <div className="text-gray-400 text-xs mt-0.5">{leader.pts} נקודות</div>
                </>
              ) : (
                <div className="text-gray-600 text-xs">אין תוצאות עדיין</div>
              )}
              <div className="text-gray-600 text-xs mt-2 flex items-center gap-1">
                <span>לפרטים →</span>
              </div>
            </button>
          );
        })}
      </div>

      {selectedGroup && (
        <GroupDetailsModal
          eventId={eventId}
          letter={selectedGroup}
          color={GROUP_COLORS[selectedGroup]}
          onClose={() => setSelectedGroup(null)}
        />
      )}
    </div>
  );
}
