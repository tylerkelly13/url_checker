import { describe, expect, vi, beforeEach, afterEach, it } from 'vitest';
import fc from 'fast-check';
import * as http from './http.js';
import needle from 'needle';

vi.mock('needle');

describe('http module - property-based tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getContent', () => {
    it('should always return an object with url and content properties', async () => {
      await fc.assert(fc.asyncProperty(fc.webUrl(), async (url) => {
        const mockResponse = { body: '<html>test content</html>' };
        vi.mocked(needle).mockResolvedValue(mockResponse as any);

        const result = await http.getContent(url);

        expect(result).toHaveProperty('url');
        expect(result).toHaveProperty('content');
        expect(result.url).toBe(url);
      }));
    });

    it('should preserve the URL in the result', async () => {
      await fc.assert(fc.asyncProperty(fc.webUrl(), async (url) => {
        const mockResponse = { body: 'any content' };
        vi.mocked(needle).mockResolvedValue(mockResponse as any);

        const result = await http.getContent(url);

        expect(result.url).toBe(url);
      }));
    });

    it('should return the response body as content on success', async () => {
      await fc.assert(fc.asyncProperty(fc.webUrl(), fc.string(), async (url, bodyContent) => {
        const mockResponse = { body: bodyContent };
        vi.mocked(needle).mockResolvedValue(mockResponse as any);

        const result = await http.getContent(url);

        expect(result.content).toBe(bodyContent);
        expect(vi.mocked(needle)).toHaveBeenCalledWith('get', url);
      }));
    });

    it('should return error message as content on failure', async () => {
      await fc.assert(fc.asyncProperty(fc.webUrl(), fc.string(), async (url, errorMessage) => {
        const error = new Error(errorMessage);
        vi.mocked(needle).mockRejectedValue(error);

        const result = await http.getContent(url);

        expect(result.url).toBe(url);
        expect(result.content).toBe(errorMessage);
      }));
    });

    it('should handle empty response body', async () => {
      await fc.assert(fc.asyncProperty(fc.webUrl(), async (url) => {
        const mockResponse = { body: '' };
        vi.mocked(needle).mockResolvedValue(mockResponse as any);

        const result = await http.getContent(url);

        expect(result.content).toBe('');
        expect(result.url).toBe(url);
      }));
    });
  });

  describe('getStatus', () => {
    it('should always return an object with url, statusCode, and statusMsg properties', async () => {
      await fc.assert(fc.asyncProperty(fc.webUrl(), async (url) => {
        const mockResponse = { statusCode: 200, statusMessage: 'OK' };
        vi.mocked(needle).mockResolvedValue(mockResponse as any);

        const result = await http.getStatus(url);

        expect(result).toHaveProperty('url');
        expect(result).toHaveProperty('statusCode');
        expect(result).toHaveProperty('statusMsg');
        expect(result.url).toBe(url);
      }));
    });

    it('should preserve the URL in the result', async () => {
      await fc.assert(fc.asyncProperty(fc.webUrl(), async (url) => {
        const mockResponse = { statusCode: 200, statusMessage: 'OK' };
        vi.mocked(needle).mockResolvedValue(mockResponse as any);

        const result = await http.getStatus(url);

        expect(result.url).toBe(url);
      }));
    });

    it('should convert status code to string for valid HTTP status codes', async () => {
      await fc.assert(fc.asyncProperty(fc.webUrl(), fc.integer({ min: 100, max: 599 }), fc.string(), async (url, statusCode, statusMessage) => {
        const mockResponse = { statusCode, statusMessage };
        vi.mocked(needle).mockResolvedValue(mockResponse as any);

        const result = await http.getStatus(url);

        expect(result.statusCode).toBe(statusCode.toString());
        expect(result.statusMsg).toBe(statusMessage);
        expect(vi.mocked(needle)).toHaveBeenCalledWith('get', url);
      }));
    });

    it('should return 999 status code and error message on request failure', async () => {
      await fc.assert(fc.asyncProperty(fc.webUrl(), fc.string(), async (url, errorMessage) => {
        const error = new Error(errorMessage);
        vi.mocked(needle).mockRejectedValue(error);

        const result = await http.getStatus(url);

        expect(result.url).toBe(url);
        expect(result.statusCode).toBe('999');
        expect(result.statusMsg).toContain('Request failed:');
        expect(result.statusMsg).toContain(errorMessage);
      }));
    });

    it('should handle missing statusMessage gracefully', async () => {
      await fc.assert(fc.asyncProperty(fc.webUrl(), async (url) => {
        const mockResponse = { statusCode: 200 };
        vi.mocked(needle).mockResolvedValue(mockResponse as any);

        const result = await http.getStatus(url);

        expect(result.statusMsg).toBe('');
      }));
    });

    it('should handle missing statusCode by using empty string', async () => {
      await fc.assert(fc.asyncProperty(fc.webUrl(), async (url) => {
        const mockResponse = { statusMessage: 'OK' };
        vi.mocked(needle).mockResolvedValue(mockResponse as any);

        const result = await http.getStatus(url);

        expect(result.statusCode).toBe('');
      }));
    });
  });

  describe('Interface contracts', () => {
    it('getContent result should match getContentResult interface', async () => {
      await fc.assert(fc.asyncProperty(fc.webUrl(), async (url) => {
        const mockResponse = { body: 'test' };
        vi.mocked(needle).mockResolvedValue(mockResponse as any);

        const result = await http.getContent(url);

        // Verify the result satisfies the interface
        const typedResult: http.getContentResult = result;
        expect(typeof typedResult.url).toBe('string');
        expect(typeof typedResult.content).toBe('string');
      }));
    });

    it('getStatus result should match getStatusResult interface', async () => {
      await fc.assert(fc.asyncProperty(fc.webUrl(), async (url) => {
        const mockResponse = { statusCode: 200, statusMessage: 'OK' };
        vi.mocked(needle).mockResolvedValue(mockResponse as any);

        const result = await http.getStatus(url);

        // Verify the result satisfies the interface
        const typedResult: http.getStatusResult = result;
        expect(typeof typedResult.url).toBe('string');
        expect(typeof typedResult.statusCode).toBe('string');
        expect(typeof typedResult.statusMsg).toBe('string');
      }));
    });
  });

  describe('Idempotency properties', () => {
    it('getContent should produce consistent results for the same URL', async () => {
      await fc.assert(fc.asyncProperty(fc.webUrl(), async (url) => {
        const mockResponse = { body: 'consistent content' };
        vi.mocked(needle).mockResolvedValue(mockResponse as any);

        const result1 = await http.getContent(url);
        vi.mocked(needle).mockResolvedValue(mockResponse as any);
        const result2 = await http.getContent(url);

        expect(result1).toEqual(result2);
      }));
    });

    it('getStatus should produce consistent results for the same URL', async () => {
      await fc.assert(fc.asyncProperty(fc.webUrl(), async (url) => {
        const mockResponse = { statusCode: 200, statusMessage: 'OK' };
        vi.mocked(needle).mockResolvedValue(mockResponse as any);

        const result1 = await http.getStatus(url);
        vi.mocked(needle).mockResolvedValue(mockResponse as any);
        const result2 = await http.getStatus(url);

        expect(result1).toEqual(result2);
      }));
    });
  });

  describe('Error handling properties', () => {
    it('getContent should never throw, always return a result', async () => {
      await fc.assert(fc.asyncProperty(fc.webUrl(), fc.oneof(fc.string(), fc.constant(undefined)), async (url, errorMsg) => {
        const error = errorMsg ? new Error(errorMsg) : new Error();
        vi.mocked(needle).mockRejectedValue(error);

        await expect(http.getContent(url)).resolves.toBeDefined();
      }));
    });

    it('getStatus should never throw, always return a result', async () => {
      await fc.assert(fc.asyncProperty(fc.webUrl(), fc.oneof(fc.string(), fc.constant(undefined)), async (url, errorMsg) => {
        const error = errorMsg ? new Error(errorMsg) : new Error();
        vi.mocked(needle).mockRejectedValue(error);

        await expect(http.getStatus(url)).resolves.toBeDefined();
      }));
    });

    it('getStatus error responses should always have status code 999', async () => {
      await fc.assert(fc.asyncProperty(fc.webUrl(), async (url) => {
        vi.mocked(needle).mockRejectedValue(new Error('Network error'));

        const result = await http.getStatus(url);

        expect(result.statusCode).toBe('999');
      }));
    });
  });
});
