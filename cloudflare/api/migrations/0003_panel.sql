-- The private usage panel (babymatch.app/es/panel). Whoever is listed here gets in with a link sent to their email:
-- no password to keep. The address is added by hand (`npx wrangler d1 execute babymatch --remote --command …`),
-- never from the web, and it is not in the repository.
CREATE TABLE admins (
  email TEXT PRIMARY KEY
);

-- Links sent to an admin (single use, 20 minutes) and the browsers that opened one (60 days). Only hashes are kept.
CREATE TABLE admin_tokens (
  hash TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL
);
CREATE TABLE admin_sessions (
  hash TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL
);
