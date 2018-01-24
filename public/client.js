console.log('Client-side code running');

//Game variables declared with "const" are to be constant, with their values locked, so they can't be changed by the application. Spaces are used to roughly seperate them by category.
const   canvasWidth = 1280, //The canvas dimensions are fixed
        canvasHeight = 720,

        //The various lines for display text labels are fixed.
        startUpTextLine1 = 'Welcome to Breakout. Press Enter to start the game.',
        startUpTextLine2 = 'Use the Left & Right Arrow Keys to move.',
        startUpTextLine3 = 'Use Space to launch the ball.',
        startUpTextLine4 = 'Aim for a Top 5 Score to get on the Leaderboard!',
        scoreText = 'Score: ',
        highScoreText = 'High Score: ',
        livesText = 'Lives: ',
        loopText = 'Loop: ',
        inputUsernameText = 'Type your Username and press enter to record your score on the leaderboard.',

        usernameSubmitButton = document.getElementById('myButton'), //Used as an event listener later when submitting the username for score submission

        defaultHighScores = [["MJC", 13], ["MJC", 11], ["MJC", 19], ["MJC", 7], ["MJC", 5]], //Used when no database scores exist

        ballRadius = 25,
        ballColor = '#' + ("000000" + Math.random().toString(16).slice(2, 8).toUpperCase()).slice(-6), //The ball's color is randomized for visual variety

        //The paddle's variables are mostly fixed, excepting later movement.
        paddleWidth = 200,
        paddleHeight = 32,
        paddleStartingX = canvasWidth/2 - paddleWidth/2,
        paddleStartingY = canvasHeight - (paddleHeight*1.25),
        paddleColor = '#' + ("000000" + Math.random().toString(16).slice(2, 8).toUpperCase()).slice(-6), //For variety, the paddle's color is randomized too

        maxBounceAngle = 5*Math.PI / 12, //Prevents the ball from bouncing too much off

        //Used when creating the Brick objects to properly display them with appropiate spaces, offset and size.
        brickWidth = 96,
        brickHeight = 32,
        brickRowCount = 7,
        brickColumnCount = 10,
        brickPaddingWidth = 12,
        brickPaddingHeight = 12,
        brickOffsetLeft = 100,
        brickOffsetTop = 80,

        powerUpColor = '#ff6600'; //The ball's color is randomized for visual variety

//The variables declared with "let" are changed periodically throughout. Spaces are used to seperate them roughly by category.
let     gameRunning = "false", //The game state variable used to check what to draw

        lives,
        score,
        highScore,
        loop, //Loop or level
        //username, //username to POST to the database
        usernameInput, //value grabbed from the DOM
        
        topFiveScores, //An array that holds the scores to display
        
        ball, //Holds the ball object
        ballXSpeed = 5, //The ball speed increase with every loop
        ballYSpeed = 5,
        
        paddle, //Holds the paddle object
        currentPaddleX = paddleStartingX, //Paddle positions
        currentPaddleY = paddleStartingY,
        paddleSpeedX = 0, //speed of the paddle to move
        
        relativeBallPaddleIntersect,
        bounceAngle, //These two are used when rebounding the ball off the paddle, to calculate the angle
        
        bricks = [], //Will hold a nested array of brick objects
    
        powerUp;

//In P5, setup runs upon startup. I have it create the canvas, set it to be black, and run the high score fetching.
function setup() {
    console.log("setup");
    createCanvas(1280, 720);
    background(0);
    fetchHighScores();
}

//startUpScreen mostly displays text. It starts with the lines explaining the game's objectives and how to start playing it.
function startUpScreen() {
    textSize(32);
    textAlign(CENTER);
    fill(0, 102, 153);
    text(startUpTextLine1, 640, 510);
    text(startUpTextLine2, 640, 550);
    text(startUpTextLine3, 640, 590);
    text(startUpTextLine4, 640, 630);
   
    /*topFiveScores.sort(function(first, last) {
        return last.score-first.score;
    });
    while (topFiveScores.length > 5) {
        topFiveScores.pop();
    }*/
    if (topFiveScores == null) {
        topFiveScores = defaultHighScores;
    }
    //console.log(topFiveScores);
    text("High Scores", 640, 60);
    //The for loop goes through the five scores in the array, using.username/score to get to the info directly rather then going three steps into the array and confusing it. Increasing the y value proportional to count ensures proper formatting for the scores being displayed.
    for (count = 0; count < topFiveScores.length; count++) {
        text(topFiveScores[count].username + ": " + topFiveScores[count].score, 640, (100+count*40));
    }
    console.log(topFiveScores.length);
}

