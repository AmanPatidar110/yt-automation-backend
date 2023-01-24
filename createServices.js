import nodeWindows from 'node-windows';
import path, { dirname, resolve } from 'path';

const Service = nodeWindows.Service;

console.log('starting service', path.join(dirname('./script.js'), 'script.js'));
const scriptService = new Service({
    name: 'Scrapper Script Service',
    description: 'To run the scrapper script at PORT: 4000',
    script: resolve('./script.js'),
    nodeOptions: ['--harmony', '--max_old_space_size=4096'],
    //, workingDirectory: '...'
    //, allowServiceLogon: true
});

scriptService.on('install', function () {
    scriptService.start();
});

scriptService.install();
