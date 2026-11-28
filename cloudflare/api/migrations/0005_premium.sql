-- BabyMatch Premium: a single payment that lifts the daily limits for a person and their partner.
-- `plan` already exists ('free' | 'premium'). These keep the Stripe Checkout session a person started, so the server
-- can ask Stripe whether it was paid even if the person never came back from the payment page.
ALTER TABLE users ADD COLUMN pay_ref TEXT;                          -- the Checkout session id of the last attempt
ALTER TABLE users ADD COLUMN pay_at INTEGER NOT NULL DEFAULT 0;     -- when that attempt started
ALTER TABLE users ADD COLUMN paid_at INTEGER NOT NULL DEFAULT 0;    -- when the payment was confirmed
