import json
import re
from groq import Groq
from tavily import TavilyClient
from routers.configs import GROQ_API_KEY, TAVILY_API_KEY
import numpy as np

client = Groq(api_key=GROQ_API_KEY)
tavily = TavilyClient(api_key=TAVILY_API_KEY)


def handle_search_market_news(query):
    try:
        res = tavily.search(query=query, max_results=3, include_answer=True)
        return res.get("answer", "No results found.")
    except:
        return "Search failed."


def handle_simulate_investment(amount, risk_level, horizon_days=252):

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


def build_system_prompt():
    return """
You are an AI investing assistant for beginners.

Rules:
- Use simple English
- Always explain in INR
- Don't entertain out of finance chats.

CRITICAL:
Return ONLY JSON.

Available tools:
- search_market_news
- simulate_investment

If any of the input from the user requires the above tools, return in the following format

- search_market_tool requires the query itself so return
  {"tool":"market_news","query": {...}}

- simulate_investment requires amount, risk_level and horizon_days(default = 252)
    return {"tool": "simulate_investment","amount":(int), "risk_level": one of ["conservative", "balanced", "growth", "aggressive"], "horizon_days":(int)}

No explanation allowed with tool calls, JSON ONLY.

If the question does not require any tools, you are free to answer in your own language.

"""


class InvestingAgent:

    def __init__(self, portfolio=None):
        self.portfolio = portfolio

    def build_context(self):
        if not self.portfolio:
            return ""

        holdings = "\n".join([
            f"{h['name']} ({h['ticker']}): {h['weight']}%"
            for h in self.portfolio["holdings"]
        ])

        return f"""User Portfolio:
{holdings}

Risk: {self.portfolio["profile"]}
Loss Probability: {self.portfolio["monte_carlo"]["loss_probability"]}%
"""

    def chat(self, user_message: str) -> str:
        context = self.build_context()
        system_prompt = build_system_prompt()

        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "system", "content": context},
                {"role": "user",   "content": user_message},
            ]
        )

        response = completion.choices[0].message.content
        clean = response.strip()

        # Strip markdown code fences if present
        if "```json" in clean:
            clean = clean.split("```json")[1].split("```")[0].strip()
        elif "```" in clean:
            clean = clean.split("```")[1].split("```")[0].strip()

        # Try to parse as a tool call
        try:
            parsed = json.loads(clean)

            if parsed.get("tool") == "market_news":
                result = handle_search_market_news(parsed["query"])
                return f"Here's what I found about '{parsed['query']}':\n\n{result}"

            if parsed.get("tool") == "simulate_investment":
                raw = handle_simulate_investment(
                    parsed["amount"],
                    parsed["risk_level"],
                    parsed.get("horizon_days", 252),
                )
                data = json.loads(raw)
                amount = parsed["amount"]
                return (
                    f"📊 Investment Simulation for ₹{amount:,.0f} "
                    f"({parsed['risk_level'].capitalize()} profile, "
                    f"{parsed.get('horizon_days', 252)} trading days)\n\n"
                    f"• Median outcome:    ₹{data['median']:,.2f}\n"
                    f"• Best case (90th):  ₹{data['best']:,.2f}\n"
                    f"• Worst case (10th): ₹{data['worst']:,.2f}\n"
                    f"• Loss probability:  {data['loss_probability']}%"
                )

            # JSON but not a known tool — return as plain text
            return clean

        except (json.JSONDecodeError, KeyError):
            # Not JSON — plain conversational reply from the model
            return clean


def run_agent():
    agent = InvestingAgent()
    print("Investing Assistant ready. Type 'quit' to exit.\n")
    while True:
        user_input = input("You: ").strip()
        if user_input.lower() == "quit":
            break
        if not user_input:
            continue
        response = agent.chat(user_input)
        print(f"\nAssistant: {response}\n")


if __name__ == "__main__":
    run_agent()