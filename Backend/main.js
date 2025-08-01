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
const getTask = db.prepare("select * from tasks where UUID = ?")
const getTaskOwnerByUUID = db.prepare("select projects.owner_username from projects inner join tasks on tasks.project_UUID = projects.UUID where tasks.UUID = ?")
const getProjectsByUser = db.prepare("select * from projects where owner_username = ?")
const getTasksByProject = db.prepare("select * from tasks where project_UUID = ?")
const getDependencyByFrom = db.prepare("select * from dependencies where from_task_UUID = ?")
const getDependencyByTo = db.prepare("select * from dependencies where to_task_UUID = ?")
const getExcludedTimePeriods = db.prepare("select * from excluded_time_periods where project_UUID = ?")

const deleteTask = db.prepare("delete from tasks where UUID = ?")
const deleteProject = db.prepare("delete from projects where UUID = ?")

const createProject = db.prepare("insert into projects values (?, ?, ?, ?, ?)")
const createTask = db.prepare("insert into tasks values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")

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
            if ((reqType !== "run" && !result) || error) return rej(error);

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
 * @returns {string} the uuid of the newly created project
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

/**
 * 
 * @param {string} name 
 * @param {Date} startDate 
 * @param {boolean} isMilestone 
 * @param {string} projectUUID 
 * @returns {Promise<string>} the uuid of the newly created task
 */
function getNewTask(name, startDate, isMilestone, projectUUID) {
    return new Promise((res, rej) => {
        // UUID is created on the fly
        const uuid = getUUID();
        // description defaults to empty
        const description = ""

        // all durations are set to 1 day by default
        const durationOptimistic = 1;
        const durationNormal = 1;
        const durationPessimistic = 1;

        // tag defaults to empty
        const tag = ""

        // colour defaults to empty
        const colour = ""

        // completion defaults to 0
        const completion = 0;

        // assigned team member defaults to empty
        const assignedTeamMember = ""

        dbPromise(createTask, "run", uuid, name, description, durationOptimistic, durationNormal, durationPessimistic, startDate, completion, tag, colour, assignedTeamMember, isMilestone, projectUUID)
            .then(() => {
                res(uuid);
            }).catch(rej)
    })
}

// Request app code

const app = express()
const port = 3000

app.set('views', 'Frontend')

app.use("/public", express.static("Frontend/public"))
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

/****** Routes ******/

/***** HTML/Application *****/
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

