const scrapeWebsite = require('../services/scrapperservice');
const cleanText = require('../utils/textcleaner');
const generateSummary = require('../services/summaryservice');
const calculateReadingTime = require('../utils/readingtime');
const extractKeywords = require('../utils/keywordextractor');

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
            return res.send({
                'url': existingResearch.url,
                'title': existingResearch.title,
                'description': existingResearch.description,
                'favicon': existingResearch.favicon,
                'summary': existingResearch.summary,
                'keypoints': existingResearch.keypoints || [],
                'keywords': existingResearch.keywords || [],
                'readingTime': existingResearch.readingTime
            });
        }
        else {

            const rawdata = await scrapeWebsite(url);

            const cleanedText = cleanText(rawdata.bodyText);

            if (!cleanedText || cleanedText.length < 50) {
                throw new Error('Insufficient content extracted from the page. The page might be empty or not accessible.');
            }

            let summary = 'Summary generation failed.';
            try {
                summary = await generateSummary(cleanedText);
            } catch (sumErr) {
                console.warn('Summary generation failed:', sumErr.message);
            }

            const readingTime = calculateReadingTime(cleanedText);

            let keywords = [];
            try {
                keywords = extractKeywords(cleanedText);
            } catch (keyErr) {
                console.warn('Keyword extraction failed:', keyErr.message);
            }

            const keypoints = rawdata.headers || [];

            const newResearch = new researchModel({
                url: url,
                title: rawdata.title,
                description: rawdata.description,
                favicon: rawdata.favicon,
                summary: summary,
                keypoints: keypoints,
                keywords: keywords,
                readingTime: readingTime
            });

            await newResearch.save();
            console.log('Research saved successfully');

            res.send({
                'url': url,
                'title': rawdata.title,
                'description': rawdata.description,
                'favicon': rawdata.favicon,
                'summary': summary,
                'keypoints': keypoints,
                'keywords': keywords,
                'readingTime': readingTime
            });

        }
    } catch (error) {
        console.error('Error saving research:', error);
        if (error.message.includes('Page not available')) {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to analyze website. Please check the URL and try again.' });
    }
}

module.exports = { index, research };

