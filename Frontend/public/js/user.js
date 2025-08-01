// All this file does is gets the user data from the backend and saves it to a global object attached to the window.

/** @type {User | null} */
let globalUser = null;

let retryCounter = 10;

/** @type {(() => void)[]} */
let userListenerList = []

function userMain() {
    fetch("/api/user").then(response => response.json()).then(({ username, displayName, profilePhoto }) => {
        globalUser = new User(username, displayName, profilePhoto);

        for (const listener of userListenerList) { // execute all listeners
            listener.call()
        }
        userListenerList = [] // then clear the array so as to not accidentally retrigger them
    }).catch((reson) => {
        console.warn(reson)
        if (--retryCounter > 0) {
            setTimeout(userMain, 500);
        }
    })
}

userMain();

/**
 * @param {() => void} listenerFunction 
 * @returns 
 */
function registerUserDataListener(listenerFunction) {
    if (globalUser != null) {
        listenerFunction(); // return early, as the data already exists
        return;
    }

    userListenerList.push(listenerFunction);
}

/**
 * 
 * @returns {Promise<>}
 */
function promiseUserData() {
    return new Promise((res, rej) => {
        registerUserDataListener(res);
    })
}