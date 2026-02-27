import { getOpenAIClient } from "@/lib/openai/client";
import { tools } from "@/lib/openai/tools";
import { toolExecutors } from "@/lib/openai/toolExecutors";
import { SYSTEM_PROMPT } from "@/lib/prompts/system";
import {
  ChatCompletionMessageParam,
  ChatCompletionToolMessageParam,
} from "openai/resources/chat/completions";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages, currentRoute, userLocation } = (await req.json()) as {
    messages: ChatCompletionMessageParam[];
    currentRoute?: {
      waypoints: [number, number][];
      distance_miles: number;
      distance_km: number;
      estimated_time_minutes: number;
      elevation_gain_ft: number;
      elevation_loss_ft: number;
      name: string;
    };
    userLocation?: { lat: number; lng: number };
  };

  const fullMessages: ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...(userLocation
      ? [
          {
            role: "system" as const,
            content: `USER'S CURRENT LOCATION (from browser geolocation): lat ${userLocation.lat}, lng ${userLocation.lng}. When the user says "near me", "from here", "my location", "where I am", or similar — use these coordinates directly as the starting point instead of geocoding. Pass them to search_places and as the first waypoint for get_route. Do NOT ask the user for an address when you already have their coordinates.`,
          },
        ]
      : []),
    ...messages,
  ];

  if (currentRoute && messages.length > 1) {
    const ctx = [
      `CURRENT ROUTE STATE (from previous turn):`,
      `- Name: ${currentRoute.name}`,
      `- Start waypoint: [${currentRoute.waypoints[0]}]`,
      `- All waypoints: ${JSON.stringify(currentRoute.waypoints)}`,
      `- Distance: ${currentRoute.distance_miles} mi / ${currentRoute.distance_km} km`,
      `- Est. time: ${currentRoute.estimated_time_minutes} min`,
      `- Elevation gain: ${currentRoute.elevation_gain_ft} ft`,
      `Use these exact waypoints as your starting point when the user asks to modify the route.`,
      `To shorten: remove intermediate waypoints or move them closer to the start.`,
      `To lengthen: add waypoints or move them farther out.`,
      `ALWAYS keep the first waypoint (start location) the same unless the user asks to change it.`,
    ].join("\n");

    const lastUserIdx = fullMessages.length - 1;
    fullMessages.splice(lastUserIdx, 0, {
      role: "system",
      content: ctx,
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
        );
      };

      try {
        const openai = getOpenAIClient();

        const state = {
          route: null as Record<string, unknown> | null,
          elevation: null as Record<string, unknown> | null,
          waypoints: null as [number, number][] | null,
        };

        const UNFINISHED_RE =
          /\b(let me adjust|stay tuned|refin(e|ing)|too (long|short)|working on|I'll (try|refine|adjust)|iterating)\b/i;
        const MAX_NUDGES = 2;
        let nudgesUsed = 0;

        const runCompletion = async () => {
          return openai.chat.completions.create({
            model: "gpt-4.1",
            messages: fullMessages,
            tools,
            tool_choice: "auto",
            max_tokens: 4096,
          });
        };

        const executeToolCalls = async (
          toolCallList: NonNullable<typeof message.tool_calls>
        ) => {
          const toolMessages: ChatCompletionToolMessageParam[] = [];

          for (const toolCall of toolCallList) {
            if (toolCall.type !== "function") continue;
            const fnName = toolCall.function.name;
            const fnArgs = JSON.parse(toolCall.function.arguments);

            if (
              fnName === "get_elevation" &&
              !fnArgs.route_geometry &&
              state.route?.geometry
            ) {
              fnArgs.route_geometry = state.route.geometry;
            }

            send({
              type: "tool_start",
              name: fnName,
              detail: summarizeToolStart(fnName, fnArgs),
            });
            console.log(
              `[TOOL CALL] ${fnName}`,
              JSON.stringify(fnArgs).slice(0, 200)
            );

            try {
              const executor = toolExecutors[fnName];
              if (!executor) {
                throw new Error(`Unknown tool: ${fnName}`);
              }
              const result = await executor(fnArgs);
              console.log(
                `[TOOL RESULT] ${fnName}`,
                JSON.stringify(result).slice(0, 300)
              );

              if (
                fnName === "get_route" &&
                result &&
                typeof result === "object" &&
                !("error" in (result as Record<string, unknown>))
              ) {
                state.route = result as Record<string, unknown>;
                state.waypoints = fnArgs.waypoints;
              }
              if (
                fnName === "get_elevation" &&
                result &&
                typeof result === "object" &&
                !("error" in (result as Record<string, unknown>))
              ) {
                state.elevation = result as Record<string, unknown>;
              }

              toolMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify(result),
              });
              send({
                type: "tool_end",
                name: fnName,
                detail: summarizeToolResult(fnName, result, state),
              });
            } catch (error: unknown) {
              console.error(`[TOOL ERROR] ${fnName}`, error);
              const errMsg =
                error instanceof Error
                  ? error.message
                  : "Tool execution failed";
              toolMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify({ error: errMsg }),
              });
              send({ type: "tool_end", name: fnName, error: errMsg });
            }
          }

          return toolMessages;
        };

        let response = await runCompletion();
        let message = response.choices[0].message;

        while (message.tool_calls && message.tool_calls.length > 0) {
          fullMessages.push(message as ChatCompletionMessageParam);
          const toolMessages = await executeToolCalls(message.tool_calls);
          fullMessages.push(...toolMessages);
          response = await runCompletion();
          message = response.choices[0].message;
        }

        // Nudge: if GPT stopped with text suggesting the route isn't done,
        // push it back into the tool loop to actually finish.
        while (
          nudgesUsed < MAX_NUDGES &&
          message.content &&
          UNFINISHED_RE.test(message.content) &&
          state.route
        ) {
          nudgesUsed++;
          console.log(
            `[NUDGE ${nudgesUsed}] GPT responded with unfinished text, pushing back to tool loop`
          );
          fullMessages.push(message as ChatCompletionMessageParam);
          fullMessages.push({
            role: "system",
            content:
              "You said you'd adjust but stopped. The user already sees the wrong route on the map. Call get_route NOW with adjusted waypoints to fix the distance. Do not respond with text until the route is correct.",
          });
          response = await runCompletion();
          message = response.choices[0].message;

          while (message.tool_calls && message.tool_calls.length > 0) {
            fullMessages.push(message as ChatCompletionMessageParam);
            const toolMessages = await executeToolCalls(message.tool_calls);
            fullMessages.push(...toolMessages);
            response = await runCompletion();
            message = response.choices[0].message;
          }
        }

        if (message.content) {
          send({ type: "text_delta", content: message.content });
        } else if (state.route) {
          console.warn("[CHAT] Model returned null content after tool loop — sending fallback");
          const fallback = `Here's your route! I mapped out a ${state.route.distance_miles}-mile run for you.`;
          send({ type: "text_delta", content: fallback });
          message = { ...message, content: fallback };
        } else {
          console.warn("[CHAT] Model returned null content with no route");
          const fallback = "Sorry, I wasn't able to put a route together that time. Could you try rephrasing your request?";
          send({ type: "text_delta", content: fallback });
          message = { ...message, content: fallback };
        }

        const routeFinalized =
          !message.content || !UNFINISHED_RE.test(message.content);

        if (state.route && routeFinalized) {
          const routeData: Record<string, unknown> = {
            waypoints: state.waypoints || [],
            waypoint_details: extractWaypointDetails(message.content || ""),
            points_of_interest: extractPointsOfInterest(message.content || ""),
            distance_miles: state.route.distance_miles,
            distance_km: state.route.distance_km,
            estimated_time_minutes: state.route.duration_minutes,
            elevation_gain_ft: state.elevation
              ? state.elevation.total_ascent_ft
              : 0,
            elevation_loss_ft: state.elevation
              ? state.elevation.total_descent_ft
              : 0,
            route_geometry: state.route.geometry,
            elevation_profile: state.elevation
              ? state.elevation.elevation_profile
              : [],
            name:
              extractRouteName(message.content || "") ||
              `${state.route.distance_miles}mi Run`,
          };
          send({ type: "route_data", route: routeData });
        }

        send({ type: "done" });
      } catch (error: unknown) {
        const errMsg =
          error instanceof Error
            ? error.message
            : "An unexpected error occurred";
        send({ type: "error", error: errMsg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

function extractWaypointDetails(
  content: string
): { name: string; reason: string }[] | undefined {
  const match = content.match(
    /```waypoint_details\s*\n([\s\S]*?)```/
  );
  if (!match) return undefined;
  try {
    const parsed = JSON.parse(match[1]);
    if (!Array.isArray(parsed)) return undefined;
    const results: { name: string; reason: string }[] = [];
    for (const d of parsed) {
      if (
        typeof d === "object" &&
        d !== null &&
        typeof d.name === "string" &&
        typeof d.reason === "string"
      ) {
        results.push({ name: d.name, reason: d.reason });
      }
    }
    return results.length > 0 ? results : undefined;
  } catch {
    // malformed JSON — skip
  }
  return undefined;
}

function extractPointsOfInterest(
  content: string
): { name: string; description: string; lat: number; lng: number }[] | undefined {
  const match = content.match(
    /```points_of_interest\s*\n([\s\S]*?)```/
  );
  if (!match) return undefined;
  try {
    const parsed = JSON.parse(match[1]);
    if (!Array.isArray(parsed)) return undefined;
    const results: { name: string; description: string; lat: number; lng: number }[] = [];
    for (const d of parsed) {
      if (
        typeof d === "object" &&
        d !== null &&
        typeof d.name === "string" &&
        typeof d.description === "string" &&
        typeof d.lat === "number" &&
        typeof d.lng === "number"
      ) {
        results.push({ name: d.name, description: d.description, lat: d.lat, lng: d.lng });
      }
    }
    return results.length > 0 ? results : undefined;
  } catch {
    // malformed JSON — skip
  }
  return undefined;
}

function summarizeToolStart(
  fnName: string,
  args: Record<string, unknown>
): string | undefined {
  switch (fnName) {
    case "geocode":
      return `Looking up "${args.query}"`;
    case "search_places": {
      const cats = (args.categories as string[]) || [];
      const radiusKm = ((args.radius_meters as number) / 1000).toFixed(1);
      const label = cats.length
        ? cats.map((c) => c.replace(/_/g, " ")).join(", ")
        : "runner-friendly spots";
      return `Searching for ${label} within ${radiusKm} km`;
    }
    case "get_route": {
      const wps = args.waypoints as number[][] | undefined;
      return wps
        ? `Routing through ${wps.length} waypoints`
        : undefined;
    }
    case "get_elevation":
      return "Analyzing hills along the route";
    default:
      return undefined;
  }
}

function summarizeToolResult(
  fnName: string,
  result: unknown,
  state: { route: Record<string, unknown> | null }
): string | undefined {
  if (!result || typeof result !== "object") return undefined;
  const r = result as Record<string, unknown>;
  if ("error" in r) return `Error: ${r.error}`;

  switch (fnName) {
    case "geocode": {
      const results = r.results as { place_name: string }[] | undefined;
      if (!results?.length) return "No locations found";
      return `Found ${results[0].place_name}`;
    }
    case "search_places": {
      const places = result as { name: string }[];
      if (Array.isArray(places)) {
        const named = places.filter((p) => p.name !== "Unnamed");
        if (named.length === 0) return `Found ${places.length} spots nearby`;
        const top = named.slice(0, 3).map((p) => p.name);
        const extra = named.length > 3 ? ` + ${named.length - 3} more` : "";
        return `Found ${top.join(", ")}${extra}`;
      }
      return undefined;
    }
    case "get_route": {
      const mi = r.distance_miles as number | undefined;
      const mins = r.duration_minutes as number | undefined;
      if (mi == null) return undefined;
      const paceStr =
        mins && mi > 0
          ? (() => {
              const p = mins / mi;
              const m = Math.floor(p);
              const s = Math.round((p - m) * 60);
              return `${m}:${s.toString().padStart(2, "0")}/mi`;
            })()
          : null;
      return `${mi} mi mapped${paceStr ? ` · ~${paceStr} pace` : ""}`;
    }
    case "get_elevation": {
      const gainFt = r.total_ascent_ft as number | undefined;
      const lossFt = r.total_descent_ft as number | undefined;
      const minFt = r.min_elevation_ft as number | undefined;
      const maxFt = r.max_elevation_ft as number | undefined;
      if (gainFt == null) return undefined;
      let s = `+${gainFt} ft gain / -${lossFt} ft loss`;
      if (minFt != null && maxFt != null)
        s += ` · ${minFt}–${maxFt} ft range`;
      return s;
    }
    default:
      return undefined;
  }
}

function extractRouteName(content: string): string | null {
  // Try to pull a route name from common patterns in GPT's response
  const patterns = [
    /(?:called|named|titled)\s+[""]([^""]+)[""]/i,
    /\*\*([^*]{5,40}(?:Loop|Route|Run|Trail|Path|Circuit))\*\*/i,
    /#+\s+(.{5,40}(?:Loop|Route|Run|Trail|Path|Circuit))/i,
  ];
  for (const pat of patterns) {
    const match = content.match(pat);
    if (match) return match[1].trim();
  }
  return null;
}
