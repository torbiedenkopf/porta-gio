import * as pdfjsLib from "./build/pdf.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = "./build/pdf.worker.mjs";

const viewer = document.getElementById("viewer");
const errorBox = document.getElementById("error");

const params = new URLSearchParams(window.location.search);
const frameId = params.get("id");
const file = params.get("file");

if (!file) {

    errorBox.style.display = "block";
    errorBox.textContent = "Kein PDF angegeben.";

    throw new Error("Missing file parameter");

}

let lastWidth = 0;

let pdfDocument;

const DPR = window.devicePixelRatio || 1;

let renderRunning = false;
let renderRequested = false;

function clearViewer() {

    while (viewer.firstChild)
        viewer.removeChild(viewer.firstChild);

}

function showError(text) {

    errorBox.style.display = "block";
    errorBox.textContent = text;

}

async function loadPdf() {

    try {

    pdfDocument =
        await pdfjsLib.getDocument({
            url: file
        }).promise;

    await renderDocument();

    }

    catch(err){

        console.error(err);

        showError(
            "Die PDF konnte nicht geladen werden."
        );

    }

}

async function renderDocument() {

    if (renderRunning) {

        renderRequested = true;
        return;

    }

    renderRunning = true;
    renderRequested = false;
	
	clearViewer();

	const availableWidth =
		document.documentElement.clientWidth;
		
    let totalHeight = 0;

    for (let pageNumber = 1;
         pageNumber <= pdfDocument.numPages;
         pageNumber++) {

        const page =
            await pdfDocument.getPage(pageNumber);

        const viewport =
            page.getViewport({
                scale: 1
            });

        const scale =
            availableWidth / viewport.width;

        const scaledViewport =
            page.getViewport({
                scale: scale
            });

        const canvas =
            document.createElement("canvas");

        canvas.className = "pdf-page";

        canvas.style.width =
            scaledViewport.width + "px";

        canvas.style.height =
            scaledViewport.height + "px";

        canvas.width =
            Math.round(
                scaledViewport.width * DPR
            );

        canvas.height =
            Math.round(
                scaledViewport.height * DPR
            );

        const context =
            canvas.getContext("2d");

        context.setTransform(
            DPR,
            0,
            0,
            DPR,
            0,
            0
        );

        viewer.appendChild(canvas);

        await page.render({

            canvasContext: context,

            viewport: scaledViewport

        }).promise;

        totalHeight +=
            scaledViewport.height + 16;

    }

    requestAnimationFrame(() => {

		window.parent.postMessage({

			type: "pdf-height",

			id: frameId,

			height: Math.ceil(totalHeight)

    }, "*");

    });

    renderRunning = false;

    if (renderRequested)
        renderDocument();

}
let resizeTimer = null;

function scheduleRender() {

    clearTimeout(resizeTimer);

    resizeTimer = setTimeout(async () => {

        if (!pdfDocument)
            return;

        await renderDocument();

    }, 150);

}

window.addEventListener(
    "resize",
    scheduleRender
);

window.addEventListener(
    "orientationchange",
    scheduleRender
);

window.addEventListener("pageshow", () => {

    lastWidth = 0;
    scheduleRender();

});

loadPdf();

