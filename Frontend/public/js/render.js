
/**
 * @param {keyof HTMLElementTagNameMap} elem 
 * @param {HTMLElement} parentElement 
 * @param  {...string} classNames 
 * @returns {HTMLDivElement}
 */
function renderElement(elem, parentElement, ...classNames) {
    const element = document.createElement(elem)

    for (let className of classNames) {
        element.classList.add(className);
    }

    parentElement.appendChild(element);

    return element
}
/**
 * 
 * @param {HTMLElement} parentElement 
 * @param  {...string} classNames 
 * @returns {HTMLDivElement}
 */
function renderDiv(parentElement, ...classNames) {
    return renderElement("div", parentElement, ...classNames);
}


/**
 * 
 * @param {string} name 
 * @param {string} description 
 * @param {string} href 
 * @param {HTMLElement} parent 
 * @returns {HTMLAnchorElement} The new card element
 */
function renderProjectCard(name, description, href, parent) {
    if (!parent)
        parent = document.querySelector(".project-list");

    const link = document.createElement("A");
    link.classList.add("card");
    link.href = href;

    const article = document.createElement("ARTICLE");

    const heading = document.createElement("H3");
    heading.textContent = name;

    const desc = document.createElement("P");
    desc.textContent = description;

    article.append(heading);
    article.append(desc);

    link.appendChild(article);

    if (parent.querySelector(".card.add-project")) {
        parent.querySelector(".card.add-project").before(link)
    } else {
        parent.appendChild(link);
    }

    return link;
}