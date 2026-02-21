from core import logger
from third_party.brave_search import BraveSearch


# ---------------------------------------------------------------------------
# Query templates
# ---------------------------------------------------------------------------
# Each tuple is (label, query_template).
# Templates use .format(home=..., away=..., comp=...) at call time.
# We group queries by what signal they provide to the betting agent.
# ---------------------------------------------------------------------------

_QUERY_TEMPLATES = [
    # --- Team form & squad news ---
    ("home_team_news",    "{home} {comp} latest news team news injuries"),
    ("away_team_news",    "{away} {comp} latest news team news injuries"),

    # --- Head-to-head & match preview ---
    ("h2h_preview",       "{home} vs {away} preview prediction head to head"),
    ("match_stats",       "{home} vs {away} {comp} stats form goals corners cards"),

    # --- Disciplinary & referee ---
    ("home_discipline",   "{home} yellow cards bookings referee {comp}"),
    ("away_discipline",   "{away} yellow cards bookings referee {comp}"),

    # --- League context ---
    ("comp_table",        "{comp} table standings form recent results"),
    ("comp_news",         "{comp} news round up match week"),
]


def _format_article(idx: int, article: dict) -> str:
    """Render a single article into a compact, readable string."""
    parts = [f"{idx}. [{article['source']}] {article['title']}"]
    if article.get("age"):
        parts[0] += f"  ({article['age']})"
    if article.get("description"):
        parts.append(f"   {article['description']}")
    for snippet in (article.get("extra_snippets") or [])[:2]:
        snippet = snippet.strip()
        if snippet:
            parts.append(f"   > {snippet}")
    parts.append(f"   {article['url']}")
    return "\n".join(parts)


def _format_section(label: str, articles: list[dict]) -> str:
    """Render all articles for one query into a labelled section."""
    section_header = f"=== {label.replace('_', ' ').upper()} ==="
    if not articles:
        return f"{section_header}\n  No recent articles found."
    body = "\n\n".join(_format_article(i, a) for i, a in enumerate(articles[:5], 1))
    return f"{section_header}\n{body}"


def get_event_analysis(home_team: str, away_team: str, competition: str) -> str:
    """
    Gather match intelligence from Brave News for a betting analysis agent.

    Runs all search queries in parallel against the Brave News API, using the
    dedicated news endpoint for fresh, football-specific results. Each query
    is scoped to a specific signal (form, injuries, discipline, head-to-head,
    league context) so the agent receives structured, purpose-labelled data
    rather than a flat dump.

    Args:
        home_team: Full name of the home side (e.g. "Arsenal").
        away_team: Full name of the away side (e.g. "Chelsea").
        competition: Competition name (e.g. "Premier League").

    Returns:
        A multi-section string ready to be consumed by the LLM agent,
        or an error message if the search completely fails.
    """
    logger.info(f"Event analysis: {home_team} vs {away_team} [{competition}]")

    fmt = {"home": home_team, "away": away_team, "comp": competition}
    queries = {label: tmpl.format(**fmt) for label, tmpl in _QUERY_TEMPLATES}

    try:
        searcher = BraveSearch()
        # All queries run in parallel — one HTTP round-trip per query, concurrently
        raw_results = searcher.search_news_parallel(
            queries=list(queries.values()),
            count=8,
            freshness="pw",   # past week — fresh enough for match previews
            extra_snippets=True,
        )

        # Map raw results back to their human-readable labels
        sections = []
        for label, query_str in queries.items():
            articles = raw_results.get(query_str, [])
            sections.append(_format_section(label, articles))

        output = "\n\n".join(sections)
        logger.info(
            f"Event analysis complete: {home_team} vs {away_team} — "
            f"{sum(len(raw_results.get(q, [])) for q in queries.values())} total articles"
        )
        return output

    except Exception as e:
        logger.error(f"Event analysis failed for {home_team} vs {away_team}: {e}")
        return (
            f"Search failed: unable to retrieve information for "
            f"{home_team} vs {away_team} in {competition}. Error: {e}"
        )
