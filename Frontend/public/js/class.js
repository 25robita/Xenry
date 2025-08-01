/** @import {renderElement, renderDiv} from "./render" */
/** @import {populateSVG} from "./populateSVG" */

class User {
    /** @type {string} */
    username;
    /** @type {string} */
    displayName;
    /** @type {(Project | ProjectEconomy)[]} */
    projects;
    /** @type {string} */
    profilePicture;

    /**
     * @param {string} username 
     * @param {string} displayName 
     * @param {string} profilePicture 
     */
    constructor(username, displayName, profilePicture) {
        this.username = username;
        this.displayName = displayName;
        this.profilePicture = profilePicture;

        this.projects = [];
    }

    /**
     * updates the user's project list from the server
     * @param {boolean} economyMode fetch only data needed at a glance, using ProjectEconomy class
     */
    async updateProjects(economyMode = true) {
        this.projects.length = 0;

        const projects = await fetch("/api/projects").then(r => r.json())

        for (const { name, description, UUID } of projects) {
            if (economyMode) this.projects.push(new ProjectEconomy(name, description, UUID));
            else this.projects.push(Project.fromUUID(UUID))
        }
    }

    /**
     * Updates the username of the user and patches the changes on the server
     * @param {string} newUsername
     */
    updateUsername(newUsername) {
        fetch(`/api/user/${this.username}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: newUsername
            })
        }).then(() => this.username = newUsername)
    }

    /**
     * Updates the displayName of the user and patches the changes on the server
     * @param {string} newDisplayName
     */
    updateDisplayName(newDisplayName) {
        this.displayName = newDisplayName;

        fetch(`/api/user/${this.username}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                displayName: newDisplayName
            })
        })
    }

    /**
     * Updates the profilePhoto of the user and patches the changes on the server
     * @param {string} newProfilePhoto
     */
    updateProfilePhoto(newProfilePhoto) {
        this.profilePicture = newProfilePhoto;

        fetch(`/api/user/${this.username}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                profilePhoto: newProfilePhoto
            })
        })
    }

    /**
     * Updates the password of the user and patches the changes on the server
     * @param {string} newPassword
     */
    updatePassword(newPassword) {
        fetch(`/api/user/${this.username}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                password: newPassword
            })
        })
    }
}

class Project {
    /** @type {string} */
    UUID;
    /** @type {string} */
    name;
    /** @type {string} */
    description;
    /** @type {Task[]} */
    tasks;
    /** @type {boolean[]} */
    excludedDays;
    /** @type {TimePeriod[]} */
    excludedTimePeriods;

    /**
     * 
     * @param {string} UUID 
     * @param {string} name 
     * @param {string} description 
     * @param {Task[]} tasks 
     * @param {boolean[]} excludedDays 
     * @param {TimePeriod[]} excludedTimePeriods 
     */
    constructor(UUID, name, description, tasks, excludedDays, excludedTimePeriods) {
        this.UUID = UUID;
        this.name = name;
        this.description = description;
        this.tasks = tasks;
        this.excludedDays = excludedDays;
        this.excludedTimePeriods = excludedTimePeriods;
    }

    /**
     * @param {string} UUID 
     * @returns {Promise<Project>}
     */
    static async fromUUID(UUID) {
        // TODO: implement this

        // fetch data from server
        const { owner, name, description, excludedDays, tasks: serverTasks, timePeriods } = await fetch(`/api/project/${UUID}`).then(response => response.json())

        // process tasks

        const tasks = []

        for (const serverTask of serverTasks) {
            const task = new Task(serverTask);

            tasks.push(task);
        }

        return new Project(UUID, name, description, tasks, excludedDays, timePeriods);
    }

