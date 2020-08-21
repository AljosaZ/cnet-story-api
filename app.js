const express = require("express");

const app = express();

const puppeteer = require("puppeteer");

const cloudinary = require("cloudinary");

require("dotenv").config().v2;

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET,
});

app.get("/", (req, res) => {
    (async () => {
        let browser = await puppeteer.launch({
            headless: false,
            defaultViewport: {
                width: 1100,
                height: 3000,
            },
        });

        let page = await browser.newPage();
        await page.goto("https://www.cnet.com/news/", {
            waitUntil: "networkidle2",
        });

        let getLinks = await page.evaluate(() => {
            /* 
            Here I get the links for each of the news, 
            category (it is placed randomly between other tags when you open the article) 
            and URL to the main image(sometimes the article includes only a video and no image).
            The main image at this point is small, if it wasn't intended like this, I could get it in the article and catch an error if there is no image in the opened article.
            */

            const linkList = [];

            const categoryList = [];

            const imageUrlList = [];

            for (i = 1; i < 6; i++) {
                let href = document
                    .querySelector(
                        `div[section=${CSS.escape(
                            i
                        )}] > div[class="col-5 assetText"] > h3 > a[class="assetHed"]`
                    )
                    .getAttribute("href");

                newLink = "https://www.cnet.com" + href;
                linkList.push(newLink);

                let category = document.querySelector(
                    `div[section=${CSS.escape(
                        i
                    )}] > div[class="col-5 assetText"] > div[class="byline"] > a[class="topicName"]`
                ).innerText;
                categoryList.push(category);

                imageUrl = document
                    .querySelector(
                        `div[section=${CSS.escape(
                            i
                        )}] > div[class="col-2 assetThumb"] > a[class="imageLinkWrapper"] > figure[class=" img"] > img`
                    )
                    .getAttribute("src");
                imageUrlList.push(imageUrl);
            }

            return [linkList, categoryList, imageUrlList];
        });

        const fullNewsSummary = [];

        for (i = 0; i < getLinks[0].length; i++) {
            await page.goto(getLinks[0][i], { waitUntill: "networkidle2" });

            let getNewsSummary = await page.evaluate(() => {
                const newNewsContent = {};

                newNewsContent.header = document.querySelector(
                    `h1[class="speakableText"]`
                ).innerText;

                newNewsContent.summary = document.querySelector(
                    `p[class="c-head_dek"]`
                ).innerText;

                let tagnl = document.querySelectorAll("a.tag");

                let tagsList = [];

                console.log("got tags");

                for (i = 0; i < tagnl.length; i++) {
                    try {
                        tagsList.push(tagnl[i].textContent);
                    } catch (err) {
                        console.log();
                        return ["No tags could be found"];
                    }
                }

                newNewsContent.tags = tagsList;

                newNewsContent.author = document.querySelector(
                    `a[class="author"]`
                ).innerText;

                newNewsContent.publication_date = document.querySelector(
                    `time`
                ).innerText;

                return newNewsContent;
            });
            const completeNewsSummary = getNewsSummary;
            /* Adding category and imageURL at the end because they are not accessible once you open the article. */
            completeNewsSummary.category = getLinks[1][i];
            completeNewsSummary.imageUrl = getLinks[2][i];
            completeNewsSummary.URL = getLinks[0][i];

            /*  First I tried to do this with puppeteer page.screenshot, then uploading the resulting buffer with cloudinary.upload_stream.
                It worked, but I could't find a way, to get the URL of the uploaded screenshot.
                Later I found this blog https://cloudinary.com/blog/website_screenshot_creation_and_manipulation_with_url2png_and_cloudinary and it worked. 
                The url2pdf add-on only allows 50 screenshots per month in the free plan. There is a possibility to pay for more screenshots.
            */

            let screenshotURL = cloudinary.url(getLinks[0][i], {
                type: "url2png",
                sign_url: true,
            });

            completeNewsSummary.screenshot_URL = screenshotURL;

            fullNewsSummary.push(completeNewsSummary);
        }

        console.log(fullNewsSummary);
        res.json(fullNewsSummary);
    })();
});

app.listen(5000, () => {
    console.log("App listening on port 5000!");
});
