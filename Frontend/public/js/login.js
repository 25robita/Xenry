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


loginButton.addEventListener("click", async () => {
    // data validation
    if (!username.value) {
        // TODO: error
    }
    if (!password.value) {
        // error
    }

    // if either of those happened, return early (but allow both to happen)

    // send information to server

    const response = await fetch("", {
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

    if (response.status == 200) {
        // TODO: redirect to '/'

        window.location.href = "/"
        return;
    }

    const body = response.json();

    // TODO: display error
    console.log(body);

})

signupButton.addEventListener("click", () => {
    // see if can autocomplete the existing stufff
    window.location.href = "/signup"
})