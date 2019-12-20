const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken')
const config = require('config')
const User = require('../models/user-model')
const BookmarkCollection = require('../models/bookmark-model')
const Categories = require('../models/bookmark-model')
const auth = require('../middleware/auth')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')

router.use(bodyParser.json())

const authCheck = (req, res, next)=>{
    if(!req.user){
        res.end();
    }else{
        next();
    }
}

//=================USER ROUTES=================================//



//=================BOOKMARK ROUTES=================================//
// @route  GET api/bookmarks
// @desc  Get user's bookmark collection
// @access Private
router.get('/bookmarks', auth, async (req, res)=>{
    try {
        const bookmarkCollection = await BookmarkCollection.findById(req.user.bcId)
        res.json({bookmarkCollection: bookmarkCollection})
    } catch (err) {
        console.error(err.message)
        res.status(500).send('Server Error')
    }    
})

// @route  POST api/bokmarks
// @desc  Add new bookmark
// @access Private

router.post('/bookmarks', auth, async (req, res)=>{
    if(req.body.isNewCategory){
        let bookmarks = []
        const bookmark = {
            name: req.body.name,
            url: req.body.url,
            category: req.body.category
        }
        bookmarks.push(bookmark)
        const category = {
            categoryName: req.body.category,
            color: req.body.color,
            bookmarks: bookmarks
        }
        try {
        BookmarkCollection.findOneAndUpdate({_id: req.user.bcId}, {$push: {"categories": category} }).then( ()=>{
            BookmarkCollection.findById(req.user.bcId).then((bookmarkCollection) => {
                const lastCategory = bookmarkCollection.categories[bookmarkCollection.categories.length - 1]
                res.json({responseType: 'category', response: lastCategory})
            }).catch((err)=>{console.log(err);})
        }).catch((err)=>{console.log(err);})

    } catch (err) {
        console.error(err.message)
        res.status(500).send('Server Error')
    }  
    }else{
        try {
            BookmarkCollection.findOne({_id: req.user.bcId}).then((bookmarkCollection)=> {
                let category = bookmarkCollection.categories.id(req.body.category)
                const bookmark = {
                    name: req.body.name,
                    url: req.body.url,
                    category: category.categoryName
                }
                BookmarkCollection.findOneAndUpdate({_id: req.user.bcId, "categories._id": category._id}, {$push: {"categories.$.bookmarks": bookmark}}).then(()=>{
                    BookmarkCollection.findById(req.user.bcId).then((bookmarkCollection) => {
                        let catIds = []
                        bookmarkCollection.categories.map((cat) => {
                            catIds.push(cat._id.toString())
                        })                        
                        const index = catIds.indexOf(req.body.category)
                        let category = bookmarkCollection.categories.id(req.body.category)
                        let dispatchNewBookmark = {
                            category: category,
                            index: index
                        }
                        res.json({responseType: 'bookmark', response: dispatchNewBookmark})

                    }).catch((err)=>{console.log(err);})

                }).catch((err)=>{console.log(err);})
            
            }).catch((err)=>{console.log(err);})
        } catch (err) {
            console.error(err.message)
        res.status(500).send('Server Error')
        }   
    }
   
})

router.put('bookmarks', authCheck, (req, res, next)=>{
    
})


router.delete('/bookmarks', auth, (req, res)=>{
    var reqType = req.query.type;

    if(reqType === 'collection'){
        console.log('It is collection');

    }else if(reqType === 'bookmark'){
        var categoryId = req.query.category
        var bookmarkId = req.query.bookmark

        BookmarkCollection.findOne({_id: req.user.bcId}).then((bookmarkCollection)=>{
            var categories = bookmarkCollection.categories
            var category = bookmarkCollection.categories.id(categoryId) 
            var bookmark = bookmarkCollection.categories.id(categoryId).bookmarks.id(bookmarkId)
            if (category.bookmarks.length < 2) {
                bookmarkCollection.categories.id(categoryId).remove();
                bookmarkCollection.save();

                if (categories.length < 1) {
                    res.json({noCategoryLeft: true, deleted: 'category', replace: false})
                } else {
                    res.json({noCategoryLeft: false, deleted: 'category', replace: false})
                }
            } else {
                bookmarkCollection.categories.id(categoryId).bookmarks.id(bookmarkId).remove()
                bookmarkCollection.save();
                const responseCategory = bookmarkCollection.categories.id(categoryId)
                console.log(responseCategory);                
                res.send({deleted: 'bookmark', replace: responseCategory})
            }   
            
        }).catch((err)=>{console.log(err);})

    }

})

