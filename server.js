const express = require('express');
const app = express();
const {pool} = require('./dbConfig');
const bcrypt = require('bcrypt');
const session = require('express-session');
const flash = require('express-flash');
const passport = require('passport');

const initializePassport = require('./passportConfig');

initializePassport(passport);


const PORT = process.env.PORT || 3000;


app.set('view engine', 'ejs');

app.use(express.urlencoded({extended: false}));

app.use(session({
    secret: 'secret',

    resave: false,

    saveUninitialized: false
}));



app.use(passport.initialize());
app.use(passport.session());
app.use(flash());



app.get('/', (req, res)=>{
    res.render('index');
});

app.get('/users/register', checkAuthenticated, (req, res)=>{
    res.render("register");
});

app.get('/users/login', checkAuthenticated, (req, res)=>{
    res.render("login");
});

app.get('/users/dashboard', checkNotAuthenticated, (req, res)=>{
    res.render("dashboard", {user: req.user.name});
});

app.get("/users/logout", (req, res) => {
    req.logOut((error) => {
        if (error) {
            return next(error);
        }
        req.flash("success_msg", "logged out");
        res.redirect("/users/login");
    });
});

app.post('/users/register', async (req, res) => {
    let { name, email, password, password2 } = req.body;
    let errors = [];

    // First validation check: no blank fields
    if (!name || !email || !password || !password2) {
        errors.push({ message: "Please fill out all fields!" });
    }

    // Password length check
    if (password.length < 6) {
        errors.push({ message: 'Password must be more than 6 characters' });
    }

    // Make sure password and confirm password match
    if (password !== password2) {
        errors.push({ message: "Passwords do not match!" });
    }

    if (errors.length > 0) {
        res.render('register', { errors });
    } else {
        try {
            // Form validation passed
            let hashedPassword = await bcrypt.hash(password, 10);

            // Query database to check if user already exists
            const results = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
            if (results.rows.length > 0) {
                errors.push({ message: "Email already in use" });
                res.render('register', { errors });
            } else {
                const newUser = await pool.query(
                    `INSERT INTO users (name, email, password)
                     VALUES ($1, $2, $3)
                     RETURNING id, password`,
                    [name, email, hashedPassword]
                );

                req.flash('success_msg', "You are now registered. Please log in!");
                res.redirect("/users/login");
            }
        } catch (error) {
            console.error(error);
            errors.push({ message: "An error occurred during registration. Please try again later." });
            res.render('register', { errors });
        }
    }
});


app.post(
    "/users/login",
    passport.authenticate('local', {
    successRedirect: "/users/dashboard",
    failureRedirect: "/users/login",
    failureFlash: true
})
);

//don't allow user to go to dashboard without logging in
function checkAuthenticated(req, res, next){
    if (req.isAuthenticated()){
        return res.redirect('/users/dashboard');
    }
    next();
}

function checkNotAuthenticated(req, res, next){
    if (req.isAuthenticated()){
        return next();
    }

    res.redirect("/users/login");
}

app.listen(PORT, () => {
    console.log(`Hello sweetie, were on PORT ${PORT}`);
});