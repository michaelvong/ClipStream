require('dotenv').config;

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const jwt = require('jsonwebtoken');
const mongooseConnect  = require('./lib/mongoose');
const User = require('./models/User');

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

//Initial auth when user first enters website
//This req handler will call twitch api using the code in req body
//it will create a user profile in our db using info from twitch about the user
app.post('/auth', async (req, res) => {
  const result = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body : JSON.stringify({
      client_id : req.body.client_id,
      client_secret : req.body.client_secret,
      code : req.body.code,
      grant_type : req.body.grant_type,
      redirect_uri : req.body.redirect_uri,
    })
  })

  //console.log(await result.json());
  resultJSON = await result.json();
  //console.log(resultJSON);
  //console.log(resultJSON?.access_token);
  const twitch_access_token = resultJSON.access_token;
  const twitch_refresh_token = resultJSON.refresh_token;

  const user = await fetch('https://api.twitch.tv/helix/users', {
    method: 'GET',
    headers: {
      'Authorization' : 'Bearer ' + twitch_access_token,
      'Client-Id' : req.body.client_id,
    },
  })
  const userJSON = await user.json();
  console.log(resultJSON);
  const userId = userJSON?.data[0]?.id;
  const userDisplay = userJSON.data[0]?.display_name;
  //console.log(userJSON.data[0].id);
  //console.log(userJSON.data[0].display_name);
  await mongooseConnect();
  //console.log(await User.findOne({userDisplay: "Vongzu"}));

  //create a new user in  db with id from twitch api, with access and refresh token
  //if user exists, reset the two tokens
  const access_token = jwt.sign({userDisplay}, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h'});
  if(!await User.findOne({userId: userId, userDisplay: userDisplay})){
    console.log('not found')
    const newUser = await User.create({
      userId: userId,
      userDisplay: userDisplay,
      twitch_access_token: twitch_access_token,
      twitch_refresh_token: twitch_refresh_token,
      access_token: access_token,
    })
  } else {
    console.log('found');
    await User.findOneAndUpdate({userId: userId, userDisplay: userDisplay}, 
      {$set:{twitch_access_token: twitch_access_token, twitch_refresh_token: twitch_refresh_token}});
  }

  res.json({ 
    userDisplay, 
    "access_token" : access_token,
    "expires_in" : 3600,
  });
});


app.get('/user', async (req, res) => {
  await fetch('https://api.twitch.tv/helix/users', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },

  })
});

app.get('/', (req, res) => {
    res.json({message : 'Hello from server'});
  });
  
app.get('/message', (req, res) => {
  res.json({message : 'Hello from message'});
});
  
const posts = [
  {
    username: 'Vongzu',
    title: 'hi'
  },
  {
    username: 'Test',
    title: 'bye',
  }
]
app.get('/test', authenticateToken, (req, res) => {
  jwt.verify(req.token, process.env.ACCESS_TOKEN_SECRET, (err, data) => {
    if(err) {
      res.sendStatus(403);
    } else {
      res.json({posts, data});
    }
  });
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if(typeof authHeader !== 'undefined'){
    const token = authHeader.split(' ')[1];
    req.token = token;
    next();
  } else {
    res.sendStatus(403);
  }
};

app.listen(3001, (req, res) => {
  console.log('listening on 3001');
})