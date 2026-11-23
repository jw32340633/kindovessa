import assert from "node:assert/strict";
import { test } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import { pool } from "../src/db/pool.js";

const endpoint = "/api/v1/sales";
const productId = "6ff589d8-c2a2-4917-ae30-ac0b8dc02600";
const authorization = `Bearer ${"a".repeat(64)}`;

test("sales reads and writes require an admin session", async () => {
  const app = createApp();
  await request(app).get(endpoint).expect(401);
  await request(app).put(`${endpoint}/visibility`).send({}).expect(401);
  await request(app).put(`${endpoint}/${productId}`).send({}).expect(401);
});

test("collection category must be removed in a separate saved change", { skip: !pool }, async (context) => {
  const statements: string[] = [];
  context.mock.method(pool!, "query", async () => ({ rows: [{ id: "test-admin" }] }));
  context.mock.method(pool!, "connect", async () => ({
    query: async (sql: string) => {
      statements.push(sql);
      return { rows: [{ version: 7, collection_category: "personal-care" }] };
    },
    release() {},
  }));
  await request(createApp()).put(`${endpoint}/visibility`).set("Authorization", authorization)
    .send({ version: 7, collectionCategory: "bath-mobility", featuredProductIds: [] }).expect(409);
  assert.equal(statements.at(-1), "ROLLBACK");
  assert.equal(statements.some((sql) => sql.startsWith("UPDATE")), false);
});

test("sale price must be below regular price, including prices under one dollar", { skip: !pool }, async (context) => {
  const writes: unknown[][] = [];
  context.mock.method(pool!, "query", async () => ({ rows: [{ id: "test-admin" }] }));
  context.mock.method(pool!, "connect", async () => ({
    query: async (sql: string, params: unknown[]) => {
      if (sql.startsWith("UPDATE")) {
        writes.push(params);
        return { rows: [{ id: productId, price_cents: 90, discount_price_cents: params[0], discount_badge: params[1],
          is_discount_price: true, is_sale_tag: true, sale_tag: "SAVE $0.10", version: 2 }] };
      }
      return { rowCount: 1, rows: [{ version: 1, price_cents: 90 }] };
    },
    release() {},
  }));
  const put = (discountPrice: string) => request(createApp()).put(`${endpoint}/${productId}`).set("Authorization", authorization)
    .send({ version: 1, discountPrice, discountBadge: "save-amount" });
  await put("0.90").expect(400);
  await put("0").expect(400);
  const result = await put("0.80").expect(200);
  assert.deepEqual(writes, [[80, "save-amount", productId]]);
  assert.equal(result.body.product.saleTag, "SAVE $0.10");
});
