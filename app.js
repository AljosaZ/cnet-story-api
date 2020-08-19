const express = require("express");

const app = express();

const puppeteer = require("puppeteer");


app.get("/", (req, res) => {
    (async () => {
        const browser = await puppeteer.launch( {headless: false, defaultViewport: {
            width: 1100,
            height: 6000
        }}
        );

        const page = await browser.newPage();
        await page.goto("https://www.cnet.com/news/", {waitUntil: "networkidle2" });
        


        let getLinks = await page.evaluate(() => {
        
        /* Here I get the links, category(random placing between other tags in the opened article) and URL to the main image(sometimes the article includes only a video and no image) */    

        let linkList = [] 

        let categoryList = []

        let imageUrlList = []

        for (i = 1; i < 6; i++) {

            let href = document.querySelector(`div[section=${CSS.escape(i)}] > div[class="col-5 assetText"] > h3 > a[class="assetHed"]`).getAttribute("href");
            newLink = "https://www.cnet.com" + href
            linkList.push(newLink)

            let category = document.querySelector(`div[section=${CSS.escape(i)}] > div[class="col-5 assetText"] > div[class="byline"] > a[class="topicName"]`).innerText;
            categoryList.push(category)

            imageUrl = document.querySelector(`div[section=${CSS.escape(i)}] > div[class="col-2 assetThumb"] > a[class="imageLinkWrapper"] > figure[class=" img"] > img`).getAttribute("src");
            imageUrlList.push(imageUrl)
        }

        return [linkList, categoryList, imageUrlList] 

        });

        let fullNewsSummary = []

        for (i = 0; i < getLinks[0].length; i++) { 

            await page.goto(getLinks[0][i], {waitUntill: "networkidle2"});
           
            let getNewsSummary = await page.evaluate(() => {

                let newNewsContent = {}

                newNewsContent.header = document.querySelector(`h1[class="speakableText"]`).innerText; 

                newNewsContent.summary = document.querySelector(`p[class="c-head_dek"]`).innerText;

                let tagnl = document.querySelectorAll("a.tag")

                let tagsList = []

                for (i = 0; i < tagnl.length; i++){
                    tagsList.push(tagnl[i].textContent)
                }

                newNewsContent.tags = tagsList

                newNewsContent.author = document.querySelector(`a[class="author"]`).innerText;

                newNewsContent.publication_date = document.querySelector(`time`).innerText;

                return newNewsContent
            }) 

            let completeNewsSummary = getNewsSummary
            /* Adding category and imageURL at the end because they are not accessible in the article. */
            completeNewsSummary.category = getLinks[1][i]
            completeNewsSummary.imageUrl = getLinks[2][i]
            completeNewsSummary.URL = getLinks[0][i]

            fullNewsSummary.push(completeNewsSummary)
        }

    console.log(fullNewsSummary)
    res.json(fullNewsSummary)
    })(); 

}) 

app.listen(5000, () => {
    console.log("App listening on port 5000!")
})