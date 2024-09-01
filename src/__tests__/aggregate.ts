import { SQURL } from '../builder';

describe('aggregate functions', () => {
  test('average', () => {
    const query = new SQURL('User', {
      schema: 'public',
    })
      .select([SQURL.avg('age', 'User')])
      .groupBy([
        {
          field: 'id',
          table: 'User',
        },
      ])
      .query();

    const expected = `SELECT AVG("User".age) FROM public."User" GROUP BY "User".id `;
    expect(query.query).toEqual(expected);
  });

  test('count', () => {
    const query = new SQURL('User', {
      schema: 'public',
    })
      .select([SQURL.count('id', 'User')])
      .groupBy([
        {
          field: 'id',
          table: 'User',
        },
      ])
      .query();

    const expected = `SELECT COUNT("User".id) FROM public."User" GROUP BY "User".id `;
    expect(query.query).toEqual(expected);
  });

  test('max', () => {
    const query = new SQURL('User', {
      schema: 'public',
    })
      .select([SQURL.max('age', 'User')])
      .groupBy([
        {
          field: 'id',
          table: 'User',
        },
      ])
      .query();

    const expected = `SELECT MAX("User".age) FROM public."User" GROUP BY "User".id `;
    expect(query.query).toEqual(expected);
  });

  test('min', () => {
    const query = new SQURL('User', {
      schema: 'public',
    })
      .select([SQURL.min('age', 'User')])
      .groupBy([
        {
          field: 'id',
          table: 'User',
        },
      ])
      .query();

    const expected = `SELECT MIN("User".age) FROM public."User" GROUP BY "User".id `;
    expect(query.query).toEqual(expected);
  });

  test('sum', () => {
    const query = new SQURL('User', {
      schema: 'public',
    })
      .select([SQURL.sum('age', 'User')])
      .groupBy([
        {
          field: 'id',
          table: 'User',
        },
      ])
      .query();

    const expected = `SELECT SUM("User".age) FROM public."User" GROUP BY "User".id `;
    expect(query.query).toEqual(expected);
  });
});
