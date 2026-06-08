import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="512" height="512" style="background-color: white;">
  <path d="M12 2L22 20H2L12 2Z" fill="black" />
</svg>
`;

async function generateIcons() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // Set HTML content to just the SVG, making sure body has 0 margin
    await page.setContent(`
        <html>
            <body style="margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; width: 100vw; height: 100vh;">
                ${svgContent}
            </body>
        </html>
    `);

    const sizes = [192, 512, 180];
    const names = ['pwa-192x192.png', 'pwa-512x512.png', 'apple-touch-icon-180x180.png'];

    for (let i = 0; i < sizes.length; i++) {
        const size = sizes[i];
        const name = names[i];
        
        await page.setViewport({ width: size, height: size });
        const element = await page.$('svg');
        await element.evaluate((el, s) => {
            el.setAttribute('width', s);
            el.setAttribute('height', s);
        }, size);
        
        await page.screenshot({
            path: path.join(process.cwd(), 'public', name),
            clip: { x: 0, y: 0, width: size, height: size }
        });
        console.log(`Generated ${name}`);
    }

    await browser.close();
}

generateIcons().catch(console.error);
