
const scrapeWebsite = require('../services/scrapperservice');
const cleanText = require('../utils/textcleaner');
const generateSummary = require('../services/summaryservice');
const calculateReadingTime = require('../utils/readingtime');

const researchModel = require('../model/Research');

const index = (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
}

const research = async (req, res) => {

    try {

        const url = req.body.urlinput;

        console.log(url);

        const existingResearch = await researchModel.findOne({ url: url });

        if (existingResearch) {
            return res.send({ 'url': existingResearch.url, 'title': existingResearch.title, 'description': existingResearch.description, 'favicon': existingResearch.favicon, 'summary': existingResearch.summary, 'readingTime': existingResearch.readingTime });
        }
        else {



            const rawdata = await scrapeWebsite(url);

            const cleanedText = cleanText(rawdata.bodyText);

            const summary = generateSummary(cleanedText);
            const readingTime = calculateReadingTime(cleanedText);

            const newResearch = new researchModel({
                url: url,
                title: rawdata.title,
                description: rawdata.description,
                favicon: rawdata.favicon,
                summary: summary,
                readingTime: readingTime
            });

            await newResearch.save();
            console.log('Research saved successfully');

            res.send({ 'url': url, 'title': rawdata.title, 'description': rawdata.description, 'favicon': rawdata.favicon, 'summary': summary, 'readingTime': readingTime });

        }
    } catch (error) {
        console.error('Error saving research:', error);
        res.status(500).json({ error: 'Failed to save research' });
    }
}

module.exports = { index, research };

