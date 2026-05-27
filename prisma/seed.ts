/**
 * Seed script – creates:
 *  1. Admin user (admin@soccerbet.com / admin123)
 *  2. World Cup 2026 event
 *  3. 72 group-stage matches (Groups A–L, 6 matches each)
 *
 * "בית" prizes (5% each) are calculated dynamically per WC group letter – no player groups needed.
 *
 * Run: npx prisma db seed
 */

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL!, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── WC 2026 Group Stage Fixtures (12 groups × 6 matches) ────────────────────
// Groups A–F: USA/Canada/Mexico venues
// Groups G–L: Remaining venues
// Dates are illustrative (WC 2026 starts June 11, group stage ends ~June 27)

type Fixture = {
  matchNumber: number;
  groupLetter: string;
  teamA: string;
  teamB: string;
  matchDate: string;
  venue: string;
};

const FIXTURES: Fixture[] = [
  // ─── GROUP A ───────────────────────────────────────────────────────────────
  { matchNumber: 1,  groupLetter: "A", teamA: "Qatar",       teamB: "Ecuador",     matchDate: "2026-06-11", venue: "Lusail Stadium" },
  { matchNumber: 2,  groupLetter: "A", teamA: "Netherlands", teamB: "Senegal",     matchDate: "2026-06-11", venue: "Al Bayt Stadium" },
  { matchNumber: 3,  groupLetter: "A", teamA: "Qatar",       teamB: "Senegal",     matchDate: "2026-06-15", venue: "Al Thumama Stadium" },
  { matchNumber: 4,  groupLetter: "A", teamA: "Ecuador",     teamB: "Netherlands", matchDate: "2026-06-15", venue: "Khalifa International" },
  { matchNumber: 5,  groupLetter: "A", teamA: "Ecuador",     teamB: "Senegal",     matchDate: "2026-06-19", venue: "Lusail Stadium" },
  { matchNumber: 6,  groupLetter: "A", teamA: "Netherlands", teamB: "Qatar",       matchDate: "2026-06-19", venue: "Al Bayt Stadium" },

  // ─── GROUP B ───────────────────────────────────────────────────────────────
  { matchNumber: 7,  groupLetter: "B", teamA: "England",      teamB: "Iran",       matchDate: "2026-06-12", venue: "SoFi Stadium" },
  { matchNumber: 8,  groupLetter: "B", teamA: "United States",teamB: "Wales",      matchDate: "2026-06-12", venue: "MetLife Stadium" },
  { matchNumber: 9,  groupLetter: "B", teamA: "England",      teamB: "United States", matchDate: "2026-06-16", venue: "AT&T Stadium" },
  { matchNumber: 10, groupLetter: "B", teamA: "Iran",         teamB: "Wales",      matchDate: "2026-06-16", venue: "Rose Bowl" },
  { matchNumber: 11, groupLetter: "B", teamA: "Wales",        teamB: "England",    matchDate: "2026-06-20", venue: "SoFi Stadium" },
  { matchNumber: 12, groupLetter: "B", teamA: "Iran",         teamB: "United States", matchDate: "2026-06-20", venue: "MetLife Stadium" },

  // ─── GROUP C ───────────────────────────────────────────────────────────────
  { matchNumber: 13, groupLetter: "C", teamA: "Argentina",   teamB: "Saudi Arabia", matchDate: "2026-06-12", venue: "Lusail Stadium" },
  { matchNumber: 14, groupLetter: "C", teamA: "Mexico",      teamB: "Poland",      matchDate: "2026-06-12", venue: "Estadio Azteca" },
  { matchNumber: 15, groupLetter: "C", teamA: "Poland",      teamB: "Saudi Arabia",matchDate: "2026-06-16", venue: "Education City Stadium" },
  { matchNumber: 16, groupLetter: "C", teamA: "Argentina",   teamB: "Mexico",      matchDate: "2026-06-16", venue: "Lusail Stadium" },
  { matchNumber: 17, groupLetter: "C", teamA: "Poland",      teamB: "Argentina",   matchDate: "2026-06-20", venue: "Stadium 974" },
  { matchNumber: 18, groupLetter: "C", teamA: "Saudi Arabia",teamB: "Mexico",      matchDate: "2026-06-20", venue: "Al Janoub Stadium" },

  // ─── GROUP D ───────────────────────────────────────────────────────────────
  { matchNumber: 19, groupLetter: "D", teamA: "France",      teamB: "Australia",   matchDate: "2026-06-13", venue: "Al Janoub Stadium" },
  { matchNumber: 20, groupLetter: "D", teamA: "Tunisia",     teamB: "Denmark",     matchDate: "2026-06-13", venue: "Education City Stadium" },
  { matchNumber: 21, groupLetter: "D", teamA: "France",      teamB: "Denmark",     matchDate: "2026-06-17", venue: "Stadium 974" },
  { matchNumber: 22, groupLetter: "D", teamA: "Australia",   teamB: "Tunisia",     matchDate: "2026-06-17", venue: "Al Wakrah Stadium" },
  { matchNumber: 23, groupLetter: "D", teamA: "Denmark",     teamB: "Australia",   matchDate: "2026-06-21", venue: "Al Thumama Stadium" },
  { matchNumber: 24, groupLetter: "D", teamA: "Tunisia",     teamB: "France",      matchDate: "2026-06-21", venue: "Education City Stadium" },

  // ─── GROUP E ───────────────────────────────────────────────────────────────
  { matchNumber: 25, groupLetter: "E", teamA: "Spain",       teamB: "Costa Rica",  matchDate: "2026-06-13", venue: "Al Bayt Stadium" },
  { matchNumber: 26, groupLetter: "E", teamA: "Germany",     teamB: "Japan",       matchDate: "2026-06-13", venue: "Khalifa International" },
  { matchNumber: 27, groupLetter: "E", teamA: "Japan",       teamB: "Costa Rica",  matchDate: "2026-06-17", venue: "Ahmad Bin Ali Stadium" },
  { matchNumber: 28, groupLetter: "E", teamA: "Spain",       teamB: "Germany",     matchDate: "2026-06-17", venue: "Al Bayt Stadium" },
  { matchNumber: 29, groupLetter: "E", teamA: "Japan",       teamB: "Spain",       matchDate: "2026-06-21", venue: "Khalifa International" },
  { matchNumber: 30, groupLetter: "E", teamA: "Costa Rica",  teamB: "Germany",     matchDate: "2026-06-21", venue: "Al Janoub Stadium" },

  // ─── GROUP F ───────────────────────────────────────────────────────────────
  { matchNumber: 31, groupLetter: "F", teamA: "Belgium",     teamB: "Canada",      matchDate: "2026-06-14", venue: "Ahmad Bin Ali Stadium" },
  { matchNumber: 32, groupLetter: "F", teamA: "Morocco",     teamB: "Croatia",     matchDate: "2026-06-14", venue: "Al Wakrah Stadium" },
  { matchNumber: 33, groupLetter: "F", teamA: "Belgium",     teamB: "Morocco",     matchDate: "2026-06-18", venue: "Al Thumama Stadium" },
  { matchNumber: 34, groupLetter: "F", teamA: "Croatia",     teamB: "Canada",      matchDate: "2026-06-18", venue: "Khalifa International" },
  { matchNumber: 35, groupLetter: "F", teamA: "Croatia",     teamB: "Belgium",     matchDate: "2026-06-22", venue: "Lusail Stadium" },
  { matchNumber: 36, groupLetter: "F", teamA: "Canada",      teamB: "Morocco",     matchDate: "2026-06-22", venue: "Al Bayt Stadium" },

  // ─── GROUP G ───────────────────────────────────────────────────────────────
  { matchNumber: 37, groupLetter: "G", teamA: "Brazil",      teamB: "Serbia",      matchDate: "2026-06-14", venue: "Lusail Stadium" },
  { matchNumber: 38, groupLetter: "G", teamA: "Switzerland", teamB: "Cameroon",    matchDate: "2026-06-14", venue: "Al Janoub Stadium" },
  { matchNumber: 39, groupLetter: "G", teamA: "Brazil",      teamB: "Switzerland", matchDate: "2026-06-18", venue: "Stadium 974" },
  { matchNumber: 40, groupLetter: "G", teamA: "Serbia",      teamB: "Cameroon",    matchDate: "2026-06-18", venue: "Al Wakrah Stadium" },
  { matchNumber: 41, groupLetter: "G", teamA: "Serbia",      teamB: "Switzerland", matchDate: "2026-06-22", venue: "Education City Stadium" },
  { matchNumber: 42, groupLetter: "G", teamA: "Cameroon",    teamB: "Brazil",      matchDate: "2026-06-22", venue: "Lusail Stadium" },

  // ─── GROUP H ───────────────────────────────────────────────────────────────
  { matchNumber: 43, groupLetter: "H", teamA: "Portugal",    teamB: "Ghana",       matchDate: "2026-06-15", venue: "Stadium 974" },
  { matchNumber: 44, groupLetter: "H", teamA: "Uruguay",     teamB: "South Korea", matchDate: "2026-06-15", venue: "Education City Stadium" },
  { matchNumber: 45, groupLetter: "H", teamA: "Portugal",    teamB: "Uruguay",     matchDate: "2026-06-19", venue: "Lusail Stadium" },
  { matchNumber: 46, groupLetter: "H", teamA: "South Korea", teamB: "Ghana",       matchDate: "2026-06-19", venue: "Education City Stadium" },
  { matchNumber: 47, groupLetter: "H", teamA: "South Korea", teamB: "Portugal",    matchDate: "2026-06-23", venue: "Education City Stadium" },
  { matchNumber: 48, groupLetter: "H", teamA: "Ghana",       teamB: "Uruguay",     matchDate: "2026-06-23", venue: "Al Janoub Stadium" },

  // ─── GROUP I ───────────────────────────────────────────────────────────────
  { matchNumber: 49, groupLetter: "I", teamA: "Italy",       teamB: "Colombia",    matchDate: "2026-06-15", venue: "MetLife Stadium" },
  { matchNumber: 50, groupLetter: "I", teamA: "Chile",       teamB: "Peru",        matchDate: "2026-06-15", venue: "SoFi Stadium" },
  { matchNumber: 51, groupLetter: "I", teamA: "Italy",       teamB: "Chile",       matchDate: "2026-06-19", venue: "AT&T Stadium" },
  { matchNumber: 52, groupLetter: "I", teamA: "Colombia",    teamB: "Peru",        matchDate: "2026-06-19", venue: "Rose Bowl" },
  { matchNumber: 53, groupLetter: "I", teamA: "Colombia",    teamB: "Italy",       matchDate: "2026-06-23", venue: "MetLife Stadium" },
  { matchNumber: 54, groupLetter: "I", teamA: "Peru",        teamB: "Chile",       matchDate: "2026-06-23", venue: "SoFi Stadium" },

  // ─── GROUP J ───────────────────────────────────────────────────────────────
  { matchNumber: 55, groupLetter: "J", teamA: "Nigeria",     teamB: "Ivory Coast", matchDate: "2026-06-16", venue: "BC Place" },
  { matchNumber: 56, groupLetter: "J", teamA: "Algeria",     teamB: "Egypt",       matchDate: "2026-06-16", venue: "Stade de France" },
  { matchNumber: 57, groupLetter: "J", teamA: "Nigeria",     teamB: "Algeria",     matchDate: "2026-06-20", venue: "BC Place" },
  { matchNumber: 58, groupLetter: "J", teamA: "Egypt",       teamB: "Ivory Coast", matchDate: "2026-06-20", venue: "BMO Field" },
  { matchNumber: 59, groupLetter: "J", teamA: "Egypt",       teamB: "Nigeria",     matchDate: "2026-06-24", venue: "Stade de France" },
  { matchNumber: 60, groupLetter: "J", teamA: "Ivory Coast", teamB: "Algeria",     matchDate: "2026-06-24", venue: "BC Place" },

  // ─── GROUP K ───────────────────────────────────────────────────────────────
  { matchNumber: 61, groupLetter: "K", teamA: "South Africa",teamB: "Mali",        matchDate: "2026-06-16", venue: "Estadio Azteca" },
  { matchNumber: 62, groupLetter: "K", teamA: "Zambia",      teamB: "DR Congo",    matchDate: "2026-06-16", venue: "Rose Bowl" },
  { matchNumber: 63, groupLetter: "K", teamA: "South Africa",teamB: "Zambia",      matchDate: "2026-06-20", venue: "Estadio Azteca" },
  { matchNumber: 64, groupLetter: "K", teamA: "Mali",        teamB: "DR Congo",    matchDate: "2026-06-20", venue: "AT&T Stadium" },
  { matchNumber: 65, groupLetter: "K", teamA: "Mali",        teamB: "South Africa",matchDate: "2026-06-24", venue: "AT&T Stadium" },
  { matchNumber: 66, groupLetter: "K", teamA: "DR Congo",    teamB: "Zambia",      matchDate: "2026-06-24", venue: "Rose Bowl" },

  // ─── GROUP L ───────────────────────────────────────────────────────────────
  { matchNumber: 67, groupLetter: "L", teamA: "Honduras",    teamB: "Jamaica",     matchDate: "2026-06-17", venue: "Estadio Azteca" },
  { matchNumber: 68, groupLetter: "L", teamA: "Panama",      teamB: "Trinidad and Tobago", matchDate: "2026-06-17", venue: "BMO Field" },
  { matchNumber: 69, groupLetter: "L", teamA: "Honduras",    teamB: "Panama",      matchDate: "2026-06-21", venue: "Estadio Azteca" },
  { matchNumber: 70, groupLetter: "L", teamA: "Jamaica",     teamB: "Trinidad and Tobago", matchDate: "2026-06-21", venue: "BC Place" },
  { matchNumber: 71, groupLetter: "L", teamA: "Jamaica",     teamB: "Honduras",    matchDate: "2026-06-25", venue: "BMO Field" },
  { matchNumber: 72, groupLetter: "L", teamA: "Trinidad and Tobago", teamB: "Panama", matchDate: "2026-06-25", venue: "MetLife Stadium" },
];