router.post('/bulkDb', auth, (req, res) => {

    var newCategories = req.body

        BookmarkCollection.findOneAndUpdate({_id: req.user.bcId}, { $push: { "categories": newCategories }}).then(() => {
            User.findOne({_id: req.user.id}).then((user) => {
                if (!user.bookmarksToDatabase) {
                    user.bookmarksToDatabase = true
                }
                user.save()
                res.json({categoriesToTransfer: false})
            }).catch((err)=>{console.log(err);})        
        }).catch((err)=>{console.log(err);})
})
router.post('/bulkLocal', auth, (req, res) => {

    var toDb = req.body.sendToDb
        if (toDb) {
            User.findOne({_id: req.user.id}).then((user) => {
                console.log(user);
                
                if (user.bookmarksToDatabase) {
                   User.findByIdAndUpdate({_id: req.user.id}, {bookmarksToDatabase: false}).then(()=> {
                    BookmarkCollection.findOne({_id: req.user.bcId}).then((bookmarkCollection) => {
                        var categories = bookmarkCollection.categories
                        bookmarkCollection['categories'] = []
                        bookmarkCollection.save()
                        res.json({transferToLocal: true, categoriesToLocal: categories});
                    })
                   }).catch((err)=>{console.log(err);})
                } else {
                    res.json({transferToLocal: false});
                }
            }).catch((err)=>{console.log(err);})
        } else {
            res.json({transferToLocal: false});
        }
})

//=================CATEGORY ROUTES=================================//
router.post('/category', auth, (req, res)=>{
    var categoryUpdate = req.body

    BookmarkCollection.findOne({_id: req.user.bcId}).then((bookmarkCollection)=>{
        var category = bookmarkCollection.categories.id(categoryUpdate.categoryId)
        if (!category){
            console.log('Shame...');
            
        }else{
            if (!categoryUpdate.merge) {
                BookmarkCollection.findOneAndUpdate({_id: req.user.bcId, categories: {$elemMatch: {_id: category._id}}}, 
                    {$set: {'categories.$.categoryName': categoryUpdate.categoryName,
                            'categories.$.color': categoryUpdate.color}}).then(()=>{
                                BookmarkCollection.findOne({_id: req.user.bcId}).then((bookmarkCollection)=>{
                                    var updatedCategory = bookmarkCollection.categories.id(category._id)    
                                    res.json({updatedCategory: updatedCategory, removedCategory: false})
                                }).catch((err)=>{console.log(err);})
                    
                }).catch((err)=>{console.log(err);})
                
            } else {
               var mergeCategory =  bookmarkCollection.categories.id(categoryUpdate.merge)
               if (!mergeCategory) {
                   console.log('Shame...');                
               } else {
                  var allTogether = mergeCategory.bookmarks.concat(category.bookmarks)
                  BookmarkCollection.findOneAndUpdate({_id: req.user.bcId, categories: {$elemMatch: {_id: mergeCategory._id}}},
                    {$set: {'categories.$.bookmarks': allTogether}}).then(()=>{
                        BookmarkCollection.findOneAndUpdate({_id: req.user.bcId}, 
                            {$pull: {'categories': {"_id": category._id}}}).then((bookmarkCollection)=>{
                            var updatedCategory = bookmarkCollection.categories.id(mergeCategory._id)    
                            res.json({updatedCategory: updatedCategory, removedCategory: category._id})
                        }).catch((err)=>{console.log(err);})
            
                }).catch((err)=>{console.log(err);})
               }
            }
        }
    
    })
 
})


//=================SETTINGS ROUTES=================================//
router.post('/sort', auth, (req, res)=>{
    var catIdList = req.body
    BookmarkCollection.findOne({_id: req.user.bcId}).then((bookmarkCollection)=>{
        var categoriesSorted = [];
        for (let i = 0; i < catIdList.length; i++) {
            var catToSort = bookmarkCollection.categories.id(catIdList[i])
            categoriesSorted.push(catToSort)
        }
        BookmarkCollection.findByIdAndUpdate({_id: req.user.bcId},{categories: categoriesSorted}).then(()=>{
            res.json({sorted: true})
        })       
    })
    
})
router.post('/color', authCheck, (req, res)=>{
    let newCatColor = req.body;

    BookmarkCollection.findOneAndUpdate({_id: req.user.bookmarkCollectionId,"categories._id": newCatColor.category}, {$set: {"categories.$.color": newCatColor.color}}).then(()=>{
        res.send('Color is changed');
    })
})

router.put('/settings', authCheck, (req, res)=>{
    console.log(req.body);
    
    User.findOneAndUpdate({_id:req.user._id}, {bookmarksToDatabase: req.body.bookmarksToDatabase}).then(()=>{
        console.log(req.body);
        res.send('Changed');
        })  
})

module.exports = router;