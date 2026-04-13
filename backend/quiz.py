# quiz.py

QUESTIONS = [
    {
        "id": "q1",
        "text": "How would you react if your investment dropped 20% in one month?",
        "options": [
            ("a", "I'd sell everything immediately",           1),
            ("b", "I'd be worried but wait and watch",         2),
            ("c", "I'd hold — markets recover eventually",     3),
            ("d", "I'd invest more while prices are low",      4),
        ]
    },
    {
        "id": "q2",
        "text": "What is your primary investment goal?",
        "options": [
            ("a", "Protect my money from losing value",        1),
            ("b", "Steady growth with minimal risk",           2),
            ("c", "Grow wealth over 5–10 years",               3),
            ("d", "Maximum returns, I accept high risk",       4),
        ]
    },
    {
        "id": "q3",
        "text": "How long can you leave your money invested without touching it?",
        "options": [
            ("a", "Less than 1 year",                          1),
            ("b", "1–3 years",                                 2),
            ("c", "3–7 years",                                 3),
            ("d", "More than 7 years",                         4),
        ]
    },
    {
        "id": "q4",
        "text": "What portion of your monthly income can you invest regularly?",
        "options": [
            ("a", "Less than 5%",                              1),
            ("b", "5–15%",                                     2),
            ("c", "15–30%",                                    3),
            ("d", "More than 30%",                             4),
        ]
    },
    {
        "id": "q5",
        "text": "Have you invested before?",
        "options": [
            ("a", "Never — this is my first time",             1),
            ("b", "Only in FDs or savings accounts",           2),
            ("c", "Some mutual funds or stocks",               3),
            ("d", "Actively trade stocks or derivatives",      4),
        ]
    },
]

# Score → Profile mapping
def score_to_profile(total: int) -> dict:
    if total <= 7:
        return {
            "profile":     "Conservative",
            "emoji":       "🛡",
            "description": "You prioritize safety over growth. "
                           "Best suited for FDs, debt mutual funds, and government bonds.",
            "equity_pct":  20,
            "debt_pct":    60,
            "gold_pct":    20,
        }
    elif total <= 12:
        return {
            "profile":     "Balanced",
            "emoji":       "⚖",
            "description": "You want moderate growth with manageable risk. "
                           "A mix of equity and debt works well for you.",
            "equity_pct":  50,
            "debt_pct":    35,
            "gold_pct":    15,
        }
    elif total <= 17:
        return {
            "profile":     "Growth",
            "emoji":       "📈",
            "description": "You're comfortable with short-term dips for long-term gains. "
                           "Equity-heavy portfolio with some cushion.",
            "equity_pct":  70,
            "debt_pct":    20,
            "gold_pct":    10,
        }
    else:
        return {
            "profile":     "Aggressive",
            "emoji":       "🚀",
            "description": "You chase maximum returns and can stomach high volatility. "
                           "Heavily equity-focused with small-cap and sectoral exposure.",
            "equity_pct":  90,
            "debt_pct":    5,
            "gold_pct":    5,
        }


def run_quiz() -> dict:
    """
    Run the quiz in terminal. Returns the full user profile dict.
    Later this gets replaced by a Streamlit UI — logic stays identical.
    """
    print("\n" + "─" * 50)
    print("  RISK PROFILE QUIZ")
    print("  Answer honestly — this shapes your portfolio.")
    print("─" * 50)

    total_score = 0
    answers     = {}

    for q in QUESTIONS:
        print(f"\n{q['text']}")
        for key, label, _ in q["options"]:
            print(f"  {key}) {label}")

        while True:
            choice = input("  Your answer (a/b/c/d): ").strip().lower()
            matched = next(
                ((key, label, score)
                 for key, label, score in q["options"]
                 if key == choice),
                None
            )
            if matched:
                answers[q["id"]] = {"choice": matched[0], "label": matched[1]}
                total_score += matched[2]
                break
            print("  Please enter a, b, c, or d.")

    profile = score_to_profile(total_score)
    profile["total_score"] = total_score
    profile["answers"]     = answers

    print("\n" + "─" * 50)
    print(f"  Your Risk Profile: {profile['emoji']}  {profile['profile']}")
    print(f"  {profile['description']}")
    print(f"\n  Suggested allocation:")
    print(f"    Equity : {profile['equity_pct']}%")
    print(f"    Debt   : {profile['debt_pct']}%")
    print(f"    Gold   : {profile['gold_pct']}%")
    print("─" * 50 + "\n")

    return profile


if __name__ == "__main__":
    result = run_quiz()
    print("Stored profile:", result)