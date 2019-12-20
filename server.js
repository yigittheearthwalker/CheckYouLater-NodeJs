const express = require('express');
const logger = require('morgan');
const bodyParser = require('body-parser')
const path = require("path");
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth-routes');
const keys = require('./config/keys');
const apiRoutes = require('./routes/api');
var cors = require('cors');


const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
//app.use(express.static(path.join(__dirname, "client/build")));

  app.use(
    cors({
        credentials: true,
        origin: true
    })
);
app.options('*', cors());

//Database Connection

mongoose.connect(keys.mongodb.dbURI, {useNewUrlParser: true}, ()=>{
    console.log('Connected to MongoDB...');
    
});

// Init Mware

app.use(express.json({extended: false})); /**/ app.use(logger('dev'));

/*app.use((err, req, res, next)=>{
    res.status(422).send({error: err.message})
})*/


    //Routes
    app.use('/auth', authRoutes);
    app.use('/api', apiRoutes)

    app.get('/*', (req, res) => {
        res.json({message: 'there is nothing here'})
        /*
        For serving the React Build
        res.sendFile(path.join(__dirname, 'client/build/index.html'))
        */
    })

    // Listening to the wind of change
    app.listen(process.env.PORT || 5000, () => console.log('Server started... Listening to the wind of port 5000'))