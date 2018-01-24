console.log('Server-side code is running');

const express = require('express');
//Body Parser is required to parse JSON data later, for the scores and usernames.
const bodyparser = require('body-parser');
const MongoClient = require('mongodb').MongoClient;
const app = express();

//Serving files from the public directory. This makes the program run using the public folder as the root directory.
app.use(express.static('public'));

//Needed to parse JSON data in the body of POST requests
app.use(bodyparser.json());

//Connects to the db and start the express server
let db;

//This URL is the coordinates for the database.
const url =  'mongodb://localhost:27017/highScores';

//Database connection. The file uses the URL and catches the errors in the console if one happens.
MongoClient.connect(url, (err, database) => {
    if(err) {
        return console.log(err);
    }
    db = database;
    // start the express web server listening on 8080
    app.listen(8080, () => {
        console.log('listening on 8080');
    });
});

//This function serves the homepage. The request part is not used as not data is passed from the client side. It sorts the data by the score variables in descending order, limit it to five, and puts it in an array, all in the db.collection line.
app.get('/fiveHighScores', (req, res) => {
    db.collection('highScores').find().sort({score:-1}).limit(5).toArray((err, result) => {
        if (err) return console.log(err);
        //if(!result) return res.send({username: MJC, score: 10}); // if no data in the DB return (0,0)
        res.send(result);
    });
});

//This is used to update the database. The new score is passed as a object, so the username and score from it are assigned to a new const, which is redirected to the database via the function-within-a-function below.
app.post('/scoreSent', (req, res) => {
    //The username and score are logged to the console before updating.
    console.log("Username: " + req.body.username);
    console.log("Score: " + req.body.score);
    const newHighScore = {
        username: req.body.username,
        score: req.body.score,
    };
    
    db.collection('highScores').save(newHighScore, (err, result) => {
        if (err) {
            return console.log(err);
        }
        console.log('score added to db');
        res.redirect('/');
    });
});