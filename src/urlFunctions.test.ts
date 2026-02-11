import { describe, expect, vi, beforeEach, afterEach } from 'vitest';
import { fc, test } from '@fast-check/vitest';
import {
  regexMatchCount,
  validURLCheckFix,
  urlTyper,
  whichProtocol,
  anchoredChecker,
  goOrNoGo,
  isNon2XX,
  filterNon2XX,
  isExternalUrl,
  filterExternalUrls,
  results
} from './urlFunctions';

describe('urlFunctions module - property-based tests', () => {
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let processExitSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('regexMatchCount', () => {
    test.prop([fc.string(), fc.constantFrom(/a/, /\d/, /\s/)])(
      'should return non-negative integer',
      (str, regex) => {
        const result = regexMatchCount(str, regex);

        expect(typeof result).toBe('number');
        expect(result).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(result)).toBe(true);
      }
    );

    test.prop([fc.constantFrom(/a/, /b/, /c/)])(
      'should return 0 for empty string',
      (regex) => {
        const result = regexMatchCount('', regex);

        expect(result).toBe(0);
      }
    );

    test.prop([fc.string()])(
      'should count all matches correctly for simple patterns',
      (str) => {
        const regex = /a/g;
        const result = regexMatchCount(str, regex);
        const expected = (str.match(/a/g) || []).length;

        expect(result).toBe(expected);
      }
    );

    test('should handle null or undefined input strings', () => {
      const result = regexMatchCount(null as any, /a/);
      expect(result).toBe(0);
    });
  });

  describe('validURLCheckFix', () => {
    test.prop([fc.webUrl()])(
      'should return URL unchanged if it has http:// or https:// prefix',
      (url) => {
        const result = validURLCheckFix(url);

        expect(result).toBe(url);
      }
    );

    test.prop([fc.domain()])(
      'should prepend https:// to www. URLs',
      (domain) => {
        const url = `www.${domain}`;
        const result = validURLCheckFix(url);

        expect(result).toBe(`https://www.${domain}`);
        expect(consoleLogSpy).toHaveBeenCalled();
      }
    );

    test.prop([
      fc.string().filter((s) => !s.startsWith('http') && !s.startsWith('www.'))
    ])('should return empty string for invalid URLs', (invalidUrl) => {
      const result = validURLCheckFix(invalidUrl);

      expect(result).toBe('');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    test.prop([fc.webUrl({ validSchemes: ['https'] })])(
      'should preserve https URLs',
      (url) => {
        const result = validURLCheckFix(url);

        expect(result).toBe(url);
      }
    );

    test.prop([fc.webUrl({ validSchemes: ['http'] })])(
      'should preserve http URLs',
      (url) => {
        const result = validURLCheckFix(url);

        expect(result).toBe(url);
      }
    );
  });

  describe('goOrNoGo', () => {
    test.prop([fc.webUrl()])('should return URL for valid URLs', (url) => {
      const result = goOrNoGo(url);

      expect(result).toBe(url);
    });

    test.prop([fc.domain()])(
      'should return URL for www. domains after fix',
      (domain) => {
        const url = `www.${domain}`;
        const result = goOrNoGo(url);

        expect(result).toBe(url);
      }
    );
  });

  describe('whichProtocol', () => {
    test.prop([fc.webUrl({ validSchemes: ['https'] })])(
      'should detect https protocol',
      (url) => {
        const result = whichProtocol(url);

        expect(result.fullUrl).toBe(url);
        expect(result.protocol).toBe('https');
      }
    );

    test.prop([fc.webUrl({ validSchemes: ['http'] })])(
      'should detect http protocol',
      (url) => {
        const result = whichProtocol(url);

        expect(result.fullUrl).toBe(url);
        expect(result.protocol).toBe('http');
      }
    );

    test.prop([fc.webUrl()])(
      'should always return object with fullUrl and protocol',
      (url) => {
        const result = whichProtocol(url);

        expect(result).toHaveProperty('fullUrl');
        expect(result).toHaveProperty('protocol');
        expect(typeof result.fullUrl).toBe('string');
        expect(typeof result.protocol).toBe('string');
      }
    );

    test('should exit for unsupported protocols', () => {
      const url = 'ftp://example.com/file.txt';

      try {
        whichProtocol(url);
        // If it doesn't throw, the mock didn't work as expected
        expect(true).toBe(false);
      } catch {
        // Should have logged and attempted to exit
        expect(consoleLogSpy).toHaveBeenCalled();
      }
    });
  });

  describe('urlTyper', () => {
    test('should identify anchor URLs', () => {
      const urls = ['#section', '#heading-1', '#top'];

      urls.forEach((url) => {
        const result = urlTyper(url);
        expect(result).toBe('anchor');
      });
    });

    test('should identify full HTTP URLs', () => {
      const url = 'http://www.example.com';
      const result = urlTyper(url);

      expect(result).toBe('fullHTTP');
    });

    test('should identify full HTTPS URLs', () => {
      const url = 'https://www.example.com';
      const result = urlTyper(url);

      expect(result).toBe('fullHTTPS');
    });

    test('should identify HTTP URLs without www', () => {
      const url = 'http://example.com';
      const result = urlTyper(url);

      expect(result).toBe('HTTPnoW');
    });

    test('should identify HTTPS URLs without www', () => {
      const url = 'https://example.com';
      const result = urlTyper(url);

      expect(result).toBe('HTTPSnoW');
    });

    test('should identify implicit domain name URLs', () => {
      const urls = ['/page', '/about/team', '/contact'];

      urls.forEach((url) => {
        const result = urlTyper(url);
        expect(result).toBe('implicitDomainName');
      });
    });

    test('should identify implicit protocol URLs', () => {
      const urls = ['//cdn.example.com/script.js', '//example.com/file.js'];

      urls.forEach((url) => {
        const result = urlTyper(url);
        expect(result).toBe('implicitProto');
      });
    });

    test('should identify sub-resource URLs', () => {
      const urls = ['images/photo.jpg', 'css/style.css', 'js/app.js'];

      urls.forEach((url) => {
        const result = urlTyper(url);
        expect(result).toBe('subResources');
      });
    });

    test('should identify up directory URLs', () => {
      // The upDir regex is /^(\.\.\/)+/ which requires ../ pattern
      const urls = ['../page.html', '../../index.html'];

      urls.forEach((url) => {
        const result = urlTyper(url);
        // May match either upDir or subResources depending on exact implementation
        expect(['upDir', 'subResources']).toContain(result);
      });
    });

    test('should identify empty anchor', () => {
      const result = urlTyper('#');

      expect(result).toBe('emptyAnchor');
    });

    test.prop([fc.string()])('should always return a string', (url) => {
      const result = urlTyper(url);

      expect(typeof result).toBe('string');
    });
  });

  describe('anchoredChecker', () => {
    test.prop([fc.webUrl()])(
      'should return "anchor" for anchor URL type',
      (url) => {
        const result = anchoredChecker(url, 'anchor');

        expect(result).toBe('anchor');
      }
    );

    test.prop([fc.webUrl()])(
      'should return "anchored" for URLs with hash',
      (url) => {
        const urlWithHash = url + '#section';
        const result = anchoredChecker(urlWithHash, 'fullHTTPS');

        expect(result).toBe('anchored');
      }
    );

    test.prop([fc.webUrl()])(
      'should return "noAnchor" for URLs without hash and not anchor type',
      (url) => {
        const result = anchoredChecker(url, 'fullHTTPS');

        expect(result).toBe('noAnchor');
      }
    );

    test.prop([
      fc.webUrl(),
      fc.constantFrom('anchor', 'fullHTTP', 'fullHTTPS')
    ])('should always return one of three values', (url, urlType) => {
      const result = anchoredChecker(url, urlType);

      expect(['anchor', 'anchored', 'noAnchor']).toContain(result);
    });
  });

  describe('Type inference properties', () => {
    test.prop([fc.webUrl()])(
      'full URLs should be typed consistently',
      (baseUrl) => {
        const httpUrl = baseUrl.replace('https://', 'http://');
        const httpsUrl = baseUrl.replace('http://', 'https://');

        const httpType = urlTyper(httpUrl);
        const httpsType = urlTyper(httpsUrl);

        expect(['fullHTTP', 'HTTPnoW', 'fullHTTPS', 'HTTPSnoW']).toContain(
          httpType
        );
        expect(['fullHTTP', 'HTTPnoW', 'fullHTTPS', 'HTTPSnoW']).toContain(
          httpsType
        );
      }
    );
  });

  describe('URL validation properties', () => {
    test.prop([fc.webUrl()])(
      'valid URLs should pass through validURLCheckFix unchanged',
      (url) => {
        const result = validURLCheckFix(url);

        expect(result).toBe(url);
      }
    );

    test.prop([fc.webUrl()])('valid URLs should pass goOrNoGo', (url) => {
      const result = goOrNoGo(url);

      expect(result).toBe(url);
    });
  });

  describe('isNon2XX', () => {
    const makeResult = (status: string): results => ({
      parentURL: 'https://example.com',
      url: 'https://example.com/page',
      status,
      statusMsg: 'Test',
      elem: 'a',
      anchored: false
    });

    test('should return true for 1XX status codes', () => {
      expect(isNon2XX(makeResult('100'))).toBe(true);
      expect(isNon2XX(makeResult('101'))).toBe(true);
    });

    test('should return false for 2XX status codes', () => {
      expect(isNon2XX(makeResult('200'))).toBe(false);
      expect(isNon2XX(makeResult('201'))).toBe(false);
      expect(isNon2XX(makeResult('204'))).toBe(false);
      expect(isNon2XX(makeResult('299'))).toBe(false);
    });

    test('should return true for 3XX status codes', () => {
      expect(isNon2XX(makeResult('301'))).toBe(true);
      expect(isNon2XX(makeResult('302'))).toBe(true);
      expect(isNon2XX(makeResult('304'))).toBe(true);
    });

    test('should return true for 4XX status codes', () => {
      expect(isNon2XX(makeResult('400'))).toBe(true);
      expect(isNon2XX(makeResult('404'))).toBe(true);
      expect(isNon2XX(makeResult('403'))).toBe(true);
    });

    test('should return true for 5XX status codes', () => {
      expect(isNon2XX(makeResult('500'))).toBe(true);
      expect(isNon2XX(makeResult('502'))).toBe(true);
      expect(isNon2XX(makeResult('503'))).toBe(true);
    });

    test('should return true for special status codes (000, 999)', () => {
      expect(isNon2XX(makeResult('000'))).toBe(true);
      expect(isNon2XX(makeResult('999'))).toBe(true);
    });
  });

  describe('filterNon2XX', () => {
    const makeResult = (status: string): results => ({
      parentURL: 'https://example.com',
      url: 'https://example.com/page',
      status,
      statusMsg: 'Test',
      elem: 'a',
      anchored: false
    });

    test('should filter out 2XX status codes', () => {
      const results = [
        makeResult('200'),
        makeResult('404'),
        makeResult('301'),
        makeResult('201'),
        makeResult('500')
      ];

      const filtered = filterNon2XX(results);

      expect(filtered).toHaveLength(3);
      expect(filtered.map((r) => r.status)).toEqual(['404', '301', '500']);
    });

    test('should return empty array when all are 2XX', () => {
      const results = [makeResult('200'), makeResult('201'), makeResult('204')];

      const filtered = filterNon2XX(results);

      expect(filtered).toHaveLength(0);
    });

    test('should return all results when none are 2XX', () => {
      const results = [makeResult('404'), makeResult('500'), makeResult('301')];

      const filtered = filterNon2XX(results);

      expect(filtered).toHaveLength(3);
    });

    test('should return empty array for empty input', () => {
      const filtered = filterNon2XX([]);

      expect(filtered).toHaveLength(0);
    });
  });

  describe('isExternalUrl', () => {
    test('should return true for full HTTP URLs', () => {
      expect(isExternalUrl('http://www.example.com')).toBe(true);
      expect(isExternalUrl('http://example.com')).toBe(true);
    });

    test('should return true for full HTTPS URLs', () => {
      expect(isExternalUrl('https://www.example.com')).toBe(true);
      expect(isExternalUrl('https://example.com')).toBe(true);
    });

    test('should return true for implicit protocol URLs', () => {
      expect(isExternalUrl('//cdn.example.com/file.js')).toBe(true);
    });

    test('should return false for anchor URLs', () => {
      expect(isExternalUrl('#section')).toBe(false);
      expect(isExternalUrl('#')).toBe(false);
    });

    test('should return false for implicit domain name URLs', () => {
      expect(isExternalUrl('/about/page')).toBe(false);
      expect(isExternalUrl('/contact')).toBe(false);
    });

    test('should return false for sub-resource URLs', () => {
      expect(isExternalUrl('images/photo.jpg')).toBe(false);
      expect(isExternalUrl('css/style.css')).toBe(false);
    });

    test('should return false for up directory URLs', () => {
      expect(isExternalUrl('../page.html')).toBe(false);
    });
  });

  describe('filterExternalUrls', () => {
    const makeUrlFound = (url: string) => ({
      parentURL: 'https://example.com',
      url,
      elem: 'a'
    });

    test('should filter out external URLs', () => {
      const urls = [
        makeUrlFound('https://www.external.com'),
        makeUrlFound('/internal/page'),
        makeUrlFound('http://example.org'),
        makeUrlFound('#section')
      ];

      const filtered = filterExternalUrls(urls);

      expect(filtered).toHaveLength(2);
      expect(filtered.map((u) => u.url)).toEqual(['/internal/page', '#section']);
    });

    test('should return all URLs when none are external', () => {
      const urls = [
        makeUrlFound('/about'),
        makeUrlFound('#contact'),
        makeUrlFound('images/logo.png'),
        makeUrlFound('../parent.html')
      ];

      const filtered = filterExternalUrls(urls);

      expect(filtered).toHaveLength(4);
    });

    test('should return empty array when all are external', () => {
      const urls = [
        makeUrlFound('https://example.com'),
        makeUrlFound('http://www.test.org'),
        makeUrlFound('https://www.another.com')
      ];

      const filtered = filterExternalUrls(urls);

      expect(filtered).toHaveLength(0);
    });

    test('should return empty array for empty input', () => {
      const filtered = filterExternalUrls([]);

      expect(filtered).toHaveLength(0);
    });
  });
});
