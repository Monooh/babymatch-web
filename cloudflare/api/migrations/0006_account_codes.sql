-- The account: an email address and a six-digit code sent to it, typed on the screen that asked for it.
-- A row of mail_tokens now carries both ways in: the link (hash) and the code (only its hash, tied to the address).
ALTER TABLE mail_tokens ADD COLUMN code TEXT;                         -- sha256(address + ':' + code)
ALTER TABLE mail_tokens ADD COLUMN tries INTEGER NOT NULL DEFAULT 0;  -- wrong codes typed against this row
CREATE INDEX mail_tokens_email ON mail_tokens(email, created_at);
