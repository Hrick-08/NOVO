import json
import re
from groq import Groq
from tavily import TavilyClient
from configs import GROQ_API_KEY, TAVILY_API_KEY
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

If the question does not require any tools, you are free to answer in you own language.

"""

class InvestingAgent:

    def __init__(self, portfolio = None):
        self.portfolio= portfolio

    def build_context(self):
        if not self.portfolio:
            return ""

        holdings = "\n".join([f"{h['name']} ({h['ticker']}): {h['weight']}%"
                              for h in self.portfolio["holdings"]
                              ])
        
        return f"""User Portfolio: 
                    {holdings}

                    Risk: {self.portfolio["profile"]}
                    Loss Probability: {self.portfolio["monte_carlo"]["loss_probability"]}%

                """
        

    def chat(self, user_message):
        context = self.build_context()
        system_prompt = build_system_prompt()

        completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role":"system","content":system_prompt},
            {"role":"system","content":context},
            {"role": "user", "content": user_message}
        ])

        response = completion.choices[0].message.content

        clean = response.strip()

        if "```json" in clean:
            clean = clean.split("```json")[1].split("```")[0].strip()

        elif "```" in clean:
            clean = clean.split("```")[1].split("```")[0].strip()


        try:
            parsed = json.loads(clean)

            if parsed.get("tool") == "market_news":
                return handle_search_market_news(parsed["query"])

            if parsed.get("tool") == "simulate_investment":
                return handle_simulate_investment(
                                                    parsed["amount"],
                                                    parsed["risk_level"],
                                                    parsed.get("horizon_days", 252)
            )
            
        except:
            pass

        return clean
        


def run_agent():
    agent = InvestingAgent()

    while True:
        user_input = input("You: ")
        if user_input.lower() == "quit":
            break

if __name__ == "__main__":
    run_agent()