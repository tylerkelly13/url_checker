import { describe, expect, vi, beforeEach, afterEach, it } from 'vitest';
import fc from 'fast-check';
import { urlChecker } from './urlChecker';
import * as URL from './urlFunctions';
import * as pageFun from './contentFunctions';
import * as http from './http';

describe('urlChecker module - property-based tests', () => {
  let consoleLogSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    vi.restoreAllMocks();
  });

  describe('urlChecker function', () => {
    it('should return an array of results for valid URLs', async () => {
      await fc.assert(fc.asyncProperty(fc.webUrl({ validSchemes: ['http', 'https'] }), async (url) => {
        // Mock the dependencies
        vi.spyOn(URL, 'goOrNoGo').mockReturnValue(url);
        vi.spyOn(URL, 'whichProtocol').mockReturnValue({
          fullUrl: url,
          protocol: 'https'
        });

        const mockContent =
          '<html><body><a href="https://example.com">Link</a></body></html>';
        vi.spyOn(http, 'getContent').mockResolvedValue({
          content: mockContent,
          url: url
        });

        vi.spyOn(pageFun, 'selectContent').mockReturnValue({
          content: {} as any,
          parentURL: url
        });

        vi.spyOn(pageFun, 'getUrls').mockReturnValue([
          { url: 'https://example.com', parentURL: url, elem: 'a' }
        ]);

        const mockResult: URL.results = {
          parentURL: url,
          url: 'https://example.com',
          status: '200',
          statusMsg: 'OK',
          elem: 'a',
          anchored: false
        };

        vi.spyOn(URL, 'checkAndReturn').mockResolvedValue(mockResult);

        const result = await urlChecker(url);

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
      }));
    });

    it('should pass selector to selectContent when provided', async () => {
      await fc.assert(fc.asyncProperty(fc.webUrl({ validSchemes: ['http', 'https'] }), fc.string(), async (url, selector) => {
        vi.spyOn(URL, 'goOrNoGo').mockReturnValue(url);
        vi.spyOn(URL, 'whichProtocol').mockReturnValue({
          fullUrl: url,
          protocol: 'https'
        });

        vi.spyOn(http, 'getContent').mockResolvedValue({
          content: '<html><body></body></html>',
          url: url
        });

        const selectContentSpy = vi
          .spyOn(pageFun, 'selectContent')
          .mockReturnValue({
            content: {} as any,
            parentURL: url
          });

        vi.spyOn(pageFun, 'getUrls').mockReturnValue([]);

        await urlChecker(url, selector);

        expect(selectContentSpy).toHaveBeenCalledWith(
          expect.objectContaining({ parentURL: url }),
          selector
        );
      }));
    });

    it('should call goOrNoGo to validate URL', async () => {
      await fc.assert(fc.asyncProperty(fc.webUrl({ validSchemes: ['http', 'https'] }), async (url) => {
        const goOrNoGoSpy = vi.spyOn(URL, 'goOrNoGo').mockReturnValue(url);
        vi.spyOn(URL, 'whichProtocol').mockReturnValue({
          fullUrl: url,
          protocol: 'https'
        });

        vi.spyOn(http, 'getContent').mockResolvedValue({
          content: '<html><body></body></html>',
          url: url
        });

        vi.spyOn(pageFun, 'selectContent').mockReturnValue({
          content: {} as any,
          parentURL: url
        });

        vi.spyOn(pageFun, 'getUrls').mockReturnValue([]);

        await urlChecker(url);

        expect(goOrNoGoSpy).toHaveBeenCalledWith(url);
      }));
    });

    it('should call whichProtocol to determine protocol', async () => {
      await fc.assert(fc.asyncProperty(fc.webUrl({ validSchemes: ['http', 'https'] }), async (url) => {
        vi.spyOn(URL, 'goOrNoGo').mockReturnValue(url);
        const whichProtocolSpy = vi
          .spyOn(URL, 'whichProtocol')
          .mockReturnValue({
            fullUrl: url,
            protocol: 'https'
          });

        vi.spyOn(http, 'getContent').mockResolvedValue({
          content: '<html><body></body></html>',
          url: url
        });

        vi.spyOn(pageFun, 'selectContent').mockReturnValue({
          content: {} as any,
          parentURL: url
        });

        vi.spyOn(pageFun, 'getUrls').mockReturnValue([]);

        await urlChecker(url);

        expect(whichProtocolSpy).toHaveBeenCalledWith(url);
      }));
    });

    it('should fetch content using getContent', async () => {
      await fc.assert(fc.asyncProperty(fc.webUrl({ validSchemes: ['http', 'https'] }), async (url) => {
        vi.spyOn(URL, 'goOrNoGo').mockReturnValue(url);
        vi.spyOn(URL, 'whichProtocol').mockReturnValue({
          fullUrl: url,
          protocol: 'https'
        });

        const getContentSpy = vi.spyOn(http, 'getContent').mockResolvedValue({
          content: '<html><body></body></html>',
          url: url
        });

        vi.spyOn(pageFun, 'selectContent').mockReturnValue({
          content: {} as any,
          parentURL: url
        });

        vi.spyOn(pageFun, 'getUrls').mockReturnValue([]);

        await urlChecker(url);

        expect(getContentSpy).toHaveBeenCalledWith(url);
      }));
    });

    it('should extract URLs from content using getUrls', async () => {
      await fc.assert(fc.asyncProperty(fc.webUrl({ validSchemes: ['http', 'https'] }), async (url) => {
        vi.spyOn(URL, 'goOrNoGo').mockReturnValue(url);
        vi.spyOn(URL, 'whichProtocol').mockReturnValue({
          fullUrl: url,
          protocol: 'https'
        });

        vi.spyOn(http, 'getContent').mockResolvedValue({
          content: '<html><body></body></html>',
          url: url
        });

        const mockContent = { content: {} as any, parentURL: url };
        vi.spyOn(pageFun, 'selectContent').mockReturnValue(mockContent);

        const getUrlsSpy = vi.spyOn(pageFun, 'getUrls').mockReturnValue([]);

        await urlChecker(url);

        expect(getUrlsSpy).toHaveBeenCalledWith(mockContent);
      }));
    });

    it('should call checkAndReturn for each URL found', async () => {
      await fc.assert(fc.asyncProperty(
        fc.webUrl({ validSchemes: ['http', 'https'] }),
        fc.array(fc.webUrl(), { minLength: 1, maxLength: 5 }),
        async (parentUrl, foundUrls) => {
          // Clear all mocks before this test run
          vi.clearAllMocks();

          vi.spyOn(URL, 'goOrNoGo').mockReturnValue(parentUrl);
          vi.spyOn(URL, 'whichProtocol').mockReturnValue({
            fullUrl: parentUrl,
            protocol: 'https'
          });

          vi.spyOn(http, 'getContent').mockResolvedValue({
            content: '<html><body></body></html>',
            url: parentUrl
          });

          const mockContent = { content: {} as any, parentURL: parentUrl };
          vi.spyOn(pageFun, 'selectContent').mockReturnValue(mockContent);

          const mockUrlsFound = foundUrls.map((url) => ({
            url,
            parentURL: parentUrl,
            elem: 'a'
          }));
          vi.spyOn(pageFun, 'getUrls').mockReturnValue(mockUrlsFound);

          const checkAndReturnSpy = vi
            .spyOn(URL, 'checkAndReturn')
            .mockImplementation(async (urlFound) => ({
              parentURL: parentUrl,
              url: urlFound.url,
              status: '200',
              statusMsg: 'OK',
              elem: 'a',
              anchored: false
            }));

          await urlChecker(parentUrl);

          expect(checkAndReturnSpy).toHaveBeenCalledTimes(foundUrls.length);
          mockUrlsFound.forEach((urlFound) => {
            expect(checkAndReturnSpy).toHaveBeenCalledWith(urlFound, mockContent);
          });
        }
      ));
    });

    it('should return empty array when no URLs found in content', async () => {
      await fc.assert(fc.asyncProperty(fc.webUrl({ validSchemes: ['http', 'https'] }), async (url) => {
        vi.spyOn(URL, 'goOrNoGo').mockReturnValue(url);
        vi.spyOn(URL, 'whichProtocol').mockReturnValue({
          fullUrl: url,
          protocol: 'https'
        });

        vi.spyOn(http, 'getContent').mockResolvedValue({
          content: '<html><body><p>No links here</p></body></html>',
          url: url
        });

        vi.spyOn(pageFun, 'selectContent').mockReturnValue({
          content: {} as any,
          parentURL: url
        });

        vi.spyOn(pageFun, 'getUrls').mockReturnValue([]);

        const result = await urlChecker(url);

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(0);
      }));
    });
  });

  describe('Integration properties', () => {
    it('should handle the full pipeline: validate -> fetch -> select -> extract -> check', async () => {
      await fc.assert(fc.asyncProperty(fc.webUrl({ validSchemes: ['http', 'https'] }), async (url) => {
        const goOrNoGoSpy = vi.spyOn(URL, 'goOrNoGo').mockReturnValue(url);
        const whichProtocolSpy = vi
          .spyOn(URL, 'whichProtocol')
          .mockReturnValue({
            fullUrl: url,
            protocol: 'https'
          });
        const getContentSpy = vi.spyOn(http, 'getContent').mockResolvedValue({
          content:
            '<html><body><a href="https://example.com">Link</a></body></html>',
          url: url
        });
        const selectContentSpy = vi
          .spyOn(pageFun, 'selectContent')
          .mockReturnValue({
            content: {} as any,
            parentURL: url
          });
        const getUrlsSpy = vi
          .spyOn(pageFun, 'getUrls')
          .mockReturnValue([
            { url: 'https://example.com', parentURL: url, elem: 'a' }
          ]);
        const checkAndReturnSpy = vi
          .spyOn(URL, 'checkAndReturn')
          .mockResolvedValue({
            parentURL: url,
            url: 'https://example.com',
            status: '200',
            statusMsg: 'OK',
            elem: 'a',
            anchored: false
          });

        await urlChecker(url);

        // Verify the pipeline was executed in correct order
        const callOrder = [
          goOrNoGoSpy.mock.invocationCallOrder[0],
          whichProtocolSpy.mock.invocationCallOrder[0],
          getContentSpy.mock.invocationCallOrder[0],
          selectContentSpy.mock.invocationCallOrder[0],
          getUrlsSpy.mock.invocationCallOrder[0],
          checkAndReturnSpy.mock.invocationCallOrder[0]
        ];

        for (let i = 1; i < callOrder.length; i++) {
          expect(callOrder[i]).toBeGreaterThan(callOrder[i - 1]);
        }
      }));
    });

    it('should preserve parent URL throughout the processing chain', async () => {
      await fc.assert(fc.asyncProperty(fc.webUrl({ validSchemes: ['http', 'https'] }), async (url) => {
        vi.spyOn(URL, 'goOrNoGo').mockReturnValue(url);
        vi.spyOn(URL, 'whichProtocol').mockReturnValue({
          fullUrl: url,
          protocol: 'https'
        });

        vi.spyOn(http, 'getContent').mockResolvedValue({
          content: '<html><body></body></html>',
          url: url
        });

        const mockContent = {
          content: {} as any,
          parentURL: url
        };

        const selectContentSpy = vi
          .spyOn(pageFun, 'selectContent')
          .mockReturnValue(mockContent);

        const mockUrlFound = {
          url: 'https://example.com',
          parentURL: url,
          elem: 'a'
        };
        vi.spyOn(pageFun, 'getUrls').mockReturnValue([mockUrlFound]);

        const checkAndReturnSpy = vi
          .spyOn(URL, 'checkAndReturn')
          .mockResolvedValue({
            parentURL: url,
            url: 'https://example.com',
            status: '200',
            statusMsg: 'OK',
            elem: 'a',
            anchored: false
          });

        const result = await urlChecker(url);

        // Verify URL was passed through the chain
        expect(selectContentSpy).toHaveBeenCalledWith(
          expect.objectContaining({ parentURL: url }),
          undefined
        );
        expect(checkAndReturnSpy).toHaveBeenCalledWith(
          mockUrlFound,
          mockContent
        );

        // Verify result contains parent URL
        result.forEach((res) => {
          expect(res.parentURL).toBe(url);
        });
      }));
    });

    it('should always return results with proper structure', async () => {
      await fc.assert(fc.asyncProperty(fc.webUrl({ validSchemes: ['http', 'https'] }), async (url) => {
        vi.spyOn(URL, 'goOrNoGo').mockReturnValue(url);
        vi.spyOn(URL, 'whichProtocol').mockReturnValue({
          fullUrl: url,
          protocol: 'https'
        });

        vi.spyOn(http, 'getContent').mockResolvedValue({
          content:
            '<html><body><a href="https://example.com">Link</a></body></html>',
          url: url
        });

        vi.spyOn(pageFun, 'selectContent').mockReturnValue({
          content: {} as any,
          parentURL: url
        });

        vi.spyOn(pageFun, 'getUrls').mockReturnValue([
          { url: 'https://example.com', parentURL: url, elem: 'a' }
        ]);

        vi.spyOn(URL, 'checkAndReturn').mockResolvedValue({
          parentURL: url,
          url: 'https://example.com',
          status: '200',
          statusMsg: 'OK',
          elem: 'a',
          anchored: false
        });

        const result = await urlChecker(url);

        expect(Array.isArray(result)).toBe(true);
        result.forEach((res) => {
          expect(res).toHaveProperty('parentURL');
          expect(res).toHaveProperty('url');
          expect(res).toHaveProperty('status');
          expect(res).toHaveProperty('statusMsg');
          expect(res).toHaveProperty('elem');
          expect(res).toHaveProperty('anchored');
        });
      }));
    });
  });

  describe('Error handling properties', () => {
    it('should handle getContent failures gracefully', async () => {
      await fc.assert(fc.asyncProperty(fc.webUrl({ validSchemes: ['http', 'https'] }), async (url) => {
        vi.spyOn(URL, 'goOrNoGo').mockReturnValue(url);
        vi.spyOn(URL, 'whichProtocol').mockReturnValue({
          fullUrl: url,
          protocol: 'https'
        });

        vi.spyOn(http, 'getContent').mockRejectedValue(
          new Error('Network error')
        );

        await expect(urlChecker(url)).rejects.toThrow();
      }));
    });

    it('should propagate validation errors from goOrNoGo', async () => {
      await fc.assert(fc.asyncProperty(fc.webUrl({ validSchemes: ['http', 'https'] }), async (url) => {
        vi.spyOn(URL, 'goOrNoGo').mockImplementation(() => {
          throw new Error('Invalid URL');
        });

        await expect(urlChecker(url)).rejects.toThrow('Invalid URL');
      }));
    });
  });

  describe('Selector behavior', () => {
    it('should use undefined selector by default', async () => {
      await fc.assert(fc.asyncProperty(fc.webUrl({ validSchemes: ['http', 'https'] }), async (url) => {
        vi.spyOn(URL, 'goOrNoGo').mockReturnValue(url);
        vi.spyOn(URL, 'whichProtocol').mockReturnValue({
          fullUrl: url,
          protocol: 'https'
        });

        vi.spyOn(http, 'getContent').mockResolvedValue({
          content: '<html><body></body></html>',
          url: url
        });

        const selectContentSpy = vi
          .spyOn(pageFun, 'selectContent')
          .mockReturnValue({
            content: {} as any,
            parentURL: url
          });

        vi.spyOn(pageFun, 'getUrls').mockReturnValue([]);

        await urlChecker(url);

        expect(selectContentSpy).toHaveBeenCalledWith(
          expect.anything(),
          undefined
        );
      }));
    });

    it('should pass custom selector to selectContent', async () => {
      await fc.assert(fc.asyncProperty(
        fc.webUrl({ validSchemes: ['http', 'https'] }),
        fc.constantFrom('main', 'article', 'section', '#content'),
        async (url, selector) => {
          vi.spyOn(URL, 'goOrNoGo').mockReturnValue(url);
          vi.spyOn(URL, 'whichProtocol').mockReturnValue({
            fullUrl: url,
            protocol: 'https'
          });

          vi.spyOn(http, 'getContent').mockResolvedValue({
            content: '<html><body></body></html>',
            url: url
          });

          const selectContentSpy = vi
            .spyOn(pageFun, 'selectContent')
            .mockReturnValue({
              content: {} as any,
              parentURL: url
            });

          vi.spyOn(pageFun, 'getUrls').mockReturnValue([]);

          await urlChecker(url, selector);

          expect(selectContentSpy).toHaveBeenCalledWith(
            expect.anything(),
            selector
          );
        }
      ));
    });
  });
});
