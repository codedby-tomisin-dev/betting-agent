from typing import Optional
from pydantic import BaseModel


class Author(BaseModel):
    name: str
    image: Optional[str] = None


class Source(BaseModel):
    name: str
    favicon: Optional[str] = None
    is_high_trust: bool = False
    url: str


class CrawledContent(BaseModel):
    title: str
    url: str
    description: str
    author: Author
    source: Source
    image: Optional[str] = None
    video: Optional[str] = None
    type: str # 'article', 'video', 'news'
    can_be_summarised: bool = True
    has_been_crawled: bool = False
    has_been_summarised: bool = False
    is_featured: bool = False
    published_at: Optional[str] = None
