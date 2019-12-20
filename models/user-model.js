const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const userSchema = new Schema({
    authentication: String,
    username: String,
    providerId: {
        type: String,
        unique: true
    },
    thumbnail: String,
    email: String,
    lastLogin: Date,
    bookmarksToDatabase: Boolean,
    bookmarkCollectionId:{
        type: String,
        default: ''
    } 
});

const User = mongoose.model('user', userSchema);

module.exports = User;