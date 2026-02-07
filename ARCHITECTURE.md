# KOL Sentiment & Persona Intelligence Platform — Technical Foundation

## Architecture Overview

Full-stack application: React frontend, Python/FastAPI backend, PostgreSQL database. Designed to ingest physician data from multiple sources, compute sentiment scores, build structured personas, and surface actionable intelligence through a dashboard UI.

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | React + TypeScript + Tailwind CSS | Component-based UI for persona cards, dashboards, network viz |
| Charts/Viz | Recharts + D3.js (network graphs) | Recharts for dashboards, D3 for influence network maps |
| Backend | Python 3.12 + FastAPI | Async, fast, great for data processing pipelines |
| Database | PostgreSQL 16 + pgvector | Relational for structured data, pgvector for future NLP/embedding search |
| ORM | SQLAlchemy 2.0 + Alembic | Migrations, async support |
| Task Queue | Celery + Redis | Async data ingestion, scheduled refreshes, scoring pipelines |
| Search | PostgreSQL full-text (phase 1), Elasticsearch (phase 2) | Publication search, physician lookup |
| Auth | JWT + role-based access control | Field vs. HQ vs. admin roles |
| Deployment | Docker Compose (dev), AWS ECS or similar (prod) | Containerized, scalable |

---

## Database Schema (Core Tables)

### physicians (master record)
```sql
CREATE TABLE physicians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    npi VARCHAR(10) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    credentials VARCHAR(50),  -- MD, DO, NP, PA
    specialty VARCHAR(100),
    subspecialty VARCHAR(100),
    practice_type VARCHAR(50),  -- academic, community, hybrid
    institution_name VARCHAR(200),
    institution_type VARCHAR(50),  -- academic_medical_center, community_hospital, private_practice, etc.
    city VARCHAR(100),
    state VARCHAR(2),
    region VARCHAR(50),  -- derived: northeast, southeast, midwest, west, southwest
    years_in_practice INTEGER,
    fellowship_training TEXT,
    institutional_role VARCHAR(100),  -- section_chief, clinic_director, faculty, etc.
    -- Tier & classification
    tier VARCHAR(30),  -- global_national, regional_institutional, local_community, rising_star
    tier_score NUMERIC(5,2),  -- composite score used for tier assignment
    tier_last_assessed TIMESTAMPTZ,
    -- Metadata
    source VARCHAR(50),  -- how they entered the system: manual, claims, publication_scan, etc.
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_physicians_npi ON physicians(npi);
CREATE INDEX idx_physicians_state ON physicians(state);
CREATE INDEX idx_physicians_tier ON physicians(tier);
CREATE INDEX idx_physicians_specialty ON physicians(specialty);
```

### diseases (reference table)
```sql
CREATE TABLE diseases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,  -- e.g., CIDP, gMG, ITP
    icd10_codes TEXT[],  -- e.g., {'G61.81', 'G61.82'}
    therapeutic_area VARCHAR(100),  -- e.g., neuromuscular_autoimmune, hematology
    is_active BOOLEAN DEFAULT TRUE
);
```

### products (reference table)
```sql
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_name VARCHAR(100),  -- VYVGART, VYVGART Hytrulo, etc.
    generic_name VARCHAR(200),
    mechanism VARCHAR(100),  -- FcRn_blocker, complement_C2, MuSK_agonist
    formulation VARCHAR(50),  -- IV, SC, SC_PFS
    manufacturer VARCHAR(100),
    is_own_product BOOLEAN DEFAULT TRUE,  -- own vs. competitor
    is_active BOOLEAN DEFAULT TRUE
);
```

### prescribing_data (claims/SP feed)
```sql
CREATE TABLE prescribing_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    physician_id UUID REFERENCES physicians(id),
    product_id UUID REFERENCES products(id),
    disease_id UUID REFERENCES diseases(id),
    period_start DATE NOT NULL,  -- monthly or quarterly period
    period_end DATE NOT NULL,
    total_patients INTEGER,
    new_starts INTEGER,
    formulation VARCHAR(50),  -- IV, SC
    line_of_therapy VARCHAR(50),  -- first_line, second_line, third_plus
    pa_submissions INTEGER,
    pa_approvals INTEGER,
    data_source VARCHAR(50),  -- specialty_pharmacy, claims, psp
    ingested_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prescribing_physician ON prescribing_data(physician_id);
CREATE INDEX idx_prescribing_period ON prescribing_data(period_start);
```

