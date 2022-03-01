/* import yaml from 'js-yaml';
interface restructuredResults {
  [parentURL: string]:
  [ URL.results ]
};
 */
// JS { 'https://www.example.com':
//    [ { url: 'https://www.wtf.com',
//        elem: 'a',
//        status: 404,
//        anchored: true,
//        anchorExists: true } ] }
// yaml
// https://www.example.com:
//   - url: 'https://www.wtf.com'
//     elem: 'a'
//     status: 404
//     anchored: true
//     anchorExists: true
/*
function dropKeyFromResults (dropkey:string, object: results):object {
  const newOutput: resultsPerPage = {};
  Object.keys(object).forEach(key => {
    if (key !== dropkey) {
      newOutput[key] = object[key];
    }
  });
  return newOutput;
}

function resultsRestructure (ArrayResultsObject: results[]):restructuredResults {
  const restructured = ArrayResultsObject.forEach(result => {
    const parent = result.parentURL;
    const subObject:resultsPerPage = dropKeyFromResults(parent, result);
    return Object.fromEntries([ parent, subObject ]);
  })
} */