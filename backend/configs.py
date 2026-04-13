import os
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
TAVILY_API_KEY    = os.getenv("TAVILY_API_KEY")

LLM_MODEL = "claude-sonnet-4-20250514"

EMBED_MODEL      = "text-embedding-3-small"
CHROMA_DB_PATH   = ".chroma"

MONTE_CARLO_SIMS = 1000
RISK_FREE_RATE   = 0.068