### sentiment_scores (the core scoring table)
```sql
CREATE TABLE sentiment_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    physician_id UUID REFERENCES physicians(id),
    disease_id UUID REFERENCES diseases(id),
    assessment_date DATE NOT NULL,
    -- Three dimensions (1-5 each)
    disease_belief_score SMALLINT CHECK (disease_belief_score BETWEEN 1 AND 5),
    product_perception_score SMALLINT CHECK (product_perception_score BETWEEN 1 AND 5),
    behavioral_readiness_score SMALLINT CHECK (behavioral_readiness_score BETWEEN 1 AND 5),
    composite_score SMALLINT GENERATED ALWAYS AS (
        disease_belief_score + product_perception_score + behavioral_readiness_score
    ) STORED,
    -- Conversion stage (derived from composite)
    conversion_stage VARCHAR(30),  -- unaware, skeptical, trialing, adopting, advocating
    -- Scoring basis
    score_type VARCHAR(20),  -- field_input, automated, blended
    confidence_level VARCHAR(20),  -- high, medium, low (based on data coverage)
    scored_by VARCHAR(100),  -- user or 'system'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sentiment_physician ON sentiment_scores(physician_id);
CREATE INDEX idx_sentiment_date ON sentiment_scores(assessment_date);
CREATE INDEX idx_sentiment_stage ON sentiment_scores(conversion_stage);
```

### sentiment_barriers (specific barriers identified per physician)
```sql
CREATE TABLE sentiment_barriers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sentiment_score_id UUID REFERENCES sentiment_scores(id),
    physician_id UUID REFERENCES physicians(id),
    barrier_type VARCHAR(50) NOT NULL,
    -- barrier_type enum: diagnostic_confidence, therapeutic_inertia, moa_unfamiliarity,
    --   economic_access_friction, cyclical_dosing_uncertainty, safety_concern,
    --   competitive_preference, patient_resistance, institutional_friction
    severity VARCHAR(20),  -- primary, secondary, resolved
    source VARCHAR(50),  -- field_report, survey, inferred_from_claims
    detail TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### publications (scientific activity)
```sql
CREATE TABLE publications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pmid VARCHAR(20) UNIQUE,
    title TEXT NOT NULL,
    journal VARCHAR(200),
    publication_date DATE,
    impact_factor NUMERIC(5,2),
    publication_type VARCHAR(50),  -- original_research, review, case_report, guideline, letter
    diseases TEXT[],  -- tagged diseases
    products_mentioned TEXT[],  -- tagged products
    sentiment_toward_product VARCHAR(20),  -- positive, neutral, negative, not_applicable
    abstract TEXT,
    doi VARCHAR(100),
    ingested_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE publication_authors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    publication_id UUID REFERENCES publications(id),
    physician_id UUID REFERENCES physicians(id),
    author_position VARCHAR(20),  -- first, last, middle, corresponding
    UNIQUE(publication_id, physician_id)
);
```

### congress_activity (conference presentations)
```sql
CREATE TABLE congress_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    physician_id UUID REFERENCES physicians(id),
    congress_name VARCHAR(200),  -- AAN, AANEM, PNS, ASH, etc.
    congress_date DATE,
    activity_type VARCHAR(50),  -- plenary, oral, poster, panel, invited_lecture, chair
    title TEXT,
    diseases TEXT[],
    products_mentioned TEXT[],
    sentiment_toward_product VARCHAR(20),
    ingested_at TIMESTAMPTZ DEFAULT NOW()
);
```

### clinical_trials (trial participation)
```sql
CREATE TABLE clinical_trials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nct_id VARCHAR(20) UNIQUE,
    trial_name VARCHAR(200),
    sponsor VARCHAR(200),
    phase VARCHAR(20),
    diseases TEXT[],
    products TEXT[],
    status VARCHAR(50),  -- recruiting, active, completed
    ingested_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE trial_investigators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trial_id UUID REFERENCES clinical_trials(id),
    physician_id UUID REFERENCES physicians(id),
    role VARCHAR(50),  -- principal_investigator, sub_investigator, steering_committee
    site_name VARCHAR(200),
    UNIQUE(trial_id, physician_id)
);
```

### referral_network (influence topology)
```sql
CREATE TABLE referral_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referring_physician_id UUID REFERENCES physicians(id),
    receiving_physician_id UUID REFERENCES physicians(id),
    disease_id UUID REFERENCES diseases(id),
    referral_volume INTEGER,  -- estimated from claims
    period_start DATE,
    period_end DATE,
    data_source VARCHAR(50),
    UNIQUE(referring_physician_id, receiving_physician_id, disease_id, period_start)
);

