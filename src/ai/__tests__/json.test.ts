import { extractJson } from '../json';
import { DraftTransactionSchema } from '../schemas';

const valid = '{"amount":200,"merchant":"Blue Tokai","item":"coffee","date":"2026-11-26","categoryHint":"Food"}';

describe('extractJson', () => {
  it('parses fenced JSON', () => {
    expect(extractJson('```json\n' + valid + '\n```', DraftTransactionSchema)?.merchant).toBe('Blue Tokai');
  });
  it('parses JSON surrounded by prose', () => {
    expect(extractJson('Sure! Here it is: ' + valid + ' Hope that helps.', DraftTransactionSchema)?.amount).toBe(200);
  });
  it('invalid returns null', () => {
    expect(extractJson('I could not find a purchase.', DraftTransactionSchema)).toBeNull();
    expect(extractJson('{"amount": 200,', DraftTransactionSchema)).toBeNull();
  });
  it('schema mismatch returns null', () => {
    expect(extractJson('{"amount":"lots"}', DraftTransactionSchema)).toBeNull();
  });
});
