import randomUseragent from 'random-useragent';

// Enable stealth mode
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import chromium from 'chromium';
puppeteer.use(StealthPlugin());

const USER_AGENT =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.75 Safari/537.36';

let MainBrowser;
const getBrowser = async () => {
    const MainBrowser = await puppeteer.launch({
        headless: false,
        ignoreHTTPSErrors: true,
        executablePath: chromium.path,
        args: [
            // '--no-sandbox',
            '--disable-gpu',
            '--enable-webgl',
            '--start-maximized',
        ],
    });
    return MainBrowser;
};

(async () => {
    MainBrowser = await getBrowser();
})();

export { MainBrowser };
export default async function createPage() {
    //  Randomize User agent or Set a valid one
    const userAgent = randomUseragent.getRandom();
    const UA = userAgent || USER_AGENT;
    const page = await MainBrowser.newPage();

    //  Randomize viewport size
    //   await page.setViewport({
    //     width: 1300,
    //     height: 720,
    //     deviceScaleFactor: 1
    //     // hasTouch: false,
    //     // isLandscape: false,
    //     // isMobile: false
    //   })
    await page.setViewport({ width: 1280, height: 720 });

    await page.setUserAgent(USER_AGENT);
    await page.setJavaScriptEnabled(true);
    //  await page.setDefaultNavigationTimeout(0);

    // Skip images/styles/fonts loading for performance
    //   await page.setRequestInterception(true)
    //   page.on('request', req => {
    //     if (
    //       req.resourceType() === 'stylesheet' ||
    //       req.resourceType() === 'font' ||
    //       req.resourceType() === 'image'
    //     ) {
    //       req.abort()
    //     } else {
    //       req.continue()
    //     }
    //   })

    await page.evaluateOnNewDocument(() => {
        //  Pass webdriver check
        Object.defineProperty(navigator, 'webdriver', {
            get: () => false,
        });
    });

    await page.evaluateOnNewDocument(() => {
        //  Pass chrome check
        window.chrome = {
            runtime: {},
            //  etc.
        };
    });

    //   await page.evaluateOnNewDocument(() => {
    //      Pass notifications check
    //     const originalQuery = window.navigator.permissions.query
    //     return (window.navigator.permissions.query = parameters =>
    //       parameters.name === 'notifications'
    //         ? Promise.resolve({ state: Notification.permission })
    //         : originalQuery(parameters))
    //   })

    //  await page.evaluateOnNewDocument(() => {
    //        Overwrite the `plugins` property to use a custom getter.
    //      Object.defineProperty(navigator, 'plugins', {
    //            This just needs to have `length > 0` for the current test,
    //            but we could mock the plugins too if necessary.
    //          get: () => [1, 2, 3, 4, 5],
    //      });
    //  });

    await page.evaluateOnNewDocument(() => {
        //  Overwrite the `languages` property to use a custom getter.
        Object.defineProperty(navigator, 'languages', {
            get: () => ['en-US', 'en'],
        });
    });

    return page;
}
