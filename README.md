# Codeit

A competitive-programming companion: upcoming contests with email reminders, one searchable
problem list across Codeforces, AtCoder and LeetCode, favorites, and daily problems from
Codeforces, LeetCode and GeeksforGeeks with streaks.

## Features

- **Contests**: upcoming contests from Codeforces, AtCoder, LeetCode and CodeChef (through the
  Clist.by API), filterable by platform, each with an "Add to Google Calendar" link.
  GeeksforGeeks contests are requested too, but none have shown up in testing yet (see limitations).
- **Contest reminders**: click the 🔔 on any contest and Codeit emails you about 30 minutes before
  it starts. You choose each contest yourself; nothing is emailed unless you turn it on. Your
  reminders are listed on the Profile page, where you can remove them.
- **Problems**: one list across Codeforces, AtCoder and LeetCode. Search by name or ID, filter by
  tag (tags are unified, so "dp" and "Dynamic Programming" are one filter), rating range or
  LeetCode difficulty, and "only unsolved".
- **Solved sync**: enter your Codeforces and AtCoder handles and the app marks the problems
  you've already solved.
- **Favorites**: star problems and contests.
- **Daily problems and streaks**: three problems a day.
  - Codeforces: a random unsolved problem in your chosen rating range.
  - LeetCode: LeetCode's own daily question.
  - GeeksforGeeks: a link to GFG's Problem of the Day.

  The main streak counts a day if you solved the Codeforces **or** the LeetCode problem, and the
  app checks both with the platform before counting them. LeetCode also has its own streak. GFG has
  a separate streak that you mark yourself, shown as self-reported, because GFG has no public API
  to check a solve.

## Stack

React (Vite) · Node.js / Express 5 · PostgreSQL · JWT authentication with bcrypt

## Run it (Windows)

You need Node.js 20.19+ (or 22.12+) and PostgreSQL.

```
# 1. Create the database (or use pgAdmin)
psql -U postgres -c "CREATE DATABASE codeit;"

# 2. Server
cd server
copy .env.example .env        # then open .env and fill in DATABASE_URL and JWT_SECRET
npm install
npm run db:init               # creates the tables (safe to re-run; also upgrades older databases)
npm run sync-problems         # downloads the problem lists (LeetCode takes a minute or two)
npm run dev                   # API on http://localhost:5000

# 3. Client, in a second terminal
cd client
npm install
npm run dev                   # open http://localhost:5173
```

Without a Clist API key, the contests page shows Codeforces contests only.

**Reminder emails** need an SMTP account in `.env` (see `.env.example`; for Gmail, use an App
Password, never your real password). Without one, reminders are printed in the server terminal,
so you can still try the feature. Reminders are only sent while the server is running.

## Tests

`cd server && npm test` runs unit tests for the streak rules, the daily day boundaries, the
Google Calendar link, AtCoder difficulty, tag normalization and the reminder email.

## Design decisions

- **PostgreSQL**: users, problems, solved problems, favorites and daily challenges are
  relationships between users and problems, which is what a relational database is built for.
- **Streaks are computed, not stored.** Each daily solve is a row in `daily_solves`; a streak is
  the number of consecutive days with a row. Nothing has to "reset" it at midnight, so there's no
  scheduled job.
- **Solves are verified where the platform allows it.** Codeforces (official API) and LeetCode
  (its public recent-submissions data) are checked by the server for an accepted submission made
  today, so a user can't just click "done". GFG can't be checked, so its streak is kept separate
  and labelled self-reported, and it never counts towards the main streak.
- **One day boundary per platform.** The Codeforces problem, the main streak and the LeetCode
  streak change at midnight UTC (5:30 am in India), when LeetCode posts its daily question. GFG's
  streak follows midnight India time, when GFG changes its problem.
- **Database constraints prevent duplicates.** `PRIMARY KEY (user_id, platform, day)` means two
  tabs checking at the same moment still record one solve.
- **Every SQL value is a parameter** (`$1`, `$2`…), never pasted into the query text, which
  prevents SQL injection.
- **Each platform is isolated.** If one website's API fails, the others keep working, and the
  sync reports which one failed.
- **The server refuses to start** without `DATABASE_URL` or with a weak `JWT_SECRET`.
- **Contests are cached for 10 minutes**, because Clist limits how often you can call it.
- **A reminder is never emailed twice.** Every minute the server claims due reminders with one
  `UPDATE ... SET sent_at = now() WHERE sent_at IS NULL ... RETURNING`, so two runs at the same
  moment can't both get the same row. A first version that read the rows first and marked them
  afterwards sent 2 emails for one reminder when 10 runs overlapped; the single statement sends 1.
  If sending fails, the row is un-claimed and retried on the next run, until the contest starts.
- **Reminder details come from the server.** The browser sends only the contest's ID; the title,
  link and start time are copied from the server's own contest list.

## Data sources and limitations

- Codeforces: official API.
- AtCoder: AtCoder Problems (kenkoooo.com), the community API; AtCoder has no official one.
  AtCoder problems have no tags.
- LeetCode: the unofficial GraphQL endpoint LeetCode's own website uses. It can change without
  notice; if it does, the LeetCode parts show an error and the rest keeps working. Premium
  problems are left out. LeetCode solves can't be synced, because only recent submissions are
  public; those recent submissions are enough to check today's daily question.
- CodeChef: contests only. It has no usable public problem API.
- GeeksforGeeks: a link to its Problem of the Day. It has no public API, so the app can't show
  the problem's name or check a solve. Its contests are requested from Clist, but none have
  appeared yet; whether that's an empty schedule or a different name on Clist isn't confirmed.
- Reminders keep a copy of the contest's start time from when you turned them on. If a contest
  is rescheduled after that, the email goes out at the old time. They're only sent while the
  server is running, since Codeit isn't deployed anywhere.

## How it was built

A personal rebuild of the feature set of a 2025 team project I worked on, written from
scratch with a different stack (PostgreSQL instead of MongoDB). Written with help from an AI
assistant (Claude).
