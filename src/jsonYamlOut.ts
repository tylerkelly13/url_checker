import yaml from 'js-yaml';
import { writeFileSync } from 'fs';
import * as URL from './urlFunctions';

export type resultsPerPage = {
  url: string;
  elem: string;
  status: string;
  statusMsg: string;
  anchored: boolean;
  anchorExists?: boolean;
};

export type restructuredResults = {
  [parentURL: string]: resultsPerPage[];
};

/**
 * Remove the parentURL key from a result object since it becomes the grouping key.
 *
 * @param result Single result object with parentURL.
 * @returns Result object without parentURL.
 */
export const dropKeyFromResults = (result: URL.results): resultsPerPage => {
  const { parentURL: _parentURL, ...rest } = result;
  return rest;
};

/**
 * Restructure flat array of results into nested object grouped by parentURL.
 *
 * @param arrayResultsObject Array of result objects.
 * @returns Object with parentURLs as keys and arrays of results as values.
 */
export const resultsRestructure = (
  arrayResultsObject: URL.results[]
): restructuredResults => {
  return arrayResultsObject.reduce(
    (acc: restructuredResults, result: URL.results) => {
      const parent = result.parentURL;
      const subObject = dropKeyFromResults(result);

      if (!acc[parent]) {
        acc[parent] = [];
      }
      acc[parent].push(subObject);

      return acc;
    },
    {}
  );
};

/**
 * Output results as JSON file.
 *
 * @param finalResults Promise resolving to array of results.
 * @param outputFileName Path to output JSON file.
 */
export const linkCheckerJSON = async (
  finalResults: Promise<URL.results[]>,
  outputFileName: string
): Promise<void> => {
  const results = await finalResults;
  const restructured = resultsRestructure(results);
  const jsonOutput = JSON.stringify(restructured, null, 2);
  writeFileSync(outputFileName, jsonOutput);
};

/**
 * Output results as YAML file.
 *
 * @param finalResults Promise resolving to array of results.
 * @param outputFileName Path to output YAML file.
 */
export const linkCheckerYAML = async (
  finalResults: Promise<URL.results[]>,
  outputFileName: string
): Promise<void> => {
  const results = await finalResults;
  const restructured = resultsRestructure(results);
  const yamlOutput = yaml.dump(restructured);
  writeFileSync(outputFileName, yamlOutput);
};
