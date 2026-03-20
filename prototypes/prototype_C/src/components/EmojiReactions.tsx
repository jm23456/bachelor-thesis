import React, { useState } from "react";
import type { EmojiReaction } from "../types/types";

interface EmojiReactionsProps {
  reactions: EmojiReaction[];
  onReact: (emoji: EmojiReaction) => void;
}

const AVAILABLE_EMOJIS: EmojiReaction[] = [
  '👏🏼', '👍🏼', '👎🏼', '👀', '😯', '😤', '🤨', '🙂‍↕️'
];

const EmojiReactions: React.FC<EmojiReactionsProps> = ({ reactions, onReact }) => {
  const [showPicker, setShowPicker] = useState(false);

  // Zähle wie oft jedes Emoji verwendet wurde
  const reactionCounts = reactions.reduce((acc, emoji) => {
    acc[emoji] = (acc[emoji] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleEmojiClick = (emoji: EmojiReaction) => {
    onReact(emoji);
    setShowPicker(false);
  };

  return (
    <div className="emoji-reactions-container">
      {/* Angezeigte Reaktionen */}
      {Object.keys(reactionCounts).length > 0 && (
        <div className="emoji-reactions-display">
          {Object.entries(reactionCounts).map(([emoji, count]) => (
            <span 
              key={emoji} 
              className="emoji-reaction-badge"
              onClick={() => onReact(emoji as EmojiReaction)}
            >
              {emoji} {count > 1 && <span className="reaction-count">{count}</span>}
            </span>
          ))}
        </div>
      )}

      {/* Emoji-Picker Button */}
      <button 
        className="emoji-picker-trigger"
        onClick={() => setShowPicker(!showPicker)}
        title="Reaktion hinzufügen"
      >
        😀
      </button>

      {/* Emoji-Picker Popup */}
      {showPicker && (
        <div className="emoji-picker-popup">
          {AVAILABLE_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              className="emoji-picker-option"
              onClick={() => handleEmojiClick(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmojiReactions;
