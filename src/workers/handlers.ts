import { randomUUID } from "node:crypto";
import type { JsonObject, JsonValue, TaskHandler } from "../types";

export const defaultHandlers = new Map<string, TaskHandler>();
const handlers = new Map<string, TaskHandler>();

const getString = (payload: JsonObject, key: string): string | null => {
  const value = payload[key];
  return typeof value === "string" && value.trim() !== "" ? value : null;
};

const getNumber = (payload: JsonObject, key: string): number | null => {
  const value = payload[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

const isValidEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const wait = async (ms: number): Promise<void> => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
};

export const registerHandler = (taskType: string, handler: TaskHandler): void => {
  if (taskType.trim() === "") {
    throw new Error("taskType cannot be empty");
  }
  handlers.set(taskType, handler);
};

export const getHandler = (taskType: string): TaskHandler | undefined => handlers.get(taskType);

const sendEmail: TaskHandler = async (payload) => {
  const to = getString(payload, "to");
  const subject = getString(payload, "subject");
  const body = getString(payload, "body");
  if (to === null || subject === null || body === null || !isValidEmail(to)) {
    throw new Error("send_email payload requires to, subject, and body");
  }

  return {
    emailId: `email_${randomUUID()}`,
    sentAt: new Date().toISOString()
  };
};

const resizeImage: TaskHandler = async (payload) => {
  const imageUrl = getString(payload, "imageUrl");
  const width = getNumber(payload, "width");
  const height = getNumber(payload, "height");
  const forceFail: JsonValue | undefined = payload.forceFail;
  if (imageUrl === null || width === null || height === null || width <= 0 || height <= 0) {
    throw new Error("resize_image payload requires imageUrl, width, and height");
  }
  if (forceFail === true) {
    throw new Error("Forced resize_image failure");
  }

  return {
    resizedUrl: `${imageUrl}?w=${width}&h=${height}`,
    originalSize: { width: width * 2, height: height * 2 },
    newSize: { width, height }
  };
};

const generatePdf: TaskHandler = async (payload) => {
  const title = getString(payload, "title");
  const content = getString(payload, "content");
  if (title === null || content === null) {
    throw new Error("generate_pdf payload requires title and content");
  }

  await wait(3000);

  return {
    pdfUrl: `https://example.com/pdfs/${randomUUID()}.pdf`,
    pageCount: Math.max(1, Math.ceil(content.length / 1800)),
    generatedAt: new Date().toISOString()
  };
};

defaultHandlers.set("send_email", sendEmail);
defaultHandlers.set("resize_image", resizeImage);
defaultHandlers.set("generate_pdf", generatePdf);

for (const [taskType, handler] of defaultHandlers.entries()) {
  registerHandler(taskType, handler);
}

