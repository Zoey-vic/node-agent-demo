# Homework: Build A More Realistic Node + AI Workflow

## Overview

In this assignment, you will extend the classroom practice-agent-demo into a more realistic backend AI workflow. You may choose how far to go.

Suggested flow: `User -> Classifier -> Router -> Tools -> Aggregator -> LLM -> Final Answer`

### Level 1: Base

- add one new tool
- update the classifier
- update the router
- add retry or fallback behavior
- write the required deep-dive answers
- prepare the deep dive questions

### Level 2: Intermediate

Do everything in Level 1, and also:

- improve the classifier beyond simple one-keyword logic
- support multi-tool routing when appropriate
- add structured logging
- make the aggregation step clearer and more explicit
- design summary explaining tradeoffs

### Level 3: Advanced

Do everything in Level 2, and also:

- call a real LLM API for the final answer
- use a stronger classifier strategy, such as LLM intent classification or hybrid routing
- make sure the real LLM consumes aggregated context, not raw tool outputs
- support fallback behavior when the LLM API or a tool fails
- explain data-safety considerations when using external model providers

---

## Required Parts Of The Assignment

## Part 1: Add One More Tool

Choose one new tool to add.

Suggested options:

- `riskTool`
  returns operational or business risks
- `pricingTool`
  returns pricing trends or volatility hints
- `supportTool`
  returns runbook or troubleshooting information
- `rankingTool`
  re-ranks retrieval results before final answer generation
- `complianceTool`
  returns compliance or policy notes for a request

### What you need to show

- what the tool does
- what input it receives
- what output shape it returns
- what user question type it supports
- how it improves the overall workflow
- Connect the tool function to:
  - classifier
  - router
  - workflow execution
  - final answer path

---

## Part 2: Implement A Classifier

The classifier decides what kind of question the user is asking.

### Option A: Rule-based classifier

Examples:

- keyword matching
- phrase detection
- simple priority rules

### Option B: LLM intent classifier

Use a model to classify the request into a structured format.

Example output:

```json
{
  "intent": "market_and_news_query",
  "needs_retrieval": false,
  "needs_market_data": true,
  "needs_news": true,
  "confidence": 0.84
}
```

### Option C: Hybrid classifier

Use rules plus LLM classification together.

Example idea:

- use rules for obvious / high-risk cases
- use the LLM for softer intent classification
- if confidence is low, route to a safer fallback path

### What your classifier section should clearly show

- what signals the classifier uses
- what output it produces
- how the router uses that output
- what happens if classification is uncertain

---

## Part 3: Implement A Router

The router decides which tools to call after classification.

### Option A: Single-tool router

Each question maps to one main tool.

Simple and acceptable for base level.

### Option B: Multi-tool router

One question can trigger multiple tools.

Example:

- internal profile question -> retrieval
- latest update question -> news
- valuation question -> market data

Combined query:

`Give me the startup profile and latest news on Redwood Robotics`

Could route to:

- retrieval
- news

### Option C: Hybrid / fallback router

Add safer routing behavior.

Examples:

- if classification confidence is low, default to retrieval
- if a specialized tool fails, fall back to retrieval
- if the system cannot determine intent clearly, take a conservative path

### What your router section should clearly show

- why a question goes to a particular tool or tool combination
- whether one query can call multiple tools
- how you handle unclear routing cases

---

## Part 4: Aggregation

You should have a clear step that gathers tool outputs before final answer generation.

### Aggregation step may do things like

- collect all successful tool outputs
- separate failures from successes
- normalize different output shapes
- remove duplicates
- prepare a final context object for the LLM

### What this section should clearly show

- how you organize multiple tool results
- how you decide what gets sent to the final answer step
- how you handle missing or failed tool outputs
- why this step happens before the LLM call

---

## Part 5: Optional Real LLM API Integration

### Base / Intermediate

You may keep this simple:

- a mock final-answer layer
- a local function that formats the final response

### Advanced

You should call a real LLM API for the final answer.

### You may use

- OpenAI API
- Claude API
- Gemini API

### What the real LLM call should do

It should take the aggregated context and generate the final answer.

Examples:

- produce the final synthesized answer
- stay grounded in the tool outputs
- explain uncertainty if some tools failed

### What this section should clearly show

- where the model call happens in the workflow
- what prompt/context is passed to the model
- how the final answer stays grounded in tool results

### Important safety note

If you use an external model provider, think about:

- what data should not leave the system
- whether internal data should be redacted
- how to ensure only essential context
- whether external APIs create data-boundary risks

---

## Part 6: Add Reliability Behavior

### Option A: Retry

Examples:

- retry a flaky tool once
- retry the LLM call if it fails with a temporary error
- retry only for safe / idempotent operations

### Option B: Fallback

Examples:

- if a specialized tool fails, fall back to retrieval
- if the LLM call fails, return a tool-based partial answer
- if classification confidence is too low, use a safer route

### Option C: Partial answer strategy

If one dependency fails, still return a useful answer built from successful tools.

### What your reliability section should clearly show

- what kind of failure you simulated or handled
- why retry or fallback is appropriate
- how the system avoids failing completely

---

## Part 7: Questions

### Architecture question examples

- Why use a router or supervisor pattern?
- Why not call the LLM directly?
- Why is aggregation useful?
- How do you decide which tools to call?
- How would you scale this workflow to more tools?
- What is the difference between LangChain and LangGraph?
- When would you choose LangGraph over LangChain?

### Backend question examples

- How would you expose this workflow through a REST API?
- What would you log for debugging?
- How would you handle tool timeouts?
- When would you use SSE vs WebSocket?
- What would you monitor first in production?
- Is there a risk when sending internal context to external model providers?
- If the ai company says your data is not used for training, is that enough?
