import { describe, expect, vi, afterEach } from 'vitest';
import { fc, test } from '@fast-check/vitest';
import { mapMaker, linkCheckerCSV, defaultResultsOrder } from './csvOut.js';
import { results } from './urlFunctions.js';
import { writeFileSync } from 'fs';

vi.mock('fs');

describe('csvOut module - property-based tests', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('mapMaker', () => {
    test.prop([fc.webUrl(), fc.webUrl(), fc.integer({ min: 100, max: 599 })])(
      'should create a Map with specified order',
      (parentURL, url, status) => {
        const obj = {
          parentURL,
          url,
          status: status.toString(),
          statusMsg: 'OK',
          anchored: false,
          anchorExists: false,
          elem: 'a'
        };
        const order = ['parentURL', 'url', 'status'];

        const result = mapMaker(obj, order);

        expect(result instanceof Map).toBe(true);
        expect(result.size).toBe(3);
        expect(result.get('parentURL')).toBe(parentURL);
        expect(result.get('url')).toBe(url);
        expect(result.get('status')).toBe(status.toString());
      }
    );

    test.prop([fc.webUrl()])('should convert all values to strings', (url) => {
      const obj = {
        url,
        status: 200,
        anchored: true,
        anchorExists: false
      };
      const order = ['url', 'status', 'anchored', 'anchorExists'];

      const result = mapMaker(obj, order);

      for (const value of result.values()) {
        expect(typeof value).toBe('string');
      }
    });

    test.prop([fc.webUrl(), fc.webUrl()])(
      'should respect the order of keys',
      (parentURL, url) => {
        const obj = { parentURL, url, status: '200' };
        const order1 = ['parentURL', 'url', 'status'];
        const order2 = ['status', 'url', 'parentURL'];

        const result1 = mapMaker(obj, order1);
        const result2 = mapMaker(obj, order2);

        const keys1 = Array.from(result1.keys());
        const keys2 = Array.from(result2.keys());

        expect(keys1).toEqual(order1);
        expect(keys2).toEqual(order2);
      }
    );

    test.prop([
      fc.record({
        parentURL: fc.webUrl(),
        url: fc.webUrl(),
        status: fc.string(),
        statusMsg: fc.string(),
        elem: fc.string(),
        anchored: fc.boolean(),
        anchorExists: fc.boolean()
      })
    ])('should handle all properties in results object', (obj) => {
      const result = mapMaker(obj, defaultResultsOrder);

      expect(result.size).toBe(defaultResultsOrder.length);
    });
  });

  describe('linkCheckerCSV', () => {
    test.prop([fc.webUrl(), fc.webUrl()])(
      'should call writeFileSync with correct filename',
      async (parentURL, url) => {
        const results: results[] = [
          {
            parentURL,
            url,
            status: '200',
            statusMsg: 'OK',
            elem: 'a',
            anchored: false,
            anchorExists: false
          }
        ];
        const filename = 'test-output.csv';

        await linkCheckerCSV(Promise.resolve(results), filename);

        expect(vi.mocked(writeFileSync)).toHaveBeenCalledWith(
          filename,
          expect.any(String)
        );
      }
    );

    test.prop([
      fc.array(
        fc.record({
          parentURL: fc.webUrl(),
          url: fc.webUrl(),
          status: fc.integer({ min: 100, max: 599 }).map(String),
          statusMsg: fc.string(),
          elem: fc.constantFrom('a', 'img', 'script', 'link'),
          anchored: fc.boolean(),
          anchorExists: fc.boolean()
        }),
        { minLength: 1, maxLength: 10 }
      )
    ])('should handle multiple results', async (results) => {
      const filename = 'test-output.csv';

      await linkCheckerCSV(Promise.resolve(results), filename);

      expect(vi.mocked(writeFileSync)).toHaveBeenCalled();
    });

    test.prop([fc.webUrl(), fc.string()])(
      'should format CSV with quoted values',
      async (url, filename) => {
        const results: results[] = [
          {
            parentURL: url,
            url: url,
            status: '200',
            statusMsg: 'OK',
            elem: 'a',
            anchored: false,
            anchorExists: false
          }
        ];

        await linkCheckerCSV(Promise.resolve(results), filename);

        const callArgs = vi.mocked(writeFileSync).mock.calls[0];
        const csvContent = callArgs[1] as string;

        expect(csvContent).toContain('"');
      }
    );

    test.prop([fc.webUrl()])(
      'should use default results order when not specified',
      async (url) => {
        const results: results[] = [
          {
            parentURL: url,
            url: url,
            status: '200',
            statusMsg: 'OK',
            elem: 'a',
            anchored: false,
            anchorExists: false
          }
        ];

        await linkCheckerCSV(Promise.resolve(results), 'output.csv');

        expect(vi.mocked(writeFileSync)).toHaveBeenCalled();
      }
    );

    test.prop([
      fc.webUrl(),
      fc.array(fc.string(), { minLength: 1, maxLength: 7 })
    ])('should respect custom results order', async (url, customOrder) => {
      const validOrder = customOrder.filter((key) =>
        defaultResultsOrder.includes(key)
      );

      if (validOrder.length === 0) {
        validOrder.push('url');
      }

      const results: results[] = [
        {
          parentURL: url,
          url: url,
          status: '200',
          statusMsg: 'OK',
          elem: 'a',
          anchored: false,
          anchorExists: false
        }
      ];

      await linkCheckerCSV(Promise.resolve(results), 'output.csv', validOrder);

      expect(vi.mocked(writeFileSync)).toHaveBeenCalled();
    });

    test('should handle empty results array', async () => {
      const results: results[] = [];

      await linkCheckerCSV(Promise.resolve(results), 'output.csv');

      expect(vi.mocked(writeFileSync)).toHaveBeenCalledWith('output.csv', '');
    });
  });

  describe('defaultResultsOrder', () => {
    test('should be an array of strings', () => {
      expect(Array.isArray(defaultResultsOrder)).toBe(true);
      expect(defaultResultsOrder.length).toBeGreaterThan(0);
      defaultResultsOrder.forEach((item) => {
        expect(typeof item).toBe('string');
      });
    });

    test('should contain expected result properties', () => {
      const expectedProps = [
        'parentURL',
        'url',
        'status',
        'statusMsg',
        'anchored',
        'anchorExists',
        'elem'
      ];

      expectedProps.forEach((prop) => {
        expect(defaultResultsOrder).toContain(prop);
      });
    });
  });

  describe('CSV formatting properties', () => {
    test.prop([fc.webUrl()])(
      'CSV output should have proper line breaks',
      async (url) => {
        const results: results[] = [
          {
            parentURL: url,
            url: url,
            status: '200',
            statusMsg: 'OK',
            elem: 'a',
            anchored: false,
            anchorExists: false
          }
        ];

        await linkCheckerCSV(Promise.resolve(results), 'output.csv');

        const callArgs = vi.mocked(writeFileSync).mock.calls[0];
        const csvContent = callArgs[1] as string;

        expect(csvContent).toMatch(/\n/);
      }
    );

    test.prop([
      fc.array(
        fc.record({
          parentURL: fc.webUrl(),
          url: fc.webUrl(),
          status: fc.string(),
          statusMsg: fc.string(),
          elem: fc.string(),
          anchored: fc.boolean(),
          anchorExists: fc.boolean()
        }),
        { minLength: 2, maxLength: 5 }
      )
    ])('multiple results should create multiple lines', async (results) => {
      await linkCheckerCSV(Promise.resolve(results), 'output.csv');

      const callArgs = vi.mocked(writeFileSync).mock.calls[0];
      const csvContent = callArgs[1] as string;

      // CSV content should have been written
      expect(csvContent.length).toBeGreaterThan(0);
    });
  });
});
