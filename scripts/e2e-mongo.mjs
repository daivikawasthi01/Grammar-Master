// Long-running in-memory MongoDB on 127.0.0.1:27017 for the e2e job. CI uses this instead of a
// mongo:8 service container, which refuses to start on the runners' newer Linux kernel (SERVER-121912).
import { MongoMemoryServer } from "mongodb-memory-server";

const server = await MongoMemoryServer.create({ instance: { port: 27017, ip: "127.0.0.1" } });
console.log(`mongod ready: ${server.getUri()}`);

const stop = async () => {
  await server.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
