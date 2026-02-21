from typing import Dict, List, Optional
from datetime import datetime, timezone, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from core import logger
from constants import BRAVE_SEARCH_API_KEY
from .base import BaseThirdParty


class BraveSearch(BaseThirdParty):
    """
    Client for the Brave Search News API.

    Uses the dedicated news endpoint (res/v1/news/search) which returns
    higher-quality, fresher football articles than the general web search endpoint.
    """

    NEWS_ENDPOINT = "res/v1/news/search"

    def __init__(self, api_key: str = BRAVE_SEARCH_API_KEY):
        super().__init__(api_key=api_key)
        self.base_url = "https://api.search.brave.com"
        self.headers = {
            **self.headers,
            "Accept": "application/json",
            "Accept-Encoding": "gzip",
            "X-Subscription-Token": self.api_key,
        }

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type(Exception),
    )
    def search_news(
        self,
        query: str,
        count: int = 10,
        country: str = "gb",
        search_lang: str = "en",
        freshness: str = "pw",
        extra_snippets: bool = True,
    ) -> List[dict]:
        """
        Query the Brave News Search endpoint and return raw parsed articles.

        Args:
            query: Search query string — include team name + league for relevance.
            count: Number of results to request (max 20 per request).
            country: Two-letter country code for result localisation.
            search_lang: Language of results.
            freshness: Recency filter. 'pd' = past day, 'pw' = past week,
                       'pm' = past month. Can also be 'YYYY-MM-DDtoYYYY-MM-DD'.
            extra_snippets: Request up to 5 additional text excerpts per result
                            (available on AI/Data plans — set False if on Basic).

        Returns:
            List of article dicts with keys: title, url, description,
            age, source, extra_snippets.
        """
        params: Dict[str, str | int | bool] = {
            "q": query,
            "count": min(count, 20),
            "country": country,
            "search_lang": search_lang,
            "freshness": freshness,
            "spellcheck": True,
            "extra_snippets": extra_snippets,
        }

        response = self._make_request(
            endpoint=self.NEWS_ENDPOINT,
            params=params,
            method="GET",
        )

        if not response.success:
            raise Exception(
                f"Brave News API error: status={response.status_code}, body={response.json}"
            )

        return self._parse_articles(response.json)

    def search_news_parallel(
        self,
        queries: List[str],
        count: int = 10,
        freshness: str = "pw",
        extra_snippets: bool = True,
        max_workers: int = 6,
    ) -> Dict[str, List[dict]]:
        """
        Run multiple news searches concurrently.

        Args:
            queries: List of search query strings.
            count: Results per query.
            freshness: Recency filter applied to all queries.
            extra_snippets: Whether to request extra snippets.
            max_workers: Thread pool size.

        Returns:
            Dict mapping each query string to its list of articles.
        """
        results: Dict[str, List[dict]] = {}

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_query = {
                executor.submit(
                    self.search_news, q, count, "gb", "en", freshness, extra_snippets
                ): q
                for q in queries
            }
            for future in as_completed(future_to_query):
                query = future_to_query[future]
                try:
                    results[query] = future.result()
                except Exception as e:
                    logger.warning(f"Brave News query failed [{query!r}]: {e}")
                    results[query] = []

        return results

    def _parse_articles(self, data: dict) -> List[dict]:
        """Extract the fields we care about from a raw Brave News response."""
        articles = []
        for r in data.get("results", []):
            article = {
                "title": r.get("title", ""),
                "url": r.get("url", ""),
                "description": r.get("description", ""),
                "age": r.get("age", ""),
                "source": r.get("meta_url", {}).get("hostname", "unknown"),
                "extra_snippets": r.get("extra_snippets", []),
            }
            # Only include results that have at least a title and URL
            if article["title"] and article["url"]:
                articles.append(article)
        return articles
