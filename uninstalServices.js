import nodeWindows from 'node-windows';
import path, { dirname, resolve } from 'path';

const Service = nodeWindows.Service;

var scriptService = new Service({
    name: 'Scrapper Script Service',
    script: resolve('./script.js'),
});
console.log(resolve('./script.js'));

// Listen for the "uninstall" event so we know when it's done.
scriptService.on('uninstall', function () {
    console.log('Script Service Uninstall complete.');
    console.log('The service exists: ', scriptService.exists);
});

// // Uninstall the service.
scriptService.uninstall();

// var cronService = new Service({
//     name: 'Cron Service',
//     script: path.join(dirname(), 'cron.js'),
// });

// // Listen for the "uninstall" event so we know when it's done.
// cronService.on('uninstall', function () {
//     console.log('Cron Service Uninstall complete.');
//     console.log('The service exists: ', cronService.exists);
// });

// // Uninstall the service.
// cronService.uninstall();
