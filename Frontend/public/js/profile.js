// this file handles input data from the profile page, as well as populating the data in the form it needs to wait for user data to be fetched

const imageContainer = document.querySelector(".profile-image .image-container")

/** @type {HTMLInputElement} */
const displayNameInput = document.getElementById("displayname")
/** @type {HTMLInputElement} */
const usernameInput = document.getElementById("username")
/** @type {HTMLInputElement} */
const passwordInput = document.getElementById("password")
/** @type {HTMLInputElement} */
const confirmPasswordInput = document.getElementById("confirmpassword")

/** @type {HTMLButtonElement} */
const editPFPButton = document.getElementById("pfp-pick-button");
/** @type {HTMLInputElement} */
const pfpPicker = document.getElementById("pfp-picker");

/** @type {HTMLButtonElement} */
const cancelButton = document.getElementById("cancel")
/** @type {HTMLButtonElement} */
const saveButton = document.getElementById("save")

promiseUserData().then(() => {
    // populates the user data
    displayNameInput.value = globalUser.displayName;
    usernameInput.value = globalUser.username;

    if (globalUser.profilePicture !== "") {
        const image = renderElement("img", imageContainer)

        image.src = globalUser.profilePicture
    }

})

// handle PFP input

editPFPButton.addEventListener("click", () => {
    // first, get a file from the user (then wait for the change event)

    pfpPicker.click()
})

pfpPicker.addEventListener("change", () => {
    // now that the file has been picked, load it as base64

    const file = pfpPicker.files[0]

    if (file.size > 5_242_880) { // restrict files to 5mb
        // TODO: show error
        return;
    }

    const reader = new FileReader();

    reader.addEventListener("loadend", () => {
        const blob = reader.result; // this is the base64 representation we've been looking for

        // now, send this to the server

        globalUser.updateProfilePhoto(blob);

        // then update all the profile pictures on the page

        const largeProfileImage = document.querySelector(".profile-image .image-container img");

        if (!largeProfileImage) {
            // need to create it
            const image = renderElement("img", imageContainer)

            image.src = globalUser.profilePicture
        } else {
            largeProfileImage.src = globalUser.profilePicture
        }

        const littleProfileImage = document.querySelector(".little-profile-image")

        if (!littleProfileImage) {
            // need to create it
            const image = renderElement("img", profileButton, "little-profile-image")
            image.src = globalUser.profilePicture;
        } else {
            littleProfileImage.src = globalUser.profilePicture;
        }
    })

    reader.readAsDataURL(file);
})


// handling other input

/** @type {NodeListOf<HTMLButtonElement>} */
const showHidePWButtons = document.querySelectorAll(".password-field button")

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

usernameInput.addEventListener("input", () => { // fix validity display
    if (usernameInput.getAttribute("aria-invalid") != "true") return;

    switch (usernameInput.getAttribute("data-errorreason")) {
        case "empty":
            // guard clause
            if (usernameInput.value.length == 0) break;

            // else, clear the error

            usernameInput.setAttribute("aria-invalid", "false")
            usernameInput.removeAttribute("data-errorreason");

            document.getElementById(usernameInput.getAttribute("aria-errormessage")).textContent = '';
            break;
        case "alreadyexists":
            if (takenUsernames.includes(usernameInput.value)) break;

            // else, clear the error

            usernameInput.setAttribute("aria-invalid", "false")
            usernameInput.removeAttribute("data-errorreason");

            document.getElementById(usernameInput.getAttribute("aria-errormessage")).textContent = '';
            break;
        default:
            console.warn("Username has unknown error reason")
            break;
    }
})

usernameInput.addEventListener("input", () => {
    // listen for taken usernames

    if (takenUsernames.includes(usernameInput.value)) {
        reportError(usernameInput, "Username is taken", "alreadyexists")
    }
})

displayNameInput.addEventListener("input", () => {
    if (displayNameInput.getAttribute("aria-invalid") != "true") return; // guard clause

    // the only reason a display name can be invalid is that it is empty

    if (displayNameInput.value.length == 0) return;

    displayNameInput.setAttribute("aria-invalid", "false");
    document.getElementById(displayNameInput.getAttribute("aria-errormessage")).textContent = "";
})

