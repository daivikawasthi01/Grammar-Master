import { existsSync } from "fs";
import { MongoMemoryServer } from "mongodb-memory-server";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    mongoBase: string;
  }
}

// One in-memory MongoDB for the whole run. A local mongod is reused when present; CI downloads one.
export default async function setup(project: TestProject) {
  const systemBinary = ["/opt/homebrew/bin/mongod", "/usr/local/bin/mongod"].find(existsSync);
  const server = await MongoMemoryServer.create(systemBinary && !process.env.CI ? { binary: { systemBinary } } : {});
  project.provide("mongoBase", server.getUri());
  return async () => {
    await server.stop();
  };
}
