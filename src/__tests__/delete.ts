import { SQURL } from '../builder';

describe('delete', () => {
  test('all', () => {
    const query = new SQURL('User', { schema: 'public' }).delete().query();
    const expected = 'DELETE FROM public."User" ';

    expect(query.query).toEqual(expected);
  });

  test('where', () => {
    const query = new SQURL('User', { schema: 'public' })
      .delete()
      .where([
        {
          field: 'id',
          table: 'User',
          equals: 1,
        },
      ])
      .query();

    const expected = 'DELETE FROM public."User" WHERE public."User".id = $1 ';

    expect(query.query).toEqual(expected);
    expect(query.placeholders?.[0]).toEqual('1');
  });

  test('multiple where', () => {
    const query = new SQURL('User', { schema: 'public' })
      .delete()
      .where([
        {
          field: 'id',
          table: 'User',
          equals: 1,
        },
        {
          field: 'age',
          table: 'User',
          between: [20, 30],
        },
      ])
      .query();

    const expected =
      'DELETE FROM public."User" WHERE public."User".id = $1 AND public."User".age BETWEEN $2 AND $3 ';

    expect(query.query).toEqual(expected);
    expect(query.placeholders?.[0]).toEqual('1');
    expect(query.placeholders?.[1]).toEqual('20');
    expect(query.placeholders?.[2]).toEqual('30');
  });

  test('returning', () => {
    const query = new SQURL('User', { schema: 'public' })
      .delete()
      .returning(['id'])
      .where([
        {
          field: 'id',
          table: 'User',
          equals: 1,
        },
      ])
      .query();

    const expected =
      'DELETE FROM public."User" WHERE public."User".id = $1 RETURNING public."User".id';

    expect(query.query).toEqual(expected);
    expect(query.placeholders?.[0]).toEqual('1');
  });
});
