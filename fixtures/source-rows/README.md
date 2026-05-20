# Source Row Fixtures

Source row fixtures preserve redacted raw evidence shape before parsing.

Required identity fields for source-derived rows:

- source family: fee sheet, pipeline, production revenue, or Float.
- source document or system alias, never a secret URL.
- tab, sheet, export name, or endpoint label when available.
- row index or stable source row key.
- batch label.
- redaction note.

Rules:

- Non-empty source rows stay represented even when archived, TBC, inactive,
  provisional, duplicate, unmatched, Float-only, source-only, or zero-fee with
  nonzero hours.
- Unsupported source capabilities must be represented as unsupported metadata,
  not numeric zero.
- If a source row is intentionally skipped in a later parser fixture, the reason
  must be explicit and law-compliant.

Expected subfolders:

- `fee-sheets/`
- `pipeline/`
- `production-revenue/`
- `float/`
