/**
 * scoring.integration.test.js
 * QA-SPEC-001 / DEC-GLOBAL-032 — File 3 (Step 6 gate)
 * 8 TCs verifying runQuickList() consuming rows that have been transformed by
 * transformSchoolRow(). This is the integration seam: api.js transform feeds
 * scoring.js gate evaluation. If this breaks, Step 6's fetchSchools() rewrite
 * will produce silent scoring failures.
 *
 * NOTE: runQuickList() reads Sheet-style keys (e.g. school.LATITUDE, school.Type,
 * school["School Name"]). transformSchoolRow() produces those keys. These tests
 * verify the two are compatible end-to-end.
 */

import { describe, it, expect } from 'vitest';
import { transformSchoolRow } from '../../src/lib/api.js';
import { runQuickList } from '../../src/lib/scoring.js';

// ── Fixture helpers ────────────────────────────────────────────────────────────

/**
 * Build a minimal Supabase-shaped school row (snake_case) then run it through
 * transformSchoolRow() so the integration test operates on realistic transformed
 * output — not handcrafted Sheet-style objects.
 */
function makeSupabaseRow(overrides = {}) {
  return {
    unitid:                       100000,
    school_name:                  'Test University',
    state:                        'OH',
    city:                         'Columbus',
    control:                      'Public',
    school_type:                  'Somewhat Selective',
    type:                         '1-FCS',           // Gate 1 tier — must match athlete topTier
    ncaa_division:                '1-FCS',
    conference:                   'Big South',
    latitude:                     40.0,
    longitude:                    -83.0,
    admissions_rate:              0.72,
    coa_out_of_state:             28000,
    est_avg_merit:                5000,
    avg_merit_award:              4800,
    share_stu_any_aid:            0.75,
    share_stu_need_aid:           0.40,
    need_blind_school:            false,
    dltv:                         40000,
    adltv:                        32000,
    adltv_rank:                   300,
    graduation_rate:              0.65,
    is_test_optional:             false,
    acad_rigor_senior:            0.45,
    acad_rigor_junior:            0.40,
    acad_rigor_soph:              0.35,
    acad_rigor_freshman:          0.30,
    acad_rigor_test_opt_senior:   0.40,
    acad_rigor_test_opt_junior:   0.35,
    acad_rigor_test_opt_soph:     0.30,
    acad_rigor_test_opt_freshman: 0.25,
    recruiting_q_link:            'https://example.com/rq',
    coach_link:                   'https://example.com/staff',
    prospect_camp_link:           null,
    field_level_questionnaire:    null,
    avg_gpa:                      3.0,
    avg_sat:                      1100,
    ...overrides,
  };
}

/**
 * Standard athlete profile that passes all three gates when paired with a
 * '1-FCS' school located near Columbus, OH. Grad year 2027 = Senior label
 * (current as of 2026-03-22 pre-Sept-1 cutoff).
 */
const STD_ATHLETE = {
  position:    'QB',
  height:      73,          // matches 1-FCS QB median (h50:73)
  weight:      195,         // matches 1-FCS QB median (w50:195)
  speed40:     4.75,        // matches 1-FCS QB median (s50:4.75)
  awards:      {},
  gpa:         3.5,
  sat:         1200,
  hsLat:       40.0,        // same lat as fixture — dist = ~0 miles
  hsLng:       -83.0,
  state:       'OH',
  agi:         null,
  dependents:  null,
  gradYear:    2027,        // Senior (pre-Sept-1-2026)
};