//fetchHighScores gets the high scores, which are sorted and limited on the server side, and assigns them to topFiveScores for displaying later. The response is a JSON given the data that must be grabbed.
function fetchHighScores() {
    fetch('/fiveHighScores', {method: 'GET'})
        .then(function(response) {
            if(response.ok) return response.json();
            throw new Error('Request failed.');
        })
        .then(function(data) {
            console.log(data);
            
            topFiveScores = data;
            //StartUpScreen is run at this point only after the scores have been retrieved. Were it run at the same time as this function, the scores would be displayed on the startUpScreen before the data had been retrieved, meaning the scores wouldn't be shown.
            startUpScreen();
        })
        .catch(function(error) {
            console.log(error);
        });
};

//gameSetup doesn't run the game, but it does change the necessary variable and assign object creation to the ball and paddle, and create the bricks.
function gameSetup() {
    lives = 2;
    loop = 1;
    score = 0;
    
    highScore = topFiveScores[0].score;
    
    ball = new Ball();
    paddle = new Paddle();
    powerUp = new PowerUp();
    console.log("brick array filled");
    createBricks();
}

//This function fills the Array that holds the bricks. Using the const coordinates in determining the brick positions, it assigns the bricks ror-by-row within the array that houses each column.
function createBricks() {
    for (let column = 0; column < brickColumnCount; column++) {
        bricks[column] = [];
        for (let row = 0; row < brickRowCount; row++) {
            //bricks[column][row] = {x: 0, y: 0, visible: true};
            bricks[column].push ( new Brick(column, row) );
            console.log("brick created");
        }
    }
}

//The draw function is kind of like updating the canvas, updating the visual canvas and the gameplay mechanisms at a frequent rate. It runs in P5 constantly.
function draw() {
    //If statements check the game state variable to know what to draw. GameRunning is the main state.
    if (gameRunning == "true") {
        
        //The background is redrawn.
        background(0);
        
        //This loop draws the bricks. It only draws those whose variables are set to true, which is false if the brick has been hit.
        for (let column = 0; column < bricks.length; column++) {
            for (var row = 0; row < bricks[column].length; row++) {
                if (bricks[column][row].visible === true){
                    bricks[column][row].draw();
                }
            }
        }
        
        //This runs when the field is empty of bricks, resetting the field, and incrementing the level.
        if (score % 70 == 0 && bricks[1][1].visible != true) {
            //It resets all bricks back to visible, so they appear once again.
            for (let column = 0; column < bricks.length; column++) {
                for (var row = 0; row < bricks[column].length; row++) {
                        bricks[column][row].visible = true;
                }
            }
            //The gae increments the loop, puts the ball back on the paddle, resets the powerup and ball color, and increases the ball speed.
            console.log("New Field");
            ball.ballOnPaddle = true;
            ball.fill = ballColor;
            powerUp.visible = true;
            loop++;
            ballXspeed = ballXSpeed * 1.5;
            ballYSpeed = ballYSpeed * 1.5;
            ball.vx = ballXSpeed;
            ball.vy = ballYSpeed;
        }
        
        //Check for Key Presses
        keyPresses();

        //The ball and paddle and powerUp are drawn and moved.
        ball.draw();
        ball.move();
        paddle.draw();
        paddle.move();
        powerUp.draw();
        powerUp.move();
        //This checks whether the ball is touching the paddle in any way. If so, it runs the paddle collosion function.
        if ((ball.x + ballRadius) >= currentPaddleX &&
            (ball.x - ballRadius) <= currentPaddleX+paddleWidth &&
            (ball.y + ballRadius) >= currentPaddleY &&
            (ball.y - ballRadius) <= currentPaddleY+paddleHeight) {
            ballPaddleCollide();
        }
        
        if ((ball.x + ballRadius) >= (powerUp.x-ballRadius) &&
            (ball.x - ballRadius) <= (powerUp.x+ballRadius) &&
            (ball.y + ballRadius) >= (powerUp.y-ballRadius) &&
            (ball.y - ballRadius) <= (powerUp.y+ballRadius)) {
            ballPowerUpCollide();
        }

        //HitBrick is run constantly to check whether the ball is touching any brick.
        hitBrick();
        
        //The text displays at the screen top are drawn last, so the ball appears behind them when near the screen's top.
        fill(255);
        textAlign(LEFT);
        text(scoreText + score, 10, 32);
        textAlign(CENTER);
        text(highScoreText + highScore, 430, 32);
        text(loopText + loop, 850, 32);
        textAlign(RIGHT);
        text(livesText + lives, 1270, 32);
    }
    //When moved back to the start screen, the game checks for keyPresses, and if lives is less then 0 (meaning the user just lost) startUpScreen is run again to display the menu once more.
    else if (gameRunning == "false") {
        if (lives < 0) {
            background(0);
            lives++;
            startUpScreen();
        }
        keyPresses();
    }
    //scoreSubmit only runs when the user gets their score within the top five. It displays text prompting the user to enter their name.
    else if (gameRunning == "scoreSubmit") {
        background(0);
        fill(0, 102, 153);
        textAlign(CENTER);
        text(inputUsernameText, 640, 100);
    }
}

