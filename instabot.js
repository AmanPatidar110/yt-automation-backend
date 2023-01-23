import axios from 'axios';

import { apiServiceUrl } from './Utility/api-service.js';
import { getChannel, updateVideos } from './Utility/firebaseUtilFunctions.js';
import createPage, { getBrowser } from './Utility/getPage.js';

/** To get the proxy run below code

var config = {
  method: 'get',
  url: 'http://falcon.proxyrotator.com:51337/?apiKey=HNSQzPLsERg7oFbrvM2XuaG4C6DB9Vfk',
  headers: { }
};

axios(config)
.then(function (response) {
  messageTransport.log(JSON.stringify(response.data));
})
.catch(function (error) {
  messageTransport.log(error.message || error);
console.log(error)
});

**/

export const crawl = async (
    threadIds,
    userName,
    password,
    forChannelEmail,
    forUser,
    messageTransport
) => {
    let FETCH_COUNT = 0;
    let browser;
    try {
        const channelResponse = await getChannel(
            forChannelEmail,
            messageTransport
        );
        const channel = channelResponse.data.channel;

        browser = await getBrowser();
        const page = await createPage(browser);

        await page.setRequestInterception(true);
        page.on('request', async (interceptedRequest) => {
            if (interceptedRequest.isInterceptResolutionHandled()) return;
            if (interceptedRequest.url().includes('png')) {
                interceptedRequest.abort();
                return;
            }

            if (
                interceptedRequest
                    .url()
                    .includes(
                        'https://www.instagram.com/api/v1/direct_v2/inbox/?persistentBadging=true'
                    )
            ) {
                messageTransport.log(interceptedRequest.url());
                const videos = [];
                for (const threadId of threadIds) {
                    messageTransport.log('Fetching thread: ' + threadId);

                    const response = await axios.request({
                        method: 'GET',
                        url: `https://www.instagram.com/api/v1/direct_v2/threads/${threadId}/`,
                        headers: interceptedRequest.headers(),
                    });
                    const threadVideos = response.data?.thread?.items
                        ?.filter((each) =>
                            ['clip', 'media_share'].includes(each.item_type)
                        )
                        .map((item) => ({
                            video_id:
                                item?.clip?.clip?.code ||
                                item?.media_share?.code,
                            title:
                                item?.clip?.clip?.caption?.text ||
                                item?.media_share?.caption?.text ||
                                'Youtube shorts',
                            author: {
                                unique_id:
                                    item?.media_share?.user?.username ||
                                    'instagram_user',
                            },
                        }));

                    videos.push(threadVideos);
                }
                messageTransport.log(videos.flat().length);
                messageTransport.log('Uploading videos on firbase.');

                const uploadResponse = await updateVideos(
                    videos.flat(),
                    forChannelEmail,
                    '',
                    'INSTAGRAM',
                    channel?.keywords,
                    forUser,
                    FETCH_COUNT,
                    messageTransport
                );

                FETCH_COUNT = uploadResponse.data.FETCH_COUNT;
                messageTransport.log(uploadResponse.data.msg);
                messageTransport.log('Closing browser');
                if (browser) {
                    await browser.close();
                }
            }

            if (interceptedRequest.isInterceptResolutionHandled()) return;
            interceptedRequest.continue();
        });
        await page.goto('https://www.instagram.com/accounts/login', {
            waitUntil: 'networkidle2',
        });

        await page.waitForXPath(
            '//*[@id="loginForm"]/div/div[1]/div/label/input'
        );

        await page.type(
            '#loginForm > div > div:nth-child(1) > div > label > input',
            userName
        );

        await page.type(
            '#loginForm > div > div:nth-child(2) > div > label > input',
            password
        );
        await page.waitForTimeout(2000);
        const allResultsSelector =
            '#loginForm > div > div:nth-child(3) > button > div';
        await page.waitForSelector(allResultsSelector);

        await Promise.all([
            await page.click(allResultsSelector),
            await page.waitForNavigation({ waitUntil: 'networkidle2' }),
        ]);
        await page.waitForTimeout(4000);
        const linkHandlers = await page.$x(
            "//button[contains(text(), 'Not Now')]"
        );

        if (linkHandlers.length > 0) {
            await linkHandlers[0].click();
        } else {
            messageTransport.log('Link not found');
        }
        messageTransport.log('Goto: INBOX!');
        await page.goto('https://www.instagram.com/direct/inbox/', {
            waitUntil: 'networkidle2',
        });
        return FETCH_COUNT;
    } catch (error) {
        if (browser) {
            browser.close();
        }
        messageTransport.log(error.message || error);
        console.log(error);
    }
};
