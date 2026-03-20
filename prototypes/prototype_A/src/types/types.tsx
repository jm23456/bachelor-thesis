export type Step =
  | "TOPIC"
  | "ROLE"
  | "TOPIC_INTRO"
  | "CANDIDATES_INTRO"
  | "ARGUMENTS_INTRO"
  | "ACTIVE_ARGUMENTS_INTRO"
  | "DEBATE"
  | "SUMMARY";

export type Role = "WATCH" | "COMMENT" | "ACTIVE" | null;

export interface DebateMessage {
  id: number;
  side: "Pro" | "Contra" | "You";
  text: string;
}

export interface ChatMessage {
  id: number;
  type: "bot" | "user";
  color?: string;
  text: string;
  side?: string;
  isComplete?: boolean;
  isIntro?: boolean;
}