//keyPresses checks for game controls. Like draw, it checks different parts depending on the game state.
function keyPresses() {
    //While the game is running, it checks left and right and moves the paddle appropriately, and space to get the ball off the paddle.
    if (gameRunning == "true") {
        if (keyIsDown(LEFT_ARROW)) {
            paddleSpeedX = -10;
        }
        else if (keyIsDown(RIGHT_ARROW)) {
            paddleSpeedX = 10;
        }
        else if (keyIsDown(32)) {
            ball.ballOnPaddle = false;
        }
        else /*(keyCode != LEFT_ARROW && keyCode != RIGHT_ARROW)*/ {
            paddleSpeedX = 0;
        }
    }
    
    //13 is the keycode for enter. This runs the game while on the start screen, triggering gameSetup.
    if (keyIsDown(13) && gameRunning == "false") {
        gameSetup();
        gameRunning = "true";
    }
}

//gameOver runs when the user's lives drop below 0.
function gameOver() {
    gameRunning = "scoreSubmit";
    //It first changes the state variable to the scoreSubmit, and then checks whether the user's score is high enough for submission. If not, the state changes to false and the game returns to the start screen as indicated in draw.
    if (score > topFiveScores[4].score) {
        //username is set to null to ensure the function does not run before it should.
        let username = null;
        
        //Only when the button in the HTML is clicked is the value grabbed from the input field.
        usernameSubmitButton.addEventListener('click', function(e) {
            console.log('submit button was clicked');
            usernameInput = document.getElementById('username').value;
            //If the value from the input field isn't blank or null, it's assigned and the database function is triggered.
            if (usernameInput != "" && usernameInput != null) {    
                username = usernameInput;
                //The username and score values are assigned, stringified to a JSON and POSTed to the server side.
                fetch('scoreSent', {
                    method: 'POST',
                    body: JSON.stringify({username: username, score: score}),
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json'
                    }
                })
                    .then(function(response) {
                        if(response.ok) {
                            console.log('Score was submitted');
                            return;
                        }
                        throw new Error('Request failed.')
                    })
                    .catch(function(error) {
                        console.log(error);
                    });
                
                /*topFiveScores.push([username, score]);
                topFiveScores.sort(function(first, last) {
                    return last.score-first.score;
                });
                topFiveScores.pop();*/
                //At the end, fetchHighScores is run again to get the updated scores to be displayed back to the user upon returning to the start screen.
                fetchHighScores();
                
                //gameRunning = "false";
            }
        });

    }
    else {
        gameRunning = "false";
    }
}

//The Ball, Paddle and Brick are all declared as objects. The ball's initial values are set, so no values need to be passed it when it is created in gameSetup().
function Ball() {
    this.x = paddleStartingX + paddleWidth/2,
    this.y = paddleStartingY - paddleHeight/2,
    this.radius = ballRadius,
    this.fill = ballColor,
    this.vx = ballXSpeed,
    this.vy = ballYSpeed,
    this.ballOnPaddle = true;
}

