const express = require('express');
const router = express.Router();
const axios = require('axios');
const nodemailer = require('nodemailer');
const {WebhookClient} = require('dialogflow-fulfillment');

router.get('/', (req, res, next) => {
    res.send(`Server is up and running.`);
});

router.post('/webhook', (req, res, next) => {

    const agent = new WebhookClient({request: req, response: res});

    // console.log('Dialogflow Request headers >> ' + JSON.stringify(req.headers));
    // console.log('Dialogflow Request body >> ' + JSON.stringify(req.body));

    let intentMap = new Map();

    intentMap.set('CalculateResult-yes', calculateResult);
    intentMap.set('SendTranscriptEmail-yes', sendTranscriptEmail);

    agent.handleRequest(intentMap);

    function calculateResult(agent) {
        let contexts = agent.contexts;
        let scoreObject = contexts.find(item => item.name === 'session-vars');
        let {score1, score2, score3, score4, score5} = scoreObject.parameters;
        let score = parseInt(score1) + parseInt(score2) + parseInt(score3) + parseInt(score4) + parseInt(score5);
        let percentage = score / 5 * 100;
        let context = {
            name: 'quiz_result',
            lifespan: 99,
            parameters: {
                score: score,
                percentage: percentage
            }
        };
        agent.setContext(context);
        let response = `You answered all 5 questions, ${score} out of 5 was correct, your score is ${percentage}% \n Do you want me to send your transcript in your email?`;
        return agent.add(response);
    }

    function sendTranscriptEmail(agent) {
        let context = agent.context.get('quiz_result');
        let parameters = agent.parameters;
        let payload = {context, parameters};
        return sendEmail(payload)
            .then(res => {
                console.log(`Email response result: ${res}`);
                return agent.add(`Your result is also sent you in your email see you next time bye`);
            })
            .catch(err => {
                console.log(`Error in sending email: ${res}`);
                return agent.add(`Error in sending email ${err}`);
            });
    }

    function sendEmail(payload) {
        return new Promise((resolve, reject) => {
            let transporter = nodemailer.createTransport({
                host: 'smtp.googlemail.com',
                port: 465,
                secure: true,
                auth: {
                    user: process.env.user,
                    pass: process.env.pass
                }
            });
            let mailOptions = {
                from: '"Dialogflow Quiz" <quiz@dialogflow.com>',
                to: payload.parameters.email,
                subject: 'Quiz Result',
                text: `Your score is ${payload.context.parameters.percentage}%, ${payload.context.parameters.score} out of 5 questions was correct`,
                html: `Your score is ${payload.context.parameters.percentage}%, ${payload.context.parameters.score} out of 5 questions was correct`
            };
            transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                    return reject(error);
                }
                return resolve(info.response);
            });
        })
    }
});

module.exports = router;
