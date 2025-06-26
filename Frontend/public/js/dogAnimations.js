// RANDOMS

let interruptLookAround = false; // allows more important things to interrupt the look around process

/**
 * 
 * @param {number} delay 
 * @returns {Promise}
 */
function asyncDogTimeout(delay) {
    return new Promise((res, rej) => {
        setTimeout(() => {
            if (interruptLookAround)
                return rej();

            res();
        }, delay);
    })
}

async function lookAround() {
    if (interruptLookAround) return;

    // first, look left
    document.getElementById("pupils").style.translate = "-2% 0";

    await asyncDogTimeout(500);

    // then, look right
    document.getElementById("pupils").style.translate = "2% 0";

    await asyncDogTimeout(500);

    // then, back to centre

    document.getElementById("pupils").style.translate = "0 0";
}

async function crossEyes() {
    if (interruptLookAround) return;

    const [leftPupil, rightPupil] = document.querySelectorAll("#pupils > *")

    leftPupil.style.translate = "1.5% -1%";
    rightPupil.style.translate = "-1.5% 1%";

    await asyncDogTimeout(2000);

    leftPupil.style.translate = ""
    rightPupil.style.translate = ""
}

setInterval(() => {
    // every 2 seconds, there's a 15% chance the dog will look around

    if (Math.random() < .15) {
        lookAround().catch(() => { });
        return;
    }

    // there's also a 4% chance if that doesn't happen that updog will cross its eyes
    if (Math.random() < .02) {
        crossEyes().catch(() => { });
        return;
    }

}, 4000)


// UTILS

/**
 * 
 * @param {number} x 
 * @param {number} y 
 * @param {boolean} blocking 
 */
function look(x, y, blocking = true) {
    document.getElementById("pupils").style.translate = `${x}% ${y}%`;

    if (blocking) {
        interruptLookAround = true;
    }
}

/**
 * 
 * @param {boolean} endBlock 
 */
function resetLook(endBlock = true) {
    look(0, 0);
    interruptLookAround = false;
}