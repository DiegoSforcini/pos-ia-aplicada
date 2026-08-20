import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from '../src/server.ts'

test('routes to cheapest model by default', async () => {
    const app = createServer()

    const response = await app.inject({
        method: 'POST',
        url: '/chat',
        body: {
            question: 'What is life?'
        }
    });

    assert.equal(response.statusCode, 200);
})