/**
 * api.transform.test.js
 * QA-SPEC-001 / DEC-GLOBAL-032 — File 1 (Step 6 gate)
 * 13 TCs covering COLUMN_MAP contract + transformSchoolRow() shape verification.
 *
 * Source of truth for assertions: src/lib/api.js COLUMN_MAP as read 2026-03-22.
 * These tests are intentionally brittle on the map — a COLUMN_MAP change must
 * cause a test failure so the translation contract is never silently broken.
 */

import { describe, it, expect } from 'vitest';
import { COLUMN_MAP, transformSchoolRow } from '../../src/lib/api.js';

// ── TC-1: COLUMN_MAP maps every camelCase key to the correct snake_case column ─
// This is the hardcoded contract. If any mapping drifts, this test fails.
describe('COLUMN_MAP contract', () => {
  it('TC-1: maps every Supabase snake_case key to the correct Sheet-style target', () => {
    const EXPECTED_MAP = {
      unitid:                       'UNITID',
      school_name:                  ['School Name', 'School_Name'],
      state:                        'State',
      city:                         'City/Location',
      control:                      'Control',
      school_type:                  'School Type',
      type:                         'Type',
      ncaa_division:                ['NCAA Division', 'NCAA_Division'],
      conference:                   'Conference',
      latitude:                     ['LATITUDE', 'Lat'],
      longitude:                    ['LONGITUDE', 'Lng'],
      admissions_rate:              'Admissions Rate',
      coa_out_of_state:             ['COA (Out-of-State)', 'COA'],
      est_avg_merit:                'Est_Avg_Merit',
      avg_merit_award:              'Avg Merit Award',
      share_stu_any_aid:            'Share_Stu_Any_Aid',
      share_stu_need_aid:           'Share_Stu_Need_Aid',
      need_blind_school:            'Need-Blind School',
      dltv:                         'DLTV',
      adltv:                        'ADLTV',
      adltv_rank:                   'ADLTV Rank',
      graduation_rate:              ['Graduation Rate', 'Grad_Rate'],
      is_test_optional:             'Is_Test_Optional',
      acad_rigor_senior:            'Acad_Rigor_Senior',
      acad_rigor_junior:            'Acad_Rigor_Junior',
      acad_rigor_soph:              'Acad_Rigor_Soph',
      acad_rigor_freshman:          'Acad_Rigor_Freshman',
      acad_rigor_test_opt_senior:   'Acad_Rigor_Test_Opt_Senior',
      acad_rigor_test_opt_junior:   'Acad_Rigor_Test_Opt_Junior',
      acad_rigor_test_opt_soph:     'Acad_Rigor_Test_Opt_Soph',
      acad_rigor_test_opt_freshman: 'Acad_Rigor_Test_Opt_Freshman',
      recruiting_q_link:            ['Recruiting Q Link', 'q_link'],
      coach_link:                   ['Coach Page', 'coach_link'],
      prospect_camp_link:           'Prospect Camp Link',
      field_level_questionnaire:    'Field Level Questionnaire',
      avg_gpa:                      'Avg GPA',
      avg_sat:                      'Avg SAT',
    };

    expect(COLUMN_MAP).toEqual(EXPECTED_MAP);
  });
});

