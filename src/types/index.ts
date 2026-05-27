// Shared types for the Soccer Betting App

export type UserRole = "player" | "admin";

export type EventStatus = "draft" | "active" | "completed";
export type MatchStatus = "scheduled" | "live" | "completed";
export type BetStatus = "draft" | "locked";

export interface GroupPrediction {
  a: number; // Team A goals
  b: number; // Team B goals
}

// groupPredictions stored as JSON string: {"1":{"a":1,"b":0},...}
export type GroupPredictionsMap = Record<string, GroupPrediction>;

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  totalPoints: number;
  kingOfGoalsPoints: number | null;
  tournamentWinnerPoints: number | null;
  betStatus: BetStatus | null;
}

export interface MatchWithResult {
  id: string;
  matchNumber: number;
  groupLetter: string;
  teamA: string;
  teamB: string;
  matchDate: string | null;
  venue: string | null;
  status: MatchStatus;
  finalScoreA: number | null;
  finalScoreB: number | null;
}

// World Cup 2026 countries (all 48 qualified nations)
export const WC2026_COUNTRIES = [
  "Qatar",
  "Ecuador",
  "Senegal",
  "Netherlands",
  "England",
  "Iran",
  "United States",
  "Wales",
  "Argentina",
  "Saudi Arabia",
  "Mexico",
  "Poland",
  "France",
  "Australia",
  "Denmark",
  "Tunisia",
  "Spain",
  "Costa Rica",
  "Germany",
  "Japan",
  "Belgium",
  "Canada",
  "Morocco",
  "Croatia",
  "Brazil",
  "Serbia",
  "Switzerland",
  "Cameroon",
  "Portugal",
  "Ghana",
  "Uruguay",
  "South Korea",
  // WC 2026 has 48 teams – additional qualifiers:
  "Italy",
  "Colombia",
  "Chile",
  "Peru",
  "Paraguay",
  "Bolivia",
  "Ecuador",
  "Venezuela",
  "Honduras",
  "Guatemala",
  "Jamaica",
  "Trinidad and Tobago",
  "Panama",
  "Costa Rica",
  "Nigeria",
  "Ivory Coast",
  "Algeria",
  "Egypt",
  "Mali",
  "Zambia",
  "South Africa",
  "Democratic Republic of Congo",
];

// Deduplicated and sorted list
export const COUNTRIES = [...new Set(WC2026_COUNTRIES)].sort();

// Top-100 scorers list for King of Goals autocomplete (illustrative)
export const KNOWN_SCORERS = [
  "Lionel Messi",
  "Cristiano Ronaldo",
  "Kylian Mbappé",
  "Erling Haaland",
  "Neymar Jr.",
  "Harry Kane",
  "Vinicius Jr.",
  "Bukayo Saka",
  "Pedri",
  "Jude Bellingham",
  "Phil Foden",
  "Lautaro Martínez",
  "Marcus Rashford",
  "Ferran Torres",
  "Richarlison",
  "Darwin Núñez",
  "Dusan Vlahovic",
  "Karim Benzema",
  "Cody Gakpo",
  "Antoine Griezmann",
  "Robert Lewandowski",
  "Sadio Mane",
  "Memphis Depay",
  "Son Heung-min",
  "Lorenzo Insigne",
  "Paulo Dybala",
  "Raheem Sterling",
  "Federico Chiesa",
  "Hirving Lozano",
  "Theo Hernández",
];
