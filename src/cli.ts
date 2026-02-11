#! /usr/bin/env node

import { argparse } from './argParser';
import { urlChecker } from './urlChecker';
import { linkCheckerCSV } from './csvOut';
import { linkCheckerJSON, linkCheckerYAML } from './jsonYamlOut';
import { linkCheckerSARIF } from './sarifOut';
import { filterNon2XX } from './urlFunctions';
import { exit } from 'process';

const inputs = argparse(process.argv);

const resultsPromise = urlChecker(
  inputs.url,
  inputs.selector,
  inputs.internal
).then((results) => (inputs.all ? results : filterNon2XX(results)));

if (inputs.format === 'csv') {
  linkCheckerCSV(resultsPromise, inputs.output);
} else if (inputs.format === 'json') {
  linkCheckerJSON(resultsPromise, inputs.output);
} else if (inputs.format === 'yaml') {
  linkCheckerYAML(resultsPromise, inputs.output);
} else if (inputs.format === 'sarif') {
  linkCheckerSARIF(resultsPromise, inputs.output);
} else {
  console.log('unsupported output format.');
  exit(1);
}
