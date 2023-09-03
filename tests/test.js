/*
 * https://mochajs.org/
 * https://www.npmjs.com/package/nodemon
 * https://github.com/remy/nodemon/blob/HEAD/doc/requireable.md
 * https://github.com/Netflix/pollyjs/
 * https://www.npmjs.com/package/node-fetch
 */

import { nodemon } from 'nodemon';

nodemon({
  script: 'app.js',
  ext: 'js json'
});

nodemon.on('start', function () {
  console.log('App has started');
}).on('quit', function () {
  console.log('App has quit');
  process.exit();
}).on('restart', function (files) {
  console.log('App restarted due to: ', files);
});
