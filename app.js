// Import required modules
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const app = express();
const expired_time = 60*60*1000

// function include(server) {
//     return require(server);
// }
// var { database } = include('./server');

// const userCollection = database.db(process.env.MONGODB_DATABASE).collection("users");

const Joi = require("joi");

app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

const navLinks = [
    {name: "Home", url: "/"},
    {name: "Members", url: "/members"},
    {name: "Admin", url: "/admin"},
    {name: "Login", url: "/login"},
    {name: "Signup", url: "/signup"},
    {name: "404", url: "/doesnotexist"}
]
// Load environment variables
require('dotenv').config();

// Start server
// mongoose.connect(`mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_HOST}/${process.env.MONGODB_DATABASE}`)
//     .then(() => {
//         app.listen(process.env.PORT || 3000, () => {
//             console.log('Listening to server!');
//         });
//     })
//     .catch(err => console.error(err));

var mongoStore = MongoStore.create({
	mongoUrl: `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_HOST}/${process.env.MONGODB_DATABASE}`,
	crypto: {
		secret: `${process.env.MONGODB_SESSION_SECRET}`
	}
})

app.use(session({ 
    secret: `${process.env.NODE_SESSION_SECRET}`,
	store: mongoStore, //default is memory store 
	saveUninitialized: false, 
	resave: true
}
));

function isValidSession(req) {
    return (req.session != null && req.session.authenticated);
}

// function sessionValidation(req, res, next) {
//     if (isValidSession(req)) {
//         next();
//         return;
//     }
//     else {
//         console.log('Redirect to login')
//         res.redirect('/login');
//     }
// }


// Authenticate user middleware
const authenticateUser = (req, res, next) => {
    if (!req.session.global_authenticate) {
        return res.redirect('/')    }
    next();
};

function isAdmin(req) {
    return (req.session.type == "admin");
}

function adminAuthorization(req, res, next) {
    if (!isAdmin(req)) {
        res.status(403).render('403', {error: "You are not authorized to view this page.", navLinks: navLinks});
        console.log(req.session.user_type)
        return;
    }
    next();
}

// Set up middleware to parse form data
app.use(express.urlencoded({ extended: true }));


const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    type: String
});

const User = mongoose.model('User', userSchema);


// Define login route
app.get('/login', (req,res) => {
    res.render('login', {navLinks: navLinks});    
});


app.post('/loginSubmit', async (req, res) => {
    const { email, password } = req.body;

    // Find user in database
    const user = await User.findOne({ email: email });
    if (user === null) {
        res.send(`
            <h1>Your email is not registered! Please sign up!</h1>
        `);
    } 
    const validate = await bcrypt.compareSync (req.body.password, user.password)
    console.log(validate)
    if (validate === false) {
        res.send(`
            <h1>Your password is incorrect!</h1>
        `);
    }
    // Check if password is correct
    if (validate === true) {
        // Save user name
        req.session.name = user.name;
        req.session.global_authenticate = true;
        req.session.type = user.type;
        req.session.cookie.maxAge = expired_time

        // Redirect to members page
        try {
            
            res.redirect('/members');
        } catch (err) {
            console.error(err);
            res.send(`
                <h1>There was an error redirecting to the members page.</h1>
            `);
        }
    }
});

// Sign up page
app.get('/signup', (req,res) => {
    res.render('signup', {navLinks: navLinks});
});


app.post('/signupSubmit', async (req, res) => {
    const { name, email, type } = req.body;
    // Hash password using bcrypt
    const password = await bcrypt.hash(req.body.password, 10);
    // const passwordHash = password;
    // Create new user

    const User = mongoose.model('User', userSchema);
    const user = new User({
        name,
        email,
        password,
        type:'user'
    });

    // Save user in database
    await user.save();
    // Redirect to login page
    req.session.name = user.name;
    req.session.global_authenticate = true;
    req.session.type = 'user'

    req.session.cookie.maxAge = expired_time



    res.redirect('/login');
})




// Define signout route
app.get('/logout', (req,res) => {
    req.session.destroy();
    res.render('logout', {navLinks: navLinks});
});


app.get('/', (req, res) => {
    res.render("index", {user: req.session.name, authenticated: req.session.global_authenticate, navLinks: navLinks});
});
    


app.get('/members', authenticateUser, (req,res) => {
    res.render("members", {user: req.session.name, navLinks: navLinks});
});

app.get('/admin', authenticateUser, adminAuthorization, async (req,res) => {
    const all_users = await User.find({});
    
    res.render('admin', {users: all_users, navLinks: navLinks});
});


app.post('/adminDemote', authenticateUser, async (req, res) => {
    const userID = req.body.id
    await User.updateOne({_id:userID}, {$set:{type:'user'}})
    res.redirect('/admin')
});

app.post('/adminPremote', authenticateUser, async (req, res) => {
    const userID = req.body.id
    await User.updateOne({_id:userID}, {$set:{type:'admin'}})
    res.redirect('/admin')
});

app.get('/sayhi', (req,res) => {
    res.render("members", {user: req.session.name});    
   });
   


app.post('/signout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.get("*", (req,res) => {
	res.status(404);
    res.render('404', {navLinks: navLinks});
})

module.exports=app