import {error} from "@server/core";
import {APIHandler} from "../../utils/workers/types";
import {
  CHATBOT_LIMITS,
  CHATBOT_SYSTEM_PROMPT,
} from "../../utils/workers/chatbot";
import config from "../../config";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Compteur par IP, propre à chaque worker
const requestsByIp = new Map<string, number[]>();

setInterval(() => {
  const now = Date.now();

  for (const [ip, times] of requestsByIp)
    if (times.every((time) => now - time >= CHATBOT_LIMITS.windowMs))
      requestsByIp.delete(ip);
}, CHATBOT_LIMITS.windowMs).unref();

function getClientIp(context: Parameters<APIHandler>[0]): string {
  const ctx = context as unknown as {
    req?: {socket?: {remoteAddress?: string}};
    stream?: {session?: {socket?: {remoteAddress?: string}}};
  };

  return (
    ctx.req?.socket?.remoteAddress ??
    ctx.stream?.session?.socket?.remoteAddress ??
    "inconnue"
  );
}

function isRateLimited(ip: string): boolean {
  const now = Date.now(),
    recent = (requestsByIp.get(ip) ?? []).filter(
      (time) => now - time < CHATBOT_LIMITS.windowMs,
    );

  if (recent.length >= CHATBOT_LIMITS.maxRequestsPerWindow) {
    requestsByIp.set(ip, recent);

    return true;
  }

  recent.push(now);
  requestsByIp.set(ip, recent);

  return false;
}

function parseMessages(data: Buffer): ChatMessage[] | null {
  try {
    const body: unknown = JSON.parse(data.toString());
    const messages = (body as {messages?: unknown})?.messages;

    if (!Array.isArray(messages) || messages.length === 0) return null;

    const valid = messages.every(
      (message) =>
        (message?.role === "user" || message?.role === "assistant") &&
        typeof message.content === "string" &&
        message.content.trim().length > 0 &&
        message.content.length <= CHATBOT_LIMITS.maxMessageLength,
    );

    if (!valid || messages.at(-1).role !== "user") return null;

    return messages
      .slice(-CHATBOT_LIMITS.maxHistory)
      .map(({role, content}) => ({role, content}));
  } catch {
    return null;
  }
}

function respondJson(
  context: Parameters<APIHandler>[0],
  status: number,
  body: object,
) {
  return context
    .respond(status, {
      headers: {"content-type": "application/json; charset=utf-8"},
    })
    .end(JSON.stringify(body));
}

export default (async (context) => {
  if (!config.groqApiKey)
    return respondJson(context, 503, {
      error: "Le chat n'est pas disponible pour le moment.",
    });

  if (isRateLimited(getClientIp(context)))
    return respondJson(context, 429, {
      error:
        "Vous avez envoyé beaucoup de messages. Réessayez dans quelques minutes ou utilisez le formulaire de devis.",
    });

  let data: Buffer;

  try {
    data = await context.getData(CHATBOT_LIMITS.maxBodyBytes);
  } catch {
    return respondJson(context, 413, {error: "Message trop long."});
  }

  const messages = parseMessages(data);

  if (!messages) return respondJson(context, 400, {error: "Message invalide."});

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "authorization": `Bearer ${config.groqApiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: config.groqModel,
          messages: [
            {role: "system", content: CHATBOT_SYSTEM_PROMPT},
            ...messages,
          ],
          max_tokens: 800,
          temperature: 0.4,
          reasoning_effort: "low",
        }),
        signal: AbortSignal.timeout(CHATBOT_LIMITS.timeoutMs),
      },
    );

    if (!response.ok) {
      error(
        `Erreur Groq (${response.status}) :`,
        (await response.text()).slice(0, 500),
      );

      return respondJson(context, response.status === 429 ? 429 : 502, {
        error:
          response.status === 429
            ? "Le chat est très sollicité. Réessayez dans un instant."
            : "Le chat a rencontré un problème. Réessayez plus tard.",
      });
    }

    const result = (await response.json()) as {
      choices?: {message?: {content?: string}}[];
    };
    const reply = result.choices?.[0]?.message?.content?.trim();

    if (!reply) throw new Error("Réponse vide de Groq");

    return respondJson(context, 200, {reply});
  } catch (err) {
    error("Erreur lors de l'appel au chatbot", err);

    return respondJson(context, 502, {
      error: "Le chat a rencontré un problème. Réessayez plus tard.",
    });
  }
}) satisfies APIHandler;
