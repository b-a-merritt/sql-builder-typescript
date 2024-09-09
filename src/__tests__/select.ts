import { SQURL } from '../builder';

describe('select', () => {
  test('simple', () => {
    const query = new SQURL('User', { schema: 'public' })
      .select(['id', 'first_name'])
      .query();
    const expected =
      'SELECT public."User".id,public."User".first_name FROM public."User" ';
    expect(query.query).toEqual(expected);
  });

  test('as', () => {
    const query = new SQURL('User', { schema: 'public' })
      .as('u')
      .select(['id', 'first_name'])
      .query();
    const expected = 'SELECT "u".id,"u".first_name FROM public."User"  AS "u" ';
    expect(query.query).toEqual(expected);
  });

  test('simple join', () => {
    const query = new SQURL('User', { schema: 'public' })
      .select(['id', 'first_name'])
      .join({
        fields: ['id', 'city'],
        on: {
          left: 'id',
          right: 'user_id',
        },
        tables: {
          left: 'User',
          right: 'ContactInfo',
        },
        pk: 'id',
        type: 'LEFT',
      })
      .query();

    const expected =
      'SELECT public."User".id,public."User".first_name,public."ContactInfo".id,public."ContactInfo".city' +
      ' FROM public."User" LEFT JOIN public."ContactInfo" ON public."User".id = public."ContactInfo".user_id ';

    expect(query.query).toEqual(expected);
  });

  test('multiple join', () => {
    const query = new SQURL('User', { schema: 'public' })
      .select(['id', 'first_name'])
      .join({
        fields: ['id', 'city'],
        on: {
          left: 'id',
          right: 'user_id',
        },
        tables: {
          left: 'User',
          right: 'ContactInfo',
        },
        pk: 'id',
        type: 'LEFT',
      })
      .join({
        fields: ['id'],
        on: {
          left: 'id',
          right: 'contact_info_id',
        },
        tables: {
          left: 'ContactInfo',
          right: 'Address',
        },
        pk: 'id',
        type: 'INNER',
      })
      .query();

    const expected =
      'SELECT public."User".id,public."User".first_name,public."ContactInfo".id,public."ContactInfo".city,public."Address".id ' +
      'FROM public."User" LEFT JOIN public."ContactInfo" ON public."User".id = public."ContactInfo".user_id ' +
      'INNER JOIN public."Address" ON public."ContactInfo".id = public."Address".contact_info_id ';

    expect(query.query).toEqual(expected);
  });

  test('where between', () => {
    const query = new SQURL('User')
      .select(['id'])
      .where([
        {
          between: ['a', 'z'],
          field: 'first_name',
          table: 'User',
        },
      ])
      .query();
    const expected = `SELECT "User".id FROM "User" WHERE "User".first_name BETWEEN $1 AND $2 `;
    expect(query.query).toEqual(expected);
  });

  test('where equals', () => {
    const query = new SQURL('User')
      .select(['id'])
      .where([
        {
          equals: 6,
          field: 'id',
          table: 'User',
        },
      ])
      .query();
    const expected = `SELECT "User".id FROM "User" WHERE "User".id = $1 `;
    expect(query.query).toEqual(expected);
  });

  test('where greater than or equal to', () => {
    const query = new SQURL('User')
      .select(['id'])
      .where([
        {
          gte: 6,
          field: 'id',
          table: 'User',
        },
      ])
      .query();
    const expected = `SELECT "User".id FROM "User" WHERE "User".id >= $1 `;
    expect(query.query).toEqual(expected);
  });

  test('where without schema', () => {
    const query = new SQURL('User')
      .select(['id'])
      .where([
        {
          equals: 6,
          field: 'id',
          table: 'User',
        },
      ])
      .query();
    const expected = `SELECT "User".id FROM "User" WHERE "User".id = $1 `;
    expect(query.query).toEqual(expected);
  });

  test('where with schema', () => {
    const query = new SQURL('User', { schema: 'public' })
      .select(['id'])
      .where([
        {
          equals: 6,
          field: 'id',
          table: 'User',
        },
      ])
      .query();
    const expected = `SELECT public."User".id FROM public."User" WHERE public."User".id = $1 `;
    expect(query.query).toEqual(expected);
  });

  test('where with schema and alias', () => {
    const query = new SQURL('User', { schema: 'public' })
      .as('u')
      .select(['id'])
      .where([
        {
          equals: 6,
          field: 'id',
        },
      ])
      .query();
    const expected = `SELECT "u".id FROM public."User"  AS "u" WHERE "u".id = $1 `;
    expect(query.query).toEqual(expected);
  });

  test('group by', () => {
    const query = new SQURL('User')
      .select(['id'])
      .where([
        {
          gte: 6,
          field: 'id',
          table: 'User',
        },
      ])
      .groupBy([
        {
          field: 'id',
          table: 'User',
        },
      ])
      .query();
    const expected = `SELECT "User".id FROM "User" WHERE "User".id >= $1 GROUP BY "User".id `;
    expect(query.query).toEqual(expected);
  });

  test('having', () => {
    const query = new SQURL('User')
      .select(['id'])
      .where([
        {
          gte: 6,
          field: 'id',
          table: 'User',
        },
      ])
      .groupBy([
        {
          field: 'id',
          table: 'User',
        },
      ])
      .having([
        {
          table: 'User',
          field: 'first_name',
          equals: 'Ben',
        },
      ])
      .query();
    const expected = `SELECT "User".id FROM "User" WHERE "User".id >= $1 GROUP BY "User".id HAVING "User".first_name = $2 `;
    expect(query.query).toEqual(expected);
  });

  test('order by', () => {
    const query = new SQURL('User')
      .select(['id'])
      .where([
        {
          gte: 6,
          field: 'id',
          table: 'User',
        },
      ])
      .orderBy([
        {
          field: 'id',
          sort_order: 'asc',
          table: 'User',
        },
      ])
      .query();
    const expected = `SELECT "User".id FROM "User" WHERE "User".id >= $1 ORDER BY "User".id ASC `;
    expect(query.query).toEqual(expected);
  });

  test('limit', () => {
    const query = new SQURL('User')
      .select(['id'])
      .where([
        {
          gte: 6,
          field: 'id',
          table: 'User',
        },
      ])
      .limit(60)
      .query();
    const expected = `SELECT "User".id FROM "User" WHERE "User".id >= $1 LIMIT 60 `;
    expect(query.query).toEqual(expected);
  });

  test('offset', () => {
    const query = new SQURL('User')
      .select(['id'])
      .where([
        {
          gte: 6,
          field: 'id',
          table: 'User',
        },
      ])
      .limit(60)
      .offset(120)
      .query();
    const expected = `SELECT "User".id FROM "User" WHERE "User".id >= $1 LIMIT 60 OFFSET 120 `;
    expect(query.query).toEqual(expected);
  });
});