async function main() {
  console.log("🌱 Seeding database...");

  // 1. Admin user
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@soccerbet.com" },
    update: {},
    create: {
      email: "admin@soccerbet.com",
      name: "Admin",
      password: adminPassword,
      role: "admin",
    },
  });
  console.log(`✅ Admin user: ${admin.email}`);

  // 2. Event
  const event = await prisma.event.upsert({
    where: { id: "wc2026" },
    update: {},
    create: {
      id: "wc2026",
      eventName: "FIFA World Cup 2026",
      description: "The 2026 FIFA World Cup – 12 groups, 72 group stage matches",
      startDate: new Date("2026-06-11"),
      endDate: new Date("2026-07-19"),
      groupStageEnd: new Date("2026-06-27"),
      bettingDeadline: new Date("2026-06-10T23:59:59"),
      entryFee: 200,
      status: "active",
    },
  });
  console.log(`✅ Event: ${event.eventName}`);

  // 3. 72 matches
  for (const fixture of FIXTURES) {
    await prisma.match.upsert({
      where: { eventId_matchNumber: { eventId: event.id, matchNumber: fixture.matchNumber } },
      update: {},
      create: {
        eventId: event.id,
        matchNumber: fixture.matchNumber,
        groupLetter: fixture.groupLetter,
        teamA: fixture.teamA,
        teamB: fixture.teamB,
        matchDate: new Date(fixture.matchDate),
        venue: fixture.venue,
        status: "scheduled",
      },
    });
  }
  console.log(`✅ 72 group-stage matches seeded`);

  console.log("\n🎉 Seed complete!");
  console.log("   Admin login: admin@soccerbet.com / admin123");
  console.log("   Event ID:    wc2026");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
