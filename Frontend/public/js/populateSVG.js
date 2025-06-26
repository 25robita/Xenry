
function populateSVG() {
    document.querySelectorAll("[data-svg]")
        .forEach(element => {
            if (element.querySelector("svg") || element.getAttribute("data-svg-complete") == "true") return;

            element.setAttribute("data-svg-complete", true);

            // first, get the SVG source

            fetch(`./public/images/${element.getAttribute("data-svg")}.svg`)
                .then(async response => {
                    const svgText = await response.text();

                    // then, parse it as HTML

                    const svgDoc = new DOMParser().parseFromString(svgText, "image/svg+xml")
                    console.log(svgDoc);
                    const svgElement = svgDoc.querySelector("svg")

                    // now, append the child to our original element
                    element.appendChild(svgElement);
                })
        })

}

populateSVG();