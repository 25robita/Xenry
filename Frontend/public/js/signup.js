/** @type {HTMLInputElement} */
const username = document.getElementById("username")
/** @type {HTMLInputElement} */
const displayName = document.getElementById("displayname")
/** @type {HTMLInputElement} */
const password = document.getElementById("password")
/** @type {HTMLInputElement} */
const confirmPassword = document.getElementById("confirmpassword")

/** @type {HTMLButtonElement} */
const loginButton = document.getElementById("login")
/** @type {HTMLButtonElement} */
const signupButton = document.getElementById("signup")

/** @type {string[]} array of usernames said to be already taken according to server responses */
let takenUsernames = []

/**
 *  
 * @param {HTMLInputElement} element 
 * @param {string} reason The reason displayed to the user
 * @param {string | undefined} dataReason The internal data reason, if applicable
 */
function reportError(element, reason, dataReason = undefined) {
    element.setAttribute("aria-invalid", "true");
    if (dataReason)
        element.setAttribute("data-errorreason", dataReason);

    document.getElementById(element.getAttribute("aria-errormessage")).textContent = reason;
}

username.addEventListener("input", () => { // fix validity display
    if (username.getAttribute("aria-invalid") != "true") return;

    switch (username.getAttribute("data-errorreason")) {
        case "empty":
            // guard clause
            if (username.value.length == 0) break;

            // else, clear the error

            username.setAttribute("aria-invalid", "false")
            username.removeAttribute("data-errorreason");

            document.getElementById(username.getAttribute("aria-errormessage")).textContent = '';
            break;
        case "alreadyexists":
            if (takenUsernames.includes(username.value)) break;

            // else, clear the error

            username.setAttribute("aria-invalid", "false")
            username.removeAttribute("data-errorreason");

            document.getElementById(username.getAttribute("aria-errormessage")).textContent = '';
            break;
        default:
            console.warn("Username has unknown error reason")
            break;
    }
})

username.addEventListener("input", () => {
    // listen for taken usernames

    if (takenUsernames.includes(username.value)) {
        reportError(username, "Username is taken", "alreadyexists")
    }
})

displayName.addEventListener("input", () => {
    if (displayName.getAttribute("aria-invalid") != "true") return; // guard clause

    // the only reason a display name can be invalid is that it is empty

    if (displayName.value.length == 0) return;

    displayName.setAttribute("aria-invalid", "false");
    document.getElementById(displayName.getAttribute("aria-errormessage")).textContent = "";
})

password.addEventListener("input", () => {
    if (password.getAttribute("aria-invalid") != "true") return;

    switch (password.getAttribute("data-errorreason")) {
        case "empty":
            if (password.value.length == 0) break;

            // clear error
            password.setAttribute("aria-invalid", "false");
            password.removeAttribute("data-errorreason");

            document.getElementById(password.getAttribute("aria-errormessage")).textContent = "";
            break;
        case "short":
            if (password.value.length < 8) break;

            // clear error
            password.setAttribute("aria-invalid", "false");
            password.removeAttribute("data-errorreason");

            document.getElementById(password.getAttribute("aria-errormessage")).textContent = "";
            break;
        default:
            console.warn("password has unknown error reason")
            break;
    }
})

confirmPassword.addEventListener("input", () => {
    if (confirmPassword.getAttribute("aria-invalid") != "true") return;

    switch (confirmPassword.getAttribute("data-errorreason")) {
        case "empty":
            if (confirmPassword.value.length == 0) break;

            // clear error
            confirmPassword.setAttribute("aria-invalid", "false");
            confirmPassword.removeAttribute("data-erroreason");

            document.getElementById(confirmPassword.getAttribute("aria-errormessage")).textContent = "";
            break;
        case "mismatch":
            if (confirmPassword.value !== password.value) break;

            // clear error
            confirmPassword.setAttribute("aria-invalid", "false");
            confirmPassword.removeAttribute("data-erroreason");

            document.getElementById(confirmPassword.getAttribute("aria-errormessage")).textContent = "";
            break;
        default:
            console.warn("confirmpassword has unknown error reason");
            break;
    }
})

loginButton.addEventListener("click", () => {
    window.location.href = "/login"
})

signupButton.addEventListener("click", () => {
    // first of all, if any inputs are still invalid, just return early
    if (document.querySelector(".fieldset input[aria-invalid=true]")) return;

    if (!username.value) {
        reportError(username, "Please enter a username", "empty");

        // username.setAttribute("aria-invalid", "true"); // styles everything
        // username.setAttribute("data-errorreason", "empty")

        // document.getElementById(username.getAttribute("aria-errormessage")).textContent = "Please enter a username"

        return;
    }

    if (!displayName.value) {
        reportError(displayName, "Please enter a display name");
        // displayName.setAttribute("aria-invalid", "true");
        // document.getElementById(displayName.getAttribute("aria-errormessage")).textContent = "Please enter a display name"

        return;
    }

    if (!password.value) {
        reportError(password, "Please enter a password", "empty");
        // password.setAttribute("aria-invalid", "true");
        // password.setAttribute("data-errorreason", "empty")
        // document.getElementById(password.getAttribute("aria-errormessage")).textContent = "Please enter a password"

        return;
    }

    if (!confirmPassword.value) {
        reportError(confirmPassword, "Please confirm your password", "empty");
        // confirmPassword.setAttribute("aria-invalid", "true");
        // confirmPassword.setAttribute("data-errorreason", "empty")
        // document.getElementById(confirmPassword.getAttribute("aria-errormessage")).textContent = "Please confirm your password"

        return;
    }

    if (password.value.length < 8) {
        // according to NIST security, this is the only restriction we should impose
        reportError(password, "Passwords must be at least 8 characters", "short");

        // password.setAttribute("aria-invalid", "true");
        // password.setAttribute("data-errorreason", "short");

        // document.getElementById(password.getAttribute("aria-errormessage")).textContent = "Passwords must be at least 8 characters"

        return;
    }

    if (password.value !== confirmPassword.value) {
        reportError(confirmPassword, "Passwords do not match", "mismatch");
        // confirmPassword.setAttribute("aria-invalid", "true");
        // confirmPassword.setAttribute("data-errorreason", "mismatch");

        // document.getElementById(confirmPassword.getAttribute("aria-errormessage")).textContent = "Passwords do not match"

        return;
    }


    // Now, all client-side validation has been completed. It is time to send this information to the server

    fetch("", {
        method: "POST",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: username.value,
            displayName: displayName.value,
            password: password.value
        }),
        credentials: "same-origin"
    })
        .then(response => {
            if (response.status == 200) {
                // all good, let's continue to '/'
                window.location.href = "/"
                return;
            }


            // else, report the error

            reportError(username, "Username is taken", "alreadyexists");
            // username.setAttribute("aria-invalid", "true");
            // username.setAttribute("data-errorreason", "alreadyexists");
            takenUsernames.push(username.value);


            // document.getElementById(username.getAttribute("aria-errormessage")).textContent = "Username is taken"
        })

})