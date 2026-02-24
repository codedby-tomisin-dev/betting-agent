from core import logger
from third_party.brave_search import BraveSearch


def search_match_news(query: str, freshness_days: int = 14) -> str:
    """
    Search for news articles about a football match or team using Brave News.

    Call this multiple times with different focused queries to gather different
    types of intelligence. Good query patterns:
    - Team injuries/suspensions: "Arsenal injuries suspensions team news 2025"
    - Head-to-head / preview:   "Arsenal vs Chelsea preview prediction"
    - League standings / form:  "Premier League table form standings latest"
    - Referee:                  "Arsenal Chelsea referee Premier League"
    - Match context:            "Arsenal Chelsea rivalry stakes title relegation"

    Args:
        query: A specific, focused search query.
        freshness_days: How many days back to search (default: 14 = last 2 weeks).

    Returns:
        A formatted string of news articles, or a message if none were found.
    """
    try:
        client = BraveSearch()
        results = client.search(query=query, count=8, freshness='pw')

        if not results:
            return f"No news articles found for query: {query!r}"

        sections = []
        for i, item in enumerate(results[:4], 1):
            source_name = item.source.name if item.source else "Unknown"
            date_str = item.published_at[:10] if item.published_at else ""
            header = f"{i}. [{source_name}] {item.title}"
            if date_str:
                header += f"  ({date_str})"
            parts = [header]
            if item.description:
                parts.append(f"   {item.description}")
            parts.append(f"   {item.url}")
            sections.append("\n".join(parts))

        # Discard large objects immediately once text is extracted
        del results

        logger.info(f"search_match_news: {len(sections)} articles for {query!r}")
        return "\n\n".join(sections)

    except Exception as e:
        logger.error(f"search_match_news failed for query {query!r}: {e}")
        return f"Search failed for query {query!r}: {e}"
