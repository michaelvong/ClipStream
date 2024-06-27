require('dotenv').config;

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const jwt = require('jsonwebtoken');
const mongooseConnect  = require('./lib/mongoose');
const User = require('./models/User');
const { performance } = require('perf_hooks');

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded()); //needed this to read body from postman requests

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
  const twitch_expires_in = resultJSON.expires_in;
  const user = await fetch('https://api.twitch.tv/helix/users', {
    method: 'GET',
    headers: {
      'Authorization' : 'Bearer ' + twitch_access_token,
      'Client-Id' : req.body.client_id,
    },
  })
  const userJSON = await user.json();
  console.log('data from twitch api call to get access, refresh token', resultJSON);
  if(resultJSON.status === 400){
    return res.json({"Failed" : "Status 400 from twitch api call"});
  }
  const userId = userJSON?.data[0]?.id;
  const userDisplay = userJSON.data[0]?.display_name;
  //console.log(userJSON.data[0].id);
  //console.log(userJSON.data[0].display_name);
  await mongooseConnect();
  //console.log(await User.findOne({userDisplay: "Vongzu"}));

  //create a new user in  db with id from twitch api, with access and refresh token
  //if user exists, reset the two tokens
  const access_token = jwt.sign({userDisplay, userId}, process.env.ACCESS_TOKEN_SECRET, { expiresIn: twitch_expires_in.toString() + 's'});
  const person = await User.findOne({userId: userId, userDisplay: userDisplay});
  if(!person){
    console.log('not found')
    const refresh_token = jwt.sign({userDisplay, userId}, process.env.REFRESH_TOKEN_SECRET);
    const newUser = await User.create({
      userId: userId,
      userDisplay: userDisplay,
      twitch_access_token: twitch_access_token,
      twitch_refresh_token: twitch_refresh_token,
      access_token: access_token,
      refresh_token: refresh_token,
    })
  } else {
    console.log('found');
    await User.findOneAndUpdate({userId: userId, userDisplay: userDisplay}, 
      {$set:
        {twitch_access_token: twitch_access_token, 
        twitch_refresh_token: twitch_refresh_token,
        access_token: access_token,
      }});
  }
  const refresh_token = person.refresh_token;
  res.json({ 
    userDisplay, 
    "access_token" : access_token,
    "refresh_token" : refresh_token,
    "expires_in" : twitch_expires_in,
  });
});

//refreshes my own JWT access token and twitch_access_token
//generates new ones and updates the database user profile
//with updated keys
//returns my own JWT access token and expiration time which matches
//twitch access key expiration time
app.post('/refresh', authenticateToken, async (req, res) => {
  //both access tokens should expire at the same time since
  //i am matching expiration times
  //so we need to update for access_token and twitch_access_token
  //refresh token in body is the one for my app
  await mongooseConnect();
  const refresh_token = req.body.refresh_token;
  const user = await User.findOne({refresh_token : refresh_token})
  if(!user){
    return res.json({"Reason":'No user found'});
  }
  //console.log(req.body)
  const result = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type' : 'application/json'},
    body: JSON.stringify({
      client_id : req.body.client_id,
      client_secret : req.body.client_secret,
      grant_type : "refresh_token",
      refresh_token : user.twitch_refresh_token,
    })
  })
  //console.log(await result.json());
  const data = await result.json();
  console.log("data from twitch api call data", data);
  const username = user.userDisplay;
  const userId = user.userId;
  const new_access_token = jwt.sign({username, userId}, process.env.ACCESS_TOKEN_SECRET, { expiresIn: data.expires_in.toString() + 's'});
  //console.log(new_access_token);

  //finds the user where my app's refresh_token matches the one in db
  //and then sets the twitch access token to the new access token we just received
  //from the api call
  await User.findOneAndUpdate({refresh_token : refresh_token}, 
    {$set: {twitch_access_token : data.access_token, 
      access_token: new_access_token
    }});

  res.json({
    access_token: new_access_token,
    expires_in: data.expires_in,
  })
});

app.post('/help', authenticateToken, (req, res) => {
  console.log(req.body);
  if(res.locals.userDisplay){
    console.log('locals success', res.locals.userDisplay);
  }
  res.json('help success')
})

//requires my access token
//gets a lost of broadcasters that the user follows
app.post('/channels/followed', authenticateToken, async (req, res) => {
  await mongooseConnect();
  /*
  if(res.locals.userId){
    console.log('user id', res.locals.userId);
  }*/
  const user = await User.findOne({access_token: res.locals.access_token});
  if(!user){
    res.json({
      "userid" : res.locals.userId,
      "Error" : "User not found",
    })
  }
  console.log('testsetset', req.body);
  //max results in a response is 100, if user follows more than 100 we need to account for the pagination
  //pointer to next page is given in the first api call as a cursor object in pagination
  //pagination.cursor
  //need to add this cursor to the next api call as the after parameter 
  let followed_list = [];
  const result = await fetch(`https://api.twitch.tv/helix/channels/followed?user_id=${res.locals.userId}&first=100`, {
    method : 'GET',
    headers : {
      'Authorization' : 'Bearer ' + user.twitch_access_token,
      'Client-Id' : req.body.client_id,
    },
  })
  const resultJSON = await result.json();
  if(resultJSON.error){
    console.log(resultJSON);
    res.json({'Error': resultJSON});
    return;
  }
  let cursor = resultJSON?.pagination?.cursor; //correct
  const total_results = resultJSON.total; //correct
  //populates the followed list with broadcaster ids from the first call
  resultJSON.data.forEach((element) => {
    followed_list.push(element.broadcaster_id); 
  });

  //total results % 100 gives up the number of api calls we need to make in addition to the previous one
  const num_of_paginations = Math.floor(total_results / 100);
  for (let i = 0; i < num_of_paginations; i++) {
    const result = await fetch(`https://api.twitch.tv/helix/channels/followed?user_id=${res.locals.userId}&first=100&after=${cursor}`, {
      method : 'GET',
      headers : {
        'Authorization' : 'Bearer ' + user.twitch_access_token,
        'Client-Id' : req.body.client_id,
      },
    });
    const resultJSON = await result.json();
    resultJSON.data.forEach((element) => {
      followed_list.push(element.broadcaster_id);
    });
    cursor = resultJSON.pagination.cursor;
  }

  //returns user id => the calling user's twitch id
  //total => the total number of followed channels
  //data => the list of broadcaster_ids that user follows
  res.json({
    "userid": res.locals.userId, 
    "total" : followed_list.length, 
    "data"  : followed_list,
  });
});