    /**
     * Updates the name of the project and patches the changes on the server
     * @param {string} newName 
     */
    updateName(newName) {
        this.name = newName;

        fetch(`/api/project/${this.UUID}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: newName
            })
        }).then(r => console.log(r.status)).catch(console.warn)
    }

    /**
     * Updates the description of the project and patches the changes on the server
     * @param {string} newDescription 
     */
    updateDescription(newDescription) {
        this.description = newDescription;

        fetch(`/api/project/${this.UUID}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                description: newDescription
            })
        })
    }

    /**
     * Updates the excludedDays of the project and patches the changes on the server
     * @param {boolean[]} newExcludedDays 
     */
    updateExcludedDays(newExcludedDays) {
        this.excludedDays = newExcludedDays;

        fetch(`/api/project/${this.UUID}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                excludedDays: newExcludedDays
            })
        })
    }

    /**
     * 
     * @param {number} index 
     * @param {boolean} excluded 
     */
    updateDayExcluded(index, excluded) {
        this.excludedDays[index] = excluded;
        this.updateExcludedDays(this.excludedDays);
    }

    /**
    * 
    * @param {string} UUID the UUID of the task
    * @returns {Task | undefined}
    */
    getTask(UUID) {
        for (const task of this.tasks) {
            if (task.UUID == UUID) return task
        }
    }

    /**
     * @returns {Promise<Task>}
     */
    createTask() {
        return new Promise((res, rej) => {
            fetch(`/api/task`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    projectUUID: this.UUID
                })
            })
                .then(r => r.json())
                .then(({ UUID }) => Task.fromUUID(UUID).then(task => {
                    this.tasks.push(task);
                    res(task)
                }))
                .catch(rej)
        })
    }

    deleteProject() {
        fetch(`/api/project/${this.UUID}`, {
            method: "DELETE"
        }).then(({ status }) => {
            if (status != 200) return;

            // redirect

            window.location.href = "/"
        })
    }

    renderSidebar() {
        const main = document.querySelector("main")

        // begin by removing any existing sidebar contents
        let parent;
        if (parent = document.querySelector("aside.sidebar")) {

            if (parent.getAttribute("data-taskid")) {
                // clear the sidebar
                parent.replaceChildren();
                parent.removeAttribute("data-taskid")
            } else {
                // close sidebar when you press the same "more" button again

                parent.remove();
                main.querySelector(".project-graph-area").removeAttribute("data-sidebar-visible")
                return;
            }
        } else {
            parent = renderElement("aside", main, "sidebar")
            main.querySelector(".project-graph-area").setAttribute("data-sidebar-visible", "true")
        }

        const headerRow = renderDiv(parent, "header-row")

        const heading = renderElement("h3", headerRow);
        /** @type {HTMLInputElement} */
        const headingInput = renderElement("input", heading);
        headingInput.type = "text";
        headingInput.value = this.name;
        headingInput.id = "name"
        headingInput.name = "name"

        headingInput.addEventListener("change", () => {
            if (!headingInput.value) return;

            this.updateName(headingInput.value);

            document.querySelector("h2>input").value = this.name;
        })

        const deleteButton = renderElement("button", headerRow, "svg-button");
        deleteButton.setAttribute("data-svg", "delete")

        deleteButton.addEventListener("click", () => {
            this.deleteProject();
        })

        populateSVG();

        // add notes field

        const notesField = renderDiv(parent, "field");
        const notesLabel = renderElement("label", notesField)
        notesLabel.textContent = "Notes:"
        notesLabel.setAttribute("for", "notes")

        const notesArea = renderElement("textarea", notesField)
        notesArea.value = this.description;
        notesArea.setAttribute("wrap", "hard")
        notesArea.id = "notes"
        notesArea.name = "notes"

        notesArea.addEventListener("change", () => {
            this.updateDescription(notesArea.value);
        })

        // add day checkboxes

        const daysField = renderDiv(parent, "field")
        const daysMasterLabel = renderElement("label", daysField)
        daysMasterLabel.textContent = "Excluded Days:"



        const daysFSRow = renderDiv(daysField, "fieldset-row", "time-estimates");

        const mondayColumn = renderDiv(daysFSRow, "column")
        const mondayLabel = renderElement("label", mondayColumn)
        mondayLabel.setAttribute("for", "monday")
        mondayLabel.textContent = "M"
        mondayLabel.title = "Monday"

        /** @type {HTMLInputElement} */
        const mondayInput = renderElement("input", mondayColumn)
        mondayInput.id = "monday"
        mondayInput.name = mondayInput.id
        mondayInput.type = "checkbox"
        mondayInput.checked = this.excludedDays[0];

        const tuesdayColumn = renderDiv(daysFSRow, "column")
        const tuesdayLabel = renderElement("label", tuesdayColumn)
        tuesdayLabel.setAttribute("for", "tuesday")
        tuesdayLabel.textContent = "T"
        tuesdayLabel.title = "Tuesday"

        /** @type {HTMLInputElement} */
        const tuesdayInput = renderElement("input", tuesdayColumn)
        tuesdayInput.id = "tuesday"
        tuesdayInput.name = tuesdayInput.id
        tuesdayInput.type = "checkbox"
        tuesdayInput.checked = this.excludedDays[1];

        const wednesdayColumn = renderDiv(daysFSRow, "column")
        const wednesdayLabel = renderElement("label", wednesdayColumn)
        wednesdayLabel.setAttribute("for", "wednesday")
        wednesdayLabel.textContent = "W"
        wednesdayLabel.title = "Wednesday"

        /** @type {HTMLInputElement} */
        const wednesdayInput = renderElement("input", wednesdayColumn)
        wednesdayInput.id = "wednesday"
        wednesdayInput.name = wednesdayInput.id
        wednesdayInput.type = "checkbox"
        wednesdayInput.checked = this.excludedDays[2];

        const thursdayColumn = renderDiv(daysFSRow, "column")
        const thursdayLabel = renderElement("label", thursdayColumn)
        thursdayLabel.setAttribute("for", "thursday")
        thursdayLabel.textContent = "Th"
        thursdayLabel.title = "Thursday"

        /** @type {HTMLInputElement} */
        const thursdayInput = renderElement("input", thursdayColumn)
        thursdayInput.id = "thursday"
        thursdayInput.name = thursdayInput.id
        thursdayInput.type = "checkbox"
        thursdayInput.checked = this.excludedDays[3];

        const fridayColumn = renderDiv(daysFSRow, "column")
        const fridayLabel = renderElement("label", fridayColumn)
        fridayLabel.setAttribute("for", "friday")
        fridayLabel.textContent = "F"
        fridayLabel.title = "Friday"

        /** @type {HTMLInputElement} */
        const fridayInput = renderElement("input", fridayColumn)
        fridayInput.id = "friday"
        fridayInput.name = fridayInput.id
        fridayInput.type = "checkbox"
        fridayInput.checked = this.excludedDays[4];

        const saturdayColumn = renderDiv(daysFSRow, "column")
        const saturdayLabel = renderElement("label", saturdayColumn)
        saturdayLabel.setAttribute("for", "saturday")
        saturdayLabel.textContent = "S"
        saturdayLabel.title = "Saturday"

        /** @type {HTMLInputElement} */
        const saturdayInput = renderElement("input", saturdayColumn)
        saturdayInput.id = "saturday"
        saturdayInput.name = saturdayInput.id
        saturdayInput.type = "checkbox"
        saturdayInput.checked = this.excludedDays[5];

        const sundayColumn = renderDiv(daysFSRow, "column")
        const sundayLabel = renderElement("label", sundayColumn)
        sundayLabel.setAttribute("for", "sunday")
        sundayLabel.textContent = "Su"
        sundayLabel.title = "Sunday"

        /** @type {HTMLInputElement} */
        const sundayInput = renderElement("input", sundayColumn)
        sundayInput.id = "sunday"
        sundayInput.name = sundayInput.id
        sundayInput.type = "checkbox"
        sundayInput.checked = this.excludedDays[6];

        daysFSRow.addEventListener("change", ({ target }) => {
            /** @type {HTMLInputElement} */
            const element = target;

            if (!element.matches("input[type=checkbox]")) return;

            switch (element.name) {
                case "monday":
                    this.updateDayExcluded(0, element.checked);
                    break;
                case "tuesday":
                    this.updateDayExcluded(1, element.checked);
                    break;
                case "wednesday":
                    this.updateDayExcluded(2, element.checked);
                    break;
                case "thursday":
                    this.updateDayExcluded(3, element.checked);
                    break;
                case "friday":
                    this.updateDayExcluded(4, element.checked);
                    break;
                case "saturday":
                    this.updateDayExcluded(5, element.checked);
                    break;
                case "sunday":
                    this.updateDayExcluded(6, element.checked);
                    break;
            }
        })
    }
}


/**
 * smaller version of the Project class, only containing basic information useful for project list screen
 */
class ProjectEconomy {
    /** @type {string} */
    name;
    /** @type {string} */
    description;
    /** @type {string} */
    UUID;

    /**
     * 
     * @param {string} name 
     * @param {string} description 
     * @param {string} UUID 
     */
    constructor(name, description, UUID) {
        this.name = name;
        this.description = description;
        this.UUID = UUID;
    }
}

/** @typedef {{
    UUID: string;
    name: string;
    description: string;
    duration: {
        optimistic: number;
        normal: number;
        pessimistic: number;
    };
    startDate: Date;
    completion: number;
    tag: string;
    colour: string;
    assignedTeamMember: string;
    isMilestone: boolean;
    dependentOn: string[];
    dependencyOf: string[];
}} TaskServerData  */

class Task {
    /** @type {string} */
    UUID;
    /** @type {string} */
    name;
    /** @type {string} */
    description;
    /** @type {string[]} array of Task UUIDs */
    dependentOn;
    /** @type {string[]} array of Task UUIDs*/
    dependencyOf;
    /** @type {number} in days*/
    durationOptimistic;
    /** @type {number} in days*/
    durationPessimistic;
    /** @type {number} in days*/
    durationNormal;
    /** @type {Date} */
    startDate;
    /** @type {number} */
    completion;
    /** @type {string} */
    tag;
    /** @type {string} */
    assignedTeamMember;
    /** @type {string} */
    colour;

    /**
     * 
     * @param {TaskServerData} serverData 
     * @returns 
     */
    constructor(serverData) {
        if (!serverData) return; // this implies the fromUUID function is being used, and data will be fetched from the server

        this.#updateFromServerData(serverData);
    }

    /**
     * 
     * @param {`${string}-${string}-${string}-${string}-${string}`} UUID 
     * @returns {Promise<Task>}
     */
    static async fromUUID(UUID) {
        const task = new Task()
        await task.getUpdatedDataFromServer(UUID);

        return task;
    }

    /**
     * Calculates the expected duration based on OMP time estimates
     * @returns {number}
     */
    getExpectedDuration() {
        return (this.durationOptimistic + this.durationPessimistic + 4 * this.durationNormal) / 6;
    }

    /**
     * Calculates the end date based on OMP time estimates
     * @returns {Date}
     */
    getEndDate() {
        return new Date(+this.startDate + (Math.round(this.getExpectedDuration()) * 1000 * 60 * 60 * 24));
    }

    #updateFromServerData(serverData) {
        this.UUID = serverData.UUID;
        this.assignedTeamMember = serverData.assignedTeamMember;
        this.colour = serverData.colour;
        this.completion = serverData.completion;
        this.dependencyOf = serverData.dependencyOf;
        this.dependentOn = serverData.dependentOn;
        this.description = serverData.description;
        this.durationNormal = serverData.duration.normal;
        this.durationOptimistic = serverData.duration.optimistic;
        this.durationPessimistic = serverData.duration.pessimistic;
        this.name = serverData.name;
        this.tag = serverData.tag;
        this.startDate = new Date(serverData.startDate);
    }


    /**
     * Updates the task from the server with an optional provided UUID
     * @param {`${string}-${string}-${string}-${string}-${string}` | undefined} UUID 
     */
    async getUpdatedDataFromServer(UUID) {
        const uuid = UUID ? UUID : this.UUID;

        // fetch data from the server

        const response = await fetch(`/api/task/${uuid}`);

        /** @type {TaskServerData} */
        const serverData = await response.json();

        this.#updateFromServerData(serverData);
    }

    /**
     * Updates the name of the project and patches the changes on the server
     * @param {string} newName 
     */
    updateName(newName) {
        this.name = newName;

        fetch(`/api/task/${this.UUID}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: newName
            })
        }).then(r => console.log(r.status)).catch(console.warn)
    }

    /**
     * Updates the description of the project and patches the changes on the server
     * @param {string} newDescription 
     */
    updateDescription(newDescription) {
        this.description = newDescription;

        fetch(`/api/task/${this.UUID}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                description: newDescription
            })
        }).then(r => console.log(r.status)).catch(console.warn)
    }

    /**
     * Updates the durationOptimistic of the project and patches the changes on the server
     * @param {number} newDurationOptimistic 
     */
    updateDurationOptimistic(newDurationOptimistic) {
        this.durationOptimistic = newDurationOptimistic;

        fetch(`/api/task/${this.UUID}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                durationOptimistic: newDurationOptimistic
            })
        }).then(r => console.log(r.status)).catch(console.warn)
    }

    /**
     * Updates the durationNormal of the project and patches the changes on the server
     * @param {number} newDurationNormal 
     */
    updateDurationNormal(newDurationNormal) {
        this.durationNormal = newDurationNormal;

        fetch(`/api/task/${this.UUID}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                durationNormal: newDurationNormal
            })
        }).then(r => console.log(r.status)).catch(console.warn)
    }

    /**
     * Updates the durationPessimistic of the project and patches the changes on the server
     * @param {number} newDurationPessimistic 
     */
    updateDurationPessimistic(newDurationPessimistic) {
        this.durationPessimistic = newDurationPessimistic;

        fetch(`/api/task/${this.UUID}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                durationPessimistic: newDurationPessimistic
            })
        }).then(r => console.log(r.status)).catch(console.warn)
    }

    /**
     * Updates the startDate of the project and patches the changes on the server
     * @param {Date} newStartDate
     */
    updateStartDate(newStartDate) {
        this.startDate = newStartDate;

        fetch(`/api/task/${this.UUID}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                startDate: +newStartDate
            })
        }).then(r => console.log(r.status)).catch(console.warn)
    }

    /**
     * Updates the completion of the project and patches the changes on the server
     * @param {string} newCompletion
     */
    updateCompletion(newCompletion) {
        this.completion = newCompletion;

        fetch(`/api/task/${this.UUID}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                completion: newCompletion
            })
        }).then(r => console.log(r.status)).catch(console.warn)
    }

    /**
     * Updates the tag of the project and patches the changes on the server
     * @param {string} newTag
     */
    updateTag(newTag) {
        this.tag = newTag;

        fetch(`/api/task/${this.UUID}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                tag: newTag
            })
        }).then(r => console.log(r.status)).catch(console.warn)
    }

    /**
     * Updates the colour of the project and patches the changes on the server
     * @param {string} newColour
     */
    updateColour(newColour) {
        this.colour = newColour;

        fetch(`/api/task/${this.UUID}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                colour: newColour
            })
        }).then(r => console.log(r.status)).catch(console.warn)
    }

    /**
     * Updates the assignedTeamMember of the project and patches the changes on the server
     * @param {string} newAssignedTeamMember
     */
    updateAssignedTeamMember(newAssignedTeamMember) {
        this.assignedTeamMember = newAssignedTeamMember;

        fetch(`/api/task/${this.UUID}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                assignedTeamMember: newAssignedTeamMember
            })
        }).then(r => console.log(r.status)).catch(console.warn)
    }

    /**
     * Updates the isMilestone of the project and patches the changes on the server
     * @param {string} newIsMilestone
     */
    updateIsMilestone(newIsMilestone) {
        this.isMilestone = newIsMilestone;

        fetch(`/api/task/${this.UUID}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                isMilestone: newIsMilestone
            })
        }).then(r => console.log(r.status)).catch(console.warn)
    }

    deleteTask() {
        fetch(`/api/task/${this.UUID}`, {
            method: "DELETE"
        }).then(r => console.log(r.status)).catch(console.warn)
    }


    /**
     * 
     * @param {HTMLElement} parent 
     * @returns {HTMLTableRowElement}
     */
    renderChecklist(parent) {
        // draw task row
        const taskRow = renderElement("tr", parent);

        const tdCheckbox = renderElement("td", taskRow);
        /** @type {HTMLInputElement} */
        const checkbox = renderElement("input", tdCheckbox)
        checkbox.type = "checkbox"
        checkbox.id = `checkbox-${this.UUID}`;
        checkbox.checked = this.completion >= 1;
        checkbox.setAttribute("data-taskid", this.UUID)

        const tdName = renderElement("td", taskRow);
        const nameLabel = renderElement("label", tdName);
        nameLabel.setAttribute("for", `checkbox-${this.UUID}`);

        const nameInput = renderElement("input", nameLabel, "task-name-input");
        nameInput.setAttribute("aria-label", "Task name")
        nameInput.setAttribute("data-taskid", this.UUID)
        nameInput.type = "text"
        nameInput.value = this.name;

        const tdMore = renderElement("td", taskRow);
        const moreButton = renderElement("button", tdMore, "svg-button")
        moreButton.setAttribute("data-svg", "ellipsis")
        moreButton.addEventListener("click", () => {
            this.renderSidebar();
        })

        return taskRow
    }

    /**
     * Renders the task info sidebar
     */
    renderSidebar() {

        const main = document.querySelector("main")

        // begin by removing any existing sidebar contents
        let parent;
        if (parent = document.querySelector("aside.sidebar")) {

            if (parent.getAttribute("data-taskid") == this.UUID) {
                // close sidebar when you press the same "more" button again

                parent.remove();
                main.querySelector(".project-graph-area").removeAttribute("data-sidebar-visible")
                return;
            } else {
                // clear the sidebar
                parent.replaceChildren();
            }
        } else {
            parent = renderElement("aside", main, "sidebar")
            main.querySelector(".project-graph-area").setAttribute("data-sidebar-visible", "true")
        }

        parent.setAttribute("data-taskid", this.UUID)

        // TODO: add tag and assignee back in, likely as text

        const headerRow = renderDiv(parent, "header-row")

        const heading = renderElement("h3", headerRow);
        const headingInput = renderElement("input", heading);
        headingInput.type = "text";
        headingInput.value = this.name;
        headingInput.id = "name"
        headingInput.name = "name"

        const deleteButton = renderElement("button", headerRow, "svg-button");
        deleteButton.setAttribute("data-svg", "delete")

        // add omp section

        const ompInputField = renderDiv(parent, "field")
        /** @type {HTMLLabelElement} */
        const ompMasterLabel = renderElement("label", ompInputField);
        ompMasterLabel.textContent = "Time estimates (days):"

        const ompFSRow = renderDiv(ompInputField, "fieldset-row", "time-estimates");

        const oColumn = renderDiv(ompFSRow, "column")
        const oLabel = renderElement("label", oColumn)
        oLabel.setAttribute("for", "optimistic")
        oLabel.textContent = "O"
        oLabel.title = "Optimstic"

        const oInput = renderElement("input", oColumn)
        oInput.id = "optimistic"
        oInput.name = oInput.id
        oInput.type = "number"
        oInput.value = this.durationOptimistic



        const mColumn = renderDiv(ompFSRow, "column")
        const mLabel = renderElement("label", mColumn)
        mLabel.setAttribute("for", "normal")
        mLabel.textContent = "M"
        mLabel.title = "Normal"

        const mInput = renderElement("input", mColumn)
        mInput.id = "normal"
        mInput.name = mInput.id
        mInput.type = "number"
        mInput.value = this.durationNormal;


        const pColumn = renderDiv(ompFSRow, "column")
        const pLabel = renderElement("label", pColumn)
        pLabel.setAttribute("for", "pessimistic")
        pLabel.textContent = "P"
        pLabel.title = "Pessimistic"

        const pInput = renderElement("input", pColumn)
        pInput.id = "pessimistic"
        pInput.name = pInput.id
        pInput.type = "number"
        pInput.value = this.durationPessimistic


        // add compeltion meter
        const completionField = renderDiv(parent, "field");
        const completionLabel = renderElement("label", completionField)
        completionLabel.textContent = "Completion:"
        completionLabel.setAttribute("for", "completion")

        const rangeParent = renderDiv(completionField, "range")
        const rangeInput = renderElement("input", rangeParent)
        rangeInput.type = "range"
        rangeInput.id = "completion"
        rangeInput.name = rangeInput.id

        const rangeSpan = renderElement("span", rangeParent, "value")

        rangeInput.value = this.completion * 100;
        rangeSpan.textContent = rangeInput.value + "%";
        rangeSpan.style.setProperty("--position", rangeInput.value + "%")
        rangeInput.addEventListener("input", () => {
            rangeSpan.textContent = rangeInput.value + "%";
            rangeSpan.style.setProperty("--position", rangeInput.value + "%")
        })

        // add start/end date

        const dateFSRow = renderDiv(parent, "fieldset-row")

        const startColumn = renderDiv(dateFSRow, "column");
        const startLabel = renderElement("label", startColumn)
        startLabel.textContent = "Start Date"
        startLabel.setAttribute("for", "start-date")

        /** @type {HTMLInputElement} */
        const startInput = renderElement("input", startColumn)
        startInput.type = "date"
        startInput.id = "start-date"
        startInput.name = startInput.id;
        startInput.valueAsDate = this.startDate;

        const endColumn = renderDiv(dateFSRow, "column");
        const endLabel = renderElement("label", endColumn)
        endLabel.textContent = "End Date"
        endLabel.setAttribute("for", "end-date")

        /** @type {HTMLInputElement} */
        const endInput = renderElement("input", endColumn)
        endInput.type = "date"
        endInput.id = "end-date"
        endInput.name = endInput.id;
        endInput.valueAsDate = this.getEndDate();

        // tag, assignee, color

        const tacFSRow = renderDiv(parent, "fieldset-row");

        const tagColumn = renderDiv(tacFSRow, "column");
        const tagLabel = renderElement("label", tagColumn)
        tagLabel.textContent = "Tag"
        tagLabel.setAttribute("for", "tag");

        const tagInput = renderElement("input", tagColumn, "small")
        tagInput.type = "text"
        tagInput.id = "tag"
        tagInput.name = tagInput.id;
        tagInput.value = this.tag;

        const assigneeColumn = renderDiv(tacFSRow, "column");
        const assigneeLabel = renderElement("label", assigneeColumn)
        assigneeLabel.textContent = "Assignee"
        assigneeLabel.setAttribute("for", "assignee");

        const assigneeInput = renderElement("input", assigneeColumn, "small")
        assigneeInput.type = "text"
        assigneeInput.id = "assignee"
        assigneeInput.name = assigneeInput.id;
        assigneeInput.value = this.assignedTeamMember;

        const colourColumn = renderDiv(tacFSRow, "column");
        const colourLabel = renderElement("label", colourColumn)
        colourLabel.textContent = "Colour"
        colourLabel.setAttribute("for", "colour");

        const colourInput = renderElement("input", colourColumn)
        colourInput.type = "color"
        colourInput.id = "colour"
        colourInput.name = colourInput.id;
        colourInput.value = this.colour;

        // add notes ield

        const notesField = renderDiv(parent, "field");
        const notesLabel = renderElement("label", notesField)
        notesLabel.textContent = "Notes:"
        notesLabel.setAttribute("for", "notes")

        const notesArea = renderElement("textarea", notesField)
        notesArea.value = this.description;
        notesArea.setAttribute("wrap", "hard")
        notesArea.id = "notes"
        notesArea.name = "notes"

        // at end, populate svgs for delete butotn
        populateSVG();

        // now, add event listeners for updating data

        parent.addEventListener("change", ({ target }) => {
            /** @type {HTMLElement} used for more accurate types in development */
            let element = target;

            if (!element.matches("input, textarea")) return; // this might need to go, but leave it for now

            switch (element.name) {
                case "name":
                    if (headingInput.name) this.updateName(headingInput.value);

                    // update on checklist
                    main.querySelector(`[type=text][data-taskid="${this.UUID}"]`).value = this.name;
                    break;
                case "optimistic":
                    if (oInput.value) this.updateDurationOptimistic(oInput.value);
                    break;
                case "normal":
                    if (mInput.value) this.updateDurationNormal(mInput.value);
                    break;
                case "pessimistic":
                    if (pInput.value) this.updateDurationPessimistic(pInput.value);
                    break;
                case "completion":
                    this.updateCompletion(Math.max(Math.min(rangeInput.value / 100, 1), 0));
                    // update checkbox status
                    main.querySelector(`[type=checkbox][data-taskid="${this.UUID}"]`).checked = this.completion >= 1;

                    break;
                case "start-date":
                    if (startInput.valueAsDate) this.updateStartDate(startInput.valueAsDate);
                    break;
                case "end-date":
                    // this ought to modify OMP estimates by an additive/subtractive factor (clamping values below 0)

                    // first, find how much the end date is being moved by
                    let delta = endInput.valueAsDate - this.getEndDate();

                    // convert this to days
                    delta /= 1000 * 60 * 60 * 24;

                    // round it to the nearest day, to keep nice values in OMP
                    delta = Math.round(delta);

                    let o = Math.max(this.durationOptimistic + delta, 0);
                    let m = Math.max(this.durationNormal + delta, 0);
                    let p = Math.max(this.durationPessimistic + delta, 0);

                    this.updateDurationOptimistic(o);
                    this.updateDurationNormal(m);
                    this.updateDurationPessimistic(p);

                    // done, but should update OMP values on the screen

                    oInput.value = o;
                    mInput.value = m;
                    pInput.value = p;

                    break;
                case "tag":
                    if (tagInput.value) this.updateTag(tagInput.value);
                    break;
                case "assignee":
                    if (assigneeInput.value) this.updateAssignedTeamMember(assigneeInput.value);
                    break;
                case "notes":
                    console.log(notesArea.value);
                    if (notesArea.value) this.updateDescription(notesArea.value);
                    break;
            }
        })

        deleteButton.addEventListener("click", () => {
            this.deleteTask();

            // hide sidebar, as task is gone
            parent.remove();
            main.querySelector(".project-graph-area").removeAttribute("data-sidebar-visible")

            // now, remove the row in the checklist
            main.querySelector(`[data-taskid="${this.UUID}"]`).closest("tr").remove();
        })

    }



}

class Milestone extends Task {

}

class TimePeriod {

}