/** Build N transformed rows from supabase fixtures */
function makeTransformedRows(n, overrides = {}) {
  return Array.from({ length: n }, (_, i) =>
    transformSchoolRow(makeSupabaseRow({ unitid: 100000 + i, ...overrides }))
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('runQuickList() with transformSchoolRow() output', () => {

  // TC-1: does not throw when given an array of transformed rows
  it('TC-1: accepts array of transformed rows without throwing', () => {
    const rows = makeTransformedRows(3);
    expect(() => runQuickList(STD_ATHLETE, rows)).not.toThrow();
  });

  // TC-2: returns an object (the result shape contains top30, top50, scored, etc.)
  it('TC-2: returns an object', () => {
    const rows = makeTransformedRows(3);
    const result = runQuickList(STD_ATHLETE, rows);
    expect(typeof result).toBe('object');
    expect(result).not.toBeNull();
  });

  // TC-3: result.scored length matches input length (5 rows → 5 results in scored)
  it('TC-3: scored array length matches input length', () => {
    const rows = makeTransformedRows(5);
    const result = runQuickList(STD_ATHLETE, rows);
    expect(Array.isArray(result.scored)).toBe(true);
    expect(result.scored.length).toBe(5);
  });

  // TC-4: each item in scored contains a numeric dist field (proxy for processing)
  // runQuickList() sets dist on every scored item — if the key translation broke,
  // lat/lng would be NaN and dist would be 9999 (still numeric, but this test
  // confirms the field exists and is a number, not undefined).
  it('TC-4: each scored item contains a numeric dist field', () => {
    const rows = makeTransformedRows(3);
    const { scored } = runQuickList(STD_ATHLETE, rows);
    scored.forEach(item => {
      expect(typeof item.dist).toBe('number');
      expect(Number.isNaN(item.dist)).toBe(false);
    });
  });

  // TC-5: athFitScore on each scored item is within 0-1 range
  it('TC-5: athFitScore is within 0-1 range on each scored item', () => {
    const rows = makeTransformedRows(3);
    const { scored } = runQuickList(STD_ATHLETE, rows);
    scored.forEach(item => {
      expect(item.athFitScore).toBeGreaterThanOrEqual(0);
      expect(item.athFitScore).toBeLessThanOrEqual(1);
    });
  });

  // TC-6: high acad_rigor school scores higher acadScore than identical school
  // with low acad_rigor — verifies the Gate 3 column mapping is wired correctly.
  // "High rigor" means a school threshold <= athlete's acadRigorScore (so it passes).
  // "Low rigor" means a school threshold of 0 (so it never passes Gate 3).
  it('TC-6: high acad_rigor_senior scores higher acadScore than low acad_rigor_senior', () => {
    // Athlete SAT 1200 → satAchieve ~0.81, GPA 3.5 → gpaPct ~0.926
    // acadRigorScore = (0.81 + 0.926) / 2 ≈ 0.868
    // High rigor school: threshold = 0.50 (≤ athlete score → passes, acadScore = 0.50)
    // Low rigor school:  threshold = 0    (= 0 → fails, acadScore = 0)
    const highRigorTransformed = transformSchoolRow(makeSupabaseRow({
      unitid: 200001,
      acad_rigor_senior: 0.50,
    }));
    const lowRigorTransformed = transformSchoolRow(makeSupabaseRow({
      unitid: 200002,
      acad_rigor_senior: 0,
    }));

    const { scored } = runQuickList(STD_ATHLETE, [highRigorTransformed, lowRigorTransformed]);

    const high = scored.find(s => s['UNITID'] === 200001);
    const low  = scored.find(s => s['UNITID'] === 200002);

    expect(high).toBeDefined();
    expect(low).toBeDefined();
    expect(high.acadScore).toBeGreaterThan(low.acadScore);
  });

  // TC-7: null optional field (prospect_camp_link) does not cause throw
  // Also tests that a school with null lat/lng degrades to dist=9999 (not throw)
  it('TC-7: null/undefined optional fields do not cause a throw', () => {
    const rowWithNulls = transformSchoolRow(makeSupabaseRow({
      prospect_camp_link:        null,
      field_level_questionnaire: null,
      coa_out_of_state:          null,
      dltv:                      null,
      adltv:                     null,
      graduation_rate:           null,
      latitude:                  null,
      longitude:                 null,
    }));

    expect(() => runQuickList(STD_ATHLETE, [rowWithNulls])).not.toThrow();

    const { scored } = runQuickList(STD_ATHLETE, [rowWithNulls]);
    // dist should degrade to 9999 when coordinates are null
    expect(scored[0].dist).toBe(9999);
  });

  // TC-8: empty array input → empty array output (no throw)
  it('TC-8: empty array input produces empty scored array without throwing', () => {
    expect(() => runQuickList(STD_ATHLETE, [])).not.toThrow();
    const { scored, top30, top50 } = runQuickList(STD_ATHLETE, []);
    expect(scored).toEqual([]);
    expect(top30).toEqual([]);
    expect(top50).toEqual([]);
  });
});
