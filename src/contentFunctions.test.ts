import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  getUrls,
  selectContent,
  elemUrlPairs,
  elemAttrib,
  findLineColumn
} from './contentFunctions.js';

describe('contentFunctions module - property-based tests', () => {
  describe('selectContent', () => {
    it('should always return an object with content and parentURL', () => {
      fc.assert(
        fc.property(fc.webUrl(), fc.string(), (url, body) => {
          const result = selectContent({ body, parentURL: url });

          expect(result).toHaveProperty('content');
          expect(result).toHaveProperty('parentURL');
          expect(result.parentURL).toBe(url);
        })
      );
    });

    it('should return body element when selector is undefined', () => {
      fc.assert(
        fc.property(fc.webUrl(), url => {
          const body = '<html><body><h1>Test</h1></body></html>';
          const result = selectContent({ body, parentURL: url }, undefined);

          expect(result.content.nodeName).toBe('BODY');
        })
      );
    });

    it('should return body element when selector is null', () => {
      fc.assert(
        fc.property(fc.webUrl(), url => {
          const body = '<html><body><h1>Test</h1></body></html>';
          const result = selectContent({ body, parentURL: url }, null as any);

          expect(result.content.nodeName).toBe('BODY');
        })
      );
    });

    it('should return body element when selector is empty string', () => {
      fc.assert(
        fc.property(fc.webUrl(), url => {
          const body = '<html><body><h1>Test</h1></body></html>';
          const result = selectContent({ body, parentURL: url }, '');

          expect(result.content.nodeName).toBe('BODY');
        })
      );
    });

    it('should select specific element when valid selector provided', () => {
      fc.assert(
        fc.property(fc.webUrl(), url => {
          const body =
            '<html><body><main id="content"><h1>Test</h1></main></body></html>';
          const result = selectContent({ body, parentURL: url }, 'main');

          expect(result.content.nodeName).toBe('MAIN');
        })
      );
    });

    it('should fallback to body when selector does not match', () => {
      fc.assert(
        fc.property(fc.webUrl(), url => {
          const body = '<html><body><h1>Test</h1></body></html>';
          const result = selectContent(
            { body, parentURL: url },
            '#nonexistent'
          );

          expect(result.content.nodeName).toBe('BODY');
        })
      );
    });

    it('should handle empty HTML body', () => {
      fc.assert(
        fc.property(fc.webUrl(), url => {
          const result = selectContent({ body: '', parentURL: url });

          expect(result.content.nodeName).toBe('BODY');
          expect(result.parentURL).toBe(url);
        })
      );
    });

    it('should preserve parentURL in result', () => {
      fc.assert(
        fc.property(fc.webUrl(), url => {
          const body = '<html><body>test</body></html>';
          const result = selectContent({ body, parentURL: url });

          expect(result.parentURL).toBe(url);
        })
      );
    });
  });

  describe('getUrls', () => {
    it('should return empty array when no URLs in content', () => {
      fc.assert(
        fc.property(fc.webUrl(), url => {
          const body = '<html><body><p>No links here</p></body></html>';
          const content = selectContent({ body, parentURL: url });

          const result = getUrls(content);

          expect(Array.isArray(result)).toBe(true);
          expect(result.length).toBe(0);
        })
      );
    });

    it('should find anchor href attributes', () => {
      fc.assert(
        fc.property(fc.webUrl(), fc.webUrl(), (parentURL, linkURL) => {
          const body = `<html><body><a href="${linkURL}">Link</a></body></html>`;
          const content = selectContent({ body, parentURL });

          const result = getUrls(content);

          expect(result.length).toBeGreaterThan(0);
          expect(result[0].url).toBe(linkURL);
          expect(result[0].elem).toBe('a');
          expect(result[0].parentURL).toBe(parentURL);
        })
      );
    });

    it('should find img src attributes', () => {
      fc.assert(
        fc.property(fc.webUrl(), fc.webUrl(), (parentURL, imgURL) => {
          const body = `<html><body><img src="${imgURL}" alt="test"/></body></html>`;
          const content = selectContent({ body, parentURL });

          const result = getUrls(content);

          expect(result.length).toBeGreaterThan(0);
          expect(result[0].url).toBe(imgURL);
          expect(result[0].elem).toBe('img');
        })
      );
    });

    it('should find script src attributes', () => {
      fc.assert(
        fc.property(fc.webUrl(), fc.webUrl(), (parentURL, scriptURL) => {
          const body = `<html><body><script src="${scriptURL}"></script></body></html>`;
          const content = selectContent({ body, parentURL });

          const result = getUrls(content);

          expect(
            result.some(r => r.url === scriptURL && r.elem === 'script')
          ).toBe(true);
        })
      );
    });

    it('should find multiple URLs in content', () => {
      fc.assert(
        fc.property(
          fc.webUrl(),
          fc.webUrl(),
          fc.webUrl(),
          (parentURL, url1, url2) => {
            const body = `<html><body><a href="${url1}">Link1</a><a href="${url2}">Link2</a></body></html>`;
            const content = selectContent({ body, parentURL });

            const result = getUrls(content);

            expect(result.length).toBe(2);
            expect(result.some(r => r.url === url1)).toBe(true);
            expect(result.some(r => r.url === url2)).toBe(true);
          }
        )
      );
    });

    it('should return urlFound objects with correct structure', () => {
      fc.assert(
        fc.property(fc.webUrl(), parentURL => {
          const body =
            '<html><body><a href="https://example.com">Link</a></body></html>';
          const content = selectContent({ body, parentURL });

          const result = getUrls(content);

          expect(result.length).toBeGreaterThan(0);
          result.forEach(urlFound => {
            expect(urlFound).toHaveProperty('parentURL');
            expect(urlFound).toHaveProperty('url');
            expect(urlFound).toHaveProperty('elem');
            expect(typeof urlFound.parentURL).toBe('string');
            expect(typeof urlFound.url).toBe('string');
            expect(typeof urlFound.elem).toBe('string');
          });
        })
      );
    });

    it('should handle elements with no URL attributes', () => {
      fc.assert(
        fc.property(fc.webUrl(), parentURL => {
          const body =
            '<html><body><a>No href</a><img alt="no src"/></body></html>';
          const content = selectContent({ body, parentURL });

          const result = getUrls(content);

          expect(Array.isArray(result)).toBe(true);
          expect(result.length).toBe(0);
        })
      );
    });

    it('should preserve parentURL in all results', () => {
      fc.assert(
        fc.property(fc.webUrl(), fc.string(), (parentURL, linkURL) => {
          const body = `<html><body><a href="${linkURL}">Link</a></body></html>`;
          const content = selectContent({ body, parentURL });

          const result = getUrls(content);

          result.forEach(urlFound => {
            expect(urlFound.parentURL).toBe(parentURL);
          });
        })
      );
    });

    it('should handle custom element-attribute pairs', () => {
      fc.assert(
        fc.property(fc.webUrl(), parentURL => {
          const body =
            '<html><body><a href="https://example.com">Link</a></body></html>';
          const content = selectContent({ body, parentURL });
          const customPairs: elemAttrib[] = [
            { element: 'a', attribute: 'href' }
          ];

          const result = getUrls(content, customPairs);

          expect(result.length).toBe(1);
          expect(result[0].elem).toBe('a');
        })
      );
    });
  });

  describe('elemUrlPairs', () => {
    it('should be an array of element-attribute pairs', () => {
      expect(Array.isArray(elemUrlPairs)).toBe(true);
      expect(elemUrlPairs.length).toBeGreaterThan(0);
    });

    it('should contain objects with element and attribute properties', () => {
      elemUrlPairs.forEach(pair => {
        expect(pair).toHaveProperty('element');
        expect(pair).toHaveProperty('attribute');
        expect(typeof pair.element).toBe('string');
        expect(typeof pair.attribute).toBe('string');
      });
    });

    it('should expand array attributes correctly', () => {
      const imgPairs = elemUrlPairs.filter(pair => pair.element === 'img');
      expect(imgPairs.length).toBeGreaterThan(1);
      expect(imgPairs.some(p => p.attribute === 'src')).toBe(true);
      expect(imgPairs.some(p => p.attribute === 'srcset')).toBe(true);
    });
  });

  describe('Integration properties', () => {
    it('selectContent -> getUrls should compose correctly', () => {
      fc.assert(
        fc.property(fc.webUrl(), parentURL => {
          const body =
            '<html><body><a href="https://example.com">Test</a></body></html>';
          const selected = selectContent({ body, parentURL });
          const urls = getUrls(selected);

          expect(urls.length).toBeGreaterThan(0);
          expect(urls[0].parentURL).toBe(parentURL);
        })
      );
    });

    it('getUrls should respect selector scope', () => {
      fc.assert(
        fc.property(
          fc.webUrl(),
          fc.constantFrom('main', 'article', 'section'),
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
        )
      );
    });
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
