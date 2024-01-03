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
  img: [ 'src', 'srcset' ],
  image: 'href',
  input: 'src',
  ins: 'cite',
  link: 'href',
  object: 'data',
  q: 'cite',
  track: 'src',
  video: [ 'src', 'poster' ],
  source: [ 'src', 'srcset' ],
  script: 'src'
};

interface elemAttrib {
  element: string,
  attribute: string
}

interface urlFound {
  parentURL: string,
  url: string,
  elem: string,
}

interface pageHTML {
  content: HTMLElement,
  parentURL: string,
}

interface pageContent {
  body: string,
  parentURL: string,
}

function expandAttrArrays (entries: [string, string | string[]][]): elemAttrib[] {
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
}

const elemUrlPairs: elemAttrib[] = expandAttrArrays(Object.entries(urlElements));

function getUrls ({ content, parentURL }:pageHTML, urlElm = elemUrlPairs): urlFound[] {
  /**
   * Takes in HTML and URL, finds elements with URLs, returns URLS.
   *
   * @param content HTML Element, such as `&gt;main&lt;` to scanned for URI-containing elements.
   * @param parentURL URL of the original content.
   * @param urlElm HTML tags and attributes to check for in the content.
   * @returns Array of objects, with URI found, HTML tag, and parentURL.
   */
  const urls: urlFound[] = [];
  for (const pair of urlElm) {
    const matchingElems = content.getElementsByTagName(pair.element);
    for (const elem of matchingElems) {
      const urlFound = elem.getAttribute(pair.attribute);
      if (urlFound !== null) {
        urls.push({ parentURL, url: urlFound.toString(), elem: elem.nodeName.toLowerCase() });
      }
    };
  };
  return urls;
};

function selectContent ({ body: page, parentURL: url }: pageContent, selector?:string): pageHTML {
  /**
   * Convert page content from a string to a JSDOM element, return the HTML element matching the selector (if provided).
   *
   * @param body page content as a string.
   * @param parentURL URL of page content.
   * @param selector [CSS selector](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors) of the HTML element to analyse.
   * @returns The page or selector HTML and the parent URL.
   */
  const { document } = (new JSDOM(page)).window;
  let selectedContent;
  if (selector !== undefined && selector !== null && selector !== '') {
    selectedContent = document.querySelector(selector) as HTMLElement || document.body;
  } else {
    selectedContent = document.body;
  }
  return { content: selectedContent, parentURL: url };
}

export {
  getUrls,
  selectContent,
  elemUrlPairs,
  elemAttrib,
  urlFound,
  pageHTML,
  pageContent
};