//get request that takes my access token and 'Client-Id' in the headers
//gets the clips from followed channels from the last 3 days
app.get('/clips', authenticateToken, async (req, res) => {
  var startTime = performance.now()
  await mongooseConnect();

  const user = await User.findOne({access_token: res.locals.access_token});
  if(!user){
    res.json({
      "userid" : res.locals.userId,
      "Error" : "User not found",
    })
  }
  const result = await fetch(`https://api.twitch.tv/helix/channels/followed?user_id=${res.locals.userId}&first=100`, {
    method : 'GET',
    headers : {
      'Authorization' : 'Bearer ' + user.twitch_access_token,
      'Client-Id' : req.get('Client-Id'),
    },
  })
  const resultJSON = await result.json();
  //console.log(resultJSON)
  if(resultJSON.error){
    console.log(resultJSON);
    res.json({'Error': resultJSON});
    return;
  }
  let cursor = resultJSON?.pagination?.cursor; //correct
  const total_results = resultJSON.total; //correct
  let followed_list = [];
  resultJSON.data.forEach((element) => {
    followed_list.push(element.broadcaster_id); 
  });
  //console.log(followed_list.length, followed_list)

  const num_of_paginations = Math.floor(total_results / 100);
  for (let i = 0; i < num_of_paginations; i++) {
    const result = await fetch(`https://api.twitch.tv/helix/channels/followed?user_id=${res.locals.userId}&first=100&after=${cursor}`, {
      method : 'GET',
      headers : {
        'Authorization' : 'Bearer ' + user.twitch_access_token,
        'Client-Id' : req.get('Client-Id'),
      },
    });
    const resultJSON = await result.json();
    resultJSON.data.forEach((element) => {
      followed_list.push(element.broadcaster_id);
    });
    cursor = resultJSON.pagination.cursor;
  }
  //console.log(followed_list.length, followed_list)
  const date = new Date();
  //7am utc = 12am pst
  //setting the starting date 3 days back and to midnight of that day
  //current date is 06/26/24 5:27PM -> starting date is 06/23/24 12:00 AM
  date.setDate(date.getDate()-7);
  date.setUTCHours(7);
  date.setUTCMinutes(0);
  const starting_date = date.toISOString();
  //console.log(starting_date, date.toLocaleTimeString());
  //console.log(temp, date.getDate());

  //we have arky broadcaster id hardcoded rn for testing
  //put the api calls for all clips in a do while loop
  //use multi threads to gather clips faster?
  //console.log(followed_list.length, followed_list) //correct
  //let loop_cursor = null;
  let clips = [];
  for(id of followed_list){
    //console.log(id);

    let loop_cursor = null;
    do {
      let clips_results = null;
      if(loop_cursor) { //if cursor exists from previous api call, use it in next api call
        clips_results = await fetch(`https://api.twitch.tv/helix/clips?broadcaster_id=${id}&started_at=${starting_date}&first=100&after=${loop_cursor}`, {
          method : 'GET',
          headers : {
            'Authorization' : 'Bearer ' + user.twitch_access_token,
            'Client-Id' : req.get('Client-Id'),
          },
        });
      } else { //first call with no cursor
        clips_results = await fetch(`https://api.twitch.tv/helix/clips?broadcaster_id=${id}&started_at=${starting_date}&first=100`, {
          method : 'GET',
          headers : {
            'Authorization' : 'Bearer ' + user.twitch_access_token,
            'Client-Id' : req.get('Client-Id'),
          },
        });
      }
      
      let clips_resultsJSON = await clips_results.json();
      const filtered_results = clips_resultsJSON.data.filter((element) => element.view_count > 500);
      filtered_results.forEach((element) => {
        clips.push(element);
      });
      if(filtered_results.length === 0) {
        break;
      }

      loop_cursor = clips_resultsJSON.pagination.cursor;
      //clips.push(clips_results);
    } while (loop_cursor);
  }

  console.log(clips.length); //arky had 7 clips

  //~303 clips from all 161 followed channels from past 7 days
  clips.sort((a, b) => b.view_count - a.view_count);
  var endTime = performance.now()
  console.log('Time elapsed: ', `${endTime - startTime} milliseconds`)
  res.json({'status' : 'in clips', 'total' : clips.length, 'data' : clips});
})

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

//middleware function to auth my own JWT tokens
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if(typeof authHeader !== 'undefined'){
    const token = authHeader.split(' ')[1];
    req.token = token;
    jwt.verify(req.token, process.env.ACCESS_TOKEN_SECRET, (err, data) => {
      if(err) {
        console.log('invalid token: ' + err)
        res.sendStatus(403);
      } else {
        //console.log('verified');
        console.log('data from JWT token:\n', data);
        //console.log('real roken', req.token)
        res.locals.userDisplay = data.userDisplay;
        res.locals.access_token = req.token;
        res.locals.userId = data.userId;
        next();
      }
    });
  }
};

app.listen(3001, (req, res) => {
  console.log('listening on 3001');
})