//Prototypal inheritence is used in this game. Move and draw functions are assigned as prototypes to their respective objects, allowing them to be used as supers and overwritten if necessary.
Ball.prototype.move = function() {
    //When the ball is airborne, it moves with its vertical and horizontal velocity constantly.
    if (this.ballOnPaddle == false) {
        //If the ball hits any side excepting the bottom, the velocity pertaining to that direction is inverted.
        if ((this.x - (this.radius/2) < 0) || (this.x + (this.radius/2) > canvasWidth)) {
            this.vx *= -1;
        }

        if (this.y - (this.radius/2) < 0) {
            this.vy *= -1;
        }
        //When the ball goes off the screen's bottom, lives are decremented and the ball placed back on the paddle. If lives go below 0, gameOver() is run.
        if (this.y - (this.radius/2) > canvasHeight) {
            this.ballOnPaddle = true;
            lives--;
            if (lives < 0) {
                gameOver();
            }
        }
        
        this.x += this.vx;
        this.y += this.vy;
    }
    //If the ball is on the paddle, it moves with the paddle.
    else if (this.ballOnPaddle == true) {
        this.x = currentPaddleX + paddleWidth/2;
        this.y = currentPaddleY - paddleHeight/2;
    }
    return this; //Allows for method chaining
}

//Drawing the ball is simple. The fill is assigned, and the ellipse is filled, draw being a P5 function.
Ball.prototype.draw = function() {
    fill(this.fill);
    ellipse(this.x,this.y,this.radius);
    return this; //Allows for method chaining
}

//Draws the powerup, which looks like the ball
function PowerUp() {
    this.x = 640,
    this.y = 40,
    this.radius = ballRadius,
    this.fill = powerUpColor,
    this.vx = ballXSpeed/2,
    this.vy = 0,
    this.visible = true;
}

//Moving the powerup is simple. It only moves if visible, and rebounds at the canvas walls
PowerUp.prototype.move = function() {
    if (this.visible == true) {
        if ((this.x - (this.radius/2+brickOffsetLeft) < 0) || (this.x + (this.radius/2+brickOffsetLeft) > canvasWidth)) {
            this.vx *= -1;
        }
        
        this.x += this.vx;
    }
}

PowerUp.prototype.draw = function() {
    if (this.visible == true) {
        fill(this.fill);
        ellipse(this.x,this.y,this.radius);
        return this; //Allows for method chaining
    }
}

//When the ball hits the powerup, all that happens is it is no longer drawn, and the ball gets the powerup's color, so indicate what happened to the user.
function ballPowerUpCollide() {
    powerUp.visible = false;
    ball.fill = powerUpColor;
    console.log("Power Up acquired! You can smash through bricks now.");
}

//Like with the ball, the Paddle's values are fixes, so no values are passed in directly upon creating it as an object.
function Paddle() {
    this.x = paddleStartingX,
    this.y = paddleStartingY,
    this.width = paddleWidth,
    this.height = paddleHeight,
    this.fill = paddleColor,
    this.currentPaddleX = paddleStartingX;
}

//Moving the paddle works the same as the ball, adding its speed to its position.
Paddle.prototype.move = function() {
    //If trying to push left or right out of the game, it pushed the paddle back by its speed. Visually, this looks like the paddle pushing against a solid wall and rebounding slightly.
    if (currentPaddleX < (0)) {
        paddleSpeedX = 0;
        currentPaddleX += 10;
    }
    else if (currentPaddleX > (canvasWidth - paddleWidth)) {
        paddleSpeedX = 0;
        currentPaddleX -= 10;
    }
    else {
        
    }
    currentPaddleX += paddleSpeedX;
    //console.log(this.x);
    
    this.x = currentPaddleX;
    return this; //Allows for method chaining
}

//Being a rectangles, drawing the paddle is a simple fill and rect, accounting only for rounded corners.
Paddle.prototype.draw = function() {
    fill(this.fill);
    //The paddle is made rounded comapred to the square bricks.
    rect(this.x, this.y, paddleWidth, paddleHeight, 15);
    return this;
}

