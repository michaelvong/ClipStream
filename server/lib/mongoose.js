const mongoose = require('mongoose');
require('dotenv').config({path:__dirname+'/./../.env'});

const mongooseConnect = async () =>{
    const uri = process.env.MONGODB_URI;
    if (mongoose.connection.readyState === 1){
        //console.log('cfe')
        return mongoose.connection.asPromise();
    } else {
        //console.log('connecting')
        return mongoose.connect(uri);
    }
}

module.exports = mongooseConnect;