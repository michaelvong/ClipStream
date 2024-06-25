const { Schema, model } = require('mongoose');

const UserSchema = new Schema({
    userId : String,
    userDisplay: String,
    twitch_access_token : String,
    twitch_refresh_token : String,
    access_token: String,
});

module.exports = model('User', UserSchema);