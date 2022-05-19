// import dependicies

const express = require('express');
const req = require('express/lib/request');
const path = require('path');
var myApp = express();
const session = require('express-session');
const upload = require('express-fileupload')
myApp.use(upload());

//Setup DB Connection
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/myBlogs', {
    UseNewUrlParser: true,
    UseUnifiedTopology: true
});

//Setup DB Model
const Post = mongoose.model('post', {
    title: String,
    content: String,
    image: String
})

const Admin = mongoose.model('Admin', {
    username: String,
    password: String
})

//Setup Session
myApp.use(session({
    secret: "thisismyrandomkeysuperrandomsecret",
    resave: false,
    saveUninitialized: true
}))

//Create Object Destructuring for Express Validator
const { check, validationResult } = require('express-validator');
myApp.use(express.urlencoded({ extended: true }));

// Set path to public and views folder.
myApp.set('views', path.join(__dirname, 'views'));
myApp.use(express.static(__dirname + '/public'));
myApp.set('view engine', 'ejs');


//------------------- Set up different routes (pages) --------------------

//Home Page
myApp.get('/', function (req, res) {
    Post.find({}).exec(function (err, postsFromDB) {
        res.render('home', { posts: postsFromDB });
    })
});


//Compose Page
myApp.get('/compose', (req, res) => {
    //Read document from MongoDB
    if (req.session.userLoggedIn) { // If session exists, then access compose Page.
        res.render('compose');
    }
    else { // Otherwise redirect user to login page.
        res.redirect('/login');
    }
})


myApp.post('/compose', [
    check('postTitle', 'Title is required!').notEmpty(),
    check('postBody', 'Content is required!').notEmpty()
], function (req, res) {
    var errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.render('compose', { errors: errors.array() });
    }
    else {
        var title = req.body.postTitle;
        var content = req.body.postBody;
        if (!req.files) {
            errors = [];
            res.render('compose', { errors: [{ msg: "Please add an image." }] });
        } else {
            var image = req.files.myImage;
            var imageName = image.name;
            var imagePath = 'public/uploaded/' + imageName;
            image.mv(imagePath, (err) => {
                if (err) {
                    console.log("error");
                    res.send(err);
                }
                else {
                    var postData = {
                        title: title,
                        image: '/uploaded/' + imageName,
                        content: content,
                    }
                    var post = new Post(postData);
                    post.save().then(function () {   //this save() method will save the information in Database.
                        console.log("New post created");
                        res.redirect('admin');
                    })
                }
            })
        }
    }
})


// Login Page
myApp.get('/login', (req, res) => {
    res.render('login');
})

myApp.post('/login', function (req, res) {
    var user = req.body.username;
    var pass = req.body.password;

    Admin.findOne({ username: user, password: pass }).exec(function (err, admin) {

        if (admin) // If Admin object exists - true
        {
            //store username in session and set login in true
            req.session.username = admin.username;
            req.session.userLoggedIn = true;
            //Redirect user to the admin Page 
            res.redirect('/admin');
        }
        else {
            //Display error if user info is incorrect
            res.render('login', { error: "Sorry Login Failed. Please try again!" });
        }
    })
})

//Logout Page
myApp.get('/admin', (req, res) => {
    if (req.session.userLoggedIn) { // If session exists, then access All posts Page.
        Post.find({}).exec(function (err, posts) {
            res.render('admin', { posts: posts });
        })
    }
    else { // Otherwise redirect user to login page.
        res.redirect('/login');
    }
})

//Logout Page
myApp.get('/logout', (req, res) => {
    req.session.username = '';
    req.session.userLoggedIn = false;
    res.render('login', { error: "Successfully logged out!" });
})

//Delete Page
myApp.get('/delete/:id', (req, res) => { // Whatever comes afte : is considered as a parameter. 
    //Check if session is created
    if (req.session.userLoggedIn) {
        //Delete 
        var id = req.params.id;
        Post.findByIdAndDelete({ _id: id }).exec(function (err, post) {
            if (post) {
                res.render('delete', { message: "Post Deleted Successfully!" });
            }
            else {
                res.render('delete', { message: "Sorry, Post Not Deleted!" });
            }
        })
    }
    else {
        //Otherwise redirect user to login page.
        res.redirect('/login');
    }

})

//Edit Page
myApp.get('/edit/:id', (req, res) => { // Whatever comes afte : is considered as a parameter. 
    //Check if session is created
    if (req.session.userLoggedIn) {
        //Edit 
        var id = req.params.id;
        Post.findOne({ _id: id }).exec(function (err, post) {
            if (post) {
                res.render('edit', { post: post });
            }
            else {
                res.send("No post found with this id..!");
            }
        })
    }
    else {
        //Otherwise redirect user to login page.
        res.redirect('/login');
    }
})
myApp.post('/edit/:id', [
    check('postTitle', 'Title is required!').notEmpty(),
    check('postBody', 'Content is required!').notEmpty()
], function (req, res) {
    var errors = validationResult(req);
    if (!errors.isEmpty()) {
        var id = req.params.id;
        Post.findOne({ _id: id }).exec(function (err, post) {
            if (post) {
                res.render('edit', { errors: errors.array(), post: post});
            }
        })
    }
    else {
        var title = req.body.postTitle;
        var content = req.body.postBody;
        if (!req.files) {
            errors = [];
            var id = req.params.id;
            Post.findOne({ _id: id }).exec(function (err, post) {
                if (post) {
                    res.render('edit', { errors: [{ msg: "Please add an image" }], post: post });
                }
            })
        } else {
            var image = req.files.myImage;
            var imageName = image.name;
            var imagePath = 'public/uploaded/' + imageName;
            image.mv(imagePath, (err) => {
                if (err) {
                    console.log("error");
                    res.send(err);
                }
                else {
                    var title = req.body.postTitle;
                    var content = req.body.postBody;
                    var id = req.params.id;
                    console.log(id);
                    Post.findOne({ _id: id }).exec(function (err, post) {
                        if (post) {
                            post.title = title;
                            post.content = content;
                            post.image = '/uploaded/' + imageName;
                            post.save();
                            res.render('editsuccess');
                        }
                        else {
                            res.send("No post found with this id..!");
                        }
                    })
                }
            })
        }
    }
})

myApp.listen(8080);
console.log('Everything executed fine... Open http://localhost:8080/');