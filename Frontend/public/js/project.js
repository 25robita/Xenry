// All this file does is gets the project data from the backend and saves it to a global object attached to the window.

/** @type {Project | null} */
let globalProject = null;

/** @type {string | null} */
let globalUUID = null;

let projectRetryCounter = 10;

/** @type {(() => void)[]} */
let projectListenerList = []

function projectMain() {

    Project.fromUUID(globalUUID).then((project) => {
        globalProject = project;

        for (const listener of projectListenerList) { // execute all listeners
            listener.call()
        }

        projectListenerList.length = 0; // then clear the listeners
    }).catch(reason => {
        console.warn(reason);

        if (--projectRetryCounter > 0) setTimeout(projectMain, 500);
    })
}


/**
 * @param {() => void} listenerFunction 
 * @returns 
 */
function registerProjectDataListener(listenerFunction) {
    if (globalProject != null) {
        listenerFunction(); // return early, as the data already exists
        return;
    }

    projectListenerList.push(listenerFunction);
}

/**
 * 
 * @returns {Promise<>}
 */
function promiseProjectData() {
    return new Promise((res, rej) => {
        registerProjectDataListener(res);
    })
}


if (window.location.pathname.startsWith("/project/")) {
    globalUUID = window.location.pathname.match(/(?<=\/project\/)([\-a-f0-9]*)/g)[0];

    projectMain();
}