//Bouncing the ball off the paddle requires more complicated physics, to calculate the angle.
function ballPaddleCollide() {
    //The y velocity is inverted first, as it will bounce in the opposite way to where it hit.
    ball.vy *= -1;
    
    //The ball's relative position to the paddle's centre is calculated first.
    relativeBallPaddleIntersect = (currentPaddleX+(paddleWidth/2)) - ball.x;
    //The bounce angle is dervived from that, times the max bounce angle (of about 75 degrees).
    bounceAngle = (relativeBallPaddleIntersect/(paddleWidth/2))*maxBounceAngle;
    //Finally, this bounce angle is used, either with sin or cos, in outputting the ball's new horizontal and vertical velocity.
    ball.vx = ballYSpeed*-Math.sin(bounceAngle);
    ball.vy = ballYSpeed*-Math.cos(bounceAngle);
    
}

//Defining each brick as an object mostly uses set values. Column and row are used alongside the padding and offset values to declare their position in a mathematically-decided algorithm.
function Brick (column, row, fill = '#0095DD') {
    this.column = column;
    this.row = row;
    this.x = (column*(brickWidth+brickPaddingWidth)) + brickOffsetLeft;
    this.y = (row*(brickHeight+brickPaddingHeight)) + brickOffsetTop;
    this.width = brickWidth;
    this.height = brickHeight;
    this.fill = fill;
    this.visible = true;
}

//Being solid rectangles, drawing the brick is a simple fill and rectangle. Method chaining is key here.
Brick.prototype.draw = function(column, row) {
    fill(this.fill);
    rect(this.x, this.y, brickWidth, brickHeight);
    return this; //Allows for method chaining
}
//The brick does not require a move function, as they remain static.

//Like with every other brick-related function, it uses a nested for loop to check every one.
function hitBrick() {
    for (let column = 0; column < bricks.length; column++) {
        for (var row = 0; row < bricks[column].length; row++) {
            //Only is the brick is visible, or not yet hit, do we bother checking this. This takes the anchors of the ball (center) and brick (top left) into account.
            if (bricks[column][row].visible === true &&
               (ball.x + ballRadius/2) >= bricks[column][row].x &&
               (ball.x - ballRadius/2) <= bricks[column][row].x+brickWidth &&
               (ball.y + ballRadius/2) >= bricks[column][row].y &&
               (ball.y - ballRadius/2) <= bricks[column][row].y+brickHeight) {
                /*
                if ((ball.y + ballRadius/2) > bricks[column][row].y+ballYSpeed+1 &&
                    (ball.y - ballRadius/2) < bricks[column][row].y+brickHeight-ballYSpeed-1) {
                    ball.vx = -ball.vx;
                }
                else if (((ball.x + ballRadius/2) > bricks[column][row].x+ballYSpeed+1 && 
                        (ball.x - ballRadius/2) < bricks[column][row].x+brickHeight-ballYSpeed-1) && 
                        ((ball.y + ballRadius/2) > bricks[column][row].y+ballYSpeed+1 &&
                        (ball.y - ballRadius/2) < bricks[column][row].y+brickHeight-ballYSpeed-1)) {
                    ball.vy = -ball.vy;
                }*/
                //Rebounding the ball from is placed in here so it only occurs if the powerup hasn't been grabbed yet. Otherwise, it goes straight through the bricks.
                if (powerUp.visible == true) {
                    //The ball's y velocity is inverted by default.
                    ball.vy = -ball.vy;
                    //If the ball is even one pixel within the brick above or below, it can only have hit it from the side. In other words, this checks if the ball hit the brick on the side. If so, it inverts it's x velcotiy, as well as its y velcotiy to correct the defauly change above.
                    if ((ball.y + ballRadius/2) > bricks[column][row].y+ballYSpeed+1 &&
                        (ball.y - ballRadius/2) < bricks[column][row].y+brickHeight-ballYSpeed-1) {
                        ball.vx = -ball.vx;
                        ball.vy = -ball.vy;
                    }
                }
                
                //Lastly, the brick is set to false so it isn't drawn, the score is incremented, and if it passes out the highScore, it is updated to reflect this.
                bricks[column][row].visible = false;
                score++;
                if (score > highScore) {
                    highScore = score;
                }
            }
        }
    }
}