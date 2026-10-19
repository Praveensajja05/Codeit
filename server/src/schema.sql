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

-- One daily problem per user per day. The streak is computed from this table,
-- so no scheduled job is needed to "reset" it at midnight.
CREATE TABLE IF NOT EXISTS daily_challenges (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day        DATE NOT NULL,
  problem_id INTEGER NOT NULL REFERENCES problems(id),
  solved_at  TIMESTAMPTZ,
  PRIMARY KEY (user_id, day)
);