CREATE INDEX idx_referral_receiving ON referral_relationships(receiving_physician_id);
```

### engagements (all touchpoints)
```sql
CREATE TABLE engagements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    physician_id UUID REFERENCES physicians(id),
    engagement_type VARCHAR(50) NOT NULL,
    -- engagement_type enum: advisory_board, speaker_program, msl_visit, commercial_call,
    --   congress_meeting, investigator_study, peer_to_peer, preceptorship, publication_collab,
    --   medical_info_request, patient_program_interaction
    engagement_date DATE NOT NULL,
    channel VARCHAR(50),  -- in_person, virtual, phone, email
    duration_minutes INTEGER,
    topic TEXT,
    disease_id UUID REFERENCES diseases(id),
    -- Field intelligence capture (for MSL/TLL interactions)
    field_disease_belief_score SMALLINT CHECK (field_disease_belief_score BETWEEN 1 AND 5),
    field_product_perception_score SMALLINT CHECK (field_product_perception_score BETWEEN 1 AND 5),
    field_behavioral_readiness_score SMALLINT CHECK (field_behavioral_readiness_score BETWEEN 1 AND 5),
    objections_tagged TEXT[],
    -- objection tags: wants_more_rwe, igG_lowering_concern, ivig_access_easier,
    --   patient_sc_reluctance, retreatment_timing_unclear, cost_concern,
    --   diagnostic_uncertainty, competitive_preference, institutional_barrier
    field_notes TEXT,
    recorded_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_engagements_physician ON engagements(physician_id);
CREATE INDEX idx_engagements_type ON engagements(engagement_type);
CREATE INDEX idx_engagements_date ON engagements(engagement_date);
```

### competitive_affiliations
```sql
CREATE TABLE competitive_affiliations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    physician_id UUID REFERENCES physicians(id),
    company VARCHAR(100),
    affiliation_type VARCHAR(50),  -- advisory_board, speaker, trial_pi, trial_sub_i, consultant
    product_name VARCHAR(100),
    year INTEGER,
    payment_amount NUMERIC(10,2),  -- from Open Payments if available
    data_source VARCHAR(50),  -- open_payments, clinicaltrials_gov, field_intel
    ingested_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Backend Module Structure

```
backend/
├── app/
│   ├── main.py                    # FastAPI app, CORS, middleware
│   ├── config.py                  # Settings, env vars, DB URL
│   ├── database.py                # SQLAlchemy engine, session
│   ├── models/                    # SQLAlchemy ORM models
│   │   ├── physician.py
│   │   ├── sentiment.py
│   │   ├── prescribing.py
│   │   ├── publication.py
│   │   ├── congress.py
│   │   ├── trial.py
│   │   ├── referral.py
│   │   ├── engagement.py
│   │   ├── competitive.py
│   │   └── reference.py           # diseases, products
│   ├── schemas/                   # Pydantic request/response models
│   │   ├── physician.py
│   │   ├── sentiment.py
│   │   ├── persona.py             # Assembled persona output
│   │   ├── engagement.py
│   │   └── analytics.py
│   ├── api/                       # Route handlers
│   │   ├── physicians.py          # CRUD + search + filter
│   │   ├── personas.py            # Assembled persona views
│   │   ├── sentiment.py           # Score entry + history + trends
│   │   ├── engagements.py         # Touchpoint logging + analysis
│   │   ├── analytics.py           # Dashboards, heatmaps, distributions
│   │   ├── network.py             # Referral network queries
│   │   ├── simulator.py           # Advisory board simulator
│   │   └── ingest.py              # Data ingestion endpoints
│   ├── services/                  # Business logic
│   │   ├── persona_builder.py     # Assembles persona from all domains
│   │   ├── sentiment_engine.py    # Computes/updates sentiment scores
│   │   ├── tier_classifier.py     # Applies tier criteria
│   │   ├── network_analyzer.py    # Referral network graph analysis
│   │   ├── engagement_optimizer.py # Intensity mapping, diversification
│   │   ├── simulator_engine.py    # Advisory board simulation logic
│   │   └── publication_scorer.py  # NLP on abstracts, sentiment tagging
│   ├── ingestion/                 # Data pipeline modules
│   │   ├── claims_loader.py       # Specialty pharmacy / claims CSV/API
│   │   ├── pubmed_fetcher.py      # PubMed API integration
│   │   ├── clinicaltrials_fetcher.py
│   │   ├── open_payments_loader.py
│   │   ├── congress_loader.py     # Congress abstract ingestion
│   │   └── manual_import.py       # Excel/CSV physician list upload
│   └── tasks/                     # Celery async tasks
│       ├── refresh_prescribing.py
│       ├── refresh_publications.py
│       ├── recompute_sentiment.py
│       └── recompute_tiers.py
├── alembic/                       # Database migrations
├── tests/
├── requirements.txt
├── Dockerfile
└── docker-compose.yml
```

