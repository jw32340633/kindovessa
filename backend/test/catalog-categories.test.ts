import assert from "node:assert/strict";
import { test } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import { pool } from "../src/db/pool.js";

const endpoint = "/api/v1/catalog/categories";
const id = "6ff589d8-c2a2-4917-ae30-ac0b8dc02600";
const coverAssetId = "6ff589d8-c2a2-4917-ae30-ac0b8dc02601";
const authorization = `Bearer ${"a".repeat(64)}`;

test("storefront categories are readable without an admin session", { skip: !pool }, async (context) => {
  const category = { slug: "personal-care", title: "Personal Care", coverUrl: "https://res.cloudinary.com/test/image/upload/cover.webp" };
  const query = context.mock.method(pool!, "query", async (sql: string) => {
    assert.match(sql, /SELECT c.slug, c.title, a.url AS "coverUrl"/);
    assert.match(sql, /WHERE c.title IS NOT NULL AND a.url IS NOT NULL/);
    return { rows: [category] };
  });
  const response = await request(createApp()).get("/api/v1/storefront/categories").expect(200);
  assert.deepEqual(response.body, { categories: [category] });
  assert.equal(query.mock.callCount(), 1);
});

test("catalog category endpoints require admin authentication", async () => {
  const api = request(createApp());
  await api.get(endpoint).expect(401);
  await api.post(endpoint).send({ title: "Personal Care", coverAssetId }).expect(401);
  await api.delete(`${endpoint}/bulk`).send({ categories: [{ id, version: 1 }] }).expect(401);
});

test("category creation derives the URL and completes an existing category link", { skip: !pool }, async (context) => {
  const writes: unknown[][] = [];
  context.mock.method(pool!, "query", async () => ({ rows: [{ id: "test-admin" }] }));
  context.mock.method(pool!, "connect", async () => ({
    async query(sql: string, params: unknown[]) {
      if (sql.startsWith("SELECT id, slug")) {
        assert.deepEqual(params, ["personal-care"]);
        return { rows: [{ id, slug: "personal-care", title: null }] };
      }
      if (sql.startsWith("UPDATE catalog_assets")) {
        assert.deepEqual(params, [coverAssetId, "test-admin"]);
        return { rowCount: 1 };
      }
      if (sql.startsWith("UPDATE catalog_categories")) writes.push(params);
      if (sql.includes('AS "productCount"')) return { rows: [{ id, slug: "personal-care", productCount: 2 }] };
      return { rows: [] };
    },
    release() {},
  }));
  const result = await request(createApp()).post(endpoint).set("Authorization", authorization)
    .send({ title: "  Personal Care  ", coverAssetId }).expect(201);
  assert.deepEqual(writes, [["Personal Care", "personal-care", coverAssetId, id]]);
  assert.equal(result.body.category.productCount, 2);
});

test("bulk category deletion rolls back when any category has linked products", { skip: !pool }, async (context) => {
  const statements: string[] = [];
  context.mock.method(pool!, "query", async () => ({ rows: [{ id: "test-admin" }] }));
  context.mock.method(pool!, "connect", async () => ({
    async query(sql: string) {
      statements.push(sql);
      if (sql.startsWith("SELECT id, slug")) return { rows: [{ id, slug: "personal-care", version: 1 }] };
      if (sql.includes("SELECT 1 FROM catalog_products")) return { rowCount: 1 };
      return { rows: [] };
    },
    release() {},
  }));
  await request(createApp()).delete(`${endpoint}/bulk`).set("Authorization", authorization)
    .send({ categories: [{ id, version: 1 }] }).expect(409);
  assert.equal(statements.at(-1), "ROLLBACK");
  assert.equal(statements.some((sql) => sql.startsWith("DELETE")), false);
});
