import { Command } from 'commander'; // https://www.npmjs.com/package/commander

interface options {
  url: string,
  selector: string,
  output: string,
  format: string
}

function argparse (args: string[]): options {
/* argument parser */
  const program = new Command();
  program
    .name('url_checker')
    .description('Checks for broken links on the pages provided (urls)')
    .option('-s, --selector [css selector]', 'CSS selector for only checking part of a page (such as: "main" for the <main> element).')
    .option('-o, --output [file]', 'File to output the results', 'url_checker_results.csv')
    .option('-f, --format [format]', 'File format to output the results (supports: "csv")', 'csv')
    .enablePositionalOptions(true)
    .requiredOption('-u, --url <url>', 'URL of the page to check including protocol (such as https://www.example.com/index.html)')
    .parse(args);

  if (program.args.length < 0) {
    program.help();
  }

  const options = {
    url: program.opts().url,
    selector: program.opts().selector,
    output: program.opts().output,
    format: program.opts().format
  };

  return options || process.exit(1);
}

export {
  argparse
};
