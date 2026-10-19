CREATE TABLE IF NOT EXISTS users (
  id                SERIAL PRIMARY KEY,
  name              TEXT NOT NULL,
  email             TEXT NOT NULL UNIQUE,
  password_hash     TEXT NOT NULL,
  codeforces_handle TEXT,
  atcoder_handle    TEXT,
  daily_min_rating  INTEGER NOT NULL DEFAULT 800,
  daily_max_rating  INTEGER NOT NULL DEFAULT 1400,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (daily_min_rating <= daily_max_rating)
);
-- Added with the LeetCode daily. ADD COLUMN IF NOT EXISTS also upgrades databases created earlier.
ALTER TABLE users ADD COLUMN IF NOT EXISTS leetcode_handle TEXT;

-- One row per problem from every platform.
CREATE TABLE IF NOT EXISTS problems (
  id               SERIAL PRIMARY KEY,
  platform         TEXT NOT NULL CHECK (platform IN ('codeforces', 'atcoder', 'leetcode')),
  external_id      TEXT NOT NULL,          -- '1850A', 'abc300_a', 'two-sum'
  name             TEXT NOT NULL,
  url              TEXT NOT NULL,
  difficulty       INTEGER,                -- Codeforces rating / AtCoder estimated difficulty
  difficulty_label TEXT,                   -- LeetCode: Easy / Medium / Hard
  tags             TEXT[] NOT NULL DEFAULT '{}',
  UNIQUE (platform, external_id)
);
CREATE INDEX IF NOT EXISTS problems_tags_idx ON problems USING GIN (tags);
CREATE INDEX IF NOT EXISTS problems_difficulty_idx ON problems (platform, difficulty);

CREATE TABLE IF NOT EXISTS solved (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  problem_id INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  solved_at  TIMESTAMPTZ,
  PRIMARY KEY (user_id, problem_id)
);

CREATE TABLE IF NOT EXISTS favorite_problems (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  problem_id INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, problem_id)
);

-- Contests are not stored (they come live from Clist), so a favorite keeps a copy of the details.
CREATE TABLE IF NOT EXISTS favorite_contests (
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contest_key TEXT NOT NULL,
  title       TEXT NOT NULL,
  platform    TEXT NOT NULL,
  url         TEXT NOT NULL,
  start_time  TIMESTAMPTZ NOT NULL,
  end_time    TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (user_id, contest_key)
);

-- Which Codeforces problem each user got as their daily problem, one per user per day.
-- The primary key stops two tabs opened at the same moment from getting two different problems.
CREATE TABLE IF NOT EXISTS daily_challenges (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day        DATE NOT NULL,
  problem_id INTEGER NOT NULL REFERENCES problems(id),
  PRIMARY KEY (user_id, day)
);

-- One row for each day a user solved a platform's daily problem. Every streak is computed
-- from these rows, so nothing has to "reset" at midnight.
-- Codeforces and LeetCode rows are only written after the platform confirms the solve.
-- GFG rows are self-reported, because GFG has no public API to check.
CREATE TABLE IF NOT EXISTS daily_solves (
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform  TEXT NOT NULL CHECK (platform IN ('codeforces', 'leetcode', 'gfg')),
  day       DATE NOT NULL,
  problem   TEXT,                       -- '1850A', 'two-sum'; NULL for GFG
  solved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, platform, day)
);

-- Upgrade from the first version, which kept Codeforces solves in daily_challenges.solved_at:
-- copy them into daily_solves, then drop the old column. It only runs while that column exists,
-- so running db:init again does nothing.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = current_schema()
               AND table_name = 'daily_challenges' AND column_name = 'solved_at') THEN
    INSERT INTO daily_solves (user_id, platform, day, problem, solved_at)
    SELECT d.user_id, 'codeforces', d.day, p.external_id, d.solved_at
    FROM daily_challenges d JOIN problems p ON p.id = d.problem_id
    WHERE d.solved_at IS NOT NULL
    ON CONFLICT DO NOTHING;
    ALTER TABLE daily_challenges DROP COLUMN solved_at;
  END IF;
END $$;