## Frontend Module Structure

```
frontend/
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── api/                       # API client
│   │   └── client.ts              # Axios/fetch wrapper, typed endpoints
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── PageLayout.tsx
│   │   ├── physicians/
│   │   │   ├── PhysicianTable.tsx         # Filterable/sortable list
│   │   │   ├── PhysicianFilters.tsx       # Tier, state, specialty, sentiment
│   │   │   └── PhysicianQuickAdd.tsx
│   │   ├── personas/
│   │   │   ├── PersonaCard.tsx            # Full persona view (7 domains)
│   │   │   ├── PersonaSummaryCard.tsx     # Compact card for lists
│   │   │   ├── SentimentBadge.tsx         # Color-coded score display
│   │   │   ├── BarrierTags.tsx            # Barrier chips
│   │   │   ├── EngagementTimeline.tsx     # Touchpoint history
│   │   │   └── PrescribingSnapshot.tsx    # Rx behavior summary
│   │   ├── sentiment/
│   │   │   ├── SentimentScoreInput.tsx    # 3-slider field input
│   │   │   ├── ObjectionTagger.tsx        # Checkbox objection tagging
│   │   │   ├── SentimentTrendChart.tsx    # Score over time
│   │   │   └── SentimentHeatMap.tsx       # Portfolio-level view
│   │   ├── network/
│   │   │   ├── ReferralNetworkGraph.tsx   # D3 force-directed graph
│   │   │   ├── InfluenceZoneMap.tsx       # Geographic influence
│   │   │   └── NetworkStats.tsx
│   │   ├── analytics/
│   │   │   ├── TierDistribution.tsx       # Donut/bar chart
│   │   │   ├── ConversionFunnel.tsx       # Advocacy continuum
│   │   │   ├── EngagementHeatMap.tsx      # Over/under engagement
│   │   │   ├── GeographicCoverage.tsx     # US map with KOL density
│   │   │   └── CompetitiveLandscape.tsx
│   │   └── simulator/
│   │       ├── AdBoardBuilder.tsx         # Panel composition
│   │       ├── PanelGapAnalysis.tsx
│   │       └── SimulatedDiscussion.tsx
│   ├── pages/
│   │   ├── Dashboard.tsx                  # Portfolio overview
│   │   ├── PhysicianList.tsx              # Searchable physician directory
│   │   ├── PersonaView.tsx                # Single physician deep-dive
│   │   ├── SentimentDashboard.tsx         # Aggregate sentiment analytics
│   │   ├── NetworkExplorer.tsx            # Referral/influence networks
│   │   ├── EngagementPlanner.tsx          # Touchpoint optimization
│   │   ├── AdBoardSimulator.tsx           # Advisory board tool
│   │   ├── DataIngestion.tsx              # Upload/manage data feeds
│   │   └── Settings.tsx
│   ├── hooks/
│   │   ├── usePhysicians.ts
│   │   ├── usePersona.ts
│   │   ├── useSentiment.ts
│   │   └── useNetwork.ts
│   ├── types/
│   │   └── index.ts                       # TypeScript interfaces
│   └── utils/
│       ├── sentimentUtils.ts              # Score-to-color, stage derivation
│       ├── tierUtils.ts
│       └── formatters.ts
├── tailwind.config.js
├── package.json
└── Dockerfile
```

---

## Key API Endpoints

### Physicians
- `GET /api/physicians` — List with filters (tier, state, disease, sentiment range)
- `GET /api/physicians/{id}` — Single physician
- `GET /api/physicians/{id}/persona` — Full assembled persona (all 7 domains)
- `POST /api/physicians` — Create
- `PUT /api/physicians/{id}` — Update
- `POST /api/physicians/import` — Bulk import from CSV/Excel

