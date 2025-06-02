import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

export async function generateThumbnail(glbUrl, thumbnailPath) {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();

    const htmlPath = path.join(path.resolve(), 'utils', 'thumbnail-viewer.html');

    await page.goto(`file://${htmlPath}?model=${encodeURIComponent(glbUrl)}`, { waitUntil: 'networkidle0' });
    const canvas = await page.$('canvas');

    const screenshotBuffer = await canvas.screenshot({ type: 'png' });
    fs.writeFileSync(thumbnailPath, screenshotBuffer);

    await browser.close();
}