// ── TC-2 through TC-13: transformSchoolRow() output shape ─────────────────────
describe('transformSchoolRow()', () => {
  // TC-2: returns an object
  it('TC-2: returns an object (not null, not array)', () => {
    const result = transformSchoolRow({});
    expect(result).toBeDefined();
    expect(result).not.toBeNull();
    expect(Array.isArray(result)).toBe(false);
    expect(typeof result).toBe('object');
  });

  // TC-3: unitid → UNITID
  it('TC-3: maps unitid to UNITID correctly', () => {
    const result = transformSchoolRow({ unitid: 217156 });
    expect(result['UNITID']).toBe(217156);
  });

  // TC-4: school_name → 'School Name' AND 'School_Name' (dual-key array entry)
  it('TC-4: maps school_name to both "School Name" and "School_Name"', () => {
    const result = transformSchoolRow({ school_name: 'Bryant University' });
    expect(result['School Name']).toBe('Bryant University');
    expect(result['School_Name']).toBe('Bryant University');
  });

  // TC-5: type → Type (division string used by scoring gate 1)
  // NOTE: The plan references "division" → result.division but COLUMN_MAP uses
  // `type` (Supabase col) → 'Type' (Sheet col). Scoring.js reads school.Type.
  it('TC-5: maps type to "Type" correctly', () => {
    const result = transformSchoolRow({ type: '1-FCS' });
    expect(result['Type']).toBe('1-FCS');
  });

  // TC-6: conference → Conference
  it('TC-6: maps conference to "Conference" correctly', () => {
    const result = transformSchoolRow({ conference: 'Big South' });
    expect(result['Conference']).toBe('Big South');
  });

  // TC-7: state → State
  it('TC-7: maps state to "State" correctly', () => {
    const result = transformSchoolRow({ state: 'RI' });
    expect(result['State']).toBe('RI');
  });

  // TC-8: recruiting_q_link → both 'Recruiting Q Link' and 'q_link' (dual-key)
  it('TC-8: maps recruiting_q_link to both "Recruiting Q Link" and "q_link"', () => {
    const result = transformSchoolRow({ recruiting_q_link: 'https://example.com/rq' });
    expect(result['Recruiting Q Link']).toBe('https://example.com/rq');
    expect(result['q_link']).toBe('https://example.com/rq');
  });

  // TC-9: coach_link → both 'Coach Page' and 'coach_link' (dual-key)
  it('TC-9: maps coach_link to both "Coach Page" and "coach_link"', () => {
    const result = transformSchoolRow({ coach_link: 'https://example.com/staff' });
    expect(result['Coach Page']).toBe('https://example.com/staff');
    expect(result['coach_link']).toBe('https://example.com/staff');
  });

  // TC-10: acad_rigor_senior → Acad_Rigor_Senior
  // The plan references "acad_rigor" as a field; the actual Supabase col is
  // acad_rigor_senior (class-year specific). Testing the most common variant.
  it('TC-10: maps acad_rigor_senior to "Acad_Rigor_Senior" correctly', () => {
    const result = transformSchoolRow({ acad_rigor_senior: 3.7 });
    expect(result['Acad_Rigor_Senior']).toBe(3.7);
  });

  // TC-11: total_enrollment is NOT in COLUMN_MAP — it passes through via the
  // passthrough loop (any key not in COLUMN_MAP is copied directly).
  // The plan states enrollment → result.enrollment. This is only possible as a
  // passthrough since 'total_enrollment' is not a COLUMN_MAP key.
  // Testing the actual passthrough behavior.
  it('TC-11: passes through columns not covered by COLUMN_MAP unchanged', () => {
    const result = transformSchoolRow({ total_enrollment: 3200 });
    // total_enrollment is not in COLUMN_MAP — passes through directly
    expect(result['total_enrollment']).toBe(3200);
  });

  // TC-12: missing optional field → output key is undefined (not throws)
  it('TC-12: returns undefined (not throws) for missing optional field', () => {
    const result = transformSchoolRow({ unitid: 123 }); // recruiting_q_link omitted
    expect(() => transformSchoolRow({ unitid: 123 })).not.toThrow();
    // Array-valued entry produces keys set to undefined when source key absent
    expect(result['Recruiting Q Link']).toBeUndefined();
    expect(result['q_link']).toBeUndefined();
  });

  // TC-13: full realistic 38-column fixture — all camelCase keys correct, no data loss
  it('TC-13: handles full realistic 38-column fixture without data loss', () => {
    const fixture = {
      unitid:                       217156,
      school_name:                  'Bryant University',
      state:                        'RI',
      city:                         'Smithfield',
      control:                      'Private',
      school_type:                  'Very Selective',
      type:                         'G6',
      ncaa_division:                'G6',
      conference:                   'Northeast Conference',
      latitude:                     41.8868,
      longitude:                    -71.5218,
      admissions_rate:              0.62,
      coa_out_of_state:             52000,
      est_avg_merit:                18000,
      avg_merit_award:              16000,
      share_stu_any_aid:            0.88,
      share_stu_need_aid:           0.45,
      need_blind_school:            false,
      dltv:                         85000,
      adltv:                        72000,
      adltv_rank:                   142,
      graduation_rate:              0.72,
      is_test_optional:             'TRUE',
      acad_rigor_senior:            0.65,
      acad_rigor_junior:            0.60,
      acad_rigor_soph:              0.55,
      acad_rigor_freshman:          0.50,
      acad_rigor_test_opt_senior:   0.55,
      acad_rigor_test_opt_junior:   0.50,
      acad_rigor_test_opt_soph:     0.45,
      acad_rigor_test_opt_freshman: 0.40,
      recruiting_q_link:            'https://example.com/rq',
      coach_link:                   'https://example.com/staff',
      prospect_camp_link:           'https://example.com/camp',
      field_level_questionnaire:    'https://example.com/fl',
      avg_gpa:                      3.2,
      avg_sat:                      1180,
    };

    const result = transformSchoolRow(fixture);

    // Scalar mappings
    expect(result['UNITID']).toBe(217156);
    expect(result['State']).toBe('RI');
    expect(result['City/Location']).toBe('Smithfield');
    expect(result['Control']).toBe('Private');
    expect(result['School Type']).toBe('Very Selective');
    expect(result['Type']).toBe('G6');
    expect(result['Conference']).toBe('Northeast Conference');
    expect(result['Admissions Rate']).toBe(0.62);
    expect(result['Est_Avg_Merit']).toBe(18000);
    expect(result['Avg Merit Award']).toBe(16000);
    expect(result['Share_Stu_Any_Aid']).toBe(0.88);
    expect(result['Share_Stu_Need_Aid']).toBe(0.45);
    expect(result['Need-Blind School']).toBe(false);
    expect(result['DLTV']).toBe(85000);
    expect(result['ADLTV']).toBe(72000);
    expect(result['ADLTV Rank']).toBe(142);
    expect(result['Is_Test_Optional']).toBe('TRUE');
    expect(result['Acad_Rigor_Senior']).toBe(0.65);
    expect(result['Acad_Rigor_Junior']).toBe(0.60);
    expect(result['Acad_Rigor_Soph']).toBe(0.55);
    expect(result['Acad_Rigor_Freshman']).toBe(0.50);
    expect(result['Acad_Rigor_Test_Opt_Senior']).toBe(0.55);
    expect(result['Acad_Rigor_Test_Opt_Junior']).toBe(0.50);
    expect(result['Acad_Rigor_Test_Opt_Soph']).toBe(0.45);
    expect(result['Acad_Rigor_Test_Opt_Freshman']).toBe(0.40);
    expect(result['Prospect Camp Link']).toBe('https://example.com/camp');
    expect(result['Field Level Questionnaire']).toBe('https://example.com/fl');
    expect(result['Avg GPA']).toBe(3.2);
    expect(result['Avg SAT']).toBe(1180);

    // Dual-key array mappings
    expect(result['School Name']).toBe('Bryant University');
    expect(result['School_Name']).toBe('Bryant University');
    expect(result['NCAA Division']).toBe('G6');
    expect(result['NCAA_Division']).toBe('G6');
    expect(result['LATITUDE']).toBe(41.8868);
    expect(result['Lat']).toBe(41.8868);
    expect(result['LONGITUDE']).toBe(-71.5218);
    expect(result['Lng']).toBe(-71.5218);
    expect(result['COA (Out-of-State)']).toBe(52000);
    expect(result['COA']).toBe(52000);
    expect(result['Graduation Rate']).toBe(0.72);
    expect(result['Grad_Rate']).toBe(0.72);
    expect(result['Recruiting Q Link']).toBe('https://example.com/rq');
    expect(result['q_link']).toBe('https://example.com/rq');
    expect(result['Coach Page']).toBe('https://example.com/staff');
    expect(result['coach_link']).toBe('https://example.com/staff');

    // No extra keys from unexpected sources — all 38 source cols are in COLUMN_MAP
    // so the passthrough loop adds nothing. Result should contain only COLUMN_MAP targets.
    // Spot-check: no raw Supabase snake_case key should appear in output (keys, not values).
    // Note: 'coach_link' and 'q_link' ARE valid output keys (they appear as array targets in
    // COLUMN_MAP) so they will be present and populated — do not assert undefined for those.
    expect(result['unitid']).toBeUndefined();
    expect(result['school_name']).toBeUndefined();
    expect(result['ncaa_division']).toBeUndefined();
    expect(result['recruiting_q_link']).toBeUndefined();
  });
});
