import { Command } from 'commander';

type options = {
  url: string;
  selector: string;
  output: string;
  format: string;
  all: boolean;
  internal: boolean;
};

export const argparse = (args: string[]): options => {
  /* argument parser */
  const program = new Command();
  program
    .name('url_checker')
    .description('Checks for broken links on the pages provided (urls)')
    .argument('[url]', 'URL of the page to check')
    .option(
      '-u, --url <url>',
      'URL of the page to check (alternative to positional argument)'
    )
    .option(
      '-s, --selector [css selector]',
      'CSS selector for checking part of a page (such as: "main" for the <main> element).'
    )
    .option(
      '-o, --output [file]',
      'File to output the results',
      'url_checker_results.csv'
    )
    .option(
      '-f, --format [format]',
      'File format to output the results (supports: "csv", "json", "yaml", "sarif")',
      'csv'
    )
    .option(
      '-a, --all',
      'Output all results (by default, non-2XX statuses are shown)',
      false
    )
    .option(
      '-i, --internal',
      'Only check internal URLs (ignore external http/https URLs)',
      false
    )
    .parse(args);

  const positionalUrl = program.args[0];
  const optionUrl = program.opts().url;
  const url = positionalUrl || optionUrl;

  if (!url) {
    console.error(
      'Error: URL is required. Provide as argument or use -u flag.'
    );
    program.help();
  }

  const options = {
    url,
    selector: program.opts().selector,
    output: program.opts().output,
    format: program.opts().format,
    all: program.opts().all,
    internal: program.opts().internal
  };

  return options;
};
