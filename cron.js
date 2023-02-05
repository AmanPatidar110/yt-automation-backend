import axios from 'axios';
import cron from 'node-cron';

export const runCron = () => {
    console.log('Scheduling crons');
    cron.schedule('0 * * * *', async () => {
        console.log('Hitting /upload for:', 'abhishek.deoghar@proton.me');

        var config = {
            method: 'get',
            url: `http://localhost:4000/upload?email=abhishek.deoghar@proton.me&forUser=ABHISHEK&targetUploadCount=${Math.floor(Math.random() * 6) + 1}`,
        };

        const response = await axios(config);
        console.log(response.data);
    });

    // cron.schedule('15 * * * *', async () => {
    //     console.log('Hitting /upload for:', 'amanpatidar110@gmail.com');

    //     var config = {
    //         method: 'get',
    //         url: 'http://localhost:4000/upload?email=amanpatidar110@gmail.com&forUser=AMAN&targetUploadCount=3',
    //     };

    //     const response = await axios(config);
    //     console.log(response.data);
    // });

    // cron.schedule('30 * * * *', async () => {
    //     console.log('Hitting /upload for:', 'theurbandenizens@gmail.com');

    //     var config = {
    //         method: 'get',
    //         url: 'http://localhost:4000/upload?email=theurbandenizens@gmail.com&forUser=AMAN&targetUploadCount=3',
    //     };

    //     const response = await axios(config);
    //     console.log(response.data);
    // });

    // cron.schedule('45 * * * *', async () => {
    //     console.log('Hitting /upload for:', 'aamanpatidar110@gmail.com');

    //     var config = {
    //         method: 'get',
    //         url: 'http://localhost:4000/upload?email=aamanpatidar110@gmail.com&forUser=AMAN&targetUploadCount=3',
    //     };

    //     const response = await axios(config);
    //     console.log(response.data);
    // });

    // cron.schedule('0 1,17 * * *', async () => {
    //     console.log(
    //         'Hitting /fetch_insta_messages for:',
    //         'aamanpatidar110@gmail.com'
    //     );

    //     var config = {
    //         method: 'POST',
    //         url: 'http://localhost:4000/insta/fetch_messages_from_insta',
    //         data: {
    //             forUser: 'AMAN',
    //             instaCredId: 'aamanpatidar110@gmail.com',
    //             forChannelEmail: 'amanpatidar110@gmail.com',
    //         },
    //     };

    //     const response = await axios(config);
    //     console.log(response.data);
    // });
};
