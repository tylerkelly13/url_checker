#! /usr/bin/env node

import { argparse } from './argParser';
import { urlChecker } from './urlChecker';
import { linkCheckerCSV } from './csvOut';
import { linkCheckerJSON, linkCheckerYAML } from './jsonYamlOut';
import { exit } from 'process';

const inputs = argparse(process.argv);

if (inputs.format === 'csv') {
  linkCheckerCSV(urlChecker(inputs.url, inputs.selector), inputs.output);
} else if (inputs.format === 'json') {
  linkCheckerJSON(urlChecker(inputs.url, inputs.selector), inputs.output);
} else if (inputs.format === 'yaml') {
  linkCheckerYAML(urlChecker(inputs.url, inputs.selector), inputs.output);
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
