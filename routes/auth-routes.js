const router = require('express').Router();
const jwt = require('jsonwebtoken')
const config = require('config')
var admin = require('firebase-admin');
var serviceAccount = require('../config/checkyoulater-bd5fa-firebase-adminsdk-tn6cc-6392c584e6.json');
  admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://checkyoulater-bd5fa.firebaseio.com"
});
const auth = require('../middleware/auth')
const bodyParser = require('body-parser')
const User = require('../models/user-model');
const BookmarkCollection = require('../models/bookmark-model')


router.use(bodyParser.json())


router.post('/identify', (req, res) => {
  
  admin.auth().verifyIdToken(req.body.token)
  .then(function(decodedToken) {
    let uid = req.body.id;
    console.log(decodedToken);
    
    User.findOne({providerId: uid}).then((currentUser)=>{

      if(currentUser){
          User.findByIdAndUpdate(currentUser._id, {lastLogin: Date.now()}).then(()=>{

              console.log(currentUser);
              
              const payload = {
                user: {
                  id: currentUser._id,
                  bcId: currentUser.bookmarkCollectionId
                }
              }

              jwt.sign(payload, config.get('jwtSecret'), {
                expiresIn: 30*24*60*60
              }, (err, token) => {
                if (err) throw err;
                res.json({token})
              })
              
          }).catch((err)=>{ if (err) { console.log(err) }}) // If User Found or Err
             
      }else{
          
          new User({
              authentication: decodedToken.firebase.sign_in_provider,
              username: decodedToken.name,
              providerId: uid,
              thumbnail: decodedToken.picture,
              email: decodedToken.email,
              lastLogin:'',
              bookmarksToDatabase: false,
              bookmarkCollectionId: ''
          }).save().then((newUser)=>{
              
            const newBookmarkCollection = {
              ownerId: newUser._id,
              localCollectionId: '',
              categories: []
            }

            BookmarkCollection.create(newBookmarkCollection).then((bookmarkCollection) => {
              User.findOneAndUpdate({_id: bookmarkCollection.ownerId}, 
                {bookmarkCollectionId: bookmarkCollection._id, bookmarksToDatabase: true, lastLogin: Date.now()}).then((user) => {
                  const payload = {
                    user: {
                      id: user._id,
                      bcId: user.bookmarkCollectionId
                    }
                  }
    
                  jwt.sign(payload, config.get('jwtSecret'), {
                    expiresIn: 30*24*60*60
                  }, (err, token) => {
                    if (err) throw err;
                    res.json({token})
                  })
                }).catch((err)=>{if (err) { console.log(err) }})
              
            }).catch((err)=>{if (err) { console.log(err) }})//Create new user's bookmark collection or Err
          
          }).catch((err)=>{if (err) { console.log(err) }}) // If User NOT Found create new or Err
      }
  }).catch((err)=>{if (err) { console.log(err) }}) // Find User or Create New or Err
  }).catch(function(error) { console.log(error) 
      res.end(error)
  });  //Verify ID Token
})


//Auth Logout
router.get('/logout', (req, res)=>{
req.logout();
res.redirect('/');
});

// @route  GET auth/user
// @desc  Get the logged in user
// @access Private

router.get('/user', auth, async (req, res)=>{
  try {
    const user = await User.findById(req.user.id)
    res.json(user)
  } catch (err) {
    console.error(err.message)
    res.status(500).send('Server Error')
  }
  
});


module.exports  = router;
