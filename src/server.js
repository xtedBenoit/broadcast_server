import fastify from "fastify";

const app = fastify();

function start() {
    const port = Number.parseInt(process.env.PORT ?? "", 10);
    const host = process.env.HOST ?? "localhost";
    const resolvedPort = Number.isFinite(port) ? port : 3000;

    app.listen({ port: resolvedPort, host }, (err, address) => {
        if (err) {
            console.error(err);
            process.exit(1);
        }
        console.log(`Server listening at ${address}`);
    });
}

start();
