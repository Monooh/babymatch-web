-- One row per person. There is no sign-up: a device gets a random id and a secret the first time it saves a name.
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',          -- first name, only if the person typed one for their partner
  lang TEXT NOT NULL DEFAULT '',
  swipes TEXT NOT NULL DEFAULT '{}',      -- {"<name id>": [kind, ms]} · kind 0 no, 1 like, 2 superlike, 3 cleared
  prefs TEXT NOT NULL DEFAULT '',         -- the opening answers and filters, as the app wrote them
  prefs_at INTEGER NOT NULL DEFAULT 0,
  rev INTEGER NOT NULL DEFAULT 0,         -- goes up on every change; clients compare it to know they are behind
  partner_id TEXT,
  invite TEXT UNIQUE,                     -- the code a partner joins with
  plan TEXT NOT NULL DEFAULT 'free',      -- for a paid tier later
  email TEXT,                             -- for sign-in by email later
  likes INTEGER NOT NULL DEFAULT 0,
  supers INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX users_partner ON users(partner_id);

-- A person can be signed in on several devices. Only the hash of each secret is kept.
CREATE TABLE sessions (
  hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);

-- Anonymous daily counters for the usage funnel: no person, no device, just how many times something happened.
CREATE TABLE events (
  day TEXT NOT NULL,
  name TEXT NOT NULL,
  lang TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, name, lang)
);
