import { appendFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import type { ExperienceInput } from "./experience-input";
import type { Experience } from "./types";

/** Replace this repository with a database adapter for a multi-instance deployment. */
export interface ExperienceRepository { create(input: ExperienceInput): Promise<Experience> }

export function createFileExperienceRepository(filePath: string): ExperienceRepository {
  let pending: Promise<unknown> = Promise.resolve();
  return {
    create(input) {
      const write = pending.then(async () => {
        const experience: Experience = { ...input, id: randomUUID(), createdAt: new Date().toISOString(), sourceType: "user_review", processed: false };
        await mkdir(dirname(filePath), { recursive: true });
        await appendFile(filePath, JSON.stringify(experience) + "\n", { encoding: "utf8", mode: 0o600, flush: true });
        return experience;
      });
      pending = write.catch(() => undefined);
      return write;
    },
  };
}

const repository = createFileExperienceRepository(process.env.HAWLAK_EXPERIENCES_PATH || join(process.cwd(), "data", "runtime", "experiences.jsonl"));
export async function saveExperience(input: ExperienceInput): Promise<Experience> {
  // A serverless writable temp directory is not durable experience storage.
  if (process.env.VERCEL) throw new Error("A persistent experience repository is required on Vercel");
  return repository.create(input);
}
