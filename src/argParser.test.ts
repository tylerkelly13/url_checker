import { describe, expect, vi, beforeEach, afterEach, it } from 'vitest';
import fc from 'fast-check';
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
    it('should parse required URL option correctly', () => {
      fc.assert(fc.property(fc.webUrl(), (url) => {
        const args = ['node', 'script.js', '-u', url];
        const result = argparse(args);

        expect(result).toHaveProperty('url');
        expect(result.url).toBe(url);
      }));
    });

    it('should parse URL and selector options', () => {
      fc.assert(fc.property(
        fc.webUrl(),
        fc
          .string()
          .filter((s) => s.length > 0 && !s.startsWith('-') && !/\s/.test(s)),
        (url, selector) => {
          const args = ['node', 'script.js', '-u', url, '-s', selector];
          const result = argparse(args);

          expect(result.url).toBe(url);
          expect(result.selector).toBe(selector);
        }
      ));
    });

    it('should parse URL and output file options', () => {
      fc.assert(fc.property(
        fc.webUrl(),
        fc
          .string()
          .filter((s) => s.length > 0 && !s.startsWith('-') && !/\s/.test(s)),
        (url, outputFile) => {
          const args = ['node', 'script.js', '-u', url, '-o', outputFile];
          const result = argparse(args);

          expect(result.url).toBe(url);
          expect(result.output).toBe(outputFile);
        }
      ));
    });

    it('should parse URL and format options', () => {
      fc.assert(fc.property(fc.webUrl(), fc.constantFrom('csv', 'json', 'yaml'), (url, format) => {
        const args = ['node', 'script.js', '-u', url, '-f', format];
        const result = argparse(args);

        expect(result.url).toBe(url);
        expect(result.format).toBe(format);
      }));
    });

    it('should parse all options together', () => {
      fc.assert(fc.property(
        fc.webUrl(),
        fc
          .string()
          .filter((s) => s.length > 0 && !s.startsWith('-') && !/\s/.test(s)),
        fc
          .string()
          .filter((s) => s.length > 0 && !s.startsWith('-') && !/\s/.test(s)),
        fc.constantFrom('csv', 'json', 'yaml'),
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
      ));
    });

    it('should use default output file when not provided', () => {
      fc.assert(fc.property(fc.webUrl(), (url) => {
        const args = ['node', 'script.js', '-u', url];
        const result = argparse(args);

        expect(result.output).toBe('url_checker_results.csv');
      }));
    });

    it('should use default format when not provided', () => {
      fc.assert(fc.property(fc.webUrl(), (url) => {
        const args = ['node', 'script.js', '-u', url];
        const result = argparse(args);

        expect(result.format).toBe('csv');
      }));
    });

    it('should accept long option names', () => {
      fc.assert(fc.property(fc.webUrl(), (url) => {
        const args = ['node', 'script.js', '--url', url];
        const result = argparse(args);

        expect(result.url).toBe(url);
      }));
    });

    it('should accept mixed short and long option names', () => {
      fc.assert(fc.property(
        fc.webUrl(),
        fc
          .string()
          .filter((s) => s.length > 0 && !s.startsWith('-') && !/\s/.test(s)),
        (url, selector) => {
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
        }
      ));
    });
  });

  describe('--internal flag', () => {
    it('should default to false when --internal flag is not provided', () => {
      fc.assert(fc.property(fc.webUrl(), (url) => {
        const args = ['node', 'script.js', '-u', url];
        const result = argparse(args);

        expect(result.internal).toBe(false);
      }));
    });

    it('should be true when --internal flag is provided', () => {
      fc.assert(fc.property(fc.webUrl(), (url) => {
        const args = ['node', 'script.js', '-u', url, '--internal'];
        const result = argparse(args);

        expect(result.internal).toBe(true);
      }));
    });

    it('should be true when -i short flag is provided', () => {
      fc.assert(fc.property(fc.webUrl(), (url) => {
        const args = ['node', 'script.js', '-u', url, '-i'];
        const result = argparse(args);

        expect(result.internal).toBe(true);
      }));
    });
  });

  describe('Result interface properties', () => {
    it('should always return object with all required properties', () => {
      fc.assert(fc.property(fc.webUrl(), (url) => {
        const args = ['node', 'script.js', '-u', url];
        const result = argparse(args);

        expect(result).toHaveProperty('url');
        expect(result).toHaveProperty('selector');
        expect(result).toHaveProperty('output');
        expect(result).toHaveProperty('format');
        expect(result).toHaveProperty('internal');
      }));
    });

    it('should return all properties as strings', () => {
      fc.assert(fc.property(fc.webUrl(), (url) => {
        const args = ['node', 'script.js', '-u', url];
        const result = argparse(args);

        expect(typeof result.url).toBe('string');
        expect(typeof result.format).toBe('string');
        expect(typeof result.output).toBe('string');
      }));
    });
  });
});
