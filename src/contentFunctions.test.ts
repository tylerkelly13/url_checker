import { describe, expect, it } from 'vitest';
import { fc, test } from '@fast-check/vitest';
import {
  getUrls,
  selectContent,
  elemUrlPairs,
  elemAttrib,
  findLineColumn
} from './contentFunctions.js';

describe('contentFunctions module - property-based tests', () => {
  describe('selectContent', () => {
    test.prop([fc.webUrl(), fc.string()])(
      'should always return an object with content and parentURL',
      (url, body) => {
        const result = selectContent({ body, parentURL: url });

        expect(result).toHaveProperty('content');
        expect(result).toHaveProperty('parentURL');
        expect(result.parentURL).toBe(url);
      }
    );

    test.prop([fc.webUrl()])(
      'should return body element when selector is undefined',
      (url) => {
        const body = '<html><body><h1>Test</h1></body></html>';
        const result = selectContent({ body, parentURL: url }, undefined);

        expect(result.content.nodeName).toBe('BODY');
      }
    );

    test.prop([fc.webUrl()])(
      'should return body element when selector is null',
      (url) => {
        const body = '<html><body><h1>Test</h1></body></html>';
        const result = selectContent({ body, parentURL: url }, null as any);

        expect(result.content.nodeName).toBe('BODY');
      }
    );

    test.prop([fc.webUrl()])(
      'should return body element when selector is empty string',
      (url) => {
        const body = '<html><body><h1>Test</h1></body></html>';
        const result = selectContent({ body, parentURL: url }, '');

        expect(result.content.nodeName).toBe('BODY');
      }
    );

    test.prop([fc.webUrl()])(
      'should select specific element when valid selector provided',
      (url) => {
        const body =
          '<html><body><main id="content"><h1>Test</h1></main></body></html>';
        const result = selectContent({ body, parentURL: url }, 'main');

        expect(result.content.nodeName).toBe('MAIN');
      }
    );

    test.prop([fc.webUrl()])(
      'should fallback to body when selector does not match',
      (url) => {
        const body = '<html><body><h1>Test</h1></body></html>';
        const result = selectContent({ body, parentURL: url }, '#nonexistent');

        expect(result.content.nodeName).toBe('BODY');
      }
    );

    test.prop([fc.webUrl()])('should handle empty HTML body', (url) => {
      const result = selectContent({ body: '', parentURL: url });

      expect(result.content.nodeName).toBe('BODY');
      expect(result.parentURL).toBe(url);
    });

    test.prop([fc.webUrl()])('should preserve parentURL in result', (url) => {
      const body = '<html><body>test</body></html>';
      const result = selectContent({ body, parentURL: url });

      expect(result.parentURL).toBe(url);
    });
  });

  describe('getUrls', () => {
    test.prop([fc.webUrl()])(
      'should return empty array when no URLs in content',
      (url) => {
        const body = '<html><body><p>No links here</p></body></html>';
        const content = selectContent({ body, parentURL: url });

        const result = getUrls(content);

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(0);
      }
    );

    test.prop([fc.webUrl(), fc.webUrl()])(
      'should find anchor href attributes',
      (parentURL, linkURL) => {
        const body = `<html><body><a href="${linkURL}">Link</a></body></html>`;
        const content = selectContent({ body, parentURL });

        const result = getUrls(content);

        expect(result.length).toBeGreaterThan(0);
        expect(result[0].url).toBe(linkURL);
        expect(result[0].elem).toBe('a');
        expect(result[0].parentURL).toBe(parentURL);
      }
    );

    test.prop([fc.webUrl(), fc.webUrl()])(
      'should find img src attributes',
      (parentURL, imgURL) => {
        const body = `<html><body><img src="${imgURL}" alt="test"/></body></html>`;
        const content = selectContent({ body, parentURL });

        const result = getUrls(content);

        expect(result.length).toBeGreaterThan(0);
        expect(result[0].url).toBe(imgURL);
        expect(result[0].elem).toBe('img');
      }
    );

    test.prop([fc.webUrl(), fc.webUrl()])(
      'should find script src attributes',
      (parentURL, scriptURL) => {
        const body = `<html><body><script src="${scriptURL}"></script></body></html>`;
        const content = selectContent({ body, parentURL });

        const result = getUrls(content);

        expect(
          result.some((r) => r.url === scriptURL && r.elem === 'script')
        ).toBe(true);
      }
    );

    test.prop([fc.webUrl(), fc.webUrl(), fc.webUrl()])(
      'should find multiple URLs in content',
      (parentURL, url1, url2) => {
        const body = `<html><body><a href="${url1}">Link1</a><a href="${url2}">Link2</a></body></html>`;
        const content = selectContent({ body, parentURL });

        const result = getUrls(content);

        expect(result.length).toBe(2);
        expect(result.some((r) => r.url === url1)).toBe(true);
        expect(result.some((r) => r.url === url2)).toBe(true);
      }
    );

    test.prop([fc.webUrl()])(
      'should return urlFound objects with correct structure',
      (parentURL) => {
        const body =
          '<html><body><a href="https://example.com">Link</a></body></html>';
        const content = selectContent({ body, parentURL });

        const result = getUrls(content);

        expect(result.length).toBeGreaterThan(0);
        result.forEach((urlFound) => {
          expect(urlFound).toHaveProperty('parentURL');
          expect(urlFound).toHaveProperty('url');
          expect(urlFound).toHaveProperty('elem');
          expect(typeof urlFound.parentURL).toBe('string');
          expect(typeof urlFound.url).toBe('string');
          expect(typeof urlFound.elem).toBe('string');
        });
      }
    );

    test.prop([fc.webUrl()])(
      'should handle elements with no URL attributes',
      (parentURL) => {
        const body =
          '<html><body><a>No href</a><img alt="no src"/></body></html>';
        const content = selectContent({ body, parentURL });

        const result = getUrls(content);

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(0);
      }
    );

    test.prop([fc.webUrl(), fc.string()])(
      'should preserve parentURL in all results',
      (parentURL, linkURL) => {
        const body = `<html><body><a href="${linkURL}">Link</a></body></html>`;
        const content = selectContent({ body, parentURL });

        const result = getUrls(content);

        result.forEach((urlFound) => {
          expect(urlFound.parentURL).toBe(parentURL);
        });
      }
    );

    test.prop([fc.webUrl()])(
      'should handle custom element-attribute pairs',
      (parentURL) => {
        const body =
          '<html><body><a href="https://example.com">Link</a></body></html>';
        const content = selectContent({ body, parentURL });
        const customPairs: elemAttrib[] = [{ element: 'a', attribute: 'href' }];

        const result = getUrls(content, customPairs);

        expect(result.length).toBe(1);
        expect(result[0].elem).toBe('a');
      }
    );
  });

  describe('elemUrlPairs', () => {
    test('should be an array of element-attribute pairs', () => {
      expect(Array.isArray(elemUrlPairs)).toBe(true);
      expect(elemUrlPairs.length).toBeGreaterThan(0);
    });

    test('should contain objects with element and attribute properties', () => {
      elemUrlPairs.forEach((pair) => {
        expect(pair).toHaveProperty('element');
        expect(pair).toHaveProperty('attribute');
        expect(typeof pair.element).toBe('string');
        expect(typeof pair.attribute).toBe('string');
      });
    });

    test('should expand array attributes correctly', () => {
      const imgPairs = elemUrlPairs.filter((pair) => pair.element === 'img');
      expect(imgPairs.length).toBeGreaterThan(1);
      expect(imgPairs.some((p) => p.attribute === 'src')).toBe(true);
      expect(imgPairs.some((p) => p.attribute === 'srcset')).toBe(true);
    });
  });

  describe('Integration properties', () => {
    test.prop([fc.webUrl()])(
      'selectContent -> getUrls should compose correctly',
      (parentURL) => {
        const body =
          '<html><body><a href="https://example.com">Test</a></body></html>';
        const selected = selectContent({ body, parentURL });
        const urls = getUrls(selected);

        expect(urls.length).toBeGreaterThan(0);
        expect(urls[0].parentURL).toBe(parentURL);
      }
    );

    test.prop([fc.webUrl(), fc.constantFrom('main', 'article', 'section')])(
      'getUrls should respect selector scope',
      (parentURL, selector) => {
        const body = `
          <html>
            <body>
              <${selector}><a href="https://inside.com">Inside</a></${selector}>
              <a href="https://outside.com">Outside</a>
            </body>
          </html>
        `;
        const selected = selectContent({ body, parentURL }, selector);
        const urls = getUrls(selected);

        expect(urls.length).toBe(1);
        expect(urls[0].url).toBe('https://inside.com');
      }
    );
  });

  describe('findLineColumn', () => {
    it('should find line and column for a substring', () => {
      const source =
        '<html>\n<body>\n<a href="test">Link</a>\n</body>\n</html>';
      const result = findLineColumn(source, 'href="test"');

      expect(result).toBeDefined();
      expect(result?.line).toBe(3);
      expect(result?.column).toBe(4);
    });

    it('should return undefined when substring is not found', () => {
      const source = '<html><body>Test</body></html>';
      const result = findLineColumn(source, 'notfound');

      expect(result).toBeUndefined();
    });

    it('should find second occurrence with startIndex', () => {
      const source = '<a href="first">A</a>\n<a href="second">B</a>';
      const firstResult = findLineColumn(source, 'href=');
      const secondResult = findLineColumn(source, 'href=', 10);

      expect(firstResult?.line).toBe(1);
      expect(secondResult?.line).toBe(2);
    });

    it('should handle URLs at start of file', () => {
      const source = 'href="test" something';
      const result = findLineColumn(source, 'href="test"');

      expect(result?.line).toBe(1);
      expect(result?.column).toBe(1);
    });

    it('should correctly count lines with multiple newlines', () => {
      const source = 'line1\nline2\nline3\nhref="test"';
      const result = findLineColumn(source, 'href="test"');

      expect(result?.line).toBe(4);
      expect(result?.column).toBe(1);
    });
  });

  describe('getUrls with line numbers', () => {
    it('should include line and column when sourceHTML is provided', () => {
      const parentURL = 'https://example.com';
      const body =
        '<html>\n<body>\n<a href="https://test.com">Link</a>\n</body>\n</html>';
      const content = selectContent({ body, parentURL });

      const urls = getUrls(content);

      expect(urls.length).toBe(1);
      expect(urls[0].line).toBeDefined();
      expect(urls[0].column).toBeDefined();
      expect(urls[0].line).toBe(3);
    });

    it('should handle multiple URLs on different lines', () => {
      const parentURL = 'https://example.com';
      const body = `<html>
<body>
<a href="https://first.com">First</a>
<a href="https://second.com">Second</a>
</body>
</html>`;
      const content = selectContent({ body, parentURL });

      const urls = getUrls(content);

      expect(urls.length).toBe(2);
      expect(urls[0].line).toBe(3);
      expect(urls[1].line).toBe(4);
    });

    it('should handle duplicate URLs on different lines', () => {
      const parentURL = 'https://example.com';
      const body = `<html>
<body>
<a href="https://same.com">First</a>
<a href="https://same.com">Second</a>
</body>
</html>`;
      const content = selectContent({ body, parentURL });

      const urls = getUrls(content);

      expect(urls.length).toBe(2);
      expect(urls[0].line).toBe(3);
      expect(urls[1].line).toBe(4);
    });
  });
});
