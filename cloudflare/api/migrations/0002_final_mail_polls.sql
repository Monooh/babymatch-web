-- The final round: each person's head-to-head results. One blob per person, the newest whole blob wins (like prefs).
ALTER TABLE users ADD COLUMN final TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN final_at INTEGER NOT NULL DEFAULT 0;

-- An optional email: a way back to the list from any device, and a note when there are new matches.
-- `email` already exists; it only counts once the person opened the link sent to it (email_ok).
ALTER TABLE users ADD COLUMN email_ok INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN mail_at INTEGER NOT NULL DEFAULT 0;   -- when the last "new matches" note went out
ALTER TABLE users ADD COLUMN mail_key TEXT;                         -- opens "stop writing to me" from a link in the email
CREATE INDEX users_email ON users(email);

-- Links sent by email (confirm the address, open the list). Only the hash is kept; they stop working after two days.
CREATE TABLE mail_tokens (
  hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX mail_tokens_user ON mail_tokens(user_id);

-- "Let family and friends vote": the finalists of a couple, open to whoever has the link.
CREATE TABLE polls (
  code TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  names TEXT NOT NULL,                    -- [[name id, "Name"], …] as shown to voters
  who TEXT NOT NULL DEFAULT '',           -- "Lucía and Dani", as the couple typed their names
  lang TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
CREATE INDEX polls_user ON polls(user_id);

-- One vote per browser; `voter` is a random id that browser keeps. `name` is the voter's first name, if they gave it.
CREATE TABLE votes (
  poll TEXT NOT NULL,
  voter TEXT NOT NULL,
  name_id INTEGER NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  at INTEGER NOT NULL,
  PRIMARY KEY (poll, voter)
);

-- People deleted here that the backup copy has not forgotten yet (see backup.js).
CREATE TABLE gone (
  id TEXT PRIMARY KEY,
  at INTEGER NOT NULL
);
