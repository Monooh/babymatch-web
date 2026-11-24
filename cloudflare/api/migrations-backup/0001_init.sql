-- The backup database: a second copy of every person's list, kept apart from the one the app writes to.
-- Filled by the API's scheduled job (backup.js); read by `npm run backup`.

-- The latest state of each person, as the whole row in JSON.
CREATE TABLE users_copy (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  copied_at INTEGER NOT NULL
);

-- How each person's row stood at the end of every day it changed, for thirty days: the way back from a bad write.
CREATE TABLE users_versions (
  id TEXT NOT NULL,
  day TEXT NOT NULL,
  data TEXT NOT NULL,
  PRIMARY KEY (id, day)
);
CREATE INDEX users_versions_day ON users_versions(day);

-- Without these a restored person could not be recognised by their own devices.
CREATE TABLE sessions_copy (
  hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX sessions_copy_user ON sessions_copy(user_id);

-- Where the copy stands: cursors and the time of the last run.
CREATE TABLE meta (
  k TEXT PRIMARY KEY,
  v TEXT NOT NULL
);
