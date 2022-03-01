import { exit } from 'process';
import * as http from './http.js';
import * as pageFun from './contentFunctions.js';

/*
 * https://developer.mozilla.org/en-US/docs/Web/API/URL/URL
 * https://developer.mozilla.org/en-US/docs/Web/API/URL
 */

interface results {
  parentURL: string,
  status: string,
  statusMsg: string,
  url: string,
  elem: string,
  anchored: boolean,
  anchorExists?: boolean
};

interface protocolCheck {
  fullUrl: string,
  protocol: string
}

type urlRegex = [string, RegExp][];

const supportedProtocolRegExp = /https?/;

const urlStarts: urlRegex = [
  [ 'anchor', /^#[^\s]+/ ],
  [ 'fullHTTP', /^http:\/\/www\./ ],
  [ 'fullHTTPS', /^https:\/\/www\./ ],
  [ 'HTTPnoW', /^http:\/\/(?!www\.)/ ],
  [ 'HTTPSnoW', /^https:\/\/(?!www\.)/ ],
  [ 'implicitDomainName', /^\/[^\s]+/ ],
  [ 'implicitProto', /^\/\/[^\s]+/ ],
  [ 'subResources', /^[^\s]+\// ],
  [ 'upDir', /^(\.\.\/)+/ ],
  [ 'emptyAnchor', /^#$/ ]
];

const fullUrlTypes = [ 'fullHTTP', 'fullHTTPS', 'HTTPnoW', 'HTTPSnoW' ];

function regexMatchCount (inputString: string, regexp: RegExp): number {
  return ((inputString || '').match(regexp) || []).length;
}

function urlConstructor (parentUrl: string, url:string, urlType:string): string {
  let fullURL: string;
  const parent = new URL(parentUrl);
  switch (urlType) {
  case 'implicitDomainName':
    fullURL = new URL(url, parent.origin).toString();
    break;
  case 'implicitProto':
    fullURL = 'https:' + url;
    break;
  case 'subResources':
  case 'upDir':
  default:
    fullURL = new URL(url, parent.href).toString();
    break;
  }
  return fullURL;
}

function anchoredChecker (validUrl:string, urlType: string): string {
  if (urlType === 'anchor') {
    return 'anchor';
  } else if (/#[^)]/.test(validUrl)) {
    return 'anchored';
  } else {
    return 'noAnchor';
  }
};

function validURLCheckFix (url:string):string {
  /**
   * Checks if the URL is valid and complete.
   *
   * @param url Input URL for validation.
   * @returns Valid URL if possible.
   */
  const fullURLPrefixCheck = /^https?:\/\//;
  const checkForW3NoProtocol = /^www\./;
  if (fullURLPrefixCheck.test(url)) {
    return url;
  } else if (checkForW3NoProtocol.test(url)) {
    console.log('No protocol provided, trying "HTTPS"');
    return 'https://' + url;
  } else {
    console.error('Invalid URL: ' + url + '\nAre you missing the protocol (`https://`) and/or domain (`www.example.com`)?');
    return '';
  }
}

function goOrNoGo (url: string): string {
  const validURL = validURLCheckFix(url);
  if (validURL === '' && validURL.length < 5) {
    exit(1);
  } else {
    return url;
  }
}

function whichProtocol (fullUrl: string, protoRegExp:RegExp = supportedProtocolRegExp): protocolCheck {
  const protocol = (fullUrl.match(protoRegExp) || [ 'Unsupported' ])[0];
  if (protocol === 'Unsupported') {
    console.log('Unable to determine the protocol for: ' + fullUrl);
    exit(1);
  }
  return { fullUrl, protocol };
}

function urlTyper (url: string, regexArr:urlRegex = urlStarts): string {
  let urlType = '';
  regexArr.every((pair) => {
    if (pair[1].test(url)) {
      urlType = pair[0];
      return false;
    };
    return true;
  });
  return urlType;
};

async function checkAndReturn (urlFound:pageFun.urlFound, page: pageFun.pageHTML, fullUrls: string[] = fullUrlTypes): Promise<results> {
  const { parentURL, url, elem } = urlFound;
  // determine type
  const urlType = urlTyper(url);
  // complete URL?
  let correctURL:string;
  if (fullUrls.indexOf(urlType) < 0 && urlType !== 'anchor') {
    correctURL = urlConstructor(parentURL, url, urlType);
  } else {
    correctURL = url;
  }
  // check if anchored
  let status: string,
    statusMsg: string,
    anchored: boolean,
    statusResult: http.getStatusResult,
    anchorExists: boolean;
  switch (anchoredChecker(correctURL, urlType)) {
  case 'anchor':
    if ((/#\w+/).test(url)) {
      anchored = true;
      anchorExists = page.content.querySelector(url) !== null;
      statusMsg = 'N/A';
      status = '000';
    } else {
      anchored = true;
      anchorExists = false;
      statusMsg = 'N/A';
      status = '000';
    }
    break;
  case 'anchored':
    anchored = true;
    statusResult = await http.getStatus(correctURL);
    status = statusResult.statusCode;
    statusMsg = statusResult.statusMsg;
    if (parseFloat(status) >= 400) {
      anchorExists = false;
    } else {
      const theAnchor = '#' + url.split('#')[1];
      // getContent
      const content = await Promise.resolve(http.getContent(parentURL));
      // getSelector
      const HTMLContent = pageFun.selectContent({ body: content.content, parentURL });
      if ((/#\w+/).test(url)) {
        anchorExists = HTMLContent.content.querySelector(theAnchor) !== null;
      } else {
        anchorExists = false;
      }
    }
    break;
  default:
    anchored = false;
    anchorExists = false;
    statusResult = await http.getStatus(correctURL);
    status = statusResult.statusCode;
    statusMsg = statusResult.statusMsg;
    break;
  }
  /*
   * if anchored, getcontent, check for id
   * else check status
   * store status
   */
  return {
    parentURL,
    status,
    statusMsg,
    url,
    elem,
    anchored,
    anchorExists
  };
}

export {
  urlRegex,
  protocolCheck,
  results,
  anchoredChecker,
  checkAndReturn,
  goOrNoGo,
  regexMatchCount,
  validURLCheckFix,
  urlTyper,
  whichProtocol
};
