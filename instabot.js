const puppeteer = require('puppeteer-extra')

const StealthPlugin = require('puppeteer-extra-plugin-stealth')
const { default: axios } = require('axios')
puppeteer.use(StealthPlugin())

/** To get the proxy run below code

var config = {
  method: 'get',
  url: 'http://falcon.proxyrotator.com:51337/?apiKey=HNSQzPLsERg7oFbrvM2XuaG4C6DB9Vfk',
  headers: { }
};

axios(config)
.then(function (response) {
  console.log(JSON.stringify(response.data));
})
.catch(function (error) {
  console.log(error);
});

**/

exports.crawl = async (threadIds, userName, password) => {
  try {
    const browser = await puppeteer.launch({
      headless: false,
      ignoreHTTPSErrors: true,
      executablePath:
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      args: ['--proxy-server=http://66.29.128.245:17861']
    })
    const page = await browser.newPage()

    await page.setRequestInterception(true)
    page.on('request', async interceptedRequest => {
      if (interceptedRequest.isInterceptResolutionHandled()) return
      if (interceptedRequest.url().includes('png')) {
        interceptedRequest.abort()
        return
      }

      if (
        interceptedRequest
          .url()
          .includes(
            'https://www.instagram.com/api/v1/direct_v2/inbox/?persistentBadging=true'
          )
      ) {
        console.log(interceptedRequest.url())
        const response = await axios.get(
          'https://www.instagram.com/api/v1/direct_v2/inbox/?persistentBadging=true&folder=0&limit=5&thread_message_limit=10',
          { headers: interceptedRequest.headers() }
        )
        console.log(response.data.inbox?.threads)
        const threads = response.data.inbox?.threads.filter(each =>
          threadIds.includes(each.thread_id)
        )

        const videos = threads.reduce((accumulatedCodes, thread) => {
          const mediaCodes = thread.items
            .filter(msg => msg.item_type === 'media_share')
            .map(filteredMessage => ({
              video_id: filteredMessage.media_share.code,
              title: filteredMessage.media_share.caption.text,
              source: 'instagram'
            }))
          return [...accumulatedCodes, ...mediaCodes]
        }, [])

        console.log(videos)

        browser.close()
        return videos
      }

      if (interceptedRequest.isInterceptResolutionHandled()) return
      interceptedRequest.continue()
    })
    await page.goto('https://www.instagram.com/accounts/login', {
      waitUntil: 'networkidle2'
    })

    await page.waitForXPath('//*[@id="loginForm"]/div/div[1]/div/label/input')

    await page.type(
      '#loginForm > div > div:nth-child(1) > div > label > input',
      userName
    )

    await page.type(
      '#loginForm > div > div:nth-child(2) > div > label > input',
      password
    )
    await page.waitForTimeout(2000)
    const allResultsSelector =
      '#loginForm > div > div:nth-child(3) > button > div'
    await page.waitForSelector(allResultsSelector)

    await Promise.all([
      await page.click(allResultsSelector),
      await page.waitForNavigation({ waitUntil: 'networkidle0' })
    ])
    const linkHandlers = await page.$x("//button[contains(text(), 'Not Now')]")

    if (linkHandlers.length > 0) {
      await linkHandlers[0].click()
    } else {
      throw new Error('Link not found')
    }
    await page.goto(
      'https://www.instagram.com/direct/t/340282366841710300949128151362669835188',
      {
        waitUntil: 'networkidle2'
      }
    )
  } catch (error) {
    console.log(error)
  }
}