passwordInput.addEventListener("input", () => {
    if (passwordInput.getAttribute("aria-invalid") != "true") return;

    switch (passwordInput.getAttribute("data-errorreason")) {
        case "empty":
            if (passwordInput.value.length == 0) break;

            // clear error
            passwordInput.setAttribute("aria-invalid", "false");
            passwordInput.removeAttribute("data-errorreason");

            document.getElementById(passwordInput.getAttribute("aria-errormessage")).textContent = "";
            break;
        case "short":
            if (passwordInput.value.length < 8) break;

            // clear error
            passwordInput.setAttribute("aria-invalid", "false");
            passwordInput.removeAttribute("data-errorreason");

            document.getElementById(passwordInput.getAttribute("aria-errormessage")).textContent = "";
            break;
        default:
            console.warn("password has unknown error reason")
            break;
    }
})

confirmPasswordInput.addEventListener("input", () => {
    if (confirmPasswordInput.getAttribute("aria-invalid") != "true") return;

    switch (confirmPasswordInput.getAttribute("data-errorreason")) {
        case "empty":
            if (confirmPasswordInput.value.length == 0) break;

            // clear error
            confirmPasswordInput.setAttribute("aria-invalid", "false");
            confirmPasswordInput.removeAttribute("data-erroreason");

            document.getElementById(confirmPasswordInput.getAttribute("aria-errormessage")).textContent = "";
            break;
        case "mismatch":
            if (confirmPasswordInput.value !== passwordInput.value) break;

            // clear error
            confirmPasswordInput.setAttribute("aria-invalid", "false");
            confirmPasswordInput.removeAttribute("data-erroreason");

            document.getElementById(confirmPasswordInput.getAttribute("aria-errormessage")).textContent = "";
            break;
        default:
            console.warn("confirmpassword has unknown error reason");
            break;
    }
})

function validateChange() {
    if (document.querySelector(".fieldset input[aria-invalid=true]")) return;

    if (!usernameInput.value) {
        reportError(usernameInput, "Please enter a username", "empty");
        return false;
    }

    if (!displayNameInput.value) {
        reportError(displayNameInput, "Please enter a display name");
        return false;
    }

    if (passwordInput.value && !confirmPasswordInput.value) {
        reportError(confirmPasswordInput, "Please confirm your password", "empty");
        return false;
    }

    if (passwordInput.value && passwordInput.value.length < 8) {
        // according to NIST security, this is the only restriction we should impose
        reportError(passwordInput, "Passwords must be at least 8 characters", "short");
        return false;
    }

    if (passwordInput.value && passwordInput.value !== confirmPasswordInput.value) {
        reportError(confirmPasswordInput, "Passwords do not match", "mismatch");
        return false;
    }

    return true;
}

document.querySelector(".fieldset").addEventListener("input", () => {
    saveButton.disabled = false;
})

// show/hide password
let visibilityTimeout;

showHidePWButtons.forEach(button =>
    button.addEventListener("click", () => {
        // either button applies to both password fields
        const pressed = button.getAttribute("aria-pressed") === "false";

        showHidePWButtons.forEach(button => button.setAttribute("aria-pressed", pressed))

        passwordInput.type = confirmPasswordInput.type = pressed ? "text" : "password";

        if (!visibilityTimeout) { // Hide password after 5 seconds for security
            visibilityTimeout = setTimeout(() => {
                button.click();
                visibilityTimeout = undefined;
            }, 5000);
        } else {
            clearTimeout(visibilityTimeout);
            visibilityTimeout = undefined;
        }
    })
)


cancelButton.addEventListener("click", () => {
    // redirect to homepage
    window.location.href = "/"
})

saveButton.addEventListener("click", () => {
    // first, validate the changes
    if (!validateChange()) return;


    // push changes to server

    if (displayNameInput.value !== globalUser.displayName)
        globalUser.updateDisplayName(displayNameInput.value);
    if (usernameInput.value !== globalUser.username)
        globalUser.updateUsername(usernameInput.value); // TODO: handle case of taken username, dipslay error
    if (passwordInput.value)
        globalUser.updatePassword(passwordInput.value);

    // reset form appearance
    passwordInput.value = ""
    confirmPasswordInput.value = ""

})

