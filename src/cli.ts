#! /usr/bin/env node

import { argparse } from './argParser';
import { urlChecker } from './urlChecker';
import { linkCheckerCSV } from './csvOut';
import { linkCheckerJSON, linkCheckerYAML } from './jsonYamlOut';
import { linkCheckerSARIF } from './sarifOut';
import { exit } from 'process';

const inputs = argparse(process.argv);

if (inputs.format === 'csv') {
  linkCheckerCSV(urlChecker(inputs.url, inputs.selector), inputs.output);
} else if (inputs.format === 'json') {
  linkCheckerJSON(urlChecker(inputs.url, inputs.selector), inputs.output);
} else if (inputs.format === 'yaml') {
  linkCheckerYAML(urlChecker(inputs.url, inputs.selector), inputs.output);
} else if (inputs.format === 'sarif') {
  linkCheckerSARIF(urlChecker(inputs.url, inputs.selector), inputs.output);
} else {
  console.log('unsupported output format.');
  exit(1);
}
