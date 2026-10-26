-- Where the wearer was around an SOS. The watch reads its position at a few milestones after an alert (never continuously):
-- the first fix travels with the alert, later fixes are sent as updates. Run after 0006_medications_calendar.sql.

alter table alerts
  add column accuracy_m real check (accuracy_m is null or (accuracy_m >= 0 and accuracy_m <= 10000)),
  add column located_at timestamptz;   -- when the position in lat/lng was measured on the watch

-- Every fix of an alert, so the map can draw the short trail. alerts.lat/lng stays the best current position.
create table alert_locations (
  id          bigint generated always as identity primary key,
  alert_id    uuid not null references alerts(id) on delete cascade,
  t           timestamptz not null,    -- when the fix was measured
  lat         double precision not null check (lat between -90 and 90),
  lng         double precision not null check (lng between -180 and 180),
  accuracy_m  real check (accuracy_m is null or (accuracy_m >= 0 and accuracy_m <= 10000)),
  created_at  timestamptz not null default now(),
  unique (alert_id, t)
);
create index alert_locations_alert_idx on alert_locations (alert_id, t);
alter table alert_locations enable row level security;
