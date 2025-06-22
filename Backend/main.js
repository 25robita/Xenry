import express from 'express';
import sqlite3 from 'sqlite3';
import { resolve } from 'path';
import { hash_password, getUUID, compare, checkSession } from './auth.js'

const db = new sqlite3.Database("./Database/database.db");

// prebuilt SQLite commands
const getUser = db.prepare("select * from users where username = ?")

const createNewUser = db.prepare("insert into users values (?, ?, ?, '')")
const createSession = db.prepare("insert into user_sessions values (?, ?, ?)")

// Request app code

const app = express()
const port = 3000

app.set('views', 'Frontend')

app.use("/public", express.static("Frontend/public"))
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// routes
app.get('/', (req, res) => {
    checkSession(req, db)
        .catch(() => {
            // need to reauthenticate / auth for first time
            res.redirect("/login");
        })
        .then((username) => {
            // if authentication succeeded
            // res.sendFile("Frontend/index.html", { root: "./" })
            getUser.get(username, (err, user) => {
                if (err) {
                    res.sendFile("Frontend/index.html", { root: "./" })
                    return;
                }

                res.send(user.display_name)
            })
        })
})

app.get('/login', (req, res) => {

    res.sendFile("Frontend/login.html", { root: "./" })
    // res.render("login");
})


// TODO: all these error responses really need to be actual webpages, or the success ones need to be success thingies
app.post('/login', (req, res) => {
    if (!req.body || !req.body.username || !req.body.password) {
        res.status(400).send({
            status: 400,
            message: "empty request"
        })
        return;
    }
    const { username, password } = req.body;

    // get user's password

    getUser.get(username, (error, user) => {
        if (!user) { // TODO: this is techincally vulnerable to timed attacks but oh well
            res.status(400).send({ status: 400, message: "username or password incorrect" })
            return;
        }

        const usersHash = user.password_hash;

        if (compare(password, usersHash)) {
            // continue to authenticate

            const uuid = getUUID()
            const expires = new Date() + (30 * 1000 * 60 * 60 * 24) // 30 days after right now
            // add session to db

            createSession.run(uuid, username, expires);

            // give them the cookie

            res.cookie("sesh", uuid, { maxAge: 30 * 1000 * 60 * 60 * 24 })

            // send them a success message: the client will redirect
            res.send({ "status": 200, "message": "successful login" });

            return;
        }

        // else do the same error message as before
        res.status(400).send({ status: 400, message: "username or password incorrect" })
    })
})

app.get('/signup', (req, res) => {
    // TODO: handle case when user is already logged in | either send them on their way or give them the option to log out, or just automatticaly log out
    res.sendFile("Frontend/signup.html", { root: "./" });
})

app.post('/signup', (req, res) => {
    if (!req.body || !req.body.username || !req.body.password || !req.body.displayName) {
        res.status(400).send({
            status: 400,
            message: "empty request"
        })
        return;
    }

    const { username, password, displayName } = req.body;

    // first, check if username exists
    getUser.get(username, (error, existingUser) => {
        if (existingUser) {
            res.status(400).send({
                status: 400,
                message: "User already exists"
            })
            return;
        }
        // now, we're free to create a new user

        createNewUser.run(
            username,
            hash_password(password),
            displayName
        )

        // now we need to give the user an authentication session

        const uuid = getUUID()
        const expires = new Date() + (30 * 1000 * 60 * 60 * 24) // 30 days after right now
        // add session to db

        createSession.run(uuid, username, expires);

        // give them the cookie

        res.cookie("sesh", uuid, { maxAge: 30 * 1000 * 60 * 60 * 24 })

        // send them a success; the client will redirect
        res.send({ status: 200, message: "successful account creating" })
    })

})

// listener
app.listen(port, () => {
    console.log(`Xenry backend listening on port ${port}`)
})