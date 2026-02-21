from core import logger
from third_party.brave_search import BraveSearch


def get_event_analysis(home_team: str, away_team: str, competition: str) -> str:
    """
    Perform targeted web searches using Brave Search API to gather recent information
    for betting analysis.

    Args:
        home_team: The name of the home team
        away_team: The name of the away team
        competition: The competition they're playing in

    Returns:
        Formatted string with aggregated search results
    """
    logger.info(f"Gathering event analysis for: {home_team} vs {away_team} in {competition}")
    
    queries = [
        f"{home_team} football news",
        f"{away_team} football news",
        f"{home_team} vs {away_team} head-to-head",
        f"{home_team} vs {away_team} match preview",
        f"{competition} standings",
        f"{competition} news",
    ]
    
    all_results = []
    
    try:
        searcher = BraveSearch()
        for q in queries:
            logger.info(f"Sub-query: {q}")
            results = searcher.search(
                query=q,
                count=4,
                content_types=['news']
            )
            
            if not results:
                all_results.append(f"No recent information found for: {q}")
                continue
                
            formatted = [
                f"{i}. {item.title}\n   {item.description}\n   Source: {item.url}"
                for i, item in enumerate(results[:4], 1)
            ]
            all_results.append(f"--- Results for: {q} ---\n" + "\n".join(formatted))
            
        logger.info(f"Finished gathering analysis for {home_team} vs {away_team}")
        logger.info("\n\n".join(all_results))
        return "\n\n".join(all_results)
        
    except Exception as e:
        logger.error(f"Event analysis search failed: {e}")
        return f"Search failed: Unable to retrieve information for {home_team} vs {away_team}"
