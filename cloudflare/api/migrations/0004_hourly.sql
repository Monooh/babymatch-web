-- The same anonymous counters as `events`, filed by the hour (UTC, 'YYYY-MM-DDTHH'), for the panel's 24-hour view.
-- Kept for two weeks only (adminSweep): the daily table is the long record.
CREATE TABLE events_h (
  hour TEXT NOT NULL,
  name TEXT NOT NULL,
  lang TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (hour, name, lang)
);
