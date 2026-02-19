from core import logger
from third_party.brave_search import BraveSearch


def web_search(query: str) -> str:
    """
    Perform web search using Brave Search API to gather recent information
    for betting analysis.

    Args:
        query: Search query string

    Returns:
        Formatted string with search results
    """
    logger.info(f"Performing web search for: {query}")

    try:
        results = BraveSearch().search(
            query=query,
            count=5,
            freshness="pw",
            content_types=['discussions', 'news'],
        )

        if not results:
            logger.warning(f"No search results found for: {query}")
            return f"No recent information found for: {query}"

        formatted = [
            f"{i}. {item.title}\n   {item.description}\n   Source: {item.url}"
            for i, item in enumerate(results[:5], 1)
        ]

        logger.info(f"Found {len(formatted)} search results")
        return "\n\n".join(formatted)

    except Exception as e:
        logger.error(f"Brave Search error: {e}")
        return f"Search failed: Unable to retrieve information for {query}"
