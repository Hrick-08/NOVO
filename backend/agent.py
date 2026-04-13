import json
import re
from groq import Groq
from tavily import TavilyClient
from configs import GROQ_API_KEY, TAVILY_API_KEY

client = Groq(api_key=GROQ_API_KEY)
tavily = TavilyClient(api_key=TAVILY_API_KEY)


# ── Guardrail ─────────────────────────────────────────

BLOCKED_PATTERNS = [
    "i will buy", "i will sell", "execute the trade",
    "placing the order", "i have purchased",
    "guaranteed return", "you will definitely",
    "100% safe", "no risk",
]

SOFTEN_PATTERNS = {
    "you should buy": "you may want to consider buying",
    "you must invest": "one option is to invest",
}

def guardrail(text: str):
    lower = text.lower()

    for pattern in BLOCKED_PATTERNS:
        if pattern in lower:
            return False, "I can only provide guidance — not execute trades."

    cleaned = text
    for k, v in SOFTEN_PATTERNS.items():
        cleaned = cleaned.replace(k, v)

    return True, cleaned


# ── Tools ────────────────────────────────────────────

def handle_search_market_news(query: str):
    try:
        res = tavily.search(query=query, max_results=3, include_answer=True)
        return res.get("answer", "No results found.")
    except:
        return "Search failed."

def handle_simulate_investment(amount, risk_level, horizon_days=252):
    import numpy as np

    params = {
        "conservative": (0.07, 0.08),
        "balanced":     (0.11, 0.14),
        "growth":       (0.14, 0.20),
        "aggressive":   (0.18, 0.28),
    }

    mean, vol = params[risk_level]
    daily_mean = mean / 252
    daily_vol  = vol / (252 ** 0.5)

    sims = 1000
    results = []

    for _ in range(sims):
        rets = np.random.normal(daily_mean, daily_vol, horizon_days)
        results.append(amount * np.prod(1 + rets))

    return json.dumps({
        "median": round(float(np.median(results)), 2),
        "worst": round(float(np.percentile(results, 10)), 2),
        "best": round(float(np.percentile(results, 90)), 2),
        "loss_probability": round(float(sum(r < amount for r in results) / sims * 100), 1)
    })

def handle_explain_term(term: str):
    return f"{term} is a financial concept explained simply."


def run_tool(name, args):
    if name == "search_market_news":
        return handle_search_market_news(args["query"])
    if name == "simulate_investment":
        return handle_simulate_investment(
            args["amount"], args["risk_level"], args.get("horizon_days", 252)
        )
    if name == "explain_term":
        return handle_explain_term(args["term"])
    return "Unknown tool"


# ── Prompt ───────────────────────────────────────────

def build_system_prompt():
    return """
You are an AI investing assistant.

CRITICAL:
If using a tool → return ONLY JSON.

Format:
{"tool": "...", "input": {...}}

No explanation allowed with tool calls.
"""


# ── Agent ────────────────────────────────────────────

class InvestingAgent:

    def __init__(self):
        self.system = build_system_prompt()
        self.history = []

    def extract_json(self, text):
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if not match:
            return None
        try:
            return json.loads(match.group())
        except:
            return None

    def chat(self, user_message):
        self.history.append({"role": "user", "content": user_message})

        for _ in range(5):  

            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": self.system},
                    *self.history
                ],
                temperature=0.3,
            )

            reply = response.choices[0].message.content.strip()

            parsed = self.extract_json(reply)

            
            if parsed and "tool" in parsed:
                result = run_tool(parsed["tool"], parsed["input"])

                self.history.append({"role": "assistant", "content": reply})
                self.history.append({
                    "role": "user",
                    "content": f"Tool result: {result}"
                })

                continue

           
            is_safe, cleaned = guardrail(reply)

            
            cleaned = re.sub(r'\{.*"tool".*\}', '', cleaned, flags=re.DOTALL)

            self.history.append({"role": "assistant", "content": cleaned})

            return cleaned

        print(reply)
        return "Something went wrong. Please try again."


# ── CLI ──────────────────────────────────────────────

def run_agent():
    agent = InvestingAgent()

    while True:
        user_input = input("You: ")

        if user_input.lower() == "quit":
            break

        print("Agent:", agent.chat(user_input))


if __name__ == "__main__":
    run_agent()