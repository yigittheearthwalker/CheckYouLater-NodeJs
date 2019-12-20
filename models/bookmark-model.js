const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const bookmarks = new Schema({
    bookmarkId: String,
    category: String,
    name: String,
    url: String
});

const categories = new Schema({
    categoryId: String,
    categoryName: String,
    color: String,
    bookmarks: [bookmarks]
});

const BookmarkCollectionSchema = new Schema({
    localCollectionId: String,
    ownerId: String,
    categories: [categories]
});

const BookmarkCollection = mongoose.model('bookmarkCollection', BookmarkCollectionSchema);


module.exports = BookmarkCollection;