### Sentiment
- `POST /api/sentiment/score` — Record a sentiment score (field input or system)
- `GET /api/sentiment/physician/{id}/history` — Score timeline
- `GET /api/sentiment/physician/{id}/barriers` — Active barriers
- `GET /api/sentiment/dashboard` — Aggregate: distribution by stage, tier, geography
- `GET /api/sentiment/shifts` — Recent significant sentiment changes (alerts)

### Engagements
- `POST /api/engagements` — Log an engagement with optional sentiment quick-score
- `GET /api/engagements/physician/{id}` — Engagement history
- `GET /api/engagements/intensity-map` — Over/under engagement analysis
- `GET /api/engagements/recommendations/{physician_id}` — Suggested next actions

### Network
- `GET /api/network/physician/{id}` — Referral connections for a physician
- `GET /api/network/geography/{state}` — Regional influence map
- `GET /api/network/graph` — Full network graph data (D3 format)

### Analytics
- `GET /api/analytics/tier-distribution` — KOL counts by tier
- `GET /api/analytics/conversion-funnel` — Physicians by conversion stage
- `GET /api/analytics/geographic-coverage` — State-level KOL density and gaps
- `GET /api/analytics/competitive-landscape` — Competitor affiliation summary

### Simulator
- `POST /api/simulator/compose` — Given an objective, suggest panel composition
- `POST /api/simulator/analyze` — Given a panel, return gap analysis + simulated dynamics

### Ingestion
- `POST /api/ingest/claims` — Upload claims/SP data (CSV)
- `POST /api/ingest/publications` — Trigger PubMed refresh for tracked physicians
- `POST /api/ingest/trials` — Trigger ClinicalTrials.gov refresh
- `POST /api/ingest/open-payments` — Upload Open Payments data

---

## Persona Builder Service (Core Logic)

The persona builder is the heart of the tool. It assembles data from all tables into a single structured output per physician.

```python
# Pseudocode for persona_builder.py

class PersonaBuilder:
    """Assembles a complete physician persona from all data domains."""

    async def build_persona(self, physician_id: UUID) -> PersonaOutput:
        physician = await self.get_physician(physician_id)

        return PersonaOutput(
            identity=self._build_identity(physician),
            prescribing=await self._build_prescribing(physician_id),
            research=await self._build_research(physician_id),
            influence=await self._build_influence(physician_id),
            competitive=await self._build_competitive(physician_id),
            sentiment=await self._build_sentiment(physician_id),
            engagement=await self._build_engagement(physician_id),
            recommended_actions=await self._generate_recommendations(physician_id),
        )

    async def _build_prescribing(self, physician_id):
        # Aggregate from prescribing_data table
        # Current period: total patients by product, formulation split, line of therapy
        # Trend: QoQ new starts, conversion rate
        # PA performance: submissions, approvals, rate
        ...

    async def _build_sentiment(self, physician_id):
        # Latest scores + historical trend
        # Active barriers
        # Conversion stage
        # Confidence level (based on data freshness + source diversity)
        ...

    async def _generate_recommendations(self, physician_id):
        # Based on: current sentiment, barriers, engagement history, tier
        # Rules engine:
        #   - Low disease belief + high prescribing = "reinforce scientific foundation"
        #   - High perception + low behavioral readiness = "remove access friction"
        #   - Stage: trialing + barrier: retreatment_timing = "MSL deep-dive on ADHERE+ durability"
        #   - Over-engaged (5+ touchpoints) = "reduce intensity, diversify channels"
        #   - Under-engaged (0-1 touchpoints) + high tier = "prioritize for engagement"
        ...
```

---

## Sentiment Engine Logic

