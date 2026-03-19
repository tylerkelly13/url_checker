import jsdom from 'jsdom';

const { JSDOM } = jsdom;

const urlElements = {
  a: 'href',
  area: 'href',
  audio: 'src',
  blockquote: 'cite',
  body: 'background',
  del: 'cite',
  embed: 'src',
  iframe: 'src',
  img: ['src', 'srcset'],
  image: 'href',
  input: 'src',
  ins: 'cite',
  link: 'href',
  object: 'data',
  q: 'cite',
  track: 'src',
  video: ['src', 'poster'],
  source: 'src',
  script: ['src', 'href']
};

export type elemAttrib = {
  element: string;
  attribute: string;
};

export type urlFound = {
  parentURL: string;
  url: string;
  elem: string;
  line?: number;
  column?: number;
};

export type pageHTML = {
  content: HTMLElement;
  parentURL: string;
  sourceHTML?: string;
};

export type pageContent = {
  body: string;
  parentURL: string;
};

const expandAttrArrays = (
  entries: [string, string | string[]][]
): elemAttrib[] => {
  /* convert  */
  const newPairArray: elemAttrib[] = [];
  entries.forEach(strStrOrArr => {
    const elem = strStrOrArr[0];
    const strOrArr = strStrOrArr[1];
    if (Array.isArray(strOrArr)) {
      strOrArr.forEach(el => {
        newPairArray.push({ element: elem, attribute: el });
      });
    } else {
      newPairArray.push({ element: elem, attribute: strOrArr });
    }
  });
  return newPairArray;
};

export const elemUrlPairs: elemAttrib[] = expandAttrArrays(
  Object.entries(urlElements)
);

/**
 * Find line and column number of a substring in source HTML.
 *
 * @param source The source HTML string.
 * @param search The substring to search for.
 * @param startIndex Optional starting index for search (for finding duplicate URLs).
 * @returns Object with line and column numbers, or undefined if not found.
 */
export const findLineColumn = (
  source: string,
  search: string,
  startIndex: number = 0
): { line: number; column: number } | undefined => {
  const index = source.indexOf(search, startIndex);
  if (index === -1) {
    return undefined;
  }

  const lines = source.substring(0, index).split('\n');
  const line = lines.length;
  const column = lines[lines.length - 1].length + 1;

  return { line, column };
};

export const getUrls = (
  { content, parentURL, sourceHTML }: pageHTML,
  urlElm = elemUrlPairs
): urlFound[] => {
  /**
   * Takes in HTML and URL, finds elements with URLs, returns URLS.
   *
   * @param content HTML Element, such as `&gt;main&lt;` to scanned for URI-containing elements.
   * @param parentURL URL of the original content.
   * @param sourceHTML Optional source HTML for line number calculation.
   * @param urlElm HTML tags and attributes to check for in the content.
   * @returns Array of objects, with URI found, HTML tag, parentURL, and optionally line/column.
   */
  const urls: urlFound[] = [];
  const seenUrls = new Map<string, number>();

  for (const pair of urlElm) {
    const matchingElems = content.getElementsByTagName(pair.element);
    for (const elem of matchingElems) {
      const urlValue = elem.getAttribute(pair.attribute);
      if (urlValue !== null) {
        const urlObj: urlFound = {
          parentURL,
          url: urlValue.toString(),
          elem: elem.nodeName.toLowerCase()
        };

        // Try to find line and column if source HTML is provided
        if (sourceHTML) {
          const urlKey = `${pair.element}:${pair.attribute}:${urlValue}`;
          const startIndex = seenUrls.get(urlKey) || 0;
          const searchPattern = `${pair.attribute}="${urlValue}"`;
          const location = findLineColumn(
            sourceHTML,
            searchPattern,
            startIndex
          );

          if (location) {
            urlObj.line = location.line;
            urlObj.column = location.column;
            // Track where we found this URL to find next occurrence
            const foundIndex = sourceHTML.indexOf(searchPattern, startIndex);
            seenUrls.set(urlKey, foundIndex + searchPattern.length);
          }
        }

        urls.push(urlObj);
      }
    }
  }
  return urls;
};

export const selectContent = (
  { body: page, parentURL: url }: pageContent,
  selector?: string
): pageHTML => {
  /**
   * Convert page content from a string to a JSDOM element, return the HTML element matching the selector (if provided).
   *
   * @param body page content as a string.
   * @param parentURL URL of page content.
   * @param selector [CSS selector](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors) of the HTML element to analyse.
   * @returns The page or selector HTML, the parent URL, and the source HTML.
   */
  const { document } = new JSDOM(page).window;
  let selectedContent;
  if (selector !== undefined && selector !== null && selector !== '') {
    selectedContent =
      (document.querySelector(selector) as HTMLElement) || document.body;
  } else {
    selectedContent = document.body;
  }
  return { content: selectedContent, parentURL: url, sourceHTML: page };
};