app.get('/profile', (req, res) => {
    checkSession(req, db)
        .then((username) => {
            // if authentication succeeded
            res.sendFile("Frontend/profile.html", { root: "./" })
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

app.get('/signup', (req, res) => {
    // TODO: handle case when user is already logged in | either send them on their way or give them the option to log out, or just automatticaly log out
    res.sendFile("Frontend/signup.html", { root: "./" });
})

app.get("/project/:uuid", (req, res) => {

    checkSession(req, db).then(() => {
        // doesn't check that user is able to see this project, as no sensitive project data is shared

        res.sendFile("Frontend/index.html", { root: "./" }) // sends main file, which determines itself how to display

    }, () => {
        // if invalid authentication in general, redirect to login

        res.redirect("/login")
    })
})

/***** API *****/

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



    // res.send('Hello World!')
})

app.get('/api/task/:uuid', (req, res) => {
    const taskUUID = req.params.uuid;

    Promise.all([
        checkSession(req, db),
        dbPromise(getTaskOwnerByUUID, "get", taskUUID),
        dbPromise(getDependencyByFrom, "all", taskUUID),
        dbPromise(getDependencyByTo, "all", taskUUID),
        dbPromise(getTask, "get", taskUUID),
    ]).then(([authenticatedUsername, { owner_username: taskOwnerUsername }, dependencyOfRows, dependentOnRows, { UUID, name, description, duration_normal: durationNormal, duration_optimistic: durationOptimistic, duration_pessimistic: durationPessimistic, start_date: startDate, completion, tag, colour, assigned_team_member: assignedTeamMember, is_milestone: isMilestone, project_UUID: projectUUID }]) => {
        // if the user doesn't own that task, throw an error
        if (authenticatedUsername !== taskOwnerUsername) {
            res.status(403).send({ status: 403, message: "Task not owned by you" })
            return;
        }

        let task = {
            UUID,
            name,
            description,
            duration: {
                optimistic: durationOptimistic,
                normal: durationNormal,
                pessimistic: durationPessimistic
            },
            startDate,
            completion,
            tag,
            colour,
            assignedTeamMember,
            isMilestone,
            dependentOn: dependentOnRows.map(({ to_task_UUID }) => to_task_UUID),
            dependencyOf: dependencyOfRows.map(({ from_task_UUID }) => from_task_UUID),
        }

        res.status(200).send(task);


    }, () => {
        res.status(400).send({ status: 400, message: "Request error: either user is not authenticated or task does not exist" })
        // TODO: send error
    })
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

app.get("/api/user", (req, res) => {
    // gives the username, display name and profile photo blob string

    checkSession(req, db).then(authenticatedUsername => {
        // once authenticated, get user data 

        dbPromise(getUser, "get", authenticatedUsername).then(({ username, display_name: displayName, profile_photo: profilePhoto }) => {
            res.status(200).send({ username, displayName, profilePhoto })

            return;
        }, () => {
            // unknown db error, send 500

            res.status(500).send({ status: 500, message: "Internal Server Error" })
        })

    }, () => {
        // auth failed implying user not logged in

        res.status(403).send({ status: 403, message: "User not authenticated" })
    })
})

app.post("/api/task", (req, res) => {

    // first, check that the user is logged in
    checkSession(req, db).then(authenticatedUsername => {

        // then, check that the request is well-formed (i.e. contains projectUUID)

        if (!req.body || !req.body.projectUUID) {

            res.status(400).send({
                status: 401,
                message: "Request body malformed or missing required field `projectUUID`"
            })

            return;
        }

        // ensure that *this* user owns *this* project
        console.log(req.body);

        dbPromise(getProject, "get", req.body.projectUUID).then(({ owner_username: owner }) => {
            if (owner !== authenticatedUsername) {
                console.warn(owner, authenticatedUsername)
                res.status(403).send({
                    status: 403,
                    message: "User not authorised"
                })
                return;
            }

            // else, continue on with response
            let name = "New Task"
            if (req.body.name) name = req.body.name;

            // TODO: figure out dates

            getNewTask(name, new Date(), req.body?.isMilestone ?? false, req.body.projectUUID).then(uuid => {
                res.status(201).send({
                    status: 201,
                    message: "Created task",
                    UUID: uuid
                })
            }).catch(() => {
                res.status(500).send({
                    status: 500,
                    message: "Internal server error"
                })
            })

        }, (reason) => {
            res.status(400).send({
                status: 400,
                message: `Project '${req.body.projectUUID}' not found`
            })
        })
    }, (reason) => {

        res.status(403).send({
            status: 403,
            message: "User is not authorised"
        })
    })
})

app.patch("/api/project/:uuid", (req, res) => {
    // first, check authentication\

    const UUID = req.params.uuid;

    checkSession(req, db).then(authenticatedUsername => {
        // then, get project information

        dbPromise(getProject, "get", UUID).then(({ owner_username: ownerUsername }) => {
            // check that this user owns this project

            if (ownerUsername !== authenticatedUsername) {
                res.status(403).send({
                    status: 403,
                    message: "Not authorised"
                })

                return;
            }

            const keyMap = {
                name: db.prepare("update projects set name = ? where UUID = ?"),
                description: db.prepare("update projects set description = ? where UUID = ?"),
                excludedDays: db.prepare("update projects set excluded_days = ? where UUID = ?")
            }

            console.log("hi");

            const promisesArray = []

            for (let key in req.body) {
                if (!(key in keyMap)) continue;

                let value = req.body[key]

                if (key == "excludedDays") {
                    value = value.map(i => i ? "X" : "-").join("")
                }

                promisesArray.push(dbPromise(keyMap[key], "run", value, UUID));
            }

            Promise.all(promisesArray).then(() => {
                res.status(200).send({
                    status: 200,
                    message: "Success"
                })
            }).catch(reason => {
                console.warn(reason)
                res.status(500).send({
                    status: 500,
                    message: "Internal server error"
                })
            })



        }).catch(() => {
            // database error
            res.status(500).send({
                status: 500,
                message: "Internal DB error"
            })
        })

    }, () => {
        res.status(403).send({
            status: 403,
            message: "User not authenticated"
        })
    })
})

app.patch("/api/task/:uuid", (req, res) => {
    // first, check authentication\

    const UUID = req.params.uuid;

    checkSession(req, db).then(authenticatedUsername => {
        // then, get project information

        dbPromise(getTaskOwnerByUUID, "get", UUID).then(({ owner_username: ownerUsername }) => {
            // check that this user owns this project

            if (ownerUsername !== authenticatedUsername) {
                res.status(403).send({
                    status: 403,
                    message: "Not authorised"
                })

                return;
            }

            const keyMap = {
                name: db.prepare("update tasks set name = ? where UUID = ?"),
                description: db.prepare("update tasks set description = ? where UUID = ?"),
                durationOptimistic: db.prepare("update tasks set duration_optimistic = ? where UUID = ?"),
                durationNormal: db.prepare("update tasks set duration_normal = ? where UUID = ?"),
                durationPessimistic: db.prepare("update tasks set duration_pessimistic = ? where UUID = ?"),
                startDate: db.prepare("update tasks set start_date = ? where UUID = ?"),
                completion: db.prepare("update tasks set completion = ? where UUID = ?"),
                tag: db.prepare("update tasks set tag = ? where UUID = ?"),
                colour: db.prepare("update tasks set colour = ? where UUID = ?"),
                assignedTeamMember: db.prepare("update tasks set assigned_team_member = ? where UUID = ?"),
                isMilestone: db.prepare("update tasks set is_milestone = ? where UUID = ?"),
            }

            const promisesArray = []

            for (let key in req.body) {
                if (!(key in keyMap)) continue;

                let value = req.body[key]

                if (key == "startDate") {
                    // TODO: process start date
                }

                promisesArray.push(dbPromise(keyMap[key], "run", value, UUID));
            }

            Promise.all(promisesArray).then(() => {
                res.status(200).send({
                    status: 200,
                    message: "Success"
                })
            }).catch(reason => {
                console.warn(reason)
                res.status(500).send({
                    status: 500,
                    message: "Internal server error"
                })
            })



        }).catch(reason => {
            console.warn(reason)
            // database error
            res.status(500).send({
                status: 500,
                message: "Internal DB error"
            })
        })

    }, () => {
        res.status(403).send({
            status: 403,
            message: "User not authenticated"
        })
    })
})

app.patch("/api/user/:username", (req, res) => {
    // first, check that the user is authenticated
    checkSession(req, db).then(authenticatedUsername => {
        // then, that the usernames match
        if (req.params.username !== authenticatedUsername) {
            res.status(403).send({
                status: 403,
                message: "User not authorised"
            })
            return;
        }

        // now, the user is allowed to modify the data

        const keyMap = {
            username: db.prepare("update users set username = ? where username = ?"),
            displayName: db.prepare("update users set display_name = ? where username = ?"),
            profilePhoto: db.prepare("update users set profile_photo = ? where username = ?"),
            password: db.prepare("update users set password_hash = ? where username = ?"),
        }

        // check if username is being altered – in that case, this should be done last

        let newUsername = "";
        let usernameModified = false;
        if ("username" in req.body) {
            // check that the username is not already taken

            newUsername = req.body.username;
            usernameModified = true;
            delete req.body.username;
        }

        let promisesArray = []

        for (let key in req.body) {
            if (!(key in keyMap)) continue;

            let value = req.body[key]

            if (key == "password") {
                value = hash_password(value);
            }

            promisesArray.push(dbPromise(keyMap[key], "run", value, authenticatedUsername));
        }

        Promise.all(promisesArray).then(() => {

            if (!usernameModified) {
                // can finish now, all done

                res.status(200).send({
                    status: 200,
                    message: "Success"
                })
                return;
            }

            // check that the username isn't already taken – if it resolves, it exists, else it does not and can be used

            dbPromise(getUser, "get", newUsername).then(() => {
                res.status(409).send({
                    status: 409,
                    message: "Username already taken. Other fields successfully modified"
                })
            }, () => {
                // now, we can update the username

                dbPromise(keyMap.username, "run", newUsername, authenticatedUsername).then(() => {
                    res.status(200).send({
                        status: 200,
                        message: "Success"
                    })
                }, () => {
                    res.status(500).send({
                        status: 500,
                        message: "Internal server error"
                    })
                })
            })

        }, () => {
            res.status(500).send({
                status: 500,
                message: "Internal Server Error"
            })
        })


    }, () => {
        res.status(403).send({
            status: 403,
            message: "User not authenticated"
        })
    })
})

app.delete("/api/project/:uuid", (req, res) => {
    // first, check authentictaion

    const UUID = req.params.uuid;

    checkSession(req, db).then(authenticatedUsername => {
        // now, check that this user owns this project
        dbPromise(getProject, "get", UUID).then(({ owner_username: ownerUsername }) => {
            if (ownerUsername !== authenticatedUsername) {
                res.status(403).send({
                    status: 403,
                    message: "User not authorised"
                })
                return;
            }

            // now, all auth is done — time to delete the Project

            dbPromise(deleteProject, "run", UUID).then(() => {

                res.status(200).send({
                    status: 200,
                    message: "Project deleted"
                })

            }).catch(() => {
                res.status(500).send({
                    status: 500,
                    message: "Internal Server Error"
                })
            })

        }).catch(() => {
            res.status(500).send({
                status: 500,
                message: "Internal Server Error"
            })
        })
    }, () => {
        res.status(403).send({
            status: 403,
            message: "User not authenticated"
        })
    })
})

app.delete("/api/task/:uuid", (req, res) => {
    // first, check authentictaion

    const UUID = req.params.uuid;

    checkSession(req, db).then(authenticatedUsername => {
        // now, check that this user owns this task
        dbPromise(getTaskOwnerByUUID, "get", UUID).then(({ owner_username: ownerUsername }) => {
            if (ownerUsername !== authenticatedUsername) {
                res.status(403).send({
                    status: 403,
                    message: "User not authorised"
                })
                return;
            }

            // now, all auth is done — time to delete the task

            dbPromise(deleteTask, "run", UUID).then(() => {

                res.status(200).send({
                    status: 200,
                    message: "Task deleted"
                })

            }).catch(() => {
                res.status(500).send({
                    status: 500,
                    message: "Internal Server Error"
                })
            })

        }).catch(() => {
            res.status(500).send({
                status: 500,
                message: "Internal Server Error"
            })
        })
    }, () => {
        res.status(403).send({
            status: 403,
            message: "User not authenticated"
        })
    })
})

// listener
app.listen(port, () => {
    console.log(`Xenry backend listening on port ${port}`)
})