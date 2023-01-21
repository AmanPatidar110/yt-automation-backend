// puppeteer imports ======================

import chromium from 'chromium';
import createPage from '../Utility/getPage';

// sample video id = https://www.instagram.com/reels/videos/CmNwJ45v4zw/

export const getVideoUrlFromInstaId = async (videoId) => {
    try {
        const page = await createPage();
        await page.goto(
            'https://saveinsta.app/en/instagram-reels-video-download',
            {
                waitUntil: 'networkidle2',
            }
        );
        const input = '#s_input';
        await page.waitForSelector(input);
        await page.type(
            input,
            `https://www.instagram.com/reels/videos/${videoId}/`
        );
        await page.click('button.btn:nth-child(2)');
        await page.waitForXPath('//*[@id="closeModalBtn"]');
        await page.waitForTimeout(3000);
        // await page.click('//*[@id="closeModalBtn"]');
        await page.waitForXPath(
            '/html/body/div[1]/div[1]/div/div/div[3]/ul/li[1]/div/div[2]/a'
        );

        const handle = await page.$('.abutton');
        const videoURL = await page.evaluate(
            (anchor) => anchor.getAttribute('href'),
            handle
        );
        console.log(videoURL);
        browser.close();
        return videoURL;
    } catch (error) {
        console.log(error);
    }
};

export const getVideoUrlFromTiktokVideoId = async (page, videoId, user) => {
    try {
        await page.goto('https://tiktokdownload.online/', {
            waitUntil: 'networkidle2',
        });
        const input = '#main_page_text';
        await page.waitForSelector(input);
        await page.type(
            input,
            `https://www.tiktok.com/@${user}/video/${videoId}`,
            {
                delay: 60,
            }
        );
        await page.waitForTimeout(2000);

        await page.keyboard.press('Enter');
        await page.waitForTimeout(5000);
        await page.waitForXPath('//*[@id="mainpicture"]/div/div/a[1]');
        await page.waitForTimeout(1000);
        const href = await page.$eval(
            '#mainpicture > div > div > a.pure-button:nth-child(1)',
            (elm) => elm.href
        );

        return href;
    } catch (error) {
        console.log(error);
    }
};
