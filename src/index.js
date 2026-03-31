// User → Classifier → Router → Tools → Aggregator → LLM → Final Answer

const sessionMemory = new Map(); // Redis, DynamoDB, or other database can be used for session memory in production

const internalKnowledgeBase = [
  {
    id: "doc-1",
    title: "Startup Profile: Redwood Robotics",
    content:
      "Redwood Robotics is an industrial automation startup. It recently expanded into logistics robotics and reported stronger enterprise demand in Q1.",
  },
  {
    id: "doc-2",
    title: "Research Note: Supply Chain Risks",
    content:
      "Semiconductor supply constraints remain a key operational risk for hardware startups. Companies with diversified suppliers are more resilient.",
  },
  {
    id: "doc-3",
    title: "Internal Memo: Evaluation Framework",
    content:
      "Analysts should combine internal documents, recent market signals, and news updates before writing an investment summary.",
  },
];

const simulatedMarketData = {
  AMD: { price: 182.11, dayChangePct: 1.8, peRatio: 42.3 },
  NVDA: { price: 911.2, dayChangePct: -0.6, peRatio: 67.5 },
  "Redwood Robotics": {
    privateValuation: "Series B",
    momentum: "growing enterprise demand",
  },
};

const simulatedNews = [
  {
    topic: "Redwood Robotics",
    headline: "Redwood Robotics signs a new warehouse automation partnership",
    sentiment: "positive",
  },
  {
    topic: "AMD",
    headline:
      "Analysts note continued AI infrastructure spending benefits for AMD",
    sentiment: "positive",
  },
  {
    topic: "NVDA",
    headline:
      "NVIDIA faces fresh debate on valuation after another strong quarter",
    sentiment: "mixed",
  },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout(label, promiseFactory, timeoutMs) {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(
      () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );
  });

  try {
    return await Promise.race([promiseFactory(), timeoutPromise]);
  } catch (error) {
    return {
      ok: false,
      label,
      error: error.message,
    };
  }
}

function classifyQuery(query) {
  const lower = query.toLowerCase();

  const needsRetrieval =
    lower.includes("startup") ||
    lower.includes("profile") ||
    lower.includes("internal") ||
    lower.includes("research");

  const needsMarketData =
    lower.includes("price") ||
    lower.includes("valuation") ||
    lower.includes("market") ||
    lower.includes("stock");

  const needsNews =
    lower.includes("news") ||
    lower.includes("recent") ||
    lower.includes("latest") ||
    lower.includes("update");

  let entity = "Redwood Robotics";
  if (lower.includes("amd")) entity = "AMD";
  if (lower.includes("nvidia") || lower.includes("nvda")) entity = "NVDA";
  if (lower.includes("redwood")) entity = "Redwood Robotics";

  return {
    entity,
    needsRetrieval,
    needsMarketData,
    needsNews,
    intent: "research_assistant_query",
  };
}

function routeTools(classification) {
  const tools = [];

  if (classification.needsRetrieval) tools.push("retrieval");
  if (classification.needsMarketData) tools.push("marketData");
  if (classification.needsNews) tools.push("news");

  return tools.length > 0 ? tools : ["retrieval"];
}

async function retrievalTool(entity) {
  await sleep(80);
  const matches = internalKnowledgeBase.filter((doc) =>
    `${doc.title} ${doc.content}`
      .toLowerCase()
      .includes(entity.toLowerCase().split(" ")[0].toLowerCase()),
  );

  return {
    ok: true,
    source: "retrieval",
    items: matches.length > 0 ? matches : internalKnowledgeBase.slice(0, 2),
  };
}

async function marketDataTool(entity) {
  await sleep(120);
  return {
    ok: true,
    source: "marketData",
    item: simulatedMarketData[entity] ?? {
      note: "No structured market data found",
    },
  };
}

async function newsTool(entity) {
  await sleep(100);
  return {
    ok: true,
    source: "news",
    items: simulatedNews.filter((item) => item.topic === entity),
  };
}

function aggregateEvidence(query, classification, toolResults, previousTurns) {
  const successfulResults = toolResults.filter((result) => result.ok);
  const failedResults = toolResults.filter((result) => !result.ok);

  return {
    query,
    entity: classification.entity,
    intent: classification.intent,
    previousTurns,
    evidence: successfulResults,
    failures: failedResults,
  };
}

function generateFinalAnswer(summary) {
  const lines = [];
  lines.push(`Question: ${summary.query}`);
  lines.push(`Entity: ${summary.entity}`);

  const retrieval = summary.evidence.find(
    (item) => item.source === "retrieval",
  );
  if (retrieval) {
    lines.push("Internal context:");
    for (const doc of retrieval.items) {
      lines.push(`- ${doc.title}: ${doc.content}`);
    }
  }

  const market = summary.evidence.find((item) => item.source === "marketData");
  if (market) {
    lines.push(`Market data: ${JSON.stringify(market.item)}`);
  }

  const news = summary.evidence.find((item) => item.source === "news");
  if (news && news.items.length > 0) {
    lines.push("Recent news:");
    for (const item of news.items) {
      lines.push(`- ${item.headline} (${item.sentiment})`);
    }
  }

  if (summary.failures.length > 0) {
    lines.push("Workflow notes:");
    for (const failure of summary.failures) {
      lines.push(`- ${failure.label} failed: ${failure.error}`);
    }
  }

  lines.push(
    "Answer: The orchestration layer combines internal knowledge, structured data, and recent events before producing a grounded response.",
  );

  return lines.join("\n");
}

async function runWorkflow({ sessionId, query }) {
  const previousTurns = sessionMemory.get(sessionId) ?? [];
  const classification = classifyQuery(query);
  const tools = routeTools(classification);
  const toolResults = [];

  for (const tool of tools) {
    if (tool === "retrieval") {
      toolResults.push(
        await withTimeout(
          "retrieval",
          () => retrievalTool(classification.entity),
          400,
        ),
      );
    }

    if (tool === "marketData") {
      toolResults.push(
        await withTimeout(
          "marketData",
          () => marketDataTool(classification.entity),
          400,
        ),
      );
    }

    if (tool === "news") {
      toolResults.push(
        await withTimeout("news", () => newsTool(classification.entity), 400),
      );
    }
  }

  const summary = aggregateEvidence(
    query,
    classification,
    toolResults,
    previousTurns,
  );
  const answer = generateFinalAnswer(summary);
  sessionMemory.set(sessionId, [...previousTurns, { query, answer }]);

  return answer;
}

async function main() {
  const query = "Give me a startup profile and latest news on Redwood Robotics";
  const answer = await runWorkflow({
    sessionId: "practice-demo-session",
    query,
  });
  console.log(answer);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
