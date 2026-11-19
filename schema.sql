-- schema.sql
-- "Fazoviy Lab 3D" — D1 ma'lumotlar bazasi sxemasi
-- Ishga tushirish: wrangler d1 execute fazoviy-lab-db --remote --file=./schema.sql
-- (Mahalliy test uchun --remote o'rniga --local ishlating)

DROP TABLE IF EXISTS experiment_logs;

CREATE TABLE experiment_logs (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  student_name    TEXT NOT NULL DEFAULT 'Mehmon',
  subject_id      TEXT NOT NULL,              -- math | physics | chemistry | biology
  simulation_id   TEXT NOT NULL,              -- masalan: math-geometry-volume
  simulation_title TEXT NOT NULL,
  result_summary  TEXT NOT NULL,              -- JSON satr ko'rinishidagi natija (V, S, tezlik va h.k.)
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_experiment_logs_simulation ON experiment_logs (simulation_id);
CREATE INDEX idx_experiment_logs_created_at ON experiment_logs (created_at DESC);
