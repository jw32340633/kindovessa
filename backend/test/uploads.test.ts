import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { supportedImage } from '../src/lib/cloudinary.js';

test('upload endpoint requires authentication before parsing files', async () => {
 await request(createApp()).post('/api/v1/uploads').set('Content-Type','application/octet-stream').send(Buffer.from('invalid')).expect(401);
});
test('only JPEG, PNG, WebP and AVIF signatures are accepted; SVG and arbitrary bytes are rejected', () => {
 assert.equal(supportedImage(Buffer.from('<svg/>')),false);
 assert.equal(supportedImage(Buffer.from('not an image')),false);
 assert.equal(supportedImage(Buffer.from([255,216,255,224])),true);
 assert.equal(supportedImage(Buffer.from([137,80,78,71,13,10,26,10,0])),true);
 assert.equal(supportedImage(Buffer.from('RIFF0000WEBP0')),true);
 assert.equal(supportedImage(Buffer.from([0,0,0,24,102,116,121,112,97,118,105,102,0])),true);
});
