import { describe, it, expect } from 'vitest';
import * as sarif from './sarifOut';
import * as URL from './urlFunctions';
import fs from 'fs';

const getVersionFromPackage = () => {
  try {
    const packageJson = fs.readFileSync('./package.json', 'utf-8');
    const packageData = JSON.parse(packageJson);
    return packageData.version || '0.0.0';
    // eslint-disable-next-line no-unused-vars
  } catch (_error) {
    return '0.0.0';
  }
};

describe('SARIF Output Module', () => {
  describe('mapStatusToLevel', () => {
    it('should return error for 5xx status codes', () => {
      expect(sarif.mapStatusToLevel('500', false)).toBe('error');
      expect(sarif.mapStatusToLevel('503', false)).toBe('error');
    });

    it('should return error for 4xx status codes', () => {
      expect(sarif.mapStatusToLevel('404', false)).toBe('error');
      expect(sarif.mapStatusToLevel('403', false)).toBe('error');
    });

    it('should return warning for 3xx status codes', () => {
      expect(sarif.mapStatusToLevel('301', false)).toBe('warning');
      expect(sarif.mapStatusToLevel('302', false)).toBe('warning');
    });

    it('should return none for 2xx status codes', () => {
      expect(sarif.mapStatusToLevel('200', false)).toBe('none');
      expect(sarif.mapStatusToLevel('201', false)).toBe('none');
    });

    it('should return note for anchor-only URLs (status 0)', () => {
      expect(sarif.mapStatusToLevel('000', true, true)).toBe('note');
    });

    it('should return error for missing anchors', () => {
      expect(sarif.mapStatusToLevel('200', true, false)).toBe('error');
      expect(sarif.mapStatusToLevel('000', true, false)).toBe('error');
    });

    it('should return warning for unknown status codes', () => {
      expect(sarif.mapStatusToLevel('999', false)).toBe('warning');
    });
  });

  describe('determineRuleId', () => {
    it('should return URL001 for missing anchors', () => {
      expect(sarif.determineRuleId('200', true, false)).toBe('URL001');
      expect(sarif.determineRuleId('000', true, false)).toBe('URL001');
    });

    it('should return URL002 for server errors', () => {
      expect(sarif.determineRuleId('500', false)).toBe('URL002');
      expect(sarif.determineRuleId('503', false)).toBe('URL002');
    });

    it('should return URL003 for 404 errors', () => {
      expect(sarif.determineRuleId('404', false)).toBe('URL003');
    });

    it('should return URL004 for other client errors', () => {
      expect(sarif.determineRuleId('400', false)).toBe('URL004');
      expect(sarif.determineRuleId('403', false)).toBe('URL004');
    });

    it('should return URL005 for redirects', () => {
      expect(sarif.determineRuleId('301', false)).toBe('URL005');
      expect(sarif.determineRuleId('302', false)).toBe('URL005');
    });

    it('should return URL006 for success', () => {
      expect(sarif.determineRuleId('200', false)).toBe('URL006');
      expect(sarif.determineRuleId('201', false)).toBe('URL006');
    });

    it('should return URL007 for unknown status', () => {
      expect(sarif.determineRuleId('999', false)).toBe('URL007');
    });
  });

  describe('getUniqueRuleIds', () => {
    it('should return unique rule IDs from results', () => {
      const results: URL.results[] = [
        {
          parentURL: 'https://example.com',
          url: 'https://example.com/page1',
          status: '200',
          statusMsg: 'OK',
          elem: 'a',
          anchored: false
        },
        {
          parentURL: 'https://example.com',
          url: 'https://example.com/page2',
          status: '404',
          statusMsg: 'Not Found',
          elem: 'a',
          anchored: false
        },
        {
          parentURL: 'https://example.com',
          url: 'https://example.com/page3',
          status: '200',
          statusMsg: 'OK',
          elem: 'a',
          anchored: false
        }
      ];

      const ruleIds = sarif.getUniqueRuleIds(results);
      expect(ruleIds).toContain('URL006'); // Success
      expect(ruleIds).toContain('URL003'); // Not Found
      expect(ruleIds.length).toBe(2);
    });
  });

  describe('createRules', () => {
    it('should create all rule definitions', () => {
      const rules = sarif.createRules();
      expect(rules.length).toBe(7);
      expect(rules.map(r => r.id)).toEqual([
        'URL001',
        'URL002',
        'URL003',
        'URL004',
        'URL005',
        'URL006',
        'URL007'
      ]);
    });

    it('should include required properties for each rule', () => {
      const rules = sarif.createRules();
      rules.forEach(rule => {
        expect(rule.id).toBeDefined();
        expect(rule.name).toBeDefined();
        expect(rule.shortDescription).toBeDefined();
        expect(rule.shortDescription?.text).toBeDefined();
        expect(rule.fullDescription).toBeDefined();
        expect(rule.fullDescription?.text).toBeDefined();
        expect(rule.defaultConfiguration).toBeDefined();
        expect(rule.defaultConfiguration?.level).toBeDefined();
      });
    });
  });

  describe('convertToSarifResult', () => {
    it('should convert a successful URL check to SARIF result', () => {
      const result: URL.results = {
        parentURL: 'https://example.com',
        url: 'https://example.com/page',
        status: '200',
        statusMsg: 'OK',
        elem: 'a',
        anchored: false
      };

      const sarifResult = sarif.convertToSarifResult(result);

      expect(sarifResult.ruleId).toBe('URL006');
      expect(sarifResult.level).toBe('none');
      expect(sarifResult.message.text).toContain('https://example.com/page');
      expect(sarifResult.message.text).toContain('200');
      expect(sarifResult.locations).toBeDefined();
      expect(
        sarifResult.locations?.[0].physicalLocation?.artifactLocation.uri
      ).toBe('https://example.com');
      expect(sarifResult.properties).toEqual({
        parentURL: 'https://example.com',
        url: 'https://example.com/page',
        status: '200',
        statusMsg: 'OK',
        anchored: false,
        anchorExists: undefined,
        elem: 'a'
      });
    });

    it('should convert a 404 error to SARIF result', () => {
      const result: URL.results = {
        parentURL: 'https://example.com',
        url: 'https://example.com/missing',
        status: '404',
        statusMsg: 'Not Found',
        elem: 'a',
        anchored: false
      };

      const sarifResult = sarif.convertToSarifResult(result);

      expect(sarifResult.ruleId).toBe('URL003');
      expect(sarifResult.level).toBe('error');
      expect(sarifResult.message.text).toContain('404');
      expect(sarifResult.message.text).toContain('Not Found');
    });

    it('should convert a missing anchor to SARIF result', () => {
      const result: URL.results = {
        parentURL: 'https://example.com',
        url: '#missing',
        status: '000',
        statusMsg: 'N/A',
        elem: 'a',
        anchored: true,
        anchorExists: false
      };

      const sarifResult = sarif.convertToSarifResult(result);

      expect(sarifResult.ruleId).toBe('URL001');
      expect(sarifResult.level).toBe('error');
      expect(sarifResult.message.text).toContain('anchor that does not exist');
    });

    it('should include logical location with URL', () => {
      const result: URL.results = {
        parentURL: 'https://example.com',
        url: 'https://example.com/page',
        status: '200',
        statusMsg: 'OK',
        elem: 'a',
        anchored: false
      };

      const sarifResult = sarif.convertToSarifResult(result);

      expect(
        sarifResult.locations?.[0].logicalLocations?.[0].fullyQualifiedName
      ).toBe('https://example.com/page');
      expect(sarifResult.locations?.[0].logicalLocations?.[0].kind).toBe('url');
    });
  });

  describe('getArtifacts', () => {
    it('should extract unique parent URLs as artifacts', () => {
      const results: URL.results[] = [
        {
          parentURL: 'https://example.com/page1',
          url: 'https://example.com/link1',
          status: '200',
          statusMsg: 'OK',
          elem: 'a',
          anchored: false
        },
        {
          parentURL: 'https://example.com/page1',
          url: 'https://example.com/link2',
          status: '404',
          statusMsg: 'Not Found',
          elem: 'a',
          anchored: false
        },
        {
          parentURL: 'https://example.com/page2',
          url: 'https://example.com/link3',
          status: '200',
          statusMsg: 'OK',
          elem: 'a',
          anchored: false
        }
      ];

      const artifacts = sarif.getArtifacts(results);

      expect(artifacts.length).toBe(2);
      expect(artifacts.map(a => a.location.uri)).toContain(
        'https://example.com/page1'
      );
      expect(artifacts.map(a => a.location.uri)).toContain(
        'https://example.com/page2'
      );
      expect(artifacts[0].mimeType).toBe('text/html');
    });
  });

  describe('convertToSarif', () => {
    it('should create valid SARIF log structure', () => {
      const results: URL.results[] = [
        {
          parentURL: 'https://example.com',
          url: 'https://example.com/page',
          status: '200',
          statusMsg: 'OK',
          elem: 'a',
          anchored: false
        }
      ];

      const sarifLog = sarif.convertToSarif(results);

      expect(sarifLog.version).toBe('2.1.0');
      expect(sarifLog.$schema).toContain('sarif-schema-2.1.0.json');
      expect(sarifLog.runs).toBeDefined();
      expect(sarifLog.runs.length).toBe(1);
    });

    it('should include tool information', () => {
      const results: URL.results[] = [
        {
          parentURL: 'https://example.com',
          url: 'https://example.com/page',
          status: '200',
          statusMsg: 'OK',
          elem: 'a',
          anchored: false
        }
      ];

      const sarifLog = sarif.convertToSarif(results);
      const tool = sarifLog.runs[0].tool.driver;

      expect(tool.name).toBe('url_checker');
      expect(tool.version).toBe(getVersionFromPackage());
      expect(tool.informationUri).toBeDefined();
      expect(tool.rules).toBeDefined();
    });

    it('should include all results', () => {
      const results: URL.results[] = [
        {
          parentURL: 'https://example.com',
          url: 'https://example.com/page1',
          status: '200',
          statusMsg: 'OK',
          elem: 'a',
          anchored: false
        },
        {
          parentURL: 'https://example.com',
          url: 'https://example.com/page2',
          status: '404',
          statusMsg: 'Not Found',
          elem: 'a',
          anchored: false
        }
      ];

      const sarifLog = sarif.convertToSarif(results);

      expect(sarifLog.runs[0].results.length).toBe(2);
    });

    it('should include artifacts', () => {
      const results: URL.results[] = [
        {
          parentURL: 'https://example.com',
          url: 'https://example.com/page',
          status: '200',
          statusMsg: 'OK',
          elem: 'a',
          anchored: false
        }
      ];

      const sarifLog = sarif.convertToSarif(results);

      expect(sarifLog.runs[0].artifacts).toBeDefined();
      expect(sarifLog.runs[0].artifacts?.length).toBe(1);
    });

    it('should include invocation information', () => {
      const results: URL.results[] = [
        {
          parentURL: 'https://example.com',
          url: 'https://example.com/page',
          status: '200',
          statusMsg: 'OK',
          elem: 'a',
          anchored: false
        }
      ];

      const sarifLog = sarif.convertToSarif(results);
      const invocation = sarifLog.runs[0].invocations?.[0];

      expect(invocation).toBeDefined();
      expect(invocation?.executionSuccessful).toBe(true);
      expect(invocation?.endTimeUtc).toBeDefined();
    });

    it('should handle multiple result types', () => {
      const results: URL.results[] = [
        {
          parentURL: 'https://example.com',
          url: 'https://example.com/ok',
          status: '200',
          statusMsg: 'OK',
          elem: 'a',
          anchored: false
        },
        {
          parentURL: 'https://example.com',
          url: 'https://example.com/notfound',
          status: '404',
          statusMsg: 'Not Found',
          elem: 'a',
          anchored: false
        },
        {
          parentURL: 'https://example.com',
          url: 'https://example.com/redirect',
          status: '301',
          statusMsg: 'Moved Permanently',
          elem: 'a',
          anchored: false
        },
        {
          parentURL: 'https://example.com',
          url: '#anchor',
          status: '000',
          statusMsg: 'N/A',
          elem: 'a',
          anchored: true,
          anchorExists: false
        }
      ];

      const sarifLog = sarif.convertToSarif(results);
      const resultLevels = sarifLog.runs[0].results.map(r => r.level);

      expect(resultLevels).toContain('none'); // 200
      expect(resultLevels).toContain('error'); // 404 and missing anchor
      expect(resultLevels).toContain('warning'); // 301
    });
  });

  describe('getPackageVersion', () => {
    it('should read version from package.json', () => {
      const version = sarif.getPackageVersion('./package.json');
      expect(version).toBe(getVersionFromPackage());
    });

    it('should return fallback version for non-existent file', () => {
      const version = sarif.getPackageVersion('./nonexistent.json');
      expect(version).toBe('0.0.0');
    });
  });

  describe('convertToSarif with package version', () => {
    it('should use version from package.json', () => {
      const results: URL.results[] = [
        {
          parentURL: 'https://example.com',
          url: 'https://example.com/page',
          status: '200',
          statusMsg: 'OK',
          elem: 'a',
          anchored: false
        }
      ];

      const sarifLog = sarif.convertToSarif(results, './package.json');
      const toolVersion = sarifLog.runs[0].tool.driver.version;

      expect(toolVersion).toBe(getVersionFromPackage());
    });
  });

  describe('SARIF with line numbers', () => {
    it('should include region with line numbers when provided', () => {
      const result: URL.results = {
        parentURL: 'https://example.com',
        url: 'https://example.com/page',
        status: '200',
        statusMsg: 'OK',
        elem: 'a',
        anchored: false,
        line: 42,
        column: 10
      };

      const sarifResult = sarif.convertToSarifResult(result);

      expect(sarifResult.locations?.[0].physicalLocation?.region).toBeDefined();
      expect(
        sarifResult.locations?.[0].physicalLocation?.region?.startLine
      ).toBe(42);
      expect(
        sarifResult.locations?.[0].physicalLocation?.region?.startColumn
      ).toBe(10);
    });

    it('should not include region when line numbers are not provided', () => {
      const result: URL.results = {
        parentURL: 'https://example.com',
        url: 'https://example.com/page',
        status: '200',
        statusMsg: 'OK',
        elem: 'a',
        anchored: false
      };

      const sarifResult = sarif.convertToSarifResult(result);

      expect(
        sarifResult.locations?.[0].physicalLocation?.region
      ).toBeUndefined();
    });

    it('should include line/column in properties', () => {
      const result: URL.results = {
        parentURL: 'https://example.com',
        url: 'https://example.com/page',
        status: '200',
        statusMsg: 'OK',
        elem: 'a',
        anchored: false,
        line: 15,
        column: 5
      };

      const sarifResult = sarif.convertToSarifResult(result);

      expect(sarifResult.properties?.line).toBe(15);
      expect(sarifResult.properties?.column).toBe(5);
    });
  });
});
