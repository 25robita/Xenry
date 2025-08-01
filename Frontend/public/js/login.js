/** @type {HTMLButtonElement} */
const showHidePWButton = document.querySelector(".password-field button");
/** @type {HTMLInputElement} */
const usernameInput = document.getElementById("username")
/** @type {HTMLInputElement} */
const passwordInput = document.getElementById("password")


/** @type {HTMLButtonElement} */
const loginButton = document.getElementById("login")
/** @type {HTMLButtonElement} */
const signupButton = document.getElementById("signup")

let visibilityTimeout;

showHidePWButton.addEventListener("click", () => {
    const pressed = showHidePWButton.getAttribute("aria-pressed") == "false";

    showHidePWButton.setAttribute("aria-pressed", pressed)
    passwordInput.setAttribute("type", pressed ? "text" : "password");

    if (pressed)
        look(Math.random() > 0.5 ? -2 : 2, -1)

    if (!visibilityTimeout) { // Hide password after 5 seconds for security
        visibilityTimeout = setTimeout(() => {
            showHidePWButton.click();
            visibilityTimeout = undefined;
            resetLook();
        }, 5000);
    } else {
        clearTimeout(visibilityTimeout);
        visibilityTimeout = undefined;
    }
})

usernameInput.addEventListener("input", () => {
    if (usernameInput.getAttribute("aria-invalid") == "false") return;

    switch (usernameInput.getAttribute("data-reason")) {
        case "empty":
            if (usernameInput.value.length == 0) return;
            // clear error

            usernameInput.setAttribute("aria-invalid", "false");
            usernameInput.removeAttribute("data-reason");

            document.getElementById("error-username").textContent = "";

            break;
        case "incorrect":
            // just clear the error on any change (from both)

            usernameInput.setAttribute("aria-invalid", "false");
            usernameInput.removeAttribute("data-reason");

            passwordInput.setAttribute("aria-invalid", "false");
            passwordInput.removeAttribute("data-reason");

            document.getElementById("error-general").textContent = "";
            break;
    }
})

passwordInput.addEventListener("input", () => {
    if (passwordInput.getAttribute("aria-invalid") == "false") return;

    switch (passwordInput.getAttribute("data-reason")) {
        case "empty":
            if (passwordInput.value.length == 0) return;
            // clear error

            passwordInput.setAttribute("aria-invalid", "false");
            passwordInput.removeAttribute("data-reason");

            document.getElementById("error-password").textContent = "";

            break;
        case "incorrect":
            // just clear the error on any change (from both)

            usernameInput.setAttribute("aria-invalid", "false");
            usernameInput.removeAttribute("data-reason");

            passwordInput.setAttribute("aria-invalid", "false");
            passwordInput.removeAttribute("data-reason");

            document.getElementById("error-general").textContent = "";
            break;
    }
})


loginButton.addEventListener("click", () => {
    // data validation
    if (!usernameInput.value) {
        usernameInput.setAttribute("aria-invalid", "true");
        usernameInput.setAttribute("data-reason", "empty");
        document.getElementById("error-username").textContent = "Please enter a username";

        return;
    }
    if (!passwordInput.value) {
        passwordInput.setAttribute("aria-invalid", "true");
        passwordInput.setAttribute("data-reason", "empty");
        document.getElementById("error-password").textContent = "Please enter a password";

        return;
    }

    // if either of those happened, return early (but allow both to happen)

    // send information to server

    fetch("", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify({
            username: usernameInput.value,
            password: passwordInput.value
        }),
        credentials: "same-origin", // to accept the authentication cookie
    })
        .then(response => {
            if (response.status == 200) {
                window.location.href = "/"
                return;
            }

            // display error, assuming its an incorrect username/password

            usernameInput.setAttribute("aria-invalid", "true");
            usernameInput.setAttribute("data-reason", "incorrect");
            passwordInput.setAttribute("aria-invalid", "true");
            passwordInput.setAttribute("data-reason", "incorrect");

            document.getElementById("error-general").textContent = "Incorrect username or password";

        }).catch(error => {


        })
})

signupButton.addEventListener("click", () => {
    // see if can autocomplete the existing stufff
    window.location.href = "/signup"
})


// Updog code

usernameInput.addEventListener("focus", () => {
    if (visibilityTimeout) return
    look(0, 2);
})

usernameInput.addEventListener("focusout", () => {
    if (visibilityTimeout) return
    resetLook()
})

passwordInput.addEventListener("focus", () => {
    if (visibilityTimeout) return
    // randomise which side updog looks towards
    look((Math.random() > .5 ? -1 : 1) * 2, -1);
})

passwordInput.addEventListener("focusout", () => {
    if (visibilityTimeout) return
    resetLook()
})

