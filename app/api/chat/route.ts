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

            send({ type: "tool_start", name: fnName });
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
              send({ type: "tool_end", name: fnName });
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
        }

        // Only send route data if GPT's final text doesn't signal an unfinished route
        const routeFinalized =
          !message.content || !UNFINISHED_RE.test(message.content);

        if (state.route && routeFinalized) {
          const routeData: Record<string, unknown> = {
            waypoints: state.waypoints || [],
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
