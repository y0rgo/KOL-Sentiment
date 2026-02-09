# KOL Master List & Intelligence Platform — Architecture v2

## Core Concept

The Master KOL List is the single source of truth for all physician intelligence. Everything else — categorization, prioritization, sentiment tracking, engagement planning — is a layer built on top of the list.

Physicians enter the list through three channels:
1. **List Import** (ongoing uploads from any team)
2. **Discovery Portal** (claims analysis, publication scan, congress monitoring, referral networks, competitive trials)
3. **Field Nominations** (MSL/TLL submissions from the field)

Every physician has a **record status** that tracks their lifecycle:
- `imported` → came from a list upload, not yet validated
- `discovered` → surfaced by a discovery tool, needs human review
- `nominated` → submitted by field team, needs review
- `under_review` → being evaluated for inclusion
- `validated` → confirmed as belonging on the Master List
- `declined` → reviewed and intentionally excluded
- `archived` → was validated but no longer active

Only `validated` physicians are eligible for Layer 2+ (categorization, prioritization, action).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Tailwind CSS |
| Charts/Viz | Recharts + D3.js (network graphs) |
| Backend | Python 3.12 + FastAPI |
| Database | PostgreSQL 16 |
| ORM | SQLAlchemy 2.0 + Alembic |
| Task Queue | Celery + Redis |
| Auth | JWT + role-based access control |
| Deployment | Docker Compose (dev) |

---

## Database Schema

### physicians (Master List — the anchor table)
```sql
CREATE TABLE physicians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    npi VARCHAR(10) UNIQUE,  -- nullable for international physicians
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    credentials VARCHAR(50),
    specialty VARCHAR(100),
    subspecialty VARCHAR(100),
    practice_type VARCHAR(50),  -- academic, community, hybrid
    institution_name VARCHAR(200),
    institution_type VARCHAR(50),
    city VARCHAR(100),
    state VARCHAR(2),
    region VARCHAR(50),
    country VARCHAR(50) DEFAULT 'US',
    years_in_practice INTEGER,
    fellowship_training TEXT,
    institutional_role VARCHAR(100),

    -- RECORD STATUS (Layer 1)
    record_status VARCHAR(20) NOT NULL DEFAULT 'imported',
    status_changed_at TIMESTAMPTZ DEFAULT NOW(),
    status_changed_by VARCHAR(100),
    decline_reason TEXT,

    -- SOURCE TRACKING (Layer 1)
    source_channel VARCHAR(30) NOT NULL DEFAULT 'import',
    source_detail TEXT,
    original_import_id UUID,

    -- COMPLETENESS (Layer 1)
    completeness_score NUMERIC(5,2) DEFAULT 0,
    last_validated_date DATE,
    validated_by VARCHAR(100),

    -- TIER & CLASSIFICATION (Layer 2)
    tier VARCHAR(30),
    tier_score NUMERIC(5,2),
    tier_last_assessed TIMESTAMPTZ,

    -- PRIORITY (Layer 3)
    priority_score NUMERIC(5,2),
    priority_rank INTEGER,
    priority_last_computed TIMESTAMPTZ,

    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### import_batches (tracks every list upload)
```sql
CREATE TABLE import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename VARCHAR(200) NOT NULL,
    uploaded_by VARCHAR(100) NOT NULL,
    team VARCHAR(50),
    description TEXT,
    total_rows INTEGER,
    new_records INTEGER,
    updated_records INTEGER,
    duplicate_records INTEGER,
    error_records INTEGER,
    status VARCHAR(20) DEFAULT 'processing',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
```

### import_conflicts
```sql
CREATE TABLE import_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_batch_id UUID REFERENCES import_batches(id),
    physician_id UUID REFERENCES physicians(id),
    conflict_type VARCHAR(30) NOT NULL,
    field_name VARCHAR(50),
    existing_value TEXT,
    incoming_value TEXT,
    resolution VARCHAR(20),
    resolved_by VARCHAR(100),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### discovery_runs
```sql
CREATE TABLE discovery_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discovery_type VARCHAR(30) NOT NULL,
    parameters JSONB,
    status VARCHAR(20) DEFAULT 'running',
    total_candidates INTEGER,
    promoted_count INTEGER DEFAULT 0,
    declined_count INTEGER DEFAULT 0,
    pending_count INTEGER DEFAULT 0,
    run_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
```

### discovery_candidates
```sql
CREATE TABLE discovery_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discovery_run_id UUID REFERENCES discovery_runs(id),
    npi VARCHAR(10),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    credentials VARCHAR(50),
    specialty VARCHAR(100),
    institution_name VARCHAR(200),
    city VARCHAR(100),
    state VARCHAR(2),
    evidence_summary TEXT NOT NULL,
    evidence_data JSONB,
    discovery_score NUMERIC(5,2),
    matched_physician_id UUID REFERENCES physicians(id),
    review_status VARCHAR(20) DEFAULT 'pending',
    reviewed_by VARCHAR(100),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### field_nominations
```sql
CREATE TABLE field_nominations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    npi VARCHAR(10),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    credentials VARCHAR(50),
    specialty VARCHAR(100),
    institution_name VARCHAR(200),
    city VARCHAR(100),
    state VARCHAR(2),
    nominated_by VARCHAR(100) NOT NULL,
    nominator_role VARCHAR(50),
    disease_context VARCHAR(100),
    rationale TEXT NOT NULL,
    observed_influence TEXT,
    matched_physician_id UUID REFERENCES physicians(id),
    review_status VARCHAR(20) DEFAULT 'pending',
    reviewed_by VARCHAR(100),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### diseases, products, prescribing_data, sentiment_scores, sentiment_barriers, publications, publication_authors, congress_activity, clinical_trials, trial_investigators, referral_relationships, engagements, competitive_affiliations

(Full schemas as defined in the architecture document above)

---

## Backend Structure

```
backend/
├── app/
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── models/
│   ├── schemas/
│   ├── api/
│   ├── services/
│   ├── ingestion/
│   └── tasks/
├── alembic/
├── tests/
├── requirements.txt
├── Dockerfile
└── docker-compose.yml
```

## Frontend Structure

```
frontend/
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── api/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── types/
│   └── utils/
├── tailwind.config.js
├── package.json
└── Dockerfile
```

---

## Build Priority

### Phase 1: Master List Foundation (build first)
### Phase 2: Discovery Portal
### Phase 3: Categorization + Prioritization (Layers 2-3)
### Phase 4: Intelligence Layer (Layer 4)
