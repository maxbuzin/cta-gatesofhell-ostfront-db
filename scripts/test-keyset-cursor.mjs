import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  decodeCursor,
  describeKeysetPredicate,
  encodeCursor,
  orderNullsLast,
  rowAfterCursor,
} from "../src/lib/db/keyset-cursor.ts";

describe("decodeCursor", () => {
  it("accepts valid cursor matching sort key", () => {
    const raw = encodeCursor({ id: 3, v: 10, k: "hp_asc" });
    assert.deepEqual(decodeCursor(raw, "hp_asc"), {
      id: 3,
      v: 10,
      k: "hp_asc",
    });
  });

  it("rejects mismatched sort, bad payload, or wrong value type → page 1", () => {
    const raw = encodeCursor({ id: 3, v: 10, k: "hp_asc" });
    assert.equal(decodeCursor(raw, "hp_desc"), null);
    assert.equal(decodeCursor("not-base64", "hp_asc"), null);
    assert.equal(
      decodeCursor(encodeCursor({ id: 1, v: 5, k: "name_asc" }), "name_asc"),
      null,
    ); // name requires string v — number fails
    assert.equal(decodeCursor(undefined, "name_asc"), null);
  });
});

describe("NULLS LAST keyset paging", () => {
  const rows = [
    { id: 1, hp: 100 },
    { id: 2, hp: 50 },
    { id: 3, hp: 50 },
    { id: 4, hp: null },
    { id: 5, hp: null },
  ];

  it("pages ending on a value then into NULLs (asc)", () => {
    const ordered = orderNullsLast(
      rows,
      "asc",
      (r) => r.hp,
      (r) => r.id,
    );
    assert.deepEqual(
      ordered.map((r) => r.id),
      [2, 3, 1, 4, 5],
    );

    // Cursor after id=3 (hp=50): remaining should be 100, then nulls
    const cursor = { id: 3, v: 50, k: "hp_asc" };
    const pred = describeKeysetPredicate("asc", cursor);
    assert.equal(pred.mode, "value-page");
    assert.equal(pred.includeNullsInValuePage, true);

    const next = ordered.filter((r) =>
      rowAfterCursor("asc", cursor, r.hp, r.id),
    );
    assert.deepEqual(
      next.map((r) => r.id),
      [1, 4, 5],
    );
  });

  it("pages that end on a NULL (asc null-page)", () => {
    const cursor = { id: 4, v: null, k: "hp_asc" };
    const pred = describeKeysetPredicate("asc", cursor);
    assert.equal(pred.mode, "null-page");

    const next = rows.filter((r) =>
      rowAfterCursor("asc", cursor, r.hp, r.id),
    );
    assert.deepEqual(
      next.map((r) => r.id),
      [5],
    );
  });

  it("desc value-page includes NULLs last; null-page uses id <", () => {
    const cursorVal = { id: 2, v: 50, k: "hp_desc" };
    assert.equal(describeKeysetPredicate("desc", cursorVal).mode, "value-page");
    const afterVal = orderNullsLast(
      rows,
      "desc",
      (r) => r.hp,
      (r) => r.id,
    ).filter((r) => rowAfterCursor("desc", cursorVal, r.hp, r.id));
    // DESC NULLS LAST order: 100, 50(id3), 50(id2), null(id5), null(id4)
    // After (50, id2): nulls only (100 and 50/id3 already passed)
    assert.ok(afterVal.every((r) => r.hp === null));

    const cursorNull = { id: 5, v: null, k: "hp_desc" };
    const afterNull = rows.filter((r) =>
      rowAfterCursor("desc", cursorNull, r.hp, r.id),
    );
    assert.deepEqual(
      afterNull.map((r) => r.id),
      [4],
    );
  });
});
