function showProjects() {
    // skeleton

    const main = document.querySelector("main");

    const content = renderDiv(main, "content");

    // populate content

    const splitRow = renderDiv(content, "split-row")

    // populate header

    const heading = renderElement("h2", splitRow);

    heading.textContent = "My Projects:" // TODO: populate this with displayname

    const addProjectButton = renderElement("button", splitRow, "add-project")
    addProjectButton.setAttribute("aria-label", "Add Project")
    addProjectButton.setAttribute("data-svg", "add")

    // populate project list

    const projectList = renderDiv(content, "project-list")

    fetch("/api/projects").then(response => {
        if (response.status != 200) {
            // TODO: show an error
            return;
        }

        response.json().then(projects => {
            for (const { name, description, UUID } of projects) {
                renderProjectCard(name, description, `/project/${UUID}`);
            }
        })
    })

    // add the "Add project" card as well

    const addProjectCard = renderElement("a", projectList, "card", "add-project");

    addProjectCard.href = "" // TODO: add this
    addProjectCard.setAttribute("aria-label", "Add Project")

    const addProjectCardHeading = renderElement("h3", addProjectCard)
    addProjectCardHeading.textContent = "Add Project"

    const addProjectCardPlus = renderDiv(addProjectCard)
    addProjectCardPlus.setAttribute("data-svg", "add")
}

switch (window.location.pathname) {
    default:
        showProjects();
        break;
}

populateSVG(); // make sure all SVGs are populated, just in case