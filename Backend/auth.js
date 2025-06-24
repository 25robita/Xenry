import { hashSync, genSaltSync, compareSync } from "bcrypt";
import 'crypto'

/**
 * 
 * @param {string} password 
 * @returns {string}
 */
export function hash_password(password) {
    const salt = genSaltSync();
    const hash = hashSync(password, salt);

    return hash;
}

/**
 * 
 * @param {string} password 
 * @param {string} hash 
 * @returns {boolean}
 */
export function compare(password, hash) {
    return compareSync(password, hash);
}

export function getUUID() { return crypto.randomUUID() }

/**
 * 
 * @param {import("express").Request} req 
 * @param {import("sqlite3").Database} db 
 * @returns {Promise<string>} username of authenticated user
 */
export function checkSession(req, db) {
    return new Promise((res, rej) => {
        const cookies = req.header("cookie")

        // find 'sesh' cookie
        const cookieObject = Object.fromEntries(cookies.split(";").map(cookie => cookie.split("=")))

        const sessionCookie = cookieObject.sesh;

        if (!sessionCookie) return rej("cookie not sent");

        db.get("select * from user_sessions where UUID = ?", sessionCookie, (error, row) => {
            if (error || !row) {
                console.warn(error, "an error was encountered, or the row was empty");
                return rej("cookie not found in db")
            }

            // handle cookie expiration
            if (new Date() > row.expires) {
                // need to reauthenticate; use this as trigger to delete all out of date cookies

                db.run("delete from user_sessions where expires < ?", + new Date()); // removes all out of date records

                return rej("cookies out of date");
            }

            // correct authentication, return authenticated user

            return res(row.username);
        })

    })
}