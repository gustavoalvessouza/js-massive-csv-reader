const API_URL = "http://localhost:3000";
let counter = 0;

async function consumeAPI(signal) {
	const response = await fetch(API_URL, {
		signal,
	});

	const reader = response.body
		.pipeThrough(new TextDecoderStream())
		.pipeThrough(parseNDJSON());

	return reader;
}

function appendToHTML(element) {
	return new WritableStream({
		write({ title, description, url_anime }) {
			const card = `
                <article class="card">
                    <div class="text">
                        <h3 class="card_title">[${++counter}] ${title}</h3>
                        <p class="card_description">${description.slice(0, 100)}</p>
                        <a class="anime_url" href="${url_anime}" target="_blank">Ver mais</a>
                    </div>
                </article>
            `;

			element.innerHTML += card;
		},
		abort(reason) {
			console.log("aborted.", reason);
		},
	});
}

// Certificar que caso dois chunks venham em uma unica transmissão, ele converta corretamente para JSON
function parseNDJSON() {
	let ndjsonBuffer = "";

	return new TransformStream({
		transform(chunk, controller) {
			ndjsonBuffer += chunk;
			const items = ndjsonBuffer.split("\n");
			items
				.slice(0, -1)
				.forEach((item) => controller.enqueue(JSON.parse(item)));

			ndjsonBuffer = items[items.length - 1];
		},
		// Quando ele termina de processar
		flush(controller) {
			if (!ndjsonBuffer) return;
			// Verificando se tem algo pendente que não foi processado
			controller.enqueue(JSON.parse(ndjsonBuffer));
		},
	});
}

const [start, stop, cards] = ["start", "stop", "cards"].map((item) =>
	document.getElementById(item)
);

/*
	AbortController: Essa interface é usada para abortar requisições

	Ex: Você está consumindo um video por streaming, e quando pausar
		quer que o consumo seja "abortado" ou você está fazendo o download
		de um arquivo e quer cancelar/abortar o mesmo.

	Quando efetuamos uma requisição, passamos o signal do AbortController
	para associar com o AbortController com a requisição e assim poder aborta-la.
*/
let abortController = new AbortController();

start.addEventListener("click", async () => {
	const readable = await consumeAPI(abortController.signal);
	readable.pipeTo(appendToHTML(cards));
});

stop.addEventListener("click", () => {
	abortController.abort();
	console.log("aborting...");
	abortController = new AbortController();
});
