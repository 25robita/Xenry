function showProjects() {
    // skeleton

    const main = document.querySelector("main");

    const content = renderDiv(main, "content");

    // populate content

    const splitRow = renderDiv(content, "split-row")

    // populate header

    const heading = renderElement("h2", splitRow);

    heading.textContent = "My Projects:" // TODO: populate this with displayname

    const addProjectButton = renderElement("button", splitRow, "add-project", "svg-button")
    addProjectButton.setAttribute("aria-label", "Add Project")
    addProjectButton.setAttribute("data-svg", "add")

    // populate project list

    const projectList = renderDiv(content, "project-list")

    promiseUserData().then(() => {

        return globalUser.updateProjects(true)
    }).then(() => {
        for (const { name, description, UUID } of globalUser.projects) {
            renderProjectCard(name, description, `/project/${UUID}`); // TODO: refactor, move to a method of Project maybe
        }
    }, () => {
        // TODO: show an error
    })

    // add the "Add project" card as well

    function addProjectHandler() {
        // add project

        fetch("/api/project", { method: "POST" })
            .then(response => response.json())
            .then(({ status, message, UUID }) => {
                if (status != 201) {
                    // TODO: show error
                    return
                }

                // project has been made, now redirect

                window.location.href = `/project/${UUID}`
            })
    }

    const addProjectCard = renderElement("a", projectList, "card", "add-project");

    addProjectCard.href = "#"
    addProjectCard.setAttribute("aria-label", "Add Project")

    const addProjectCardHeading = renderElement("h3", addProjectCard)
    addProjectCardHeading.textContent = "Add Project"

    const addProjectCardPlus = renderDiv(addProjectCard)
    addProjectCardPlus.setAttribute("data-svg", "add")

    addProjectCard.addEventListener("click", addProjectHandler);

    addProjectButton.addEventListener("click", addProjectHandler);
}

/**
 * 
 * @param {import("crypto").UUID} uuid 
 */
function showProject(uuid) {

    const main = document.querySelector("main");
    main.setAttribute("project", "")

    // TODO: implement different views

    // first, await the project object

    promiseProjectData().then(() => {
        // then, make header

        function addTaskHandler() {
            globalProject.createTask().then(task => {

                task.renderChecklist(taskTBody)
                task.renderSidebar();
                populateSVG();
            }).catch(() => {
                // TODO: show error
            })
        }

        const header = renderElement("section", main, "project-header");

        const heading = renderElement("h2", header)

        /** @type {HTMLInputElement} */
        const headingInput = renderElement("input", heading);
        headingInput.value = globalProject.name;

        // heading event listeners
        headingInput.addEventListener("click", () => {
            headingInput.select();
        })

        headingInput.addEventListener("change", () => {
            console.log("hi")

            // perform input validation

            if (headingInput.value == "") return; // existence
            if (typeof headingInput.value !== "string") return; // type
            if (headingInput.value.length <= 0 || headingInput.value.length > 30) return; // range

            globalProject.updateName(headingInput.value);

        })

        const buttonSet = renderDiv(header, "buttonset");

        const addButton = renderElement("button", buttonSet, "svg-button")
        addButton.setAttribute("data-svg", "add")

        addButton.addEventListener("click", () => addTaskHandler())


        const moreButton = renderElement("button", buttonSet, "svg-button")
        moreButton.setAttribute("data-svg", "ellipsis")

        moreButton.addEventListener("click", () => globalProject.renderSidebar())



        // const criticalPathButton = renderElement("button", buttonSet, "svg-button")
        // criticalPathButton.setAttribute("data-svg", "path-on")

        // const filterButton = renderElement("button", buttonSet, "svg-button")
        // filterButton.setAttribute("data-svg", "filter")

        // const searchButton = renderElement("button", buttonSet, "svg-button")
        // searchButton.setAttribute("data-svg", "search")

        populateSVG();

        // make main area

        const graphArea = renderElement('section', main, "project-graph-area")

        graphArea.setAttribute("data-graph-type", "checklist") // TODO: implement multiple view types

        // iterate tasks and create checklist items

        const taskTable = renderElement("table", graphArea);
        const taskTBody = renderElement("tbody", taskTable);

        for (const task of globalProject.tasks) {
            task.renderChecklist(taskTBody);
        }

        populateSVG();

        // task list listeners

        graphArea.addEventListener("click", (event) => {
            /** @type {HTMLElement} */
            const elem = event.target;

            if (elem.matches(".task-name-input")) {
                elem.select();
            }
        })

        graphArea.addEventListener("change", (event) => {
            /** @type {HTMLElement} */
            const elem = event.target;

            if (elem.matches(".task-name-input")) {
                const taskUUID = elem.getAttribute("data-taskid");

                const task = globalProject.getTask(taskUUID)

                if (elem.value == "") return; // existence
                if (typeof elem.value !== "string") return; // type
                if (elem.value.length <= 0 || elem.value.length > 30) return; // range

                task.updateName(elem.value)
                return;
            }

            if (elem.matches("input[type=checkbox]") && elem.closest("tr")) {
                const taskUUID = elem.getAttribute("data-taskid");

                const task = globalProject.getTask(taskUUID);

                task.updateCompletion(elem.checked ? 1 : 0)
            }
        })

    }).catch(reason => {
        console.warn(reason);
    })

}

const route = window.location.pathname

if (route.startsWith("/project/")) {
    const UUID = route.match(/(?<=\/project\/)([\-a-f0-9]*)/g)
    showProject(UUID);
} else if (route.startsWith("/profile")) {
    // do nothing for now
} else {
    showProjects();
}

populateSVG(); // make sure all SVGs are populated, just in case