import assert from "node:assert/strict";
import test from "node:test";

import { onRequest } from "../functions/api/rating.js";

function makeDb(row) {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      const call = { sql, bindings: [] };
      calls.push(call);
      return {
        bind(...bindings) {
          call.bindings = bindings;
          return this;
        },
        async first() {
          return row;
        },
      };
    },
  };
}

test("GET /api/rating returns aggregate and user rating with one D1 query", async () => {
  const db = makeDb({ average: 4.25, count: 8, user_rating: 5 });
  const response = await onRequest({
    request: new Request(
      "https://www.daily-life-hacks.com/api/rating?slug=split-pea-soup&user_key=reader-1",
      { headers: { Origin: "https://www.daily-life-hacks.com" } },
    ),
    env: { DB: db },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    slug: "split-pea-soup",
    average: 4.25,
    count: 8,
    userRating: 5,
  });
  assert.equal(db.calls.length, 1);
  assert.match(db.calls[0].sql, /MAX\(CASE WHEN user_key = \?/);
  assert.deepEqual(db.calls[0].bindings, ["reader-1", "split-pea-soup"]);
});

test("GET /api/rating keeps anonymous userRating null", async () => {
  const db = makeDb({ average: 0, count: 0, user_rating: null });
  const response = await onRequest({
    request: new Request(
      "https://www.daily-life-hacks.com/api/rating?slug=new-article",
    ),
    env: { DB: db },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    slug: "new-article",
    average: 0,
    count: 0,
    userRating: null,
  });
  assert.equal(db.calls.length, 1);
  assert.deepEqual(db.calls[0].bindings, ["", "new-article"]);
});
