import {describe,expect,it} from 'vitest';
import {isFutureLocalDateTime,localDateTimeToIso,localInputFromIso,normalizeSkillInput} from './job-form-utils';

describe('job form date and skill utilities',()=>{
  it('converts a local datetime field into the matching absolute timestamp',()=>{
    const local='2035-04-05T18:00';
    expect(localDateTimeToIso(local)).toBe(new Date(local).toISOString());
    expect(localDateTimeToIso('')).toBeUndefined();
    expect(localDateTimeToIso('invalid')).toBeUndefined();
  });
  it('formats a stored instant back into local wall time without changing the instant',()=>{
    const iso='2035-04-05T12:30:00.000Z';const local=localInputFromIso(iso);
    expect(new Date(local).getTime()).toBe(Date.parse(iso));
  });
  it('uses a strict future boundary for local date inputs',()=>{
    const local='2035-04-05T18:00';const instant=new Date(local).getTime();
    expect(isFutureLocalDateTime(local,instant-1)).toBe(true);
    expect(isFutureLocalDateTime(local,instant)).toBe(false);
    expect(isFutureLocalDateTime('invalid',instant)).toBe(false);
  });
  it('normalizes common skill aliases, whitespace, and case',()=>{
    expect(normalizeSkillInput(' NodeJS ')).toBe('node.js');
    expect(normalizeSkillInput('  REACT   JS ')).toBe('react js');
  });
});
