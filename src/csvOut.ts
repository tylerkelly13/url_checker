import * as URL from './urlFunctions.js';
import { writeFileSync } from 'fs';

export const defaultResultsOrder = [
  'parentURL',
  'url',
  'status',
  'statusMsg',
  'anchored',
  'anchorExists',
  'elem'
];

export const mapMaker = (
  objectIn: { [x: string]: any },
  order: string[]
): Map<string, string> => {
  const mapping = new Map();
  order.forEach((item) => {
    mapping.set(item, objectIn[item].toString());
  });
  return mapping;
};

export const linkCheckerCSV = async (
  finalResults: Promise<URL.results[]>,
  outPutFileName: string,
  resultsOrder: string[] = defaultResultsOrder
): Promise<void> => {
  const results = await finalResults;
  const arrayOfArrays = results.map((res) => {
    const map = mapMaker(res, resultsOrder);
    const newArray = [];
    for (const value of map.values()) {
      newArray.push(value);
    }
    return newArray;
  });
  const concatenator: string[] = arrayOfArrays.map((array) => {
    return '"' + array.join('","') + '"\n';
  });
  writeFileSync(outPutFileName, concatenator.toString());
};
