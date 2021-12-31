#! /usr/bin/env node

import * as URL from './urlFunctions.js';
import * as pageFun from './contentFunctions.js';
import * as http from './http.js';
import { argparse } from './argParser.js';
import { linkCheckerCSV } from './csvOut.js';
import { exit } from 'process';

/* Main */
async function urlChecker (url: string, selector?: string): Promise<URL.results[]> {
  // validate
  const parentURL = URL.goOrNoGo(url);
  URL.whichProtocol(parentURL);
  // getContent
  const resultsArray: Promise<URL.results>[] = await http.getContent(parentURL)
    .then(parentPage => {
      return pageFun.selectContent({ body: parentPage.content, parentURL: parentPage.url }, selector);
    })
    .then(parentContent => {
      return { urls: pageFun.getUrls(parentContent), content: parentContent };
    })
    .then(urlsFoundInParent => {
      return urlsFoundInParent.urls.map(
        async url => {
          const res = await URL.checkAndReturn(url, urlsFoundInParent.content);
          return res;
        });
    });
  const finalResults = Promise.all(resultsArray).then();
  return finalResults;
};

const inputs = argparse(process.argv);

if (inputs.format === 'csv') {
  linkCheckerCSV(urlChecker(inputs.url, inputs.selector), inputs.output);
} else {
  console.log('unsupported output format.');
  exit(1);
}

/* const results = await http.getContent(parentURL)
.then(parentPage => {
  return pageFun.selectContent({ body: parentPage.content, parentURL: parentPage.url }, selector);
})
.then(parentContent => {
  console.log(parentContent);
  return { urls: pageFun.getUrls(parentContent), content: parentContent };
})
.then(urlsAndContent => {
  return urlsAndContent.urls.map(
    async url => {
      return await URL.checkAndReturn(url, urlsAndContent.content);
    });
}); */