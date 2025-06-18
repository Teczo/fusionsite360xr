import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

export async function generateThumbnail(glbUrl, thumbnailPath) {
    const htmlPath = path.join(path.resolve(), 'utils', 'thumbnail-viewer.html');

    if (!fs.existsSync(htmlPath)) {
        console.error("❌ Viewer HTML not found:", htmlPath);
        throw new Error('thumbnail-viewer.html is missing');
    }

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 512, height: 512 });

        const viewerUrl = `file://${htmlPath}?model=${encodeURIComponent(glbUrl)}`;
        console.log("🧭 Thumbnail viewer URL:", viewerUrl);

        await page.goto(viewerUrl, { waitUntil: 'networkidle0', timeout: 10000 });

        // Wait for canvas to be available
        await page.waitForSelector('canvas', { timeout: 5000 });

        const canvas = await page.$('canvas');
        if (!canvas) {
            throw new Error('❌ No canvas found on viewer page');
        }

        // Optional delay to allow 3D scene to render
        await page.waitForTimeout(1000);

        const screenshotBuffer = await canvas.screenshot({ type: 'png' });
        fs.writeFileSync(thumbnailPath, screenshotBuffer);
        console.log(`✅ Thumbnail saved at: ${thumbnailPath}`);

    } catch (err) {
        console.error('❌ Failed to generate thumbnail:', err.message);
        throw err;
    } finally {
        await browser.close();
    }
}
