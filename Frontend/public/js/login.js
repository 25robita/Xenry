/** @type {HTMLButtonElement} */
const showHidePWButton = document.querySelector(".password-field button");
/** @type {HTMLInputElement} */
const username = document.getElementById("username")
/** @type {HTMLInputElement} */
const password = document.getElementById("password")


/** @type {HTMLButtonElement} */
const loginButton = document.getElementById("login")
/** @type {HTMLButtonElement} */
const signupButton = document.getElementById("signup")

let visibilityTimeout;

showHidePWButton.addEventListener("click", () => {
    const pressed = showHidePWButton.getAttribute("aria-pressed") == "false";

    showHidePWButton.setAttribute("aria-pressed", pressed)
    password.setAttribute("type", pressed ? "text" : "password");


    if (!visibilityTimeout) { // Hide password after 5 seconds for security
        visibilityTimeout = setTimeout(() => {
            showHidePWButton.click();
            visibilityTimeout = undefined;
        }, 5000);
    } else {
        clearTimeout(visibilityTimeout);
        visibilityTimeout = undefined;
    }
})

username.addEventListener("input", () => {
    if (username.getAttribute("aria-invalid") == "false") return;

    switch (username.getAttribute("data-reason")) {
        case "empty":
            if (username.value.length == 0) return;
            // clear error

            username.setAttribute("aria-invalid", "false");
            username.removeAttribute("data-reason");

            document.getElementById("error-username").textContent = "";

            break;
        case "incorrect":
            // just clear the error on any change (from both)

            username.setAttribute("aria-invalid", "false");
            username.removeAttribute("data-reason");

            password.setAttribute("aria-invalid", "false");
            password.removeAttribute("data-reason");

            document.getElementById("error-general").textContent = "";
            break;
    }
})

password.addEventListener("input", () => {
    if (password.getAttribute("aria-invalid") == "false") return;

    switch (password.getAttribute("data-reason")) {
        case "empty":
            if (password.value.length == 0) return;
            // clear error

            password.setAttribute("aria-invalid", "false");
            password.removeAttribute("data-reason");

            document.getElementById("error-password").textContent = "";

            break;
        case "incorrect":
            // just clear the error on any change (from both)

            username.setAttribute("aria-invalid", "false");
            username.removeAttribute("data-reason");

            password.setAttribute("aria-invalid", "false");
            password.removeAttribute("data-reason");

            document.getElementById("error-general").textContent = "";
            break;
    }
})


loginButton.addEventListener("click", () => {
    // data validation
    if (!username.value) {
        username.setAttribute("aria-invalid", "true");
        username.setAttribute("data-reason", "empty");
        document.getElementById("error-username").textContent = "Please enter a username";

        return;
    }
    if (!password.value) {
        password.setAttribute("aria-invalid", "true");
        password.setAttribute("data-reason", "empty");
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
            username: username.value,
            password: password.value
        }),
        credentials: "same-origin", // to accept the authentication cookie
    })
        .then(response => {
            if (response.status == 200) {
                window.location.href = "/"
                return;
            }

            // display error, assuming its an incorrect username/password

            username.setAttribute("aria-invalid", "true");
            username.setAttribute("data-reason", "incorrect");
            password.setAttribute("aria-invalid", "true");
            password.setAttribute("data-reason", "incorrect");

            document.getElementById("error-general").textContent = "Incorrect username or password";

        }).catch(error => {


        })
})

signupButton.addEventListener("click", () => {
    // see if can autocomplete the existing stufff
    window.location.href = "/signup"
})