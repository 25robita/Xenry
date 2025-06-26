import express from 'express';
import sqlite3 from 'sqlite3';
import { resolve } from 'path';
import { hash_password, getUUID, compare, checkSession } from './auth.js'

const db = new sqlite3.Database("./Database/database.db");
const COOKIE_EXPIRATION_LENGTH = 1000 * 60 * 60 * 24 * 30 // 30 days

// MASSIVE TODO: all my db row unpacks are dumb and stupid rows are objects not arrays

// prebuilt SQLite commands
const getUser = db.prepare("select * from users where username = ?")

const createNewUser = db.prepare("insert into users values (?, ?, ?, '')")
const createSession = db.prepare("insert into user_sessions values (?, ?, ?)")

const getProject = db.prepare("select * from projects where UUID = ?")
const getProjectsByUser = db.prepare("select * from projects where owner_username = ?")
const getTasksByProject = db.prepare("select * from tasks where project_UUID = ?")
const getDependencyByFrom = db.prepare("select * from dependencies where from_task_UUID = ?")
const getDependencyByTo = db.prepare("select * from dependencies where to_task_UUID = ?")
const getExcludedTimePeriods = db.prepare("select * from excluded_time_periods where project_UUID = ?")

const createProject = db.prepare("insert into projects values (?, ?, ?, ?, ?)")

/**
 * 
 * @param {sqlite3.Statement} preparedStatement 
 * @param {"get" | "all" | "run"} reqType 
 * @param  {...string} args 
 * @returns {Promise<any[], any>}
 */
function dbPromise(preparedStatement, reqType, ...args) {
    return new Promise((res, rej) => {
        function listener(error, result) {
            if (!result || error) return rej(error);

            res(result);
        }

        switch (reqType) {
            case "get":
                preparedStatement.get(args, listener)
                break;
            case "all":
                preparedStatement.all(args, listener)
                break;
            case "run":
                preparedStatement.run(args, listener);
                break;
        }
    })
}

/**
 * 
 * @param {string} username 
 * @returns {string} session UUID
 */
function getNewSession(username) {
    if (!username) {
        console.error("Username not supplied to get new session");
        return;
    }

    const uuid = getUUID();
    const expires = (+ new Date()) + COOKIE_EXPIRATION_LENGTH
    createSession.run(uuid, username, expires)
    return uuid;
}

/**
 * 
 * @param {string} name 
 * @param {string} description 
 * @param {string} ownerUsername 
 * @returns 
 */
function getNewProject(name, description, ownerUsername) {
    if (!name || description == undefined) {
        console.error("name or description of new project not given")
        return;
    }

    const uuid = getUUID();

    createProject.run(uuid, ownerUsername, name, description, "-------")

    return uuid;
}

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
        .then((username) => {
            // if authentication succeeded
            res.sendFile("Frontend/index.html", { root: "./" })
        })
        .catch(() => {
            // need to reauthenticate / auth for first time
            res.redirect("/login");
        })
})

app.get('/login', (req, res) => {

    res.sendFile("Frontend/login.html", { root: "./" })
    // res.render("login");
})


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

            // give them the cookie

            res.cookie("sesh", getNewSession(username), { maxAge: 30 * 1000 * 60 * 60 * 24 })

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
        // and give them the cookie

        res.cookie("sesh", getNewSession(username), { maxAge: COOKIE_EXPIRATION_LENGTH })

        // send them a success; the client will redirect
        res.send({ status: 200, message: "successful account creating" })
    })

})

