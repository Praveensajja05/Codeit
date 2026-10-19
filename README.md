# Codeit

A competitive-programming companion: upcoming contests from five platforms, one searchable
problem list across Codeforces, AtCoder and LeetCode, favorites, and a daily problem with a
streak that is verified against Codeforces.

## Features

- **Contests**: upcoming contests from Codeforces, AtCoder, LeetCode, CodeChef and GeeksforGeeks
  (through the Clist.by API), filterable by platform, each with an "Add to Google Calendar" link.
- **Problems**: one list across Codeforces, AtCoder and LeetCode. Search by name or ID, filter by
  tag (tags are unified, so "dp" and "Dynamic Programming" are one filter), rating range or
  LeetCode difficulty, and "only unsolved".
- **Solved sync**: enter your Codeforces and AtCoder handles and the app marks the problems
  you've already solved.
- **Favorites**: star problems and contests.
- **Daily problem and streak**: one random unsolved Codeforces problem a day, in your chosen
  rating range. The streak only counts if Codeforces shows an accepted submission that same day.

## Stack

React (Vite) · Node.js / Express 5 · PostgreSQL · JWT authentication with bcrypt

## Run it (Windows)

You need Node.js 18+ and PostgreSQL.

```
# 1. Create the database (or use pgAdmin)
psql -U postgres -c "CREATE DATABASE codeit;"

# 2. Server
cd server
copy .env.example .env        # then open .env and fill in DATABASE_URL and JWT_SECRET
npm install
npm run db:init               # creates the tables
npm run sync-problems         # downloads the problem lists (LeetCode takes a minute or two)
npm run dev                   # API on http://localhost:5000

# 3. Client, in a second terminal
cd client
npm install
npm run dev                   # open http://localhost:5173
```

Without a Clist API key, the contests page shows Codeforces contests only.

## Tests

`cd server && npm test` runs unit tests for the streak logic, time zones, the Google Calendar
link, AtCoder difficulty and tag normalization.

## Design decisions

- **PostgreSQL**: users, problems, solved problems, favorites and daily challenges are
  relationships between users and problems, which is what a relational database is built for.
- **The streak is computed, not stored.** Each day's challenge is a row; the streak is the number
  of consecutive solved days. Nothing has to "reset" it at midnight, so there's no scheduled job.
- **Solves are verified.** The daily problem is from Codeforces because its official API lets the
  server check for an accepted submission, so a user can't just click "done".
- **Every SQL value is a parameter** (`$1`, `$2`…), never pasted into the query text, which
  prevents SQL injection.
- **Each platform is isolated.** If one website's API fails, the others keep working, and the
  sync reports which one failed.
- **The server refuses to start** without `DATABASE_URL` or with a weak `JWT_SECRET`.
- **Contests are cached for 10 minutes**, because Clist limits how often you can call it.

## Data sources and limitations

- Codeforces: official API.
- AtCoder: AtCoder Problems (kenkoooo.com), the community API; AtCoder has no official one.
  AtCoder problems have no tags.
- LeetCode: the unofficial GraphQL endpoint LeetCode's own website uses. It can change without
  notice; if it does, LeetCode sync fails and the rest keeps working. Premium problems are left
  out. LeetCode solves can't be synced, because only recent submissions are public.
- CodeChef and GeeksforGeeks: contests only. Neither has a usable public problem API.
- The daily problem is Codeforces only (see above).

## How it was built

A personal rebuild of the feature set of a 2025 team project I worked on, written from
scratch with a different stack (PostgreSQL instead of MongoDB). Written with help from an AI
assistant (Claude).
