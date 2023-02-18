import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { Readable, Transform } from "node:stream";
import { WritableStream, TransformStream } from "node:stream/web";
import { setTimeout } from "node:timers/promises";
import csvtojson from "csvtojson";

const PORT = 3000;

createServer(async (req, res) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "*",
  };

  if (req.method === "OPTIONS") {
    res.writeHead(204, headers);
    res.end();
    return;
  }

  let items = 0;

  // Quando a conexão for encerrada, mostrar a quantidade de items que parou
  req.once("close", (_) => console.log("connection was closed:", items));

  // A medida que for lendo o arquivo, já retorna a response
  Readable.toWeb(createReadStream("./animeflv.csv"))
    // Várias etapas (passo a passo de cada item)
    .pipeThrough(Transform.toWeb(csvtojson()))
    .pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          // Convertendo o array Unit para um Buffer e então convertendo o Buffer em string
          // console.log("------ chunk", Buffer.from(chunk).toString());

          // Esses dados vem do cabeçalho do CSV
          const { title, description, url_anime } = JSON.parse(
            Buffer.from(chunk)
          );

          controller.enqueue(
            JSON.stringify({
              title,
              description,
              url_anime,
            }).concat("\n") // Concatenando porque ele é um NDJSON ou seja Newline Delimited JSON
          );
        },
      })
    )
    // pipeTo é a ultima etapa
    .pipeTo(
      new WritableStream({
        async write(chunck) {
          await setTimeout(1000);
          items++;
          res.write(chunck);
        },
        close() {
          res.end();
        },
      })
    );

  res.writeHead(200, headers);
})
  .listen(PORT)
  .on("listening", (_) => console.log(`server is running on port ${PORT}`));