app.get('/api/project/:uuid', (req, res) => {
    // includes all tasks, dependencies and excluded time periods

    const projectUUID = req.params.uuid;

    checkSession(req, db).then(authenticatedUsername => {
        Promise.all([
            dbPromise(getProject, "get", projectUUID),
            dbPromise(getTasksByProject, "all", projectUUID),
            dbPromise(getExcludedTimePeriods, "all", projectUUID)
        ]).then(([project, tasks, timePeriods]) => {
            const {
                owner_username: ownerUsername,
                name: projectName,
                description: projectDescription,
                excluded_days: excludedDays
            } = project;


            if (ownerUsername != authenticatedUsername) {
                // send error

                res.status(403).send({
                    "status": 403,
                    "message": "Not your project"
                })

                return;
            }

            const projectObject = {
                owner: ownerUsername,
                name: projectName,
                description: projectDescription,
                excludedDays: [...excludedDays].map(i => i == "X"),
                uuid: projectUUID,
                tasks: [],
                timePeriods: [],
            }

            for (const { start_date: startDate, end_date: endDate } of timePeriods) {
                projectObject.timePeriods.push({
                    startDate,
                    endDate
                });
            }

            /**@type {Promise<>[]} */
            const promiseArray = []


            for (const {
                UUID,
                name: taskName,
                description: taskDescription,
                duration_optimistic: durationOptimistic,
                duration_normal: durationNormal,
                duration_pessimistic: durationPessimistic,
                start_date: taskStartDate,
                completion: taskCompletion,
                tag: taskTag,
                colour: taskColour,
                assigned_team_member: taskAssignedTeamMember,
                is_milestone: taskIsMilestone
            } of tasks) {

                let task = {
                    UUID,
                    name: taskName,
                    description: taskDescription,
                    duration: {
                        optimistic: durationOptimistic,
                        normal: durationNormal,
                        pessimistic: durationPessimistic
                    },
                    startDate: taskStartDate,
                    completion: taskCompletion,
                    tag: taskTag,
                    colour: taskColour,
                    assignedTeamMember: taskAssignedTeamMember,
                    isMilestone: taskIsMilestone,
                    dependentOn: [],
                    dependencyOf: [],
                }

                projectObject.tasks.push(task)

                promiseArray.push(dbPromise(getDependencyByFrom, "all", UUID).then((dependencies) => {
                    for (const { to_UUID } of dependencies) {
                        task.dependencyOf.push(to_UUID)
                    }
                }, () => { }))

                promiseArray.push(dbPromise(getDependencyByTo, "all", UUID).then(dependencies => {
                    for (const { from_UUID } of dependencies) {
                        task.dependencyOf.push(from_UUID)
                    }
                }, () => { }))
            }

            Promise.all(promiseArray).then(() => {
                // once all tasks have been populated

                res.status(200).send(projectObject);
            })
        }, () => {
            res.status(404).send({
                status: 404,
                message: "Project not found"
            })
        })

    }, () => {
        // send error

        res.status(403).send({
            status: 403,
            message: "User not logged in"
        })
        return;
    })



    res.send('Hello World!')
})

app.post("/api/project", (req, res) => {
    checkSession(req, db).then(authenticatedUsername => {
        let name = "New Project";
        let description = "";

        if (req.body && req.body.name) {
            name = req.body.name
        }

        if (req.body && req.body.description) {
            description = req.body.description
        }

        const projectUUID = getNewProject(name, description, authenticatedUsername)

        res.status(201).send({
            status: 201,
            message: "Created project",
            UUID: projectUUID
        })

    }, () => {
        res.status(403).send({
            status: 403,
            message: "Not authenticated"
        })
    })
})

app.get("/api/projects", (req, res) => {
    checkSession(req, db).then(authenticatedUsername => {
        dbPromise(getProjectsByUser, "all", authenticatedUsername).then(projects => {
            const response = [];

            for (const { UUID, name, description, excluded_days: excludedDays } of projects) {
                response.push({
                    UUID,
                    name,
                    description,
                    excludedDays: excludedDays && [...excludedDays].map(i => i == "X")
                })
            }

            res.status(200).send(response);

        }, (err) => {
            console.log("empty or error", err)
            res.send([])
        })

    }, () => {
        res.status(403).send("User not authenticated")
    })

})

// listener
app.listen(port, () => {
    console.log(`Xenry backend listening on port ${port}`)
})