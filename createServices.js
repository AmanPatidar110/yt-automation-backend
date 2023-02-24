// import nodeWindows from 'node-windows';
import nodeWindows from 'node-service-linux';

import path, { dirname, resolve } from 'path';

const Service = nodeWindows.Service;

console.log('starting service', path.join(dirname('./script.js'), 'script.js'));
const scriptService = new Service({
    name: 'scrapper-script-service',
    description: 'To run the scrapper script at PORT: 8999',
    script: resolve('./script.js'),
    nodeOptions: ['--harmony', '--max_old_space_size=4096'],
    //, workingDirectory: '...'
    //, allowServiceLogon: true
});

scriptService.on('install', function () {
    scriptService.start();
});

scriptService.install();
