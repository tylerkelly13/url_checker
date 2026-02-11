import { describe, expect, vi, beforeEach, afterEach } from 'vitest';
import { fc, test } from '@fast-check/vitest';
import { argparse } from './argParser';

describe('argParser module - property-based tests', () => {
  let consoleErrorSpy: any;
  let processExitSpy: any;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('argparse function', () => {
    test.prop([fc.webUrl()])(
      'should parse required URL option correctly',
      (url) => {
        const args = ['node', 'script.js', '-u', url];
        const result = argparse(args);

        expect(result).toHaveProperty('url');
        expect(result.url).toBe(url);
      }
    );

    test.prop([
      fc.webUrl(),
      fc
        .string()
        .filter((s) => s.length > 0 && !s.startsWith('-') && !/\s/.test(s))
    ])('should parse URL and selector options', (url, selector) => {
      const args = ['node', 'script.js', '-u', url, '-s', selector];
      const result = argparse(args);

      expect(result.url).toBe(url);
      expect(result.selector).toBe(selector);
    });

    test.prop([
      fc.webUrl(),
      fc
        .string()
        .filter((s) => s.length > 0 && !s.startsWith('-') && !/\s/.test(s))
    ])('should parse URL and output file options', (url, outputFile) => {
      const args = ['node', 'script.js', '-u', url, '-o', outputFile];
      const result = argparse(args);

      expect(result.url).toBe(url);
      expect(result.output).toBe(outputFile);
    });

    test.prop([fc.webUrl(), fc.constantFrom('csv', 'json', 'yaml')])(
      'should parse URL and format options',
      (url, format) => {
        const args = ['node', 'script.js', '-u', url, '-f', format];
        const result = argparse(args);

        expect(result.url).toBe(url);
        expect(result.format).toBe(format);
      }
    );

    test.prop([
      fc.webUrl(),
      fc
        .string()
        .filter((s) => s.length > 0 && !s.startsWith('-') && !/\s/.test(s)),
      fc
        .string()
        .filter((s) => s.length > 0 && !s.startsWith('-') && !/\s/.test(s)),
      fc.constantFrom('csv', 'json', 'yaml')
    ])(
      'should parse all options together',
      (url, selector, outputFile, format) => {
        const args = [
          'node',
          'script.js',
          '-u',
          url,
          '-s',
          selector,
          '-o',
          outputFile,
          '-f',
          format
        ];
        const result = argparse(args);

        expect(result.url).toBe(url);
        expect(result.selector).toBe(selector);
        expect(result.output).toBe(outputFile);
        expect(result.format).toBe(format);
      }
    );

    test.prop([fc.webUrl()])(
      'should use default output file when not provided',
      (url) => {
        const args = ['node', 'script.js', '-u', url];
        const result = argparse(args);

        expect(result.output).toBe('url_checker_results.csv');
      }
    );

    test.prop([fc.webUrl()])(
      'should use default format when not provided',
      (url) => {
        const args = ['node', 'script.js', '-u', url];
        const result = argparse(args);

        expect(result.format).toBe('csv');
      }
    );

    test.prop([fc.webUrl()])('should accept long option names', (url) => {
      const args = ['node', 'script.js', '--url', url];
      const result = argparse(args);

      expect(result.url).toBe(url);
    });

    test.prop([
      fc.webUrl(),
      fc
        .string()
        .filter((s) => s.length > 0 && !s.startsWith('-') && !/\s/.test(s))
    ])('should accept mixed short and long option names', (url, selector) => {
      const args = [
        'node',
        'script.js',
        '--url',
        url,
        '-s',
        selector,
        '--output',
        'test.csv',
        '-f',
        'csv'
      ];
      const result = argparse(args);

      expect(result.url).toBe(url);
      expect(result.selector).toBe(selector);
      expect(result.output).toBe('test.csv');
      expect(result.format).toBe('csv');
    });
  });

  describe('--internal flag', () => {
    test.prop([fc.webUrl()])(
      'should default to false when --internal flag is not provided',
      (url) => {
        const args = ['node', 'script.js', '-u', url];
        const result = argparse(args);

        expect(result.internal).toBe(false);
      }
    );

    test.prop([fc.webUrl()])(
      'should be true when --internal flag is provided',
      (url) => {
        const args = ['node', 'script.js', '-u', url, '--internal'];
        const result = argparse(args);

        expect(result.internal).toBe(true);
      }
    );

    test.prop([fc.webUrl()])(
      'should be true when -i short flag is provided',
      (url) => {
        const args = ['node', 'script.js', '-u', url, '-i'];
        const result = argparse(args);

        expect(result.internal).toBe(true);
      }
    );
  });

  describe('Result interface properties', () => {
    test.prop([fc.webUrl()])(
      'should always return object with all required properties',
      (url) => {
        const args = ['node', 'script.js', '-u', url];
        const result = argparse(args);

        expect(result).toHaveProperty('url');
        expect(result).toHaveProperty('selector');
        expect(result).toHaveProperty('output');
        expect(result).toHaveProperty('format');
        expect(result).toHaveProperty('internal');
      }
    );

    test.prop([fc.webUrl()])(
      'should return all properties as strings',
      (url) => {
        const args = ['node', 'script.js', '-u', url];
        const result = argparse(args);

        expect(typeof result.url).toBe('string');
        expect(typeof result.format).toBe('string');
        expect(typeof result.output).toBe('string');
      }
    );
  });
});
