import {describe,expect,it} from 'vitest';
import {isFutureDeadline,normalizeJobSkill} from './jobValidation.js';

describe('job form deadline and skill normalization',()=>{
  it('accepts only a strictly future instant and rejects past, boundary, and invalid values',()=>{
    const now=Date.parse('2035-04-05T12:30:00.000Z');
    expect(isFutureDeadline('2035-04-05T12:30:00.001Z',now)).toBe(true);
    expect(isFutureDeadline('2035-04-05T12:29:59.999Z',now)).toBe(false);
    expect(isFutureDeadline('2035-04-05T12:30:00.000Z',now)).toBe(false);
    expect(isFutureDeadline('not-a-date',now)).toBe(false);
  });
  it('compares timezone offsets by timestamp',()=>{
    const offset='2035-04-05T18:00:00+05:30',utc='2035-04-05T12:30:00.000Z';
    expect(Date.parse(offset)).toBe(Date.parse(utc));
    expect(isFutureDeadline(offset,Date.parse(utc)-1)).toBe(true);
  });
  it('normalizes skill aliases in the API',()=>{
    expect(normalizeJobSkill('NodeJS')).toBe('node.js');
  });
});
