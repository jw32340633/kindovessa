import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { productSchema, cents } from '../src/routes/products.js';

const product = { name: 'Test product', slug: 'test-product', brand: '', category: 'daily-living-aids', variants: [], images: [{ assetId: '6ff589d8-c2a2-4917-ae30-ac0b8dc02600', url: 'https://example.com/product.webp', alt: 'Test product', name: 'product.webp' }], detailImages: { usage: null, care: null, safety: null }, price: '19.99', rating: '', reviewCount: '', soldCount: '', details: { description: 'A complete product description.' } };
test('requires complete catalog essentials and converts money exactly', () => {
 assert.ok(productSchema.safeParse(product).success);
 assert.equal(cents('19.99'), 1999); assert.equal(cents('0.10'), 10); assert.equal(cents(''), null);
});
test('rejects incomplete products, invalid categories, status and data URLs', () => {
 assert.equal(productSchema.safeParse({ ...product, images: [] }).success, false);
 assert.equal(productSchema.safeParse({ ...product, price: '' }).success, false);
 assert.equal(productSchema.safeParse({ ...product, details: {} }).success, false);
 assert.equal(productSchema.safeParse({ ...product, category: 'new-catalog-category' }).success, false);
 assert.equal(productSchema.safeParse({ ...product, category: 'Invalid Category Link!' }).success, false);
 assert.equal(productSchema.safeParse({ ...product, status: 'active' }).success, false);
 assert.equal(productSchema.safeParse({ ...product, images: [{ url: 'data:image/png;base64,abc', alt: 'Test', name: '' }] }).success, false);
});
test('rejects invalid options, oversized money and unsupported fields', () => {
 const option = { type: 'size', title: 'Small', priceMode: 'same', price: '', colorHex: '', image: null };
 assert.equal(productSchema.safeParse({ ...product, variants: [{ ...option, sku: 'ABC' }] }).success, false);
 assert.equal(productSchema.safeParse({ ...product, variants: [{ ...option, priceMode: 'custom', price: '999999999999' }] }).success, false);
 assert.equal(productSchema.safeParse({ ...product, variants: [{ ...option, type: 'color-swatch' }] }).success, false);
 assert.equal(productSchema.safeParse({ ...product, variants: [{ ...option, type: 'image-swatch' }] }).success, false);
 assert.equal(productSchema.safeParse({ ...product, totalSales: 100 }).success, false);
});
test('sales metrics validate ranges and nonnegative whole counts', () => {
 assert.ok(productSchema.safeParse({ ...product, price: '19.99' }).success);
 assert.equal(productSchema.safeParse({ ...product, price: '999999999999' }).success, false);
 assert.ok(productSchema.safeParse({ ...product, rating: '4.5', reviewCount: '2', soldCount: '10' }).success);
 assert.equal(productSchema.safeParse({ ...product, rating: '6' }).success, false);
 assert.equal(productSchema.safeParse({ ...product, soldCount: '-1' }).success, false);
 assert.equal(productSchema.safeParse({ ...product, reviewCount: '1.5' }).success, false);
 assert.ok(productSchema.safeParse({ ...product, reviewCount: '0', soldCount: '0' }).success);
 assert.equal(productSchema.safeParse({ ...product, sourceUrl: 'https://example.com' }).success, false);
 assert.equal(productSchema.safeParse({ ...product, details: { manufacturer: 'Removed' } }).success, false);
 assert.equal(productSchema.safeParse({ ...product, details: { productType: 'Removed' } }).success, false);
 assert.equal(productSchema.safeParse({ ...product, details: { modelNumber: 'Removed' } }).success, false);
});
test('all product methods reject unauthenticated requests', async () => {
 const app = createApp();
 await request(app).get('/api/v1/products').expect(401);
 await request(app).post('/api/v1/products').send(product).expect(401);
 await request(app).put('/api/v1/products/6ff589d8-c2a2-4917-ae30-ac0b8dc02600').send(product).expect(401);
 await request(app).delete('/api/v1/products/6ff589d8-c2a2-4917-ae30-ac0b8dc02600').send({ version: 1 }).expect(401);
});
