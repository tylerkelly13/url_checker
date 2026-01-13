import { describe, expect, vi, afterEach } from 'vitest';
import { fc, test } from '@fast-check/vitest';
import {
  dropKeyFromResults,
  resultsRestructure,
  linkCheckerJSON,
  linkCheckerYAML
} from './jsonYamlOut';
import { results } from './urlFunctions';
import { writeFileSync } from 'fs';
import yaml from 'js-yaml';

vi.mock('fs');

describe('jsonYamlOut module - property-based tests', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('dropKeyFromResults', () => {
    test.prop([fc.webUrl(), fc.webUrl()])(
      'should remove parentURL from result object',
      (parentURL, url) => {
        const result: results = {
          parentURL,
          url,
          status: '200',
          statusMsg: 'OK',
          elem: 'a',
          anchored: false,
          anchorExists: false
        };

        const dropped = dropKeyFromResults(result);

        expect(dropped).not.toHaveProperty('parentURL');
        expect(dropped).toHaveProperty('url');
        expect(dropped).toHaveProperty('status');
        expect(dropped).toHaveProperty('statusMsg');
        expect(dropped).toHaveProperty('elem');
        expect(dropped).toHaveProperty('anchored');
      }
    );

    test.prop([
      fc.record({
        parentURL: fc.webUrl(),
        url: fc.webUrl(),
        status: fc.string(),
        statusMsg: fc.string(),
        elem: fc.constantFrom('a', 'img', 'script', 'link'),
        anchored: fc.boolean(),
        anchorExists: fc.boolean()
      })
    ])('should preserve all other properties', (result) => {
      const dropped = dropKeyFromResults(result);

      expect(dropped.url).toBe(result.url);
      expect(dropped.status).toBe(result.status);
      expect(dropped.statusMsg).toBe(result.statusMsg);
      expect(dropped.elem).toBe(result.elem);
      expect(dropped.anchored).toBe(result.anchored);
      expect(dropped.anchorExists).toBe(result.anchorExists);
    });

    test.prop([fc.webUrl()])(
      'should handle optional anchorExists property',
      (url) => {
        const resultWithAnchor: results = {
          parentURL: url,
          url: url,
          status: '200',
          statusMsg: 'OK',
          elem: 'a',
          anchored: true,
          anchorExists: true
        };

        const resultWithoutAnchor: results = {
          parentURL: url,
          url: url,
          status: '200',
          statusMsg: 'OK',
          elem: 'a',
          anchored: false
        };

        const dropped1 = dropKeyFromResults(resultWithAnchor);
        const dropped2 = dropKeyFromResults(resultWithoutAnchor);

        expect(dropped1.anchorExists).toBe(true);
        expect(dropped2.anchorExists).toBeUndefined();
      }
    );
  });

  describe('resultsRestructure', () => {
    test.prop([fc.webUrl(), fc.webUrl()])(
      'should group results by parentURL',
      (parentURL, url) => {
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

        const restructured = resultsRestructure(results);

        expect(restructured).toHaveProperty(parentURL);
        expect(Array.isArray(restructured[parentURL])).toBe(true);
        expect(restructured[parentURL].length).toBe(1);
      }
    );

    test.prop([fc.webUrl(), fc.webUrl(), fc.webUrl()])(
      'should group multiple results with same parentURL',
      (parentURL, url1, url2) => {
        const results: results[] = [
          {
            parentURL,
            url: url1,
            status: '200',
            statusMsg: 'OK',
            elem: 'a',
            anchored: false
          },
          {
            parentURL,
            url: url2,
            status: '404',
            statusMsg: 'Not Found',
            elem: 'img',
            anchored: false
          }
        ];

        const restructured = resultsRestructure(results);

        expect(restructured[parentURL].length).toBe(2);
        expect(restructured[parentURL][0].url).toBe(url1);
        expect(restructured[parentURL][1].url).toBe(url2);
      }
    );

    test.prop([fc.webUrl(), fc.webUrl(), fc.webUrl(), fc.webUrl()])(
      'should create separate keys for different parentURLs',
      (parent1, parent2, url1, url2) => {
        fc.pre(parent1 !== parent2);

        const results: results[] = [
          {
            parentURL: parent1,
            url: url1,
            status: '200',
            statusMsg: 'OK',
            elem: 'a',
            anchored: false
          },
          {
            parentURL: parent2,
            url: url2,
            status: '200',
            statusMsg: 'OK',
            elem: 'a',
            anchored: false
          }
        ];

        const restructured = resultsRestructure(results);

        expect(Object.keys(restructured).length).toBe(2);
        expect(restructured).toHaveProperty(parent1);
        expect(restructured).toHaveProperty(parent2);
      }
    );

    test('should handle empty array', () => {
      const results: results[] = [];
      const restructured = resultsRestructure(results);

      expect(Object.keys(restructured).length).toBe(0);
    });

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
    ])('should not lose any results during restructuring', (results) => {
      const restructured = resultsRestructure(results);
      const totalResults = Object.values(restructured).reduce(
        (sum, arr) => sum + arr.length,
        0
      );

      expect(totalResults).toBe(results.length);
    });

    test.prop([
      fc.webUrl(),
      fc.array(fc.webUrl(), { minLength: 1, maxLength: 5 })
    ])(
      'should preserve result data in restructured format',
      (parentURL, urls) => {
        const results: results[] = urls.map((url) => ({
          parentURL,
          url,
          status: '200',
          statusMsg: 'OK',
          elem: 'a',
          anchored: false
        }));

        const restructured = resultsRestructure(results);

        restructured[parentURL].forEach((result, index) => {
          expect(result.url).toBe(urls[index]);
          expect(result.status).toBe('200');
          expect(result.elem).toBe('a');
        });
      }
    );
  });

  describe('linkCheckerJSON', () => {
    test.prop([fc.webUrl(), fc.webUrl()])(
      'should write valid JSON to file',
      async (parentURL, url) => {
        const results: results[] = [
          {
            parentURL,
            url,
            status: '200',
            statusMsg: 'OK',
            elem: 'a',
            anchored: false
          }
        ];

        await linkCheckerJSON(Promise.resolve(results), 'output.json');

        expect(vi.mocked(writeFileSync)).toHaveBeenCalled();
        const callArgs = vi.mocked(writeFileSync).mock.calls[0];
        const jsonContent = callArgs[1] as string;

        // Should be valid JSON
        expect(() => JSON.parse(jsonContent)).not.toThrow();
      }
    );

    test.prop([fc.webUrl()])(
      'should format JSON with proper structure',
      async (parentURL) => {
        const results: results[] = [
          {
            parentURL,
            url: 'https://example.com/page',
            status: '200',
            statusMsg: 'OK',
            elem: 'a',
            anchored: false
          }
        ];

        await linkCheckerJSON(Promise.resolve(results), 'output.json');

        const callArgs = vi.mocked(writeFileSync).mock.calls[0];
        const jsonContent = callArgs[1] as string;
        const parsed = JSON.parse(jsonContent);

        // Should have at least one key (the parentURL)
        const keys = Object.keys(parsed);
        expect(keys.length).toBeGreaterThan(0);
        expect(Array.isArray(parsed[keys[0]])).toBe(true);
      }
    );

    test.prop([fc.webUrl(), fc.string()])(
      'should use provided filename',
      async (parentURL, filename) => {
        const results: results[] = [
          {
            parentURL,
            url: 'https://example.com',
            status: '200',
            statusMsg: 'OK',
            elem: 'a',
            anchored: false
          }
        ];

        await linkCheckerJSON(Promise.resolve(results), filename);

        expect(vi.mocked(writeFileSync)).toHaveBeenCalledWith(
          filename,
          expect.any(String)
        );
      }
    );

    test('should handle empty results', async () => {
      const results: results[] = [];

      await linkCheckerJSON(Promise.resolve(results), 'output.json');

      const callArgs = vi.mocked(writeFileSync).mock.calls[0];
      const jsonContent = callArgs[1] as string;

      expect(JSON.parse(jsonContent)).toEqual({});
    });
  });

  describe('linkCheckerYAML', () => {
    test.prop([fc.webUrl(), fc.webUrl()])(
      'should write valid YAML to file',
      async (parentURL, url) => {
        const results: results[] = [
          {
            parentURL,
            url,
            status: '200',
            statusMsg: 'OK',
            elem: 'a',
            anchored: false
          }
        ];

        await linkCheckerYAML(Promise.resolve(results), 'output.yaml');

        expect(vi.mocked(writeFileSync)).toHaveBeenCalled();
        const callArgs = vi.mocked(writeFileSync).mock.calls[0];
        const yamlContent = callArgs[1] as string;

        // Should be valid YAML
        expect(() => yaml.load(yamlContent)).not.toThrow();
      }
    );

    test.prop([fc.webUrl()])(
      'should format YAML with proper structure',
      async (parentURL) => {
        const results: results[] = [
          {
            parentURL,
            url: 'https://example.com/page',
            status: '200',
            statusMsg: 'OK',
            elem: 'a',
            anchored: false
          }
        ];

        await linkCheckerYAML(Promise.resolve(results), 'output.yaml');

        const callArgs = vi.mocked(writeFileSync).mock.calls[0];
        const yamlContent = callArgs[1] as string;
        const parsed = yaml.load(yamlContent) as any;

        // Should have at least one key (the parentURL)
        const keys = Object.keys(parsed);
        expect(keys.length).toBeGreaterThan(0);
        expect(Array.isArray(parsed[keys[0]])).toBe(true);
      }
    );

    test.prop([fc.webUrl(), fc.string()])(
      'should use provided filename',
      async (parentURL, filename) => {
        const results: results[] = [
          {
            parentURL,
            url: 'https://example.com',
            status: '200',
            statusMsg: 'OK',
            elem: 'a',
            anchored: false
          }
        ];

        await linkCheckerYAML(Promise.resolve(results), filename);

        expect(vi.mocked(writeFileSync)).toHaveBeenCalledWith(
          filename,
          expect.any(String)
        );
      }
    );

    test('should handle empty results', async () => {
      const results: results[] = [];

      await linkCheckerYAML(Promise.resolve(results), 'output.yaml');

      const callArgs = vi.mocked(writeFileSync).mock.calls[0];
      const yamlContent = callArgs[1] as string;

      expect(yaml.load(yamlContent)).toEqual({});
    });
  });

  describe('JSON and YAML equivalence', () => {
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
        { minLength: 1, maxLength: 5 }
      )
    ])(
      'JSON and YAML should produce equivalent data structures',
      async (results) => {
        await linkCheckerJSON(Promise.resolve(results), 'output.json');
        await linkCheckerYAML(Promise.resolve(results), 'output.yaml');

        const jsonCall = vi.mocked(writeFileSync).mock.calls[0];
        const yamlCall = vi.mocked(writeFileSync).mock.calls[1];

        const jsonParsed = JSON.parse(jsonCall[1] as string);
        const yamlParsed = yaml.load(yamlCall[1] as string);

        expect(jsonParsed).toEqual(yamlParsed);
      }
    );
  });
});
