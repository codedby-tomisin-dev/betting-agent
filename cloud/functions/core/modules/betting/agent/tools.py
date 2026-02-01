import requests
from constants import BRAVE_SEARCH_API_KEY
from core import logger


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
    
    url = "https://api.search.brave.com/res/v1/web/search"
    
    headers = {
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": BRAVE_SEARCH_API_KEY
    }
    
    params = {
        "q": query,
        "count": 5,  # Get top 5 results
        "search_lang": "en",
        "freshness": "pw"  # Past week for recent information
    }
    
    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        # Format results
        results = []
        if "web" in data and "results" in data["web"]:
            for i, result in enumerate(data["web"]["results"][:5], 1):
                title = result.get("title", "")
                description = result.get("description", "")
                url = result.get("url", "")
                
                results.append(f"{i}. {title}\n   {description}\n   Source: {url}")
        
        if not results:
            logger.warning(f"No search results found for: {query}")
            return f"No recent information found for: {query}"
        
        formatted_results = "\n\n".join(results)
        logger.info(f"Found {len(results)} search results")

        return formatted_results
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Brave Search API error: {e}")
        return f"Search failed: Unable to retrieve information for {query}"
    except Exception as e:
        logger.error(f"Unexpected error in web_search: {e}")
        return f"Search error: {str(e)}"
