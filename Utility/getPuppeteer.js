import Chromium from 'chrome-aws-lambda'
import { addExtra } from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

const puppeteerExtra = addExtra(Chromium.puppeteer)
puppeteerExtra.use(StealthPlugin())

export { puppeteerExtra }
