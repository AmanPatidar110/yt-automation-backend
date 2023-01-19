const Puppeteer = require('puppeteer-extra')
const UserAgentPlugin = require('puppeteer-extra-plugin-anonymize-ua')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
const Delay = require('delay')
const FS = require('fs')
const FSExtra = require('fs-extra')
const { getElement } = require('./helpers/getElement.js')

const CHROMIUM_MAC_PATH =
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const CHROMIUM_UBUNTU_PATH = '/usr/bin/chromium-browser'
const CHROMIUM_WINDOWS_PATH = String.raw`C:\Program Files\Google\Chrome\Application`

const UPLOAD_PRIVACY_PUBLIC = 'PUBLIC'
const UPLOAD_PRIVACY_PRIVATE = 'PRIVATE'
const UPLOAD_PRIVACY_UNLISTED = 'UNLISTED'

Puppeteer.use(StealthPlugin())
Puppeteer.use(UserAgentPlugin({ makeWindows: true }))

const rootDir = `${process.cwd()}/browser` // TODO: Make the "Browser" folder appear in temp folder or something

class YoutubeUploader {
  Browser
  MainPage
  privacy
  chromiumPath
  display

  constructor (
    chromiumPath = CHROMIUM_MAC_PATH |
      CHROMIUM_UBUNTU_PATH |
      CHROMIUM_WINDOWS_PATH,
    privacy = UPLOAD_PRIVACY_PUBLIC |
      UPLOAD_PRIVACY_PRIVATE |
      UPLOAD_PRIVACY_UNLISTED,
    display = ''
  ) {
    this.chromiumPath = chromiumPath
    this.display = display
    this.privacy = privacy
  }

  // For opening the chromium browser
  OpenBrowser = async directory => {
    try {
      console.log('Launching browser')
      return await Puppeteer.launch({
        headless: false,
        defaultViewport: null,
        userDataDir: directory,
        ignoreDefaultArgs: ['--disable-extensions'],
        executablePath: this.chromiumPath,
        env: {
          DISPLAY: this.display
        }
      })
    } catch (err) {
      console.log(err)
    }
  }

  // For close the browser at the end
  CloseBrowser = async () => {
    try {
      console.log('Closing browser')

      await this.MainPage.close()
      await this.Browser.close()
      FSExtra.removeSync(rootDir)
    } catch (err) {
      // Handle properly later
      console.log(err)
    }
  }

  // For logging you into youtube studio
  Login = async (Email, Password) => {
    try {
      console.log('Logging in')

      FSExtra.removeSync(rootDir)
      this.Browser = await this.OpenBrowser(rootDir)
      this.MainPage = await this.Browser.newPage()
      await this.MainPage.goto('https://studio.youtube.com/')
      console.log('Typing email')

      await this.MainPage.type('input[type="email"]', Email, {
        delay: 100
      })
      await this.MainPage.keyboard.press('Enter')
      await Delay(3000)
      console.log('Waiting for password input')
      // await this.MainPage.waitForNetworkIdle({ idleTime: 2000 })
      await getElement('input[type="password"]', this.MainPage, true)
      console.log('Typing password')
      await this.MainPage.type('input[type="password"]', Password, {
        delay: 60
      })
      await this.MainPage.keyboard.press('Enter')
      await Delay(3000)

      await this.MainPage.waitForNavigation()
    } catch (err) {
      return console.log(err)
    }
  }

  // For uploading your video
  UploadVideos = async videos => {
    let UPLOAD_COUNT = 0
    for (let video of videos) {
      const { Video, Title, Description, Thumbnails, onSuccess, Tags } = video
      // guard clauses
      if (!Video.length) {
        throw new Error('Video source cannot be empty.')
      } else if (!FS.existsSync(Video)) {
        throw new Error(`Cannot find video at: ${Video}`)
      }

      try {
        await Delay(5000)
        await this.MainPage.goto('https://youtube.com/upload/')

        // Upload video
        const submitFileBtn = await getElement(
          '#content > input[type=file]',
          this.MainPage,
          true
        )
        await submitFileBtn.uploadFile(Video)

        await Delay(2000)
        const popupExists = await this.MainPage.$eval(
          '#close-button > div',
          () => true
        ).catch(() => false)
        if (popupExists) {
          const popup = await getElement('#close-button > div', this.MainPage)
          await popup.click()
        }

        // Import title
        await this.MainPage.waitForFunction(
          'document.querySelectorAll(\'[id="textbox"]\').length > 1'
        )
        const textBoxes = await this.MainPage.$x('//*[@id="textbox"]')
        await this.MainPage.bringToFront()
        // Add the title value
        await textBoxes[0].focus()
        await this.MainPage.waitForTimeout(1000)
        await textBoxes[0].evaluate(e => (e.__shady_native_textContent = ''))
        await textBoxes[0].type(Title.substring(0, 80), {
          delay: 20
        })

        // Add the Description content
        await textBoxes[0].evaluate(e => (e.__shady_native_textContent = ''))
        await textBoxes[1].type(Description.substring(0, 4950), {
          delay: 20
        })

        if (Thumbnails) {
          // Import thumbnails
          const submitFileThumbnails = await getElement(
            'input[id="file-loader"]',
            this.MainPage,
            true
          )
          await submitFileThumbnails.uploadFile(Thumbnails)
          await Delay(2000)
        }

        // Make it not for kids
        const ageRestrictionEl = await getElement(
          'tp-yt-paper-radio-button[name="VIDEO_MADE_FOR_KIDS_NOT_MFK"]',
          this.MainPage
        )

        await ageRestrictionEl.click()
        await Delay(1000)

        // Show more meta
        const moreBtn = await getElement(
          'ytcp-button[id="toggle-button"]',
          this.MainPage,
          true
        )
        await moreBtn.click()
        await Delay(3000)

        // Import Tags
        const inputTags = await getElement(
          'ytcp-form-input-container[id="tags-container"]',
          this.MainPage,
          true
        )
        inputTags.click()
        await Delay(800)
        await this.MainPage.evaluate(() =>
          document.execCommand('selectall', false, null)
        )
        await Delay(1000)
        await this.MainPage.keyboard.type(Tags.substr(0, 500), {
          delay: 30
        })
        await Delay(1000)

        // Keep clicking next till the end
        const nextBtn = await getElement(
          'ytcp-button[id="next-button"]',
          this.MainPage
        )

        let PrivacyText = await getElement(
          `tp-yt-paper-radio-button[name="${this.privacy}"]`,
          this.MainPage
        )

        while (!PrivacyText) {
          await nextBtn.click()
          await Delay(4000)
          PrivacyText = await getElement(
            `tp-yt-paper-radio-button[name="${this.privacy}"]`,
            this.MainPage
          )
        }

        // Make video public/private
        const privacyBtn = await getElement(
          `tp-yt-paper-radio-button[name="${this.privacy}"]`,
          this.MainPage
        )

        await privacyBtn.click()
        await Delay(3000)

        // Publish video
        const publishBtn = await getElement(
          'ytcp-button[id="done-button"]',
          this.MainPage
        )

        await publishBtn.click()
        if (this.privacy === 'PUBLIC') {
          // Close popup
          const closeBtn = await getElement(
            'ytcp-button[id="close-button"]',
            this.MainPage,
            true
          )
          await closeBtn.click()
        }

        await this.MainPage.waitForNavigation()
        await this.MainPage.waitForTimeout(200)
        await onSuccess()
        UPLOAD_COUNT++
      } catch (err) {
        console.log(err)
      }
    }
    return UPLOAD_COUNT
  }
}
module.exports = YoutubeUploader
