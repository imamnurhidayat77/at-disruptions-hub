/**
 * Focused SAP integration tests — Node built-in runner only
 * (node --test). No test framework added to the repository.
 * Run: npm run test:sap
 */
import { deepStrictEqual, equal, ok } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import test from 'node:test';
import { normalizeEnvelope, normalizeEntry } from '../src/services/sap/sapIncidentMapper.ts';
import {
  SapNotConfiguredError,
  SapUnavailableError,
} from '../src/services/sap/types.ts';
import { fetchSapIncidentsFrom } from '../src/services/sap/sapIncidentService.ts';

test('mapper handles a valid OData V2 envelope', () => {
  const entries = normalizeEnvelope({
    d: {
      results: [
        {
          IncidentUUID: 'abc-123',
          IncidentTitle: 'Forklift near miss',
          IncidentDescription: 'Near miss in warehouse aisle 4.',
          IncidentStatus: 'Open',
          CreatedAt: '2026-09-01T10:00:00Z',
          ChangedAt: '2026-09-02T10:00:00Z',
        },
      ],
    },
  });
  equal(entries.length, 1);
  const ref = normalizeEntry(entries[0], 0);
  equal(ref.sapId, 'abc-123');
  equal(ref.title, 'Forklift near miss');
  equal(ref.status, 'Open');
  deepStrictEqual(ref.rawSource, entries[0]);
});

test('mapper handles OData V4 envelope with missing optional fields', () => {
  const entries = normalizeEnvelope({ value: [{ Incident: '0001' }] });
  equal(entries.length, 1);
  const ref = normalizeEntry(entries[0], 0);
  equal(ref.sapId, '0001');
  equal(ref.title, null);
  equal(ref.description, null);
  equal(ref.status, null);
  equal(ref.createdAt, null);
  equal(ref.updatedAt, null);
});

test('mapper handles an empty response without throwing', () => {
  deepStrictEqual(normalizeEnvelope({ d: { results: [] } }), []);
  deepStrictEqual(normalizeEnvelope({ value: [] }), []);
  deepStrictEqual(normalizeEnvelope(null), []);
  deepStrictEqual(normalizeEnvelope({ unexpected: true }), [
    { unexpected: true },
  ]);
});

test('service maps HTTP errors to SapUnavailableError', async () => {
  const server = createServer((_req, res) => {
    res.statusCode = 500;
    res.end('boom');
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as { port: number }).port;
  await test('inner', async () => {
    let thrown: unknown = null;
    try {
      await fetchSapIncidentsFrom(`http://127.0.0.1:${port}/api/sap/incidents`);
    } catch (err) {
      thrown = err;
    }
    ok(thrown instanceof SapUnavailableError);
  });
  server.close();
});

test('service maps connection failure to SapUnavailableError', async () => {
  let thrown: unknown = null;
  try {
    await fetchSapIncidentsFrom('http://127.0.0.1:1/api/sap/incidents');
  } catch (err) {
    thrown = err;
  }
  ok(thrown instanceof SapUnavailableError);
});

test('service maps 503 NOT_CONFIGURED to SapNotConfiguredError', async () => {
  const server = createServer((_req, res) => {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ code: 'NOT_CONFIGURED' }));
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as { port: number }).port;
  let thrown: unknown = null;
  try {
    await fetchSapIncidentsFrom(`http://127.0.0.1:${port}/api/sap/incidents`);
  } catch (err) {
    thrown = err;
  }
  ok(thrown instanceof SapNotConfiguredError);
  server.close();
});

test('sync path never mutates AT state or touches the incident store', () => {
  const input = Object.freeze({
    d: { results: [Object.freeze({ Incident: '0001', Title: 'T' })] },
  });
  const before = JSON.stringify(input);
  const refs = normalizeEnvelope(input).map((e, i) => normalizeEntry(e, i));
  equal(JSON.stringify(input), before);
  for (const ref of refs) {
    const keys = Object.keys(ref);
    for (const forbidden of ['route', 'operator', 'severity', 'owner', 'timeline']) {
      ok(!keys.includes(forbidden), `normalised ref must not carry AT field ${forbidden}`);
    }
  }
  const serviceSource = readFileSync(
    new URL('../src/services/sap/sapIncidentService.ts', import.meta.url),
    'utf8',
  );
  ok(!serviceSource.includes('state/AppStore'), 'service must not import the incident store');
  ok(!serviceSource.includes('SAP_API_KEY'), 'service must not reference credentials');
});
