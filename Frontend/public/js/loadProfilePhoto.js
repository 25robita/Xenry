// this file loads the user's profile picture into the bottom left

const profileButton = document.querySelector(`[data-svg="account"]`)

promiseUserData().then(() => {
    if (!globalUser.profilePicture) return;

    const image = renderElement("img", profileButton, "little-profile-image")
    image.src = globalUser.profilePicture;
})