```python
# Pseudocode for sentiment_engine.py

class SentimentEngine:
    """Computes and updates sentiment scores from multiple signal types."""

    def compute_blended_score(self, physician_id, disease_id) -> SentimentScore:
        """Blends automated signals with field inputs."""

        # Weight: field inputs (if recent) > automated signals
        field_scores = self.get_recent_field_scores(physician_id, lookback_days=180)
        auto_scores = self.compute_automated_scores(physician_id, disease_id)

        if field_scores:
            # Weighted average: 60% field, 40% automated
            blended = self._weighted_blend(field_scores, auto_scores, field_weight=0.6)
        else:
            # No field data: automated only, lower confidence
            blended = auto_scores
            blended.confidence = "low"

        blended.conversion_stage = self._derive_stage(blended.composite_score)
        return blended

    def compute_automated_scores(self, physician_id, disease_id) -> AutoScores:
        """Infers sentiment from behavioral data."""

        prescribing = self.get_prescribing_data(physician_id, disease_id)
        publications = self.get_publications(physician_id, disease_id)
        trials = self.get_trial_participation(physician_id)

        # Behavioral Readiness: primarily from prescribing
        if prescribing.total_own_product_patients >= 5 and prescribing.line_of_therapy == "first_line":
            behavioral = 5
        elif prescribing.total_own_product_patients >= 5:
            behavioral = 4
        elif prescribing.total_own_product_patients >= 1:
            behavioral = 3
        elif prescribing.has_competitor_product:
            behavioral = 2
        else:
            behavioral = 1

        # Disease Belief: from publications + trial participation
        # (simplified — real implementation uses NLP on abstracts)
        disease_belief = self._score_disease_belief(publications, trials)

        # Product Perception: from prescribing trend + publication sentiment
        product_perception = self._score_product_perception(prescribing, publications)

        return AutoScores(
            disease_belief=disease_belief,
            product_perception=product_perception,
            behavioral_readiness=behavioral,
        )

    def _derive_stage(self, composite: int) -> str:
        if composite <= 4:
            return "unaware"
        elif composite <= 6:
            return "skeptical"
        elif composite <= 9:
            return "trialing"
        elif composite <= 12:
            return "adopting"
        else:
            return "advocating"
```

---

## Tier Classification Logic

```python
# Pseudocode for tier_classifier.py

class TierClassifier:
    """Assigns influence tier based on composite criteria."""

    def classify(self, physician_id) -> TierResult:
        metrics = self.gather_metrics(physician_id)

        score = 0

        # Publication score (0-25)
        score += min(metrics.cidp_publications_5yr * 2.5, 25)

        # Prescribing volume score (0-20)
        score += min(metrics.total_disease_patients * 1.0, 20)

        # Referral hub score (0-20)
        score += min(metrics.inbound_referring_mds * 1.0, 20)

        # Congress activity score (0-15)
        score += min(metrics.major_congress_presentations_3yr * 3, 15)

        # Trial participation score (0-10)
        if metrics.is_phase3_pi:
            score += 10
        elif metrics.is_sub_investigator:
            score += 5

        # Guideline committee score (0-10)
        score += min(metrics.guideline_committees * 5, 10)

        # Classify
        if score >= 65:
            tier = "global_national"
        elif score >= 40:
            tier = "regional_institutional"
        elif score >= 20:
            tier = "local_community"
        else:
            # Check rising star criteria separately
            if metrics.years_in_practice <= 15 and metrics.publication_growth_rate > 1.5:
                tier = "rising_star"
            else:
                tier = "monitor"

        return TierResult(tier=tier, score=score)
```

---

## Docker Compose (Development)

```yaml
version: '3.8'
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: kol_platform
      POSTGRES_USER: kol_admin
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    volumes:
      - ./backend:/app
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql+asyncpg://kol_admin:${DB_PASSWORD}@db:5432/kol_platform
      REDIS_URL: redis://redis:6379/0
    depends_on:
      - db
      - redis

  celery:
    build: ./backend
    command: celery -A app.tasks worker --loglevel=info
    volumes:
      - ./backend:/app
    environment:
      DATABASE_URL: postgresql+asyncpg://kol_admin:${DB_PASSWORD}@db:5432/kol_platform
      REDIS_URL: redis://redis:6379/0
    depends_on:
      - db
      - redis

  frontend:
    build: ./frontend
    command: npm run dev
    volumes:
      - ./frontend:/app
      - /app/node_modules
    ports:
      - "3000:3000"
    environment:
      VITE_API_URL: http://localhost:8000

volumes:
  pgdata:
```

---

## Phase 1 Build Priority (What to code first)

1. **Database + migrations** — All core tables above
2. **Physician CRUD + import** — Upload existing Excel KOL lists
3. **Persona builder service** — Assemble from whatever data is available
4. **Persona card UI** — Single physician view with all 7 domains
5. **Sentiment score input** — The 3-slider + objection tagger
6. **Physician list with filters** — Searchable, filterable table
7. **Dashboard** — Tier distribution, sentiment funnel, geographic map
8. **Claims data ingestion** — CSV upload for prescribing data
