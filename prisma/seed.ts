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
// Real fixture data: groups A–L, 72 matches, June 11–27 2026
// Venues: USA (11 cities), Mexico (Azteca/Akron/BBVA), Canada (BMO/BC Place)
// Source: Official FIFA 2026 World Cup schedule

type Fixture = {
  matchNumber: number;
  groupLetter: string;
  teamA: string;
  teamB: string;
  matchDate: string;
  venue: string;
};

// All times are UTC. June is EDT (UTC−4), so ET + 4h = UTC.
// "Midnight ET" on a given date = 00:00 ET the following day = 04:00 UTC next day.
const FIXTURES: Fixture[] = [
  // ─── GROUP A ── Mexico, South Korea, Czechia, South Africa ────────────────
  { matchNumber: 1,  groupLetter: "A", teamA: "Mexico",       teamB: "South Africa", matchDate: "2026-06-11T19:00:00Z", venue: "Estadio Azteca" },          // 3pm ET
  { matchNumber: 2,  groupLetter: "A", teamA: "South Korea",  teamB: "Czechia",      matchDate: "2026-06-12T02:00:00Z", venue: "Estadio Akron" },           // 10pm ET Jun 11
  { matchNumber: 3,  groupLetter: "A", teamA: "Czechia",      teamB: "South Africa", matchDate: "2026-06-18T16:00:00Z", venue: "Mercedes-Benz Stadium" },   // 12pm ET
  { matchNumber: 4,  groupLetter: "A", teamA: "Mexico",       teamB: "South Korea",  matchDate: "2026-06-19T01:00:00Z", venue: "Estadio Akron" },           // 9pm ET Jun 18
  { matchNumber: 5,  groupLetter: "A", teamA: "Czechia",      teamB: "Mexico",       matchDate: "2026-06-25T01:00:00Z", venue: "Estadio Azteca" },          // 9pm ET Jun 24
  { matchNumber: 6,  groupLetter: "A", teamA: "South Africa", teamB: "South Korea",  matchDate: "2026-06-25T01:00:00Z", venue: "Estadio BBVA" },            // 9pm ET Jun 24

  // ─── GROUP B ── Canada, Qatar, Switzerland, Bosnia and Herzegovina ─────────
  { matchNumber: 7,  groupLetter: "B", teamA: "Canada",                teamB: "Bosnia and Herzegovina", matchDate: "2026-06-12T19:00:00Z", venue: "BMO Field" },         // 3pm ET
  { matchNumber: 8,  groupLetter: "B", teamA: "Qatar",                 teamB: "Switzerland",            matchDate: "2026-06-13T19:00:00Z", venue: "Levi's Stadium" },    // 3pm ET
  { matchNumber: 9,  groupLetter: "B", teamA: "Switzerland",           teamB: "Bosnia and Herzegovina", matchDate: "2026-06-18T19:00:00Z", venue: "SoFi Stadium" },      // 3pm ET
  { matchNumber: 10, groupLetter: "B", teamA: "Canada",                teamB: "Qatar",                  matchDate: "2026-06-18T22:00:00Z", venue: "BC Place" },          // 6pm ET
  { matchNumber: 11, groupLetter: "B", teamA: "Switzerland",           teamB: "Canada",                 matchDate: "2026-06-24T19:00:00Z", venue: "BC Place" },          // 3pm ET
  { matchNumber: 12, groupLetter: "B", teamA: "Bosnia and Herzegovina",teamB: "Qatar",                  matchDate: "2026-06-24T19:00:00Z", venue: "Lumen Field" },       // 3pm ET

  // ─── GROUP C ── Brazil, Morocco, Haiti, Scotland ──────────────────────────
  { matchNumber: 13, groupLetter: "C", teamA: "Brazil",   teamB: "Morocco",  matchDate: "2026-06-13T22:00:00Z", venue: "MetLife Stadium" },          // 6pm ET
  { matchNumber: 14, groupLetter: "C", teamA: "Haiti",    teamB: "Scotland", matchDate: "2026-06-14T01:00:00Z", venue: "Gillette Stadium" },         // 9pm ET Jun 13
  { matchNumber: 15, groupLetter: "C", teamA: "Scotland", teamB: "Morocco",  matchDate: "2026-06-19T22:00:00Z", venue: "Gillette Stadium" },         // 6pm ET
  { matchNumber: 16, groupLetter: "C", teamA: "Brazil",   teamB: "Haiti",    matchDate: "2026-06-20T01:00:00Z", venue: "Lincoln Financial Field" },  // 9pm ET Jun 19
  { matchNumber: 17, groupLetter: "C", teamA: "Scotland", teamB: "Brazil",   matchDate: "2026-06-24T22:00:00Z", venue: "Hard Rock Stadium" },        // 6pm ET
  { matchNumber: 18, groupLetter: "C", teamA: "Morocco",  teamB: "Haiti",    matchDate: "2026-06-24T22:00:00Z", venue: "Mercedes-Benz Stadium" },    // 6pm ET

  // ─── GROUP D ── USA, Paraguay, Australia, Turkiye ─────────────────────────
  { matchNumber: 19, groupLetter: "D", teamA: "USA",       teamB: "Paraguay",  matchDate: "2026-06-13T01:00:00Z", venue: "SoFi Stadium" },   // 9pm ET Jun 12
  { matchNumber: 20, groupLetter: "D", teamA: "Australia", teamB: "Turkiye",   matchDate: "2026-06-14T04:00:00Z", venue: "BC Place" },        // midnight ET Jun 13
  { matchNumber: 21, groupLetter: "D", teamA: "USA",       teamB: "Australia", matchDate: "2026-06-19T19:00:00Z", venue: "Lumen Field" },    // 3pm ET
  { matchNumber: 22, groupLetter: "D", teamA: "Turkiye",   teamB: "Paraguay",  matchDate: "2026-06-20T04:00:00Z", venue: "Levi's Stadium" }, // midnight ET Jun 19
  { matchNumber: 23, groupLetter: "D", teamA: "Turkiye",   teamB: "USA",       matchDate: "2026-06-26T02:00:00Z", venue: "SoFi Stadium" },   // 10pm ET Jun 25
  { matchNumber: 24, groupLetter: "D", teamA: "Paraguay",  teamB: "Australia", matchDate: "2026-06-26T02:00:00Z", venue: "Levi's Stadium" }, // 10pm ET Jun 25

  // ─── GROUP E ── Germany, Curacao, Ivory Coast, Ecuador ───────────────────
  { matchNumber: 25, groupLetter: "E", teamA: "Germany",     teamB: "Curacao",     matchDate: "2026-06-14T17:00:00Z", venue: "NRG Stadium" },              // 1pm ET
  { matchNumber: 26, groupLetter: "E", teamA: "Ivory Coast", teamB: "Ecuador",     matchDate: "2026-06-14T23:00:00Z", venue: "Lincoln Financial Field" },  // 7pm ET
  { matchNumber: 27, groupLetter: "E", teamA: "Germany",     teamB: "Ivory Coast", matchDate: "2026-06-20T20:00:00Z", venue: "BMO Field" },                // 4pm ET
  { matchNumber: 28, groupLetter: "E", teamA: "Ecuador",     teamB: "Curacao",     matchDate: "2026-06-21T00:00:00Z", venue: "Arrowhead Stadium" },        // 8pm ET Jun 20
  { matchNumber: 29, groupLetter: "E", teamA: "Ecuador",     teamB: "Germany",     matchDate: "2026-06-25T20:00:00Z", venue: "MetLife Stadium" },          // 4pm ET
  { matchNumber: 30, groupLetter: "E", teamA: "Curacao",     teamB: "Ivory Coast", matchDate: "2026-06-25T20:00:00Z", venue: "Lincoln Financial Field" },  // 4pm ET

  // ─── GROUP F ── Netherlands, Japan, Sweden, Tunisia ──────────────────────
  { matchNumber: 31, groupLetter: "F", teamA: "Netherlands", teamB: "Japan",       matchDate: "2026-06-14T20:00:00Z", venue: "AT&T Stadium" },      // 4pm ET
  { matchNumber: 32, groupLetter: "F", teamA: "Sweden",      teamB: "Tunisia",     matchDate: "2026-06-15T02:00:00Z", venue: "Estadio BBVA" },      // 10pm ET Jun 14
  { matchNumber: 33, groupLetter: "F", teamA: "Netherlands", teamB: "Sweden",      matchDate: "2026-06-20T17:00:00Z", venue: "NRG Stadium" },       // 1pm ET
  { matchNumber: 34, groupLetter: "F", teamA: "Tunisia",     teamB: "Japan",       matchDate: "2026-06-21T04:00:00Z", venue: "Estadio BBVA" },      // midnight ET Jun 20
  { matchNumber: 35, groupLetter: "F", teamA: "Japan",       teamB: "Sweden",      matchDate: "2026-06-25T23:00:00Z", venue: "AT&T Stadium" },      // 7pm ET
  { matchNumber: 36, groupLetter: "F", teamA: "Tunisia",     teamB: "Netherlands", matchDate: "2026-06-25T23:00:00Z", venue: "Arrowhead Stadium" }, // 7pm ET

  // ─── GROUP G ── Iran, New Zealand, Belgium, Egypt ─────────────────────────
  { matchNumber: 37, groupLetter: "G", teamA: "Iran",        teamB: "New Zealand", matchDate: "2026-06-16T01:00:00Z", venue: "SoFi Stadium" },  // 9pm ET Jun 15
  { matchNumber: 38, groupLetter: "G", teamA: "Belgium",     teamB: "Egypt",       matchDate: "2026-06-15T19:00:00Z", venue: "Lumen Field" },   // 3pm ET
  { matchNumber: 39, groupLetter: "G", teamA: "Belgium",     teamB: "Iran",        matchDate: "2026-06-21T19:00:00Z", venue: "SoFi Stadium" },  // 3pm ET
  { matchNumber: 40, groupLetter: "G", teamA: "New Zealand", teamB: "Egypt",       matchDate: "2026-06-22T01:00:00Z", venue: "BC Place" },       // 9pm ET Jun 21
  { matchNumber: 41, groupLetter: "G", teamA: "Egypt",       teamB: "Iran",        matchDate: "2026-06-27T03:00:00Z", venue: "Lumen Field" },   // 11pm ET Jun 26
  { matchNumber: 42, groupLetter: "G", teamA: "New Zealand", teamB: "Belgium",     matchDate: "2026-06-27T03:00:00Z", venue: "BC Place" },       // 11pm ET Jun 26

  // ─── GROUP H ── Spain, Cape Verde, Saudi Arabia, Uruguay ──────────────────
  { matchNumber: 43, groupLetter: "H", teamA: "Spain",        teamB: "Cape Verde",  matchDate: "2026-06-15T16:00:00Z", venue: "Mercedes-Benz Stadium" }, // 12pm ET
  { matchNumber: 44, groupLetter: "H", teamA: "Saudi Arabia", teamB: "Uruguay",     matchDate: "2026-06-15T22:00:00Z", venue: "Hard Rock Stadium" },     // 6pm ET
  { matchNumber: 45, groupLetter: "H", teamA: "Spain",        teamB: "Saudi Arabia",matchDate: "2026-06-21T16:00:00Z", venue: "Mercedes-Benz Stadium" }, // 12pm ET
  { matchNumber: 46, groupLetter: "H", teamA: "Uruguay",      teamB: "Cape Verde",  matchDate: "2026-06-21T22:00:00Z", venue: "Hard Rock Stadium" },     // 6pm ET
  { matchNumber: 47, groupLetter: "H", teamA: "Cape Verde",   teamB: "Saudi Arabia",matchDate: "2026-06-27T00:00:00Z", venue: "NRG Stadium" },           // 8pm ET Jun 26
  { matchNumber: 48, groupLetter: "H", teamA: "Uruguay",      teamB: "Spain",       matchDate: "2026-06-27T00:00:00Z", venue: "Estadio Akron" },         // 8pm ET Jun 26

  // ─── GROUP I ── France, Senegal, Iraq, Norway ─────────────────────────────
  { matchNumber: 49, groupLetter: "I", teamA: "France",  teamB: "Senegal", matchDate: "2026-06-16T19:00:00Z", venue: "MetLife Stadium" },         // 3pm ET
  { matchNumber: 50, groupLetter: "I", teamA: "Iraq",    teamB: "Norway",  matchDate: "2026-06-16T22:00:00Z", venue: "Gillette Stadium" },        // 6pm ET
  { matchNumber: 51, groupLetter: "I", teamA: "France",  teamB: "Iraq",    matchDate: "2026-06-22T21:00:00Z", venue: "Lincoln Financial Field" }, // 5pm ET
  { matchNumber: 52, groupLetter: "I", teamA: "Norway",  teamB: "Senegal", matchDate: "2026-06-23T00:00:00Z", venue: "MetLife Stadium" },         // 8pm ET Jun 22
  { matchNumber: 53, groupLetter: "I", teamA: "Norway",  teamB: "France",  matchDate: "2026-06-26T19:00:00Z", venue: "Gillette Stadium" },        // 3pm ET
  { matchNumber: 54, groupLetter: "I", teamA: "Senegal", teamB: "Iraq",    matchDate: "2026-06-26T19:00:00Z", venue: "BMO Field" },               // 3pm ET

  // ─── GROUP J ── Argentina, Algeria, Austria, Jordan ──────────────────────
  { matchNumber: 55, groupLetter: "J", teamA: "Argentina", teamB: "Algeria",   matchDate: "2026-06-17T01:00:00Z", venue: "Arrowhead Stadium" }, // 9pm ET Jun 16
  { matchNumber: 56, groupLetter: "J", teamA: "Austria",   teamB: "Jordan",    matchDate: "2026-06-17T04:00:00Z", venue: "Levi's Stadium" },    // midnight ET Jun 16
  { matchNumber: 57, groupLetter: "J", teamA: "Argentina", teamB: "Austria",   matchDate: "2026-06-22T17:00:00Z", venue: "AT&T Stadium" },      // 1pm ET
  { matchNumber: 58, groupLetter: "J", teamA: "Jordan",    teamB: "Algeria",   matchDate: "2026-06-23T03:00:00Z", venue: "Levi's Stadium" },    // 11pm ET Jun 22
  { matchNumber: 59, groupLetter: "J", teamA: "Algeria",   teamB: "Austria",   matchDate: "2026-06-28T02:00:00Z", venue: "Arrowhead Stadium" }, // 10pm ET Jun 27
  { matchNumber: 60, groupLetter: "J", teamA: "Jordan",    teamB: "Argentina", matchDate: "2026-06-28T02:00:00Z", venue: "AT&T Stadium" },      // 10pm ET Jun 27

  // ─── GROUP K ── Portugal, DR Congo, Uzbekistan, Colombia ─────────────────
  { matchNumber: 61, groupLetter: "K", teamA: "Portugal",    teamB: "DR Congo",   matchDate: "2026-06-17T17:00:00Z", venue: "NRG Stadium" },           // 1pm ET
  { matchNumber: 62, groupLetter: "K", teamA: "Uzbekistan",  teamB: "Colombia",   matchDate: "2026-06-18T02:00:00Z", venue: "Estadio Azteca" },        // 10pm ET Jun 17
  { matchNumber: 63, groupLetter: "K", teamA: "Portugal",    teamB: "Uzbekistan", matchDate: "2026-06-23T17:00:00Z", venue: "NRG Stadium" },           // 1pm ET
  { matchNumber: 64, groupLetter: "K", teamA: "Colombia",    teamB: "DR Congo",   matchDate: "2026-06-24T02:00:00Z", venue: "Estadio Akron" },         // 10pm ET Jun 23
  { matchNumber: 65, groupLetter: "K", teamA: "Colombia",    teamB: "Portugal",   matchDate: "2026-06-27T23:30:00Z", venue: "Hard Rock Stadium" },     // 7:30pm ET
  { matchNumber: 66, groupLetter: "K", teamA: "DR Congo",    teamB: "Uzbekistan", matchDate: "2026-06-27T23:30:00Z", venue: "Mercedes-Benz Stadium" }, // 7:30pm ET

  // ─── GROUP L ── England, Croatia, Ghana, Panama ───────────────────────────
  { matchNumber: 67, groupLetter: "L", teamA: "England", teamB: "Croatia", matchDate: "2026-06-17T20:00:00Z", venue: "AT&T Stadium" },          // 4pm ET
  { matchNumber: 68, groupLetter: "L", teamA: "Ghana",   teamB: "Panama",  matchDate: "2026-06-17T23:00:00Z", venue: "BMO Field" },             // 7pm ET
  { matchNumber: 69, groupLetter: "L", teamA: "England", teamB: "Ghana",   matchDate: "2026-06-23T20:00:00Z", venue: "Gillette Stadium" },      // 4pm ET
  { matchNumber: 70, groupLetter: "L", teamA: "Panama",  teamB: "Croatia", matchDate: "2026-06-23T23:00:00Z", venue: "BMO Field" },             // 7pm ET
  { matchNumber: 71, groupLetter: "L", teamA: "Panama",  teamB: "England", matchDate: "2026-06-27T21:00:00Z", venue: "MetLife Stadium" },       // 5pm ET
  { matchNumber: 72, groupLetter: "L", teamA: "Croatia", teamB: "Ghana",   matchDate: "2026-06-27T21:00:00Z", venue: "Lincoln Financial Field" }, // 5pm ET
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
      totalPlayers: 0,
      status: "active",
    },
  });
  console.log(`✅ Event: ${event.eventName}`);

  // 3. 72 matches
  for (const fixture of FIXTURES) {
    await prisma.match.upsert({
      where: { eventId_matchNumber: { eventId: event.id, matchNumber: fixture.matchNumber } },
      update: {
        groupLetter: fixture.groupLetter,
        teamA: fixture.teamA,
        teamB: fixture.teamB,
        matchDate: new Date(fixture.matchDate),
        venue: fixture.venue,
      },
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
