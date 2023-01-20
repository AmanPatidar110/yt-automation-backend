import puppeteerRaw from 'puppeteer'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import axios from 'axios'

import { uploadVideosOnFirestore } from './Controllers/fireStoreUpload.controller.js'
import { db } from './firebase.js'
import chromium from 'chromium'
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

export const crawl = async (
  threadIds,
  userName,
  password,
  forChannelEmail,
  forUser
) => {
  let FETCH_COUNT = 0
  try {
    const channelRef = db.collection('channels').doc(forChannelEmail)
    const channel = (await channelRef.get()).data()

    const browser = await puppeteer.launch({
      headless: true,
      ignoreHTTPSErrors: true,
      executablePath: chromium.path,
      args: ['--no-sandbox']
      // args: ["--proxy-server=http://66.29.128.245:17861"],
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
        const videos = []
        for (const threadId of threadIds) {
          const response = await axios.get(
            `https://www.instagram.com/api/v1/direct_v2/threads/${threadId}/`,
            { headers: interceptedRequest.headers() }
          )
          const threadVideos = response.data?.thread?.items
            ?.filter(each => ['clip', 'media_share'].includes(each.item_type))
            .map(item => ({
              video_id: item?.clip?.clip?.code || item?.media_share?.code,
              title:
                item?.clip?.clip?.caption?.text ||
                item?.media_share?.caption?.text,
              author: {
                unique_id: item?.media_share?.user?.username || 'instagram_user'
              }
            }))

          videos.push(threadVideos)
        }
        console.log(videos, videos.flat().length)

        FETCH_COUNT = await uploadVideosOnFirestore(
          videos.flat(),
          forChannelEmail,
          '',
          'INSTAGRAM',
          FETCH_COUNT,
          forUser,
          channel.keywords
        )
        await browser.close()
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
      await page.waitForNavigation({ waitUntil: 'networkidle2' })
    ])
    await page.waitForTimeout(4000)
    const linkHandlers = await page.$x("//button[contains(text(), 'Not Now')]")

    if (linkHandlers.length > 0) {
      await linkHandlers[0].click()
    } else {
      throw new Error('Link not found')
    }
    await page.goto('https://www.instagram.com/direct/inbox/', {
      waitUntil: 'networkidle2'
    })

    return FETCH_COUNT
  } catch (error) {
    console.log(error)
  }
}
