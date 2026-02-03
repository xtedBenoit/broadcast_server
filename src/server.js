import fastify from "fastify";

const app = fastify();

function start() {
    app.listen({ port: 3000, host: "localhost" }, (err, address) => {
        if (err) {
            console.error(err);
            process.exit(1);
        }
        console.log(`Server listening at ${address}`);
    });
}

start();