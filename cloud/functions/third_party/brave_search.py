from typing import Dict, List, Literal, Optional
from datetime import datetime, timezone, timedelta
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from core import logger
from core.models import Author, CrawledContent, Source
from constants import BRAVE_SEARCH_API_KEY
from .base import BaseThirdParty


class BraveSearch(BaseThirdParty):
    def __init__(self, api_key: str = BRAVE_SEARCH_API_KEY):
        super().__init__(api_key=api_key)
        self.base_url = "https://api.search.brave.com"
        self.headers = {
            **self.headers,
            "X-Subscription-Token": self.api_key,
        }

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type(Exception)
    )
    def search(
        self,
        query: str,
        count: int = 20,
        country: str = "uk",
        search_lang: str = "en",
        freshness: Optional[str] = None,
        safe_search: Optional[str] = None,
        extra_params: Optional[Dict[str, str]] = None,
        content_types: List[Literal['discussions', 'infobox', 'news', 'videos']] = ['discussions', 'infobox', 'news', 'videos'],
    ) -> List[CrawledContent]:
        """
        Perform a Brave web search and return a list of CrawledContent objects.
        """
        params: Dict[str, str | int] = {
            "q": query,
            "count": count,
            "country": country,
            "search_lang": search_lang,
            "summary": True,
            "result_filter": ",".join(content_types),
        }
        if freshness:
            params["freshness"] = freshness
        if safe_search:
            params["safesearch"] = safe_search
        if extra_params:
            params.update(extra_params)

        response = self._make_request(
            endpoint="res/v1/web/search",
            params=params,
            method="GET",
        )

        if not response.success:
            raise Exception(f"Brave Search API error: status={response.status_code}, body={response.json}")

        return self._convert_to_crawled_content(response.json)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type(Exception)
    )
    def search_news(
        self,
        query: str,
        count: int = 20,
        country: str = "us",
        search_lang: str = "en",
        spellcheck: bool = True,
        extra_params: Optional[Dict[str, str]] = None,
        freshness_days: int = 28,
    ) -> List[CrawledContent]:
        """
        Perform a Brave news search and return a list of CrawledContent objects.
        """
        params: Dict[str, str | int | bool] = {
            "q": query,
            "count": count,
            "country": country,
            "search_lang": search_lang,
            "spellcheck": spellcheck,
        }

        # Enforce API-level freshness using Brave's `freshness` parameter.
        # Docs: freshness can be 'pd'|'pw'|'pm'|'py' or a date range 'YYYY-MM-DDtoYYYY-MM-DD'.
        try:
            end_date = datetime.now(timezone.utc).date()
            start_date = (end_date - timedelta(days=max(freshness_days, 1)))
            params["freshness"] = f"{start_date.isoformat()}to{end_date.isoformat()}"
        except Exception:
            # Fallback to last month window token if range construction fails
            params["freshness"] = "pm"

        if extra_params:
            params.update(extra_params)

        response = self._make_request(
            endpoint="res/v1/news/search",
            params=params,
            method="GET",
        )

        if not response.success:
            raise Exception(f"Brave News Search API error: status={response.status_code}, body={response.json}")

        items = self._convert_news_to_crawled_content(response.json)

        # Filter to preceding `freshness_days` days (default: 4 weeks)
        try:
            cutoff = datetime.now(timezone.utc) - timedelta(days=max(freshness_days, 1))
            items = [
                i for i in items
                if getattr(i, "published_at", None) is not None and i.published_at >= cutoff
            ]
        except Exception:
            # If any parsing issues occur, return unfiltered items
            pass

        return items

    def _convert_to_crawled_content(self, response_data: Dict) -> List[CrawledContent]:
        """
        Convert Brave Search API response to a list of CrawledContent objects.
        """
        crawled_content = []
        # Extract web results
        web_results = response_data.get("web", {}).get("results", [])
        for result in web_results:
            crawled_item = self._convert_web_result_to_crawled_content(result)
            if crawled_item:
                crawled_content.append(crawled_item)
        
        # Extract news results
        news_results = response_data.get("news", {}).get("results", [])
        for result in news_results:
            crawled_item = self._convert_web_result_to_crawled_content(result)
            if crawled_item:
                crawled_content.append(crawled_item)

        # Extract video results
        video_results = response_data.get("videos", {}).get("results", [])
        for result in video_results:
            crawled_item = self._convert_video_result_to_crawled_content(result)
            if crawled_item:
                crawled_content.append(crawled_item)
        
        return crawled_content

    def _convert_news_to_crawled_content(self, response_data: Dict) -> List[CrawledContent]:
        """
        Convert Brave News Search API response to a list of CrawledContent objects.
        """
        crawled_content = []
        # Extract news results
        news_results = response_data.get("results", [])
        for result in news_results:
            crawled_item = self._convert_news_result_to_crawled_content(result)
            if crawled_item:
                crawled_content.append(crawled_item)
        
        return crawled_content

    def _convert_web_result_to_crawled_content(self, result: Dict) -> Optional[CrawledContent]:
        """
        Convert a web or news search result to a CrawledContent object.
        """
        try:
            # Extract favicon from meta_url or profile
            favicon = None
            if "meta_url" in result and "favicon" in result["meta_url"]:
                favicon = result["meta_url"]["favicon"]
            elif "profile" in result and "img" in result["profile"]:
                favicon = result["profile"]["img"]

            # Extract source name from profile or hostname
            source_name = "Unknown"
            if "profile" in result and "name" in result["profile"]:
                source_name = result["profile"]["name"]
            elif "meta_url" in result and "hostname" in result["meta_url"]:
                source_name = result["meta_url"]["hostname"]

            # Parse published date if available
            published_at = None
            if "page_age" in result:
                try:
                    parsed_date = datetime.fromisoformat(result["page_age"].replace("Z", "+00:00"))
                    published_at = parsed_date.isoformat()
                except:
                    pass

            content_type = "article"
            # The subtype is not always present, especially in news results.
            # A URL containing youtube.com is a strong indicator of a video.
            if result.get("subtype") == "video" or "youtube.com" in result.get("url", ""):
                content_type = "video"

            return CrawledContent(
                title=result.get("title", ""),
                url=result.get("url", ""),
                description=result.get("description", ""),
                author=Author(name="", image=None),
                source=Source(
                    name=source_name,
                    favicon=favicon,
                    is_high_trust=False,
                    url=result.get("url", ""),
                ),
                image=result.get("thumbnail", {}).get("src", ""),
                video=result.get("url") if content_type == "video" else None,
                type=content_type,
                can_be_summarised=True,
                has_been_crawled=False,
                has_been_summarised=False,
                is_featured=False,
                published_at=published_at
            )

        except Exception as e:
            logger.warning(f"Failed to convert web/news result to CrawledContent: {e}")
            return None

    def _convert_news_result_to_crawled_content(self, result: Dict) -> Optional[CrawledContent]:
        """
        Convert a news search result to a CrawledContent object.
        """
        try:
            # Extract favicon from meta_url
            favicon = None
            if "meta_url" in result and "favicon" in result["meta_url"]:
                favicon = result["meta_url"]["favicon"]

            # Extract source name from meta_url hostname
            source_name = "Unknown"
            if "meta_url" in result and "hostname" in result["meta_url"]:
                source_name = result["meta_url"]["hostname"]

            # Parse published date if available
            published_at = None
            if "age" in result:
                try:
                    parsed_date = datetime.fromisoformat(result["age"].replace("Z", "+00:00"))
                    published_at = parsed_date.isoformat()
                except:
                    pass

            return CrawledContent(
                title=result.get("title", ""),
                url=result.get("url", ""),
                description=result.get("description", ""),
                author=Author(name="", image=None),
                source=Source(
                    name=source_name,
                    favicon=favicon,
                    is_high_trust=False,
                    url=result.get("url", ""),
                ),
                image="",
                video=None,
                type="news",
                can_be_summarised=True,
                has_been_crawled=False,
                has_been_summarised=False,
                is_featured=False,
                published_at=published_at
            )

        except Exception as e:
            logger.warning(f"Failed to convert news result to CrawledContent: {e}")
            return None

    def _convert_video_result_to_crawled_content(self, result: Dict) -> Optional[CrawledContent]:
        """
        Convert a video search result to a CrawledContent object.
        """
        try:
            # Extract video creator as author
            author_name = ""
            if "video" in result and "creator" in result["video"]:
                author_name = result["video"]["creator"]

            # Extract favicon from meta_url
            favicon = None
            if "meta_url" in result and "favicon" in result["meta_url"]:
                favicon = result["meta_url"]["favicon"]

            # Extract source name from meta_url hostname
            source_name = "Unknown"
            if "meta_url" in result and "hostname" in result["meta_url"]:
                source_name = result["meta_url"]["hostname"]

            # Parse published date if available
            published_at = None
            if "page_age" in result:
                try:
                    parsed_date = datetime.fromisoformat(result["page_age"].replace("Z", "+00:00"))
                    published_at = parsed_date.isoformat()
                except:
                    pass

            return CrawledContent(
                title=result.get("title", ""),
                url=result.get("url", ""),
                description=result.get("description", ""),
                author=Author(name=author_name, image=None),
                source=Source(
                    name=source_name,
                    favicon=favicon,
                    is_high_trust=False,
                    url=result.get("url", ""),
                ),
                image=result.get("thumbnail", {}).get("src", ""),
                video=result.get("url", ""),
                type="video",
                can_be_summarised=True,
                has_been_crawled=False,
                has_been_summarised=False,
                is_featured=False,
                published_at=published_at
            )

        except Exception as e:
            logger.warning(f"Failed to convert video result to CrawledContent: {e}")
            return None
