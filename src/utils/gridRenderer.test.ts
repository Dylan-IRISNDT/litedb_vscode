import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderCollectionGrid } from './gridRenderer';
import { QueryResult } from '../types';

function makeResult(rows: Array<Record<string, unknown>>, columns: string[]): QueryResult {
    return { columns, rows };
}

test('nested document/array values render as a truncated json-link', () => {
    const nested = { foo: 'bar', nested: { a: 1 } };
    const html = renderCollectionGrid('test', makeResult([{ _id: '1', data: nested }], ['_id', 'data']));

    assert.match(html, /class="json-link"/);
    assert.match(html, /data-type="json"/);
    assert.match(html, / data-json="[^"]*&quot;foo&quot;/);
});

test('string columns containing valid JSON are detected and linkified', () => {
    const jsonString = '{"a":1,"b":2}';
    const html = renderCollectionGrid('test', makeResult([{ _id: '1', payload: jsonString }], ['_id', 'payload']));

    assert.match(html, /class="json-link"/);
    assert.match(html, /data-json="\{&quot;a&quot;:1,&quot;b&quot;:2\}"/);
});

test('plain strings are not treated as JSON', () => {
    const html = renderCollectionGrid('test', makeResult([{ _id: '1', name: 'hello world' }], ['_id', 'name']));

    assert.doesNotMatch(html, /class="json-link"/);
    assert.match(html, />hello world</);
});

test('long JSON previews are truncated with an ellipsis', () => {
    const longValue = { items: Array.from({ length: 20 }, (_, i) => `item-${i}`) };
    const fullJson = JSON.stringify(longValue);
    const html = renderCollectionGrid('test', makeResult([{ _id: '1', data: longValue }], ['_id', 'data']));

    const linkMatch = html.match(/<a href="#" class="json-link"[^>]*>([^<]*)<\/a>/);
    assert.ok(linkMatch, 'expected a json-link anchor to be rendered');
    assert.ok(linkMatch![1].endsWith('...'));
    assert.ok(linkMatch![1].length < fullJson.length);
});

test('BSON special types ($oid, $guid, $date) are not treated as JSON links', () => {
    const html = renderCollectionGrid('test', makeResult([{
        _id: { $oid: 'abc123abc123abc123abc123' },
        g: { $guid: '11111111-1111-1111-1111-111111111111' },
        d: { $date: '2024-01-01T00:00:00Z' }
    }], ['_id', 'g', 'd']));

    assert.doesNotMatch(html, /class="json-link"/);
    assert.match(html, /data-type="bson"/);
    assert.match(html, /data-type="guid"/);
    assert.match(html, /data-type="date"/);
});
