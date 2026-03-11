require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const Research = require('./model/Research');
const scrapeWebsite = require('./services/scrapperservice');
const cleanText = require('./utils/textcleaner');
const generateSummary = require('./services/summaryservice');
const calculateReadingTime = require('./utils/readingtime');

const urlvalidator = require('./middlewares/urlvalidator')

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('path', __dirname + '/public');


const connectDB= require('./config/db');

connectDB();

app.get('/', (req, res) => {
 res.sendFile(__dirname + '/public/index.html');
}   );

app.post('/research',urlvalidator, async (req, res) => {

    try {

const url = req.body.urlinput;
console.log(url);
const rawdata = await scrapeWebsite(url);

const cleanedText = cleanText(rawdata.bodyText);
const summary = generateSummary(cleanedText);
const readingTime = calculateReadingTime(cleanedText);





res.json({'url': url,'title': rawdata.title, 'description': rawdata.description, 'favicon': rawdata.favicon, 'summary': summary, 'reading_time': readingTime });


}catch (error) {
        console.error('Error saving research:',error);
        res.status(500).json({ error: 'Failed to save research' });
    }
}
)

app.listen(port, () => {  console.log(`Server is running on port ${port}